import { Server, Socket } from 'socket.io';
import { AuthenticatedSocket } from './socketAuth';
import { RedisService } from '../services/redisService';
import logger from '../utils/logger';

export interface Room {
  id: string;
  name: string;
  type: 'user' | 'role' | 'ngo' | 'program' | 'custom';
  members: Set<string>;
  metadata: Record<string, any>;
  createdAt: Date;
  createdBy: string;
  maxMembers?: number;
  isPrivate: boolean;
  permissions?: {
    canInvite: 'admin' | 'member' | 'anyone';
    canMessage: 'admin' | 'member' | 'anyone';
    canViewHistory: boolean;
  };
}

export interface RoomEvent {
  type: 'user_joined' | 'user_left' | 'message' | 'announcement' | 'custom';
  roomId: string;
  userId: string;
  data: any;
  timestamp: Date;
}

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private userRooms: Map<string, Set<string>> = new Map();
  private io: Server;
  private redis: RedisService;

  constructor(io: Server, redis: RedisService) {
    this.io = io;
    this.redis = redis;
    this.initializeDefaultRooms();
  }

  /**
   * Initialize default system rooms
   */
  private async initializeDefaultRooms(): Promise<void> {
    // Role-based rooms
    const roles = ['super_admin', 'admin', 'ngo_admin', 'volunteer', 'donor', 'beneficiary'];
    for (const role of roles) {
      await this.createRoom({
        id: `role:${role}`,
        name: `${role.replace('_', ' ').toUpperCase()} Room`,
        type: 'role',
        isPrivate: false,
        metadata: { role },
        permissions: {
          canInvite: 'admin',
          canMessage: 'member',
          canViewHistory: true
        }
      });
    }

    // System notification room
    await this.createRoom({
      id: 'system:notifications',
      name: 'System Notifications',
      type: 'custom',
      isPrivate: false,
      metadata: { isSystemRoom: true },
      permissions: {
        canInvite: 'admin',
        canMessage: 'admin',
        canViewHistory: true
      }
    });

    logger.info('Default rooms initialized');
  }

  /**
   * Create a new room
   */
  async createRoom(options: {
    id?: string;
    name: string;
    type: Room['type'];
    isPrivate: boolean;
    createdBy?: string;
    metadata?: Record<string, any>;
    maxMembers?: number;
    permissions?: Room['permissions'];
  }): Promise<Room> {
    const roomId = options.id || `room:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
    
    const room: Room = {
      id: roomId,
      name: options.name,
      type: options.type,
      members: new Set(),
      metadata: options.metadata || {},
      createdAt: new Date(),
      createdBy: options.createdBy || 'system',
      maxMembers: options.maxMembers,
      isPrivate: options.isPrivate,
      permissions: options.permissions || {
        canInvite: 'member',
        canMessage: 'member',
        canViewHistory: true
      }
    };

    this.rooms.set(roomId, room);
    
    // Store in Redis for persistence
    await this.redis.hset(
      'rooms',
      roomId,
      JSON.stringify({
        ...room,
        members: Array.from(room.members)
      })
    );

    logger.info(`Room created: ${roomId} - ${room.name}`);
    return room;
  }

  /**
   * Get room by ID
   */
  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * Join user to room
   */
  async joinRoom(socket: AuthenticatedSocket, roomId: string): Promise<boolean> {
    if (!socket.user) return false;

    const room = this.rooms.get(roomId);
    if (!room) {
      logger.warn(`Attempted to join non-existent room: ${roomId}`);
      return false;
    }

    const { userId } = socket.user;

    // Check if room is at capacity
    if (room.maxMembers && room.members.size >= room.maxMembers) {
      socket.emit('room_error', {
        type: 'room_full',
        message: 'Room is at maximum capacity',
        roomId
      });
      return false;
    }

    // Check permissions
    if (!this.canJoinRoom(socket, room)) {
      socket.emit('room_error', {
        type: 'permission_denied',
        message: 'You do not have permission to join this room',
        roomId
      });
      return false;
    }

    // Add user to room
    room.members.add(userId);
    socket.join(roomId);

    // Track user's rooms
    const userRooms = this.userRooms.get(userId) || new Set();
    userRooms.add(roomId);
    this.userRooms.set(userId, userRooms);

    // Update Redis
    await this.redis.hset(
      'rooms',
      roomId,
      JSON.stringify({
        ...room,
        members: Array.from(room.members)
      })
    );

    await this.redis.sadd(`user_rooms:${userId}`, roomId);

    // Notify room members
    const joinEvent: RoomEvent = {
      type: 'user_joined',
      roomId,
      userId,
      data: {
        userName: socket.user.email,
        timestamp: new Date()
      },
      timestamp: new Date()
    };

    this.io.to(roomId).emit('room_event', joinEvent);

    logger.info(`User ${userId} joined room ${roomId}`);
    return true;
  }

  /**
   * Leave room
   */
  async leaveRoom(socket: AuthenticatedSocket, roomId: string): Promise<boolean> {
    if (!socket.user) return false;

    const room = this.rooms.get(roomId);
    if (!room) return false;

    const { userId } = socket.user;

    // Remove user from room
    room.members.delete(userId);
    socket.leave(roomId);

    // Update user's rooms
    const userRooms = this.userRooms.get(userId);
    if (userRooms) {
      userRooms.delete(roomId);
      if (userRooms.size === 0) {
        this.userRooms.delete(userId);
      }
    }

    // Update Redis
    await this.redis.hset(
      'rooms',
      roomId,
      JSON.stringify({
        ...room,
        members: Array.from(room.members)
      })
    );

    await this.redis.srem(`user_rooms:${userId}`, roomId);

    // Notify room members
    const leaveEvent: RoomEvent = {
      type: 'user_left',
      roomId,
      userId,
      data: {
        userName: socket.user.email,
        timestamp: new Date()
      },
      timestamp: new Date()
    };

    this.io.to(roomId).emit('room_event', leaveEvent);

    logger.info(`User ${userId} left room ${roomId}`);
    return true;
  }

  /**
   * Join user to appropriate rooms based on their role and NGO
   */
  async joinUserToDefaultRooms(socket: AuthenticatedSocket): Promise<void> {
    if (!socket.user) return;

    const { userId, role, ngoId } = socket.user;

    // Join role-based room
    await this.joinRoom(socket, `role:${role}`);

    // Join NGO room if applicable
    if (ngoId) {
      let ngoRoom = this.rooms.get(`ngo:${ngoId}`);
      if (!ngoRoom) {
        ngoRoom = await this.createRoom({
          id: `ngo:${ngoId}`,
          name: `NGO ${ngoId}`,
          type: 'ngo',
          isPrivate: true,
          metadata: { ngoId },
          permissions: {
            canInvite: 'admin',
            canMessage: 'member',
            canViewHistory: true
          }
        });
      }
      await this.joinRoom(socket, `ngo:${ngoId}`);
    }

    // Join system notifications room
    await this.joinRoom(socket, 'system:notifications');
  }

  /**
   * Remove user from all rooms
   */
  async removeUserFromAllRooms(userId: string): Promise<void> {
    const userRooms = this.userRooms.get(userId);
    if (!userRooms) return;

    for (const roomId of userRooms) {
      const room = this.rooms.get(roomId);
      if (room) {
        room.members.delete(userId);
        
        // Update Redis
        await this.redis.hset(
          'rooms',
          roomId,
          JSON.stringify({
            ...room,
            members: Array.from(room.members)
          })
        );

        // Notify room members
        const leaveEvent: RoomEvent = {
          type: 'user_left',
          roomId,
          userId,
          data: {
            reason: 'disconnected',
            timestamp: new Date()
          },
          timestamp: new Date()
        };

        this.io.to(roomId).emit('room_event', leaveEvent);
      }
    }

    this.userRooms.delete(userId);
    await this.redis.del(`user_rooms:${userId}`);
  }

  /**
   * Send message to room
   */
  async sendToRoom(roomId: string, event: string, data: any, excludeUserId?: string): Promise<void> {
    const room = this.rooms.get(roomId);
    if (!room) return;

    if (excludeUserId) {
      // Get all sockets in the room except the excluded user
      const sockets = await this.io.in(roomId).fetchSockets();
      const filteredSockets = sockets.filter(socket => 
        (socket as any).user?.userId !== excludeUserId
      );
      
      filteredSockets.forEach(socket => {
        socket.emit(event, data);
      });
    } else {
      this.io.to(roomId).emit(event, data);
    }
  }

  /**
   * Get room members
   */
  getRoomMembers(roomId: string): string[] {
    const room = this.rooms.get(roomId);
    return room ? Array.from(room.members) : [];
  }

  /**
   * Get user's rooms
   */
  getUserRooms(userId: string): string[] {
    const userRooms = this.userRooms.get(userId);
    return userRooms ? Array.from(userRooms) : [];
  }

  /**
   * Check if user can join room
   */
  private canJoinRoom(socket: AuthenticatedSocket, room: Room): boolean {
    if (!socket.user) return false;

    const { role, ngoId } = socket.user;

    // System admins can join any room
    if (role === 'super_admin' || role === 'admin') return true;

    // Check room type permissions
    switch (room.type) {
      case 'role':
        return room.metadata.role === role;
      
      case 'ngo':
        return room.metadata.ngoId === ngoId;
      
      case 'custom':
        return !room.isPrivate || room.metadata.allowedUsers?.includes(socket.user.userId);
      
      default:
        return !room.isPrivate;
    }
  }

  /**
   * Get room statistics
   */
  getRoomStats(): {
    totalRooms: number;
    totalMembers: number;
    roomsByType: Record<string, number>;
    averageMembersPerRoom: number;
  } {
    const stats = {
      totalRooms: this.rooms.size,
      totalMembers: 0,
      roomsByType: {} as Record<string, number>,
      averageMembersPerRoom: 0
    };

    for (const room of this.rooms.values()) {
      stats.totalMembers += room.members.size;
      stats.roomsByType[room.type] = (stats.roomsByType[room.type] || 0) + 1;
    }

    stats.averageMembersPerRoom = stats.totalRooms > 0 
      ? stats.totalMembers / stats.totalRooms 
      : 0;

    return stats;
  }

  /**
   * Delete room
   */
  async deleteRoom(roomId: string): Promise<boolean> {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    // Remove all members from the room
    for (const userId of room.members) {
      const userRooms = this.userRooms.get(userId);
      if (userRooms) {
        userRooms.delete(roomId);
        if (userRooms.size === 0) {
          this.userRooms.delete(userId);
        }
      }
    }

    // Notify members about room deletion
    this.io.to(roomId).emit('room_deleted', {
      roomId,
      message: 'Room has been deleted',
      timestamp: new Date()
    });

    // Remove from memory and Redis
    this.rooms.delete(roomId);
    await this.redis.hdel('rooms', roomId);

    logger.info(`Room deleted: ${roomId}`);
    return true;
  }

  /**
   * Load rooms from Redis on startup
   */
  async loadRoomsFromRedis(): Promise<void> {
    try {
      const rooms = await this.redis.hgetall('rooms');
      
      for (const [roomId, roomData] of Object.entries(rooms)) {
        const room = JSON.parse(roomData);
        room.members = new Set(room.members);
        this.rooms.set(roomId, room);
        
        // Rebuild user rooms mapping
        for (const userId of room.members) {
          const userRooms = this.userRooms.get(userId) || new Set();
          userRooms.add(roomId);
          this.userRooms.set(userId, userRooms);
        }
      }
      
      logger.info(`Loaded ${Object.keys(rooms).length} rooms from Redis`);
    } catch (error) {
      logger.error('Failed to load rooms from Redis:', error);
    }
  }
}
