import { Server } from 'socket.io';
import { AuthenticatedSocket } from './socketAuth';
import { ConnectionManager } from './connectionManager';
import { RoomManager } from './roomManager';
import { RedisService } from '../services/redisService';
import logger from '../utils/logger';

export interface EventHandler {
  event: string;
  handler: (socket: AuthenticatedSocket, data: any) => Promise<void>;
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
  requiresAuth?: boolean;
  allowedRoles?: string[];
}

export interface EventMetrics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  errorCount: number;
  rateLimitHits: number;
}

export class EventRouter {
  private handlers: Map<string, EventHandler> = new Map();
  private metrics: EventMetrics = {
    totalEvents: 0,
    eventsByType: {},
    errorCount: 0,
    rateLimitHits: 0
  };
  private rateLimitMap: Map<string, Map<string, number>> = new Map();
  private io: Server;
  private connectionManager: ConnectionManager;
  private roomManager: RoomManager;
  private redis: RedisService;

  constructor(
    io: Server,
    connectionManager: ConnectionManager,
    roomManager: RoomManager,
    redis: RedisService
  ) {
    this.io = io;
    this.connectionManager = connectionManager;
    this.roomManager = roomManager;
    this.redis = redis;
    
    this.registerDefaultHandlers();
    this.startMetricsCleanup();
  }

  /**
   * Register an event handler
   */
  registerHandler(config: EventHandler): void {
    this.handlers.set(config.event, config);
    logger.info(`Event handler registered: ${config.event}`);
  }

  /**
   * Handle incoming socket event
   */
  async handleEvent(socket: AuthenticatedSocket, event: string, data: any): Promise<void> {
    try {
      const handler = this.handlers.get(event);
      if (!handler) {
        logger.warn(`No handler found for event: ${event}`);
        socket.emit('error', { message: 'Unknown event type' });
        return;
      }

      // Update activity tracking
      await this.connectionManager.updateActivity(socket.id);

      // Check authentication
      if (handler.requiresAuth && !socket.user) {
        socket.emit('error', { message: 'Authentication required' });
        return;
      }

      // Check role permissions
      if (handler.allowedRoles && socket.user) {
        if (!handler.allowedRoles.includes(socket.user.role)) {
          socket.emit('error', { message: 'Insufficient permissions' });
          return;
        }
      }

      // Check rate limiting
      if (handler.rateLimit && socket.user) {
        const isRateLimited = await this.checkRateLimit(
          socket.user.userId,
          event,
          handler.rateLimit
        );

        if (isRateLimited) {
          this.metrics.rateLimitHits++;
          socket.emit('error', { message: 'Rate limit exceeded' });
          return;
        }
      }

      // Execute handler
      await handler.handler(socket, data);

      // Update metrics
      this.metrics.totalEvents++;
      this.metrics.eventsByType[event] = (this.metrics.eventsByType[event] || 0) + 1;

    } catch (error) {
      this.metrics.errorCount++;
      logger.error(`Event handler error for ${event}:`, error);
      socket.emit('error', { 
        message: 'Internal server error',
        eventType: event 
      });
    }
  }

  /**
   * Register default event handlers
   */
  private registerDefaultHandlers(): void {
    // User status events
    this.registerHandler({
      event: 'user_status_change',
      handler: this.handleUserStatusChange.bind(this),
      requiresAuth: true,
      rateLimit: { maxRequests: 5, windowMs: 60000 }
    });

    // Room events
    this.registerHandler({
      event: 'join_room',
      handler: this.handleJoinRoom.bind(this),
      requiresAuth: true,
      rateLimit: { maxRequests: 10, windowMs: 60000 }
    });

    this.registerHandler({
      event: 'leave_room',
      handler: this.handleLeaveRoom.bind(this),
      requiresAuth: true,
      rateLimit: { maxRequests: 10, windowMs: 60000 }
    });

    // Dashboard events
    this.registerHandler({
      event: 'dashboard_metrics_request',
      handler: this.handleDashboardMetricsRequest.bind(this),
      requiresAuth: true,
      allowedRoles: ['admin', 'super_admin', 'ngo_admin'],
      rateLimit: { maxRequests: 30, windowMs: 60000 }
    });

    // Notification events
    this.registerHandler({
      event: 'mark_notification_read',
      handler: this.handleMarkNotificationRead.bind(this),
      requiresAuth: true,
      rateLimit: { maxRequests: 50, windowMs: 60000 }
    });

    // Real-time chat events
    this.registerHandler({
      event: 'send_message',
      handler: this.handleSendMessage.bind(this),
      requiresAuth: true,
      rateLimit: { maxRequests: 100, windowMs: 60000 }
    });

    // Program events
    this.registerHandler({
      event: 'program_update',
      handler: this.handleProgramUpdate.bind(this),
      requiresAuth: true,
      allowedRoles: ['admin', 'super_admin', 'ngo_admin'],
      rateLimit: { maxRequests: 20, windowMs: 60000 }
    });

    // Donation events
    this.registerHandler({
      event: 'donation_status_update',
      handler: this.handleDonationStatusUpdate.bind(this),
      requiresAuth: true,
      rateLimit: { maxRequests: 10, windowMs: 60000 }
    });

    // Volunteer events
    this.registerHandler({
      event: 'volunteer_application_update',
      handler: this.handleVolunteerApplicationUpdate.bind(this),
      requiresAuth: true,
      rateLimit: { maxRequests: 15, windowMs: 60000 }
    });

    // Emergency events
    this.registerHandler({
      event: 'emergency_alert',
      handler: this.handleEmergencyAlert.bind(this),
      requiresAuth: true,
      allowedRoles: ['admin', 'super_admin', 'ngo_admin'],
      rateLimit: { maxRequests: 5, windowMs: 300000 } // 5 alerts per 5 minutes
    });
  }

