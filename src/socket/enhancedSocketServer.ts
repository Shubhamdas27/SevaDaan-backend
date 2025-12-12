import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import { socketAuthMiddleware, AuthenticatedSocket } from './socketAuth';
import { ConnectionManager } from './connectionManager';
import { RoomManager } from './roomManager';
import { EventRouter } from './eventRouter';
import { RateLimiter } from './rateLimiter';
import { RedisService } from '../services/redisService';
import logger from '../utils/logger';
import config from '../config/config';

export class EnhancedSocketServer {
  private io: Server;
  private redis: RedisService;
  private connectionManager: ConnectionManager;
  private roomManager: RoomManager;
  private eventRouter: EventRouter;
  private rateLimiter: RateLimiter;
  private isInitialized = false;

  constructor(httpServer: HttpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: config.allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.redis = new RedisService();
    this.connectionManager = new ConnectionManager(this.io, this.redis);
    this.roomManager = new RoomManager(this.io, this.redis);
    this.eventRouter = new EventRouter(this.io, this.connectionManager, this.roomManager, this.redis);
    this.rateLimiter = new RateLimiter(this.redis, 'socket_ratelimit');

    this.setupMiddleware();
    this.setupEventHandlers();
    this.startPeriodicTasks();
  }

  /**
   * Initialize the socket server
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('Socket server already initialized');
      return;
    }

    try {
      // Try to initialize Redis connection, but don't fail if it's not available
      try {
        await this.redis.connect();
        logger.info('Redis connected successfully for Socket.IO');
        
        // Load rooms from Redis only if Redis is available
        await this.roomManager.loadRoomsFromRedis();
      } catch (redisError) {
        logger.warn('Redis not available for Socket.IO, running without Redis cache:', redisError);
        // Continue without Redis - socket will work but without persistence
      }
      
      // Start connection manager cleanup
      this.connectionManager.startCleanupTimer();
      
      this.isInitialized = true;
      logger.info('Enhanced Socket.IO server initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize socket server:', error);
      throw error;
    }
  }

  /**
   * Setup middleware
   */
  private setupMiddleware(): void {
    // Authentication middleware
    this.io.use(socketAuthMiddleware);

    // Rate limiting middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      if (!socket.user) {
        return next();
      }

      const rateLimitResult = await this.rateLimiter.checkLimit(
        socket.user.userId,
        {
          maxRequests: 100, // 100 connections per minute
          windowMs: 60000
        }
      );

      if (!rateLimitResult.allowed) {
        logger.warn(`Rate limit exceeded for user: ${socket.user.email}`);
        return next(new Error('Rate limit exceeded'));
      }

