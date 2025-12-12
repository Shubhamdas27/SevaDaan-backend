import { RedisService } from '../services/redisService';
import logger from '../utils/logger';

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  blockDurationMs?: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  totalRequests: number;
  remainingRequests: number;
  resetTime: number;
  retryAfter?: number;
}

export class RateLimiter {
  private redis: RedisService;
  private keyPrefix: string;

  constructor(redis: RedisService, keyPrefix = 'ratelimit') {
    this.redis = redis;
    this.keyPrefix = keyPrefix;
  }

  /**
   * Check if request is allowed under rate limit
   */
  async checkLimit(
    identifier: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const window = Math.floor(Date.now() / config.windowMs);
    const key = `${this.keyPrefix}:${identifier}:${window}`;

    try {
      // Use Redis pipeline for atomic operations
      const pipeline = await this.redis.multi();
      
      // Get current count
      const currentCount = await this.redis.get(key);
      
      // Increment counter
      await this.redis.incr(key);
      
      // Set expiration if it's a new key
      if (!currentCount) {
        await this.redis.expire(key, Math.ceil(config.windowMs / 1000));
      }
      
      const count = currentCount ? parseInt(currentCount) : 0;
      const newCount = count + 1;
      
      const allowed = newCount <= config.maxRequests;
      const remainingRequests = Math.max(0, config.maxRequests - newCount);
      const resetTime = (window + 1) * config.windowMs;
      
      const result: RateLimitResult = {
        allowed,
        totalRequests: newCount,
        remainingRequests,
        resetTime
      };

      // If blocked and block duration is specified, set additional block
      if (!allowed && config.blockDurationMs) {
        const blockKey = `${this.keyPrefix}:blocked:${identifier}`;
        await this.redis.set(
          blockKey,
          'blocked',
          Math.ceil(config.blockDurationMs / 1000)
        );
        result.retryAfter = config.blockDurationMs;
      }

      return result;
    } catch (error) {
      logger.error('Rate limit check failed:', error);
      // Fail open - allow request if Redis is unavailable
      return {
        allowed: true,
        totalRequests: 0,
        remainingRequests: config.maxRequests,
        resetTime: Date.now() + config.windowMs
      };
    }
  }

  /**
   * Check if identifier is currently blocked
   */
  async isBlocked(identifier: string): Promise<boolean> {
    try {
      const blockKey = `${this.keyPrefix}:blocked:${identifier}`;
      const blocked = await this.redis.exists(blockKey);
      return blocked === 1;
    } catch (error) {
      logger.error('Block check failed:', error);
      return false;
    }
  }

