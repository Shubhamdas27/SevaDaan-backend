import { Server, Socket } from 'socket.io';
import { AuthenticatedSocket } from './socketAuth';
import { RedisService } from '../services/redisService';
import logger from '../utils/logger';

export interface UserConnection {
  userId: string;
  socketId: string;
  email: string;
  role: string;
  ngoId?: string;
  lastActivity: Date;
  deviceInfo?: {
    type: 'web' | 'mobile';
    userAgent?: string;
    platform?: string;
  };
}

export class ConnectionManager {
  private connections: Map<string, UserConnection[]> = new Map();
  private redis: RedisService;
  private io: Server;

  constructor(io: Server, redis: RedisService) {
    this.io = io;
    this.redis = redis;
  }

  /**
   * Add a new user connection
   */
  async addConnection(socket: AuthenticatedSocket): Promise<void> {
    if (!socket.user) return;

    const { userId, email, role, ngoId } = socket.user;
    
    const connection: UserConnection = {
      userId,
      socketId: socket.id,
      email,
      role,
      ngoId,
      lastActivity: new Date(),
      deviceInfo: {
        type: socket.handshake.headers['user-agent']?.includes('Mobile') ? 'mobile' : 'web',
        userAgent: socket.handshake.headers['user-agent'],
        platform: socket.handshake.headers['x-platform'] as string
      }
    };

    // Add to local connections
    const userConnections = this.connections.get(userId) || [];
    userConnections.push(connection);
    this.connections.set(userId, userConnections);

    // Store in Redis for cluster support
    await this.redis.hset(
      'user_connections',
      userId,
      JSON.stringify(userConnections)
    );

    // Update user online status
    await this.updateUserStatus(userId, 'online');

    logger.info(`User connected: ${email} (${role}) - Socket: ${socket.id}`);
  }

  /**
   * Remove a user connection
   */
  async removeConnection(socketId: string): Promise<void> {
    let removedUserId: string | null = null;

    // Find and remove the connection
    for (const [userId, connections] of this.connections.entries()) {
      const filteredConnections = connections.filter(conn => conn.socketId !== socketId);
      
      if (filteredConnections.length !== connections.length) {
        removedUserId = userId;
        
        if (filteredConnections.length === 0) {
          this.connections.delete(userId);
          await this.redis.hdel('user_connections', userId);
          await this.updateUserStatus(userId, 'offline');
        } else {
          this.connections.set(userId, filteredConnections);
          await this.redis.hset(
            'user_connections',
            userId,
            JSON.stringify(filteredConnections)
          );
        }
        break;
      }
    }

    if (removedUserId) {
      logger.info(`User disconnected: ${removedUserId} - Socket: ${socketId}`);
    }
  }

  /**
   * Get all connections for a user
   */
  getUserConnections(userId: string): UserConnection[] {
    return this.connections.get(userId) || [];
  }

  /**
   * Get all online users
   */
  getOnlineUsers(): string[] {
    return Array.from(this.connections.keys());
  }

  /**
   * Get user connection by socket ID
   */
  getConnectionBySocketId(socketId: string): UserConnection | null {
    for (const connections of this.connections.values()) {
      const connection = connections.find(conn => conn.socketId === socketId);
      if (connection) return connection;
    }
    return null;
  }

  /**
   * Update user activity timestamp
   */
  async updateActivity(socketId: string): Promise<void> {
    const connection = this.getConnectionBySocketId(socketId);
    if (!connection) return;

    connection.lastActivity = new Date();
    
    // Update in Redis
    const userConnections = this.getUserConnections(connection.userId);
    await this.redis.hset(
      'user_connections',
      connection.userId,
      JSON.stringify(userConnections)
    );
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    return this.connections.has(userId);
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): {
    totalConnections: number;
    uniqueUsers: number;
    roleDistribution: Record<string, number>;
    deviceDistribution: Record<string, number>;
  } {
    const stats = {
      totalConnections: 0,
      uniqueUsers: this.connections.size,
      roleDistribution: {} as Record<string, number>,
      deviceDistribution: {} as Record<string, number>
    };

    for (const connections of this.connections.values()) {
      stats.totalConnections += connections.length;
      
      for (const conn of connections) {
        // Role distribution
        stats.roleDistribution[conn.role] = (stats.roleDistribution[conn.role] || 0) + 1;
        
        // Device distribution
        const deviceType = conn.deviceInfo?.type || 'unknown';
        stats.deviceDistribution[deviceType] = (stats.deviceDistribution[deviceType] || 0) + 1;
      }
    }

    return stats;
  }

  /**
   * Clean up inactive connections
   */
  async cleanupInactiveConnections(): Promise<void> {
    const inactiveThreshold = 30 * 60 * 1000; // 30 minutes
    const now = new Date();

    for (const [userId, connections] of this.connections.entries()) {
      const activeConnections = connections.filter(conn => {
        const timeSinceActivity = now.getTime() - conn.lastActivity.getTime();
        return timeSinceActivity < inactiveThreshold;
      });

      if (activeConnections.length !== connections.length) {
        if (activeConnections.length === 0) {
          this.connections.delete(userId);
          await this.redis.hdel('user_connections', userId);
          await this.updateUserStatus(userId, 'offline');
        } else {
          this.connections.set(userId, activeConnections);
          await this.redis.hset(
            'user_connections',
            userId,
            JSON.stringify(activeConnections)
          );
        }
      }
    }
  }

  /**
   * Send message to all user connections
   */
  async sendToUser(userId: string, event: string, data: any): Promise<void> {
    const connections = this.getUserConnections(userId);
    
    for (const connection of connections) {
      this.io.to(connection.socketId).emit(event, data);
    }
  }

  /**
   * Send message to users by role
   */
  async sendToRole(role: string, event: string, data: any): Promise<void> {
    this.io.to(`role:${role}`).emit(event, data);
  }

  /**
   * Send message to NGO members
   */
  async sendToNGO(ngoId: string, event: string, data: any): Promise<void> {
    this.io.to(`ngo:${ngoId}`).emit(event, data);
  }

  /**
   * Update user online status
   */
  private async updateUserStatus(userId: string, status: 'online' | 'offline'): Promise<void> {
    await this.redis.hset('user_status', userId, status);
    
    // Broadcast status change to relevant users
    this.io.emit('user_status_change', {
      userId,
      status,
      timestamp: new Date()
    });
  }

  /**
   * Initialize periodic cleanup
   */
  startCleanupTimer(): void {
    setInterval(() => {
      this.cleanupInactiveConnections().catch(error => {
        logger.error('Error during connection cleanup:', error);
      });
    }, 5 * 60 * 1000); // Every 5 minutes
  }
}