  /**
   * Handle user status change
   */
  private async handleUserStatusChange(socket: AuthenticatedSocket, data: any): Promise<void> {
    if (!socket.user) return;

    const { status } = data;
    const validStatuses = ['online', 'away', 'busy', 'offline'];
    
    if (!validStatuses.includes(status)) {
      socket.emit('error', { message: 'Invalid status' });
      return;
    }

    await this.redis.hset('user_status', socket.user.userId, status);
    
    // Broadcast to relevant rooms
    const userRooms = this.roomManager.getUserRooms(socket.user.userId);
    for (const roomId of userRooms) {
      await this.roomManager.sendToRoom(roomId, 'user_status_changed', {
        userId: socket.user.userId,
        status,
        timestamp: new Date()
      }, socket.user.userId);
    }
  }

  /**
   * Handle join room request
   */
  private async handleJoinRoom(socket: AuthenticatedSocket, data: any): Promise<void> {
    const { roomId } = data;
    
    if (!roomId || typeof roomId !== 'string') {
      socket.emit('error', { message: 'Invalid room ID' });
      return;
    }

    const success = await this.roomManager.joinRoom(socket, roomId);
    
    if (success) {
      socket.emit('room_joined', {
        roomId,
        members: this.roomManager.getRoomMembers(roomId),
        timestamp: new Date()
      });
    }
  }

  /**
   * Handle leave room request
   */
  private async handleLeaveRoom(socket: AuthenticatedSocket, data: any): Promise<void> {
    const { roomId } = data;
    
    if (!roomId || typeof roomId !== 'string') {
      socket.emit('error', { message: 'Invalid room ID' });
      return;
    }

    const success = await this.roomManager.leaveRoom(socket, roomId);
    
    if (success) {
      socket.emit('room_left', {
        roomId,
        timestamp: new Date()
      });
    }
  }

  /**
   * Handle dashboard metrics request
   */
  private async handleDashboardMetricsRequest(socket: AuthenticatedSocket, data: any): Promise<void> {
    if (!socket.user) return;

    const { metricsType, filters } = data;
    
    try {
      // This would integrate with your dashboard service
      const metrics = await this.getDashboardMetrics(socket.user, metricsType, filters);
      
      socket.emit('dashboard_metrics_response', {
        type: metricsType,
        data: metrics,
        timestamp: new Date()
      });
    } catch (error) {
      socket.emit('error', { message: 'Failed to fetch dashboard metrics' });
    }
  }

  /**
   * Handle mark notification as read
   */
  private async handleMarkNotificationRead(socket: AuthenticatedSocket, data: any): Promise<void> {
    if (!socket.user) return;

    const { notificationId } = data;
    
    if (!notificationId) {
      socket.emit('error', { message: 'Notification ID required' });
      return;
    }

    try {
      // This would integrate with your notification service
      await this.markNotificationAsRead(socket.user.userId, notificationId);
      
      socket.emit('notification_marked_read', {
        notificationId,
        timestamp: new Date()
      });
    } catch (error) {
      socket.emit('error', { message: 'Failed to mark notification as read' });
    }
  }

  /**
   * Handle send message
   */
  private async handleSendMessage(socket: AuthenticatedSocket, data: any): Promise<void> {
    if (!socket.user) return;

    const { roomId, message, messageType = 'text' } = data;
    
    if (!roomId || !message) {
      socket.emit('error', { message: 'Room ID and message are required' });
      return;
    }

    const messageData = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      roomId,
      userId: socket.user.userId,
      userEmail: socket.user.email,
      message,
      messageType,
      timestamp: new Date()
    };

    // Store message in Redis for history
    await this.redis.lpush(`room_messages:${roomId}`, JSON.stringify(messageData));
    
    // Keep only last 100 messages
    await this.redis.ltrim(`room_messages:${roomId}`, 0, 99);