  /**
   * Reset rate limit for identifier
   */
  async resetLimit(identifier: string): Promise<void> {
    try {
      const pattern = `${this.keyPrefix}:${identifier}:*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        for (const key of keys) {
          await this.redis.del(key);
        }
      }
      
      // Also remove any blocks
      const blockKey = `${this.keyPrefix}:blocked:${identifier}`;
      await this.redis.del(blockKey);
      
      logger.info(`Rate limit reset for: ${identifier}`);
    } catch (error) {
      logger.error('Rate limit reset failed:', error);
    }
  }

  /**
   * Get current rate limit status
   */
  async getStatus(identifier: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const window = Math.floor(Date.now() / config.windowMs);
    const key = `${this.keyPrefix}:${identifier}:${window}`;

    try {
      const currentCount = await this.redis.get(key);
      const count = currentCount ? parseInt(currentCount) : 0;
      
      const allowed = count < config.maxRequests;
      const remainingRequests = Math.max(0, config.maxRequests - count);
      const resetTime = (window + 1) * config.windowMs;

      return {
        allowed,
        totalRequests: count,
        remainingRequests,
        resetTime
      };
    } catch (error) {
      logger.error('Rate limit status check failed:', error);
      return {
        allowed: true,
        totalRequests: 0,
        remainingRequests: config.maxRequests,
        resetTime: Date.now() + config.windowMs
      };
    }
  }

  /**
   * Get rate limit statistics
   */
  async getStats(): Promise<{
    totalKeys: number;
    blockedIdentifiers: number;
    keysByWindow: Record<string, number>;
  }> {
    try {
      const allKeys = await this.redis.keys(`${this.keyPrefix}:*`);
      const blockedKeys = await this.redis.keys(`${this.keyPrefix}:blocked:*`);
      
      const keysByWindow: Record<string, number> = {};
      
      for (const key of allKeys) {
        if (key.includes(':blocked:')) continue;
        
        const parts = key.split(':');
        const window = parts[parts.length - 1];
        keysByWindow[window] = (keysByWindow[window] || 0) + 1;
      }

      return {
        totalKeys: allKeys.length - blockedKeys.length,
        blockedIdentifiers: blockedKeys.length,
        keysByWindow
      };
    } catch (error) {
      logger.error('Rate limit stats failed:', error);
      return {
        totalKeys: 0,
        blockedIdentifiers: 0,
        keysByWindow: {}
      };
    }
  }

  /**
   * Clean up expired rate limit data
   */
  async cleanup(): Promise<void> {
    try {
      const pattern = `${this.keyPrefix}:*`;
      const keys = await this.redis.keys(pattern);
      
      let deletedCount = 0;
      
      for (const key of keys) {
        const ttl = await this.redis.ttl(key);
        if (ttl <= 0) {
          await this.redis.del(key);
          deletedCount++;
        }
      }
      
      if (deletedCount > 0) {
        logger.info(`Cleaned up ${deletedCount} expired rate limit keys`);
      }
    } catch (error) {
      logger.error('Rate limit cleanup failed:', error);
    }
  }

  /**
   * Sliding window rate limiter
   */
  async checkSlidingWindow(
    identifier: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const key = `${this.keyPrefix}:sliding:${identifier}`;

    try {
      // Remove old entries
      const cutoff = now - config.windowMs;
      await this.redis.zremrangebyscore(key, 0, cutoff);

      // Count current requests
      const currentCount = await this.redis.zcard(key);
      
      const allowed = currentCount < config.maxRequests;
      
      if (allowed) {
        // Add current request
        await this.redis.zadd(key, now, now.toString());
        
        // Set expiration
        await this.redis.expire(key, Math.ceil(config.windowMs / 1000));
      }

      return {
        allowed,
        totalRequests: currentCount + (allowed ? 1 : 0),
        remainingRequests: Math.max(0, config.maxRequests - currentCount - (allowed ? 1 : 0)),
        resetTime: now + config.windowMs
      };
    } catch (error) {
      logger.error('Sliding window rate limit check failed:', error);
      return {
        allowed: true,
        totalRequests: 0,
        remainingRequests: config.maxRequests,
        resetTime: now + config.windowMs
      };
    }
  }

  /**
   * Token bucket rate limiter
   */
  async checkTokenBucket(
    identifier: string,
    config: RateLimitConfig & { refillRate: number }
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const key = `${this.keyPrefix}:bucket:${identifier}`;

    try {
      const bucketData = await this.redis.get(key);
      let tokens = config.maxRequests;
      let lastRefill = now;

      if (bucketData) {
        const parsed = JSON.parse(bucketData);
        tokens = parsed.tokens;
        lastRefill = parsed.lastRefill;
      }

      // Calculate tokens to add based on time elapsed
      const timeElapsed = now - lastRefill;
      const tokensToAdd = Math.floor(timeElapsed / config.refillRate);
      
      if (tokensToAdd > 0) {
        tokens = Math.min(config.maxRequests, tokens + tokensToAdd);
        lastRefill = now;
      }

      const allowed = tokens > 0;
      
      if (allowed) {
        tokens--;
      }

      // Update bucket state
      await this.redis.set(
        key,
        JSON.stringify({ tokens, lastRefill }),
        Math.ceil(config.windowMs / 1000)
      );

      return {
        allowed,
        totalRequests: config.maxRequests - tokens,
        remainingRequests: tokens,
        resetTime: now + (tokens === 0 ? config.refillRate : 0)
      };
    } catch (error) {
      logger.error('Token bucket rate limit check failed:', error);
      return {
        allowed: true,
        totalRequests: 0,
        remainingRequests: config.maxRequests,
        resetTime: now + config.windowMs
      };
    }
  }
}