      next();
    });

    // Connection logging middleware
    this.io.use((socket: AuthenticatedSocket, next) => {
      logger.info(`New socket connection attempt: ${socket.id}`);
      next();
    });
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.io.on('connection', async (socket: AuthenticatedSocket) => {
      try {
        if (!socket.user) {
          logger.warn('Unauthenticated socket connected');
          socket.disconnect();
          return;
        }

        logger.info(`User connected: ${socket.user.email} (${socket.user.role}) - Socket: ${socket.id}`);

        // Add connection to manager
        await this.connectionManager.addConnection(socket);

        // Join user to default rooms
        await this.roomManager.joinUserToDefaultRooms(socket);

        // Setup event listeners
        this.setupSocketEvents(socket);

        // Send welcome message
        socket.emit('connected', {
          userId: socket.user.userId,
          connectedAt: new Date(),
          rooms: this.roomManager.getUserRooms(socket.user.userId)
        });

        // Handle disconnection
        socket.on('disconnect', async (reason) => {
          logger.info(`User disconnected: ${socket.user?.email} - Reason: ${reason}`);
          
          if (socket.user) {
            await this.connectionManager.removeConnection(socket.id);
            await this.roomManager.removeUserFromAllRooms(socket.user.userId);
          }
        });

      } catch (error) {
        logger.error('Error handling socket connection:', error);
        socket.disconnect();
      }
    });
  }

  /**
   * Setup individual socket event listeners
   */
  private setupSocketEvents(socket: AuthenticatedSocket): void {
    // Heartbeat/ping handling
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date() });
    });

    // Route all other events through the event router
    const eventNames = [
      'user_status_change',
      'join_room',
      'leave_room',
      'send_message',
      'dashboard_metrics_request',
      'mark_notification_read',
      'program_update',
      'donation_status_update',
      'volunteer_application_update',
      'emergency_alert'
    ];

    eventNames.forEach(eventName => {
      socket.on(eventName, async (data: any) => {
        await this.eventRouter.handleEvent(socket, eventName, data);
      });
    });

    // Error handling
    socket.on('error', (error) => {
      logger.error(`Socket error for user ${socket.user?.email}:`, error);
    });
  }

  /**
   * Start periodic tasks
   */
  private startPeriodicTasks(): void {
    // Cleanup rate limit data every 5 minutes
    setInterval(async () => {
      try {
        await this.rateLimiter.cleanup();
      } catch (error) {
        logger.error('Rate limiter cleanup failed:', error);
      }
    }, 5 * 60 * 1000);

    // Log server statistics every 10 minutes
    setInterval(() => {
      this.logServerStats();
    }, 10 * 60 * 1000);

    // Health check ping to Redis every minute
    setInterval(async () => {
      try {
        await this.redis.ping();
      } catch (error) {
        logger.error('Redis health check failed:', error);
      }
    }, 60 * 1000);
  }

  /**
   * Log server statistics
   */
  private logServerStats(): void {
    const connectionStats = this.connectionManager.getConnectionStats();
    const roomStats = this.roomManager.getRoomStats();
    const eventMetrics = this.eventRouter.getMetrics();

    logger.info('Socket Server Statistics:', {
      connections: connectionStats,
      rooms: roomStats,
      events: eventMetrics,
      timestamp: new Date()
    });
  }

  /**
   * Broadcast to all connected clients
   */
  async broadcastToAll(event: string, data: any): Promise<void> {
    this.io.emit(event, data);
  }

  /**
   * Broadcast to specific role
   */
  async broadcastToRole(role: string, event: string, data: any): Promise<void> {
    await this.connectionManager.sendToRole(role, event, data);
  }

  /**
   * Broadcast to specific NGO
   */
  async broadcastToNGO(ngoId: string, event: string, data: any): Promise<void> {
    await this.connectionManager.sendToNGO(ngoId, event, data);
  }

  /**
   * Send to specific user
   */
  async sendToUser(userId: string, event: string, data: any): Promise<void> {
    await this.connectionManager.sendToUser(userId, event, data);
  }

  /**
   * Get server status
   */
  getServerStatus(): {
    initialized: boolean;
    connections: number;
    rooms: number;
    uptime: number;
    redisConnected: boolean;
  } {
    return {
      initialized: this.isInitialized,
      connections: this.connectionManager.getConnectionStats().totalConnections,
      rooms: this.roomManager.getRoomStats().totalRooms,
      uptime: process.uptime(),
      redisConnected: true // Would need to implement actual Redis connection check
    };
  }

  /**
   * Shutdown the server gracefully
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down Socket.IO server...');
    
    try {
      // Disconnect all clients
      this.io.disconnectSockets();
      
      // Close Redis connections
      await this.redis.disconnect();
      
      // Close Socket.IO server
      this.io.close();
      
      logger.info('Socket.IO server shut down successfully');
    } catch (error) {
      logger.error('Error during socket server shutdown:', error);
    }
  }

  /**
   * Get the Socket.IO server instance
   */
  getServer(): Server {
    return this.io;
  }
}

// Factory function to create and initialize the enhanced socket server
export async function createEnhancedSocketServer(httpServer: HttpServer): Promise<EnhancedSocketServer> {
  const socketServer = new EnhancedSocketServer(httpServer);
  await socketServer.initialize();
  return socketServer;
}

// Export the existing function for backward compatibility
export function initializeSocket(httpServer: HttpServer): Server {
  const socketServer = new EnhancedSocketServer(httpServer);
  
  // Initialize asynchronously without blocking
  socketServer.initialize().catch(error => {
    logger.error('Failed to initialize enhanced socket server:', error);
  });
  
  return socketServer.getServer();
}
