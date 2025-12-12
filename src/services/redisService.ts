import Redis from 'ioredis';
import config from '../config/config';
import logger from '../utils/logger';

export class RedisService {
  private client: Redis;
  private subscriber: Redis;
  private publisher: Redis;
  private connected: boolean = false;
  private connectionAttempts: number = 0;
  private maxConnectionAttempts: number = 3;
  private errorsSuppressed: boolean = false;

  constructor() {
    const redisConfig = {
      host: config.redis?.host || 'localhost',
      port: config.redis?.port || 6379,
      password: config.redis?.password,
      db: config.redis?.db || 0,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 0, // Disable automatic retries
      lazyConnect: true,
      connectTimeout: 5000,
      commandTimeout: 5000,
      enableOfflineQueue: false, // Disable offline command queuing
    };

    this.client = new Redis(redisConfig);
    this.subscriber = new Redis(redisConfig);
    this.publisher = new Redis(redisConfig);

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      logger.info('Redis client connected');
      this.connected = true;
      this.connectionAttempts = 0;
      this.errorsSuppressed = false;
    });

    this.client.on('error', (error: Error) => {
      if (this.connectionAttempts < this.maxConnectionAttempts && !this.errorsSuppressed) {
        logger.error('Redis client error:', error);
        this.connectionAttempts++;
        
        if (this.connectionAttempts >= this.maxConnectionAttempts) {
          this.errorsSuppressed = true;
          logger.warn('Redis connection failed after maximum attempts. Errors will be suppressed.');
          
          // Remove all error listeners to prevent further error logging
          this.client.removeAllListeners('error');
          this.subscriber.removeAllListeners('error');
          this.publisher.removeAllListeners('error');
          
          // Add silent error handlers
          this.client.on('error', () => {});
          this.subscriber.on('error', () => {});
          this.publisher.on('error', () => {});
        }
      }
      this.connected = false;
    });

    this.client.on('close', () => {
      this.connected = false;
    });

    this.subscriber.on('connect', () => {
      if (!this.errorsSuppressed) {
        logger.info('Redis subscriber connected');
      }
    });

    this.publisher.on('connect', () => {
      if (!this.errorsSuppressed) {
        logger.info('Redis publisher connected');
      }
    });

    // Initial silent error handlers for subscriber and publisher
    this.subscriber.on('error', (error: Error) => {
      if (!this.errorsSuppressed && this.connectionAttempts < this.maxConnectionAttempts) {
        logger.error('Redis subscriber error:', error);
      }
    });
    
    this.publisher.on('error', (error: Error) => {
      if (!this.errorsSuppressed && this.connectionAttempts < this.maxConnectionAttempts) {
        logger.error('Redis publisher error:', error);
      }
    });
  }

  /**
   * Initialize Redis connections
   */
  async connect(): Promise<void> {
    try {
      if (this.connectionAttempts >= this.maxConnectionAttempts || this.errorsSuppressed) {
        // Silently return if max attempts reached
        return;
      }
      
      this.connectionAttempts++;
      await this.client.connect();
      this.connected = true;
      this.connectionAttempts = 0;
      this.errorsSuppressed = false;
      logger.info('Redis service connected successfully');
    } catch (error: any) {
      this.connected = false;
      if (this.connectionAttempts <= this.maxConnectionAttempts && !this.errorsSuppressed) {
        logger.warn(`Failed to connect to Redis (attempt ${this.connectionAttempts}/${this.maxConnectionAttempts}):`, error.message);
      }
      
      if (this.connectionAttempts >= this.maxConnectionAttempts) {
        this.errorsSuppressed = true;
        logger.warn('Redis connection failed after maximum attempts. Continuing without Redis.');
      }
      // Don't throw the error, just log it and continue
    }
  }

  /**
   * Close all Redis connections
   */
  async disconnect(): Promise<void> {
    await Promise.all([
      this.client.disconnect(),
      this.subscriber.disconnect(),
      this.publisher.disconnect()
    ]);
    logger.info('Redis connections closed');
  }

  /**
   * Check if Redis is connected and ready
   */
  isConnected(): boolean {
    return this.client.status === 'ready';
  }

  // Basic Redis operations
  async set(key: string, value: string, expireSeconds?: number): Promise<void> {
    if (!this.isConnected()) {
      logger.warn('Redis not connected, skipping SET operation');
      return;
    }
    try {
      if (expireSeconds) {
        await this.client.setex(key, expireSeconds, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      logger.error('Redis SET operation failed:', error);
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.isConnected()) {
      logger.warn('Redis not connected, skipping GET operation');
      return null;
    }
    try {
      return await this.client.get(key);
    } catch (error) {
      logger.error('Redis GET operation failed:', error);
      return null;
    }
  }

  async del(key: string): Promise<number>;
  async del(...keys: string[]): Promise<number>;
  async del(...keys: string[]): Promise<number> {
    if (!this.isConnected() || this.errorsSuppressed) {
      return 0;
    }
    try {
      return await this.client.del(...keys);
    } catch (error) {
      return 0;
    }
  }

  async exists(key: string): Promise<number> {
    if (!this.isConnected() || this.errorsSuppressed) {
      return 0;
    }
    try {
      return await this.client.exists(key);
    } catch (error) {
      return 0;
    }
  }

  async expire(key: string, seconds: number): Promise<number> {
    if (!this.isConnected() || this.errorsSuppressed) {
      return 0;
    }
    try {
      return await this.client.expire(key, seconds);
    } catch (error) {
      return 0;
    }
  }

  async ttl(key: string): Promise<number> {
    if (!this.isConnected() || this.errorsSuppressed) {
      return -1;
    }
    try {
      return await this.client.ttl(key);
    } catch (error) {
      return -1;
    }
  }

  // Hash operations
  async hset(key: string, field: string, value: string): Promise<number> {
    if (!this.isConnected() || this.errorsSuppressed) {
      return 0;
    }
    try {
      return await this.client.hset(key, field, value);
    } catch (error) {
      return 0;
    }
  }

  async hget(key: string, field: string): Promise<string | null> {
    if (!this.isConnected() || this.errorsSuppressed) {
      return null;
    }
    try {
      return await this.client.hget(key, field);
    } catch (error) {
      return null;
    }
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    if (!this.isConnected() || this.errorsSuppressed) {
      return {};
    }
    try {
      return await this.client.hgetall(key);
    } catch (error) {
      return {};
    }
  }

  async hdel(key: string, field: string): Promise<number> {
    if (!this.isConnected() || this.errorsSuppressed) {
      return 0;
    }
    try {
      return await this.client.hdel(key, field);
    } catch (error) {
      return 0;
    }
  }

  async hexists(key: string, field: string): Promise<number> {
    if (!this.isConnected() || this.errorsSuppressed) {
      return 0;
    }
    try {
      return await this.client.hexists(key, field);
    } catch (error) {
      return 0;
    }
  }

  // List operations
  async lpush(key: string, value: string): Promise<number> {
    if (!this.isConnected() || this.errorsSuppressed) {
      return 0;
    }
    try {
      return await this.client.lpush(key, value);
    } catch (error) {
      return 0;
    }
  }

  async rpush(key: string, value: string): Promise<number> {
    if (!this.isConnected() || this.errorsSuppressed) {
      return 0;
    }
    try {
      return await this.client.rpush(key, value);
    } catch (error) {
      return 0;
    }
  }

  async lpop(key: string): Promise<string | null> {
    if (!this.isConnected() || this.errorsSuppressed) {
      return null;
    }
    try {
      return await this.client.lpop(key);
    } catch (error) {
      return null;
    }
  }

  async rpop(key: string): Promise<string | null> {
    if (!this.isConnected() || this.errorsSuppressed) {
      return null;
    }
    try {
      return await this.client.rpop(key);
    } catch (error) {
      return null;
    }
  }

  async llen(key: string): Promise<number> {
    if (!this.isConnected() || this.errorsSuppressed) {
      return 0;
    }
    try {
      return await this.client.llen(key);
    } catch (error) {
      return 0;
    }
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    if (!this.isConnected() || this.errorsSuppressed) {
      return [];
    }
    try {
      return await this.client.lrange(key, start, stop);
    } catch (error) {
      return [];
    }
  }

  async ltrim(key: string, start: number, stop: number): Promise<string> {
    if (!this.isConnected() || this.errorsSuppressed) {
      return 'OK';
    }
    try {
      return await this.client.ltrim(key, start, stop);
    } catch (error) {
      return 'OK';
    }
  }

  // Set operations
  async sadd(key: string, member: string): Promise<number> {
    if (!this.isConnected() || this.errorsSuppressed) {
      return 0;
    }
    try {
      return await this.client.sadd(key, member);
    } catch (error) {
      return 0;
    }
  }

  async srem(key: string, member: string): Promise<number> {
    if (!this.isConnected() || this.errorsSuppressed) {
      return 0;
    }
    try {
      return await this.client.srem(key, member);
    } catch (error) {
      return 0;
    }
  }

  async smembers(key: string): Promise<string[]> {
    if (!this.isConnected() || this.errorsSuppressed) {
      return [];
    }
    try {
      return await this.client.smembers(key);
    } catch (error) {
      return [];
    }
  }

  async sismember(key: string, member: string): Promise<number> {
    if (!this.isConnected() || this.errorsSuppressed) {
      return 0;
    }
    try {
      return await this.client.sismember(key, member);
    } catch (error) {
      return 0;
    }
  }

  // Sorted set operations
  async zadd(key: string, score: number, member: string): Promise<number> {
    if (!this.isConnected() || this.errorsSuppressed) {
      return 0;
    }
    try {
      return await this.client.zadd(key, score, member);
    } catch (error) {
      return 0;
    }
  }

  async zrem(key: string, member: string): Promise<number> {
    if (!this.isConnected() || this.errorsSuppressed) {
      return 0;
    }
    try {
      return await this.client.zrem(key, member);
    } catch (error) {
      return 0;
    }
  }

  async zremrangebyscore(key: string, min: number, max: number): Promise<number> {
    if (!this.isConnected() || this.errorsSuppressed) {
      return 0;
    }
    try {
      return await this.client.zremrangebyscore(key, min, max);
    } catch (error) {
      return 0;
    }
  }

  async zrange(key: string, start: number, stop: number): Promise<string[]> {
    if (!this.isConnected() || this.errorsSuppressed) {
      return [];
    }
    try {
      return await this.client.zrange(key, start, stop);
    } catch (error) {
      return [];
    }
  }

  async zcard(key: string): Promise<number> {
    if (!this.isConnected() || this.errorsSuppressed) {
      return 0;
    }
    try {
      return await this.client.zcard(key);
    } catch (error) {
      return 0;
    }
  }

  // Pub/Sub operations
  async publish(channel: string, message: string): Promise<number> {
    return await this.publisher.publish(channel, message);
  }

  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    this.subscriber.subscribe(channel);
    this.subscriber.on('message', (receivedChannel: string, message: string) => {
      if (receivedChannel === channel) {
        callback(message);
      }
    });
  }

  async unsubscribe(channel: string): Promise<void> {
    await this.subscriber.unsubscribe(channel);
  }

  // Rate limiting using token bucket algorithm
  async isRateLimited(key: string, limit: number, windowSeconds: number): Promise<boolean> {
    if (!this.isConnected() || this.errorsSuppressed) {
      return false; // Allow requests when Redis is down
    }
    try {
      const current = await this.client.incr(key);
      
      if (current === 1) {
        await this.client.expire(key, windowSeconds);
      }
      
      return current > limit;
    } catch (error) {
      return false; // Allow requests on error
    }
  }

  // Session management
  async setSession(sessionId: string, data: any, expireSeconds: number = 3600): Promise<void> {
    await this.set(`session:${sessionId}`, JSON.stringify(data), expireSeconds);
  }

  async getSession(sessionId: string): Promise<any | null> {
    const data = await this.get(`session:${sessionId}`);
    return data ? JSON.parse(data) : null;
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.del(`session:${sessionId}`);
  }

  // Cache operations
  async setCache(key: string, data: any, expireSeconds: number = 300): Promise<void> {
    await this.set(`cache:${key}`, JSON.stringify(data), expireSeconds);
  }

  async getCache(key: string): Promise<any | null> {
    const data = await this.get(`cache:${key}`);
    return data ? JSON.parse(data) : null;
  }

  async deleteCache(key: string): Promise<void> {
    await this.del(`cache:${key}`);
  }

  // Pattern-based operations
  async keys(pattern: string): Promise<string[]> {
    if (!this.isConnected() || this.errorsSuppressed) {
      return [];
    }
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      return [];
    }
  }

  async deletePattern(pattern: string): Promise<number> {
    if (!this.isConnected() || this.errorsSuppressed) {
      return 0;
    }
    try {
      const keys = await this.keys(pattern);
      if (keys.length === 0) return 0;
      return await this.client.del(...keys);
    } catch (error) {
      return 0;
    }
  }

  // Health check
  async ping(): Promise<string> {
    if (!this.isConnected() || this.errorsSuppressed) {
      return 'Redis unavailable';
    }
    try {
      return await this.client.ping();
    } catch (error) {
      return 'Redis error';
    }
  }

  // Get client info
  async info(): Promise<string> {
    if (!this.isConnected() || this.errorsSuppressed) {
      return 'Redis unavailable';
    }
    try {
      return await this.client.info();
    } catch (error) {
      return 'Redis error';
    }
  }

  // Atomic operations
  async multi(): Promise<any> {
    if (!this.isConnected() || this.errorsSuppressed) {
      return { exec: () => Promise.resolve([]) }; // Mock multi object
    }
    try {
      return this.client.multi();
    } catch (error) {
      return { exec: () => Promise.resolve([]) };
    }
  }

  async incr(key: string): Promise<number> {
    if (!this.isConnected() || this.errorsSuppressed) {
      return 1; // Return default increment
    }
    try {
      return await this.client.incr(key);
    } catch (error) {
      return 1;
    }
  }

  async exec(multi: any): Promise<any> {
    if (!this.isConnected() || this.errorsSuppressed) {
      return [];
    }
    try {
      return await multi.exec();
    } catch (error) {
      return [];
    }
  }
}

// Create singleton instance
const redisService = new RedisService();
export default redisService;