    // Send to room members
    await this.roomManager.sendToRoom(roomId, 'new_message', messageData);
  }

  /**
   * Handle program update
   */
  private async handleProgramUpdate(socket: AuthenticatedSocket, data: any): Promise<void> {
    if (!socket.user) return;

    const { programId, updateType, updateData } = data;
    
    if (!programId || !updateType) {
      socket.emit('error', { message: 'Program ID and update type are required' });
      return;
    }

    // Broadcast to relevant users
    await this.connectionManager.sendToRole('admin', 'program_updated', {
      programId,
      updateType,
      updateData,
      updatedBy: socket.user.userId,
      timestamp: new Date()
    });

    if (socket.user.ngoId) {
      await this.connectionManager.sendToNGO(socket.user.ngoId, 'program_updated', {
        programId,
        updateType,
        updateData,
        updatedBy: socket.user.userId,
        timestamp: new Date()
      });
    }
  }

  /**
   * Handle donation status update
   */
  private async handleDonationStatusUpdate(socket: AuthenticatedSocket, data: any): Promise<void> {
    if (!socket.user) return;

    const { donationId, status, amount, donorId } = data;
    
    if (!donationId || !status) {
      socket.emit('error', { message: 'Donation ID and status are required' });
      return;
    }

    // Notify donor
    if (donorId) {
      await this.connectionManager.sendToUser(donorId, 'donation_status_changed', {
        donationId,
        status,
        amount,
        timestamp: new Date()
      });
    }

    // Notify relevant administrators
    await this.connectionManager.sendToRole('admin', 'donation_status_changed', {
      donationId,
      status,
      amount,
      donorId,
      timestamp: new Date()
    });
  }

  /**
   * Handle volunteer application update
   */
  private async handleVolunteerApplicationUpdate(socket: AuthenticatedSocket, data: any): Promise<void> {
    if (!socket.user) return;

    const { applicationId, status, volunteerId } = data;
    
    if (!applicationId || !status) {
      socket.emit('error', { message: 'Application ID and status are required' });
      return;
    }

    // Notify volunteer
    if (volunteerId) {
      await this.connectionManager.sendToUser(volunteerId, 'volunteer_application_updated', {
        applicationId,
        status,
        timestamp: new Date()
      });
    }

    // Notify relevant administrators
    await this.connectionManager.sendToRole('admin', 'volunteer_application_updated', {
      applicationId,
      status,
      volunteerId,
      timestamp: new Date()
    });
  }

  /**
   * Handle emergency alert
   */
  private async handleEmergencyAlert(socket: AuthenticatedSocket, data: any): Promise<void> {
    if (!socket.user) return;

    const { alertType, message, severity, location } = data;
    
    if (!alertType || !message || !severity) {
      socket.emit('error', { message: 'Alert type, message, and severity are required' });
      return;
    }

    const alertData = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      alertType,
      message,
      severity,
      location,
      reportedBy: socket.user.userId,
      timestamp: new Date()
    };

    // Store in Redis
    await this.redis.lpush('emergency_alerts', JSON.stringify(alertData));

    // Broadcast to all admins and relevant users
    await this.connectionManager.sendToRole('admin', 'emergency_alert', alertData);
    await this.connectionManager.sendToRole('super_admin', 'emergency_alert', alertData);
    
    if (socket.user.ngoId) {
      await this.connectionManager.sendToNGO(socket.user.ngoId, 'emergency_alert', alertData);
    }
  }

  /**
   * Check rate limiting
   */
  private async checkRateLimit(
    userId: string,
    event: string,
    rateLimit: { maxRequests: number; windowMs: number }
  ): Promise<boolean> {
    const key = `ratelimit:${userId}:${event}`;
    const window = Math.floor(Date.now() / rateLimit.windowMs);
    const windowKey = `${key}:${window}`;

    const current = await this.redis.get(windowKey);
    const count = current ? parseInt(current) : 0;

    if (count >= rateLimit.maxRequests) {
      return true;
    }

    await this.redis.set(windowKey, (count + 1).toString(), Math.ceil(rateLimit.windowMs / 1000));
    return false;
  }

  /**
   * Get dashboard metrics (placeholder for actual implementation)
   */
  private async getDashboardMetrics(user: any, metricsType: string, filters: any): Promise<any> {
    // This would integrate with your actual dashboard service
    return {
      metricsType,
      data: `Dashboard metrics for ${user.email}`,
      filters
    };
  }

  /**
   * Mark notification as read (placeholder for actual implementation)
   */
  private async markNotificationAsRead(userId: string, notificationId: string): Promise<void> {
    // This would integrate with your actual notification service
    await this.redis.hset(`user_notifications:${userId}`, notificationId, 'read');
  }

  /**
   * Get event metrics
   */
  getMetrics(): EventMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalEvents: 0,
      eventsByType: {},
      errorCount: 0,
      rateLimitHits: 0
    };
  }

  /**
   * Start periodic cleanup of rate limit data
   */
  private startMetricsCleanup(): void {
    setInterval(async () => {
      // Clean up old rate limit data
      const pattern = 'ratelimit:*';
      const keys = await this.redis.keys(pattern);
      
      for (const key of keys) {
        const ttl = await this.redis.ttl(key);
        if (ttl <= 0) {
          await this.redis.del(key);
        }
      }
    }, 60000); // Clean up every minute
  }
}
