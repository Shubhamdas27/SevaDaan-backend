import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import config from '../config/config';
import logger from '../utils/logger';
import { IUser } from '../types';

interface AuthenticatedSocket extends Socket {
  user?: IUser;
}

export class EnhancedSocketService {
  private io: SocketIOServer;
  private connectedUsers: Map<string, string> = new Map(); // userId -> socketId
  private roleRooms: Map<string, Set<string>> = new Map(); // role -> Set of socketIds
  private ngoRooms: Map<string, Set<string>> = new Map(); // ngoId -> Set of socketIds

  constructor(server: Server) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupAuthentication();
    this.setupEventHandlers();
  }

  private setupAuthentication() {
    this.io.use(async (socket: any, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
        
        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, config.jwtSecret) as any;
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user || !user.isActive) {
          return next(new Error('Authentication error: User not found or inactive'));
        }

        socket.user = user;
        next();
      } catch (error) {
        logger.error('Socket authentication error:', error);
        next(new Error('Authentication error: Invalid token'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      if (!socket.user) return;

      const userId = socket.user._id.toString();
      const userRole = socket.user.role;
      const ngoId = socket.user.ngoId?.toString();

      // Track connected user
      this.connectedUsers.set(userId, socket.id);
      
      // Join role-based room
      socket.join(`role:${userRole}`);
      this.addToRoleRoom(userRole, socket.id);

      // Join NGO-specific room if applicable
      if (ngoId) {
        socket.join(`ngo:${ngoId}`);
        this.addToNgoRoom(ngoId, socket.id);
      }

      // Join user-specific room
      socket.join(`user:${userId}`);

      logger.info(`User ${socket.user.name} (${userRole}) connected via socket`);

      // Send initial connection confirmation
      socket.emit('connected', {
        message: 'Connected to SevaDaan real-time service',
        userId,
        role: userRole,
        timestamp: new Date().toISOString()
      });

      // Handle real-time dashboard requests
      socket.on('dashboard:subscribe', () => {
        socket.join(`dashboard:${userRole}`);
        this.sendDashboardUpdate(socket);
      });

      socket.on('dashboard:unsubscribe', () => {
        socket.leave(`dashboard:${userRole}`);
      });

      // Handle notification subscription
      socket.on('notifications:subscribe', () => {
        socket.join(`notifications:${userId}`);
      });

      // Handle activity feed subscription
      socket.on('activity:subscribe', () => {
        socket.join(`activity:${userRole}`);
        if (ngoId) {
          socket.join(`activity:ngo:${ngoId}`);
        }
      });

      // Handle typing indicators for chat/comments
      socket.on('typing:start', (data) => {
        socket.to(data.room).emit('typing:user_started', {
          userId,
          userName: socket.user!.name,
          room: data.room
        });
      });

      socket.on('typing:stop', (data) => {
        socket.to(data.room).emit('typing:user_stopped', {
          userId,
          room: data.room
        });
      });

      // Handle live status updates
      socket.on('status:update', (data) => {
        this.broadcastStatusUpdate(userId, data);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        this.handleDisconnection(userId, socket.id, userRole, ngoId);
      });
    });
  }

  private addToRoleRoom(role: string, socketId: string) {
    if (!this.roleRooms.has(role)) {
      this.roleRooms.set(role, new Set());
    }
    this.roleRooms.get(role)!.add(socketId);
  }

  private addToNgoRoom(ngoId: string, socketId: string) {
    if (!this.ngoRooms.has(ngoId)) {
      this.ngoRooms.set(ngoId, new Set());
    }
    this.ngoRooms.get(ngoId)!.add(socketId);
  }

  private handleDisconnection(userId: string, socketId: string, role: string, ngoId?: string) {
    this.connectedUsers.delete(userId);
    
    // Remove from role room
    if (this.roleRooms.has(role)) {
      this.roleRooms.get(role)!.delete(socketId);
    }

    // Remove from NGO room
    if (ngoId && this.ngoRooms.has(ngoId)) {
      this.ngoRooms.get(ngoId)!.delete(socketId);
    }

    logger.info(`User ${userId} (${role}) disconnected from socket`);
  }

  private sendDashboardUpdate(socket: AuthenticatedSocket) {
    if (!socket.user) return;

    // Send role-specific dashboard data
    const dashboardData = this.generateDashboardData(socket.user.role, socket.user);
    socket.emit('dashboard:update', dashboardData);
  }

  private generateDashboardData(role: string, user: IUser) {
    const baseData = {
      timestamp: new Date().toISOString(),
      role,
      userId: user._id
    };

    switch (role) {
      case 'ngo_admin':
      case 'ngo':
        return {
          ...baseData,
          stats: {
            totalDonations: Math.floor(Math.random() * 100000),
            activeVolunteers: Math.floor(Math.random() * 500),
            ongoingPrograms: Math.floor(Math.random() * 50),
            beneficiariesReached: Math.floor(Math.random() * 10000)
          }
        };
      
      case 'volunteer':
        return {
          ...baseData,
          stats: {
            hoursContributed: Math.floor(Math.random() * 200),
            activitiesCompleted: Math.floor(Math.random() * 50),
            certificatesEarned: Math.floor(Math.random() * 10),
            upcomingTasks: Math.floor(Math.random() * 5)
          }
        };
      
      case 'donor':
        return {
          ...baseData,
          stats: {
            totalDonated: Math.floor(Math.random() * 50000),
            programsSupported: Math.floor(Math.random() * 20),
            impactScore: Math.floor(Math.random() * 100),
            certificatesReceived: Math.floor(Math.random() * 5)
          }
        };
      
      case 'citizen':
        return {
          ...baseData,
          stats: {
            activeApplications: Math.floor(Math.random() * 5),
            servicesReceived: Math.floor(Math.random() * 10),
            upcomingEvents: Math.floor(Math.random() * 3),
            referralsMade: Math.floor(Math.random() * 8)
          }
        };
      
      default:
        return baseData;
    }
  }

  // Public methods for broadcasting events
  public broadcastToRole(role: string, event: string, data: any) {
    this.io.to(`role:${role}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  public broadcastToNGO(ngoId: string, event: string, data: any) {
    this.io.to(`ngo:${ngoId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  public sendToUser(userId: string, event: string, data: any) {
    this.io.to(`user:${userId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  public broadcastDashboardUpdate(role?: string, ngoId?: string) {
    const rooms = [];
    if (role) rooms.push(`dashboard:${role}`);
    if (ngoId) rooms.push(`dashboard:ngo:${ngoId}`);
    
    rooms.forEach(room => {
      this.io.to(room).emit('dashboard:real_time_update', {
        timestamp: new Date().toISOString(),
        room
      });
    });
  }

  public broadcastNotification(userId: string, notification: any) {
    this.io.to(`notifications:${userId}`).emit('notification:new', {
      ...notification,
      timestamp: new Date().toISOString()
    });
  }

  public broadcastActivityUpdate(activity: any, role?: string, ngoId?: string) {
    const rooms = [`activity:${role}`];
    if (ngoId) rooms.push(`activity:ngo:${ngoId}`);
    
    rooms.forEach(room => {
      this.io.to(room).emit('activity:new', {
        ...activity,
        timestamp: new Date().toISOString()
      });
    });
  }

  private broadcastStatusUpdate(userId: string, statusData: any) {
    this.io.emit('user:status_update', {
      userId,
      ...statusData,
      timestamp: new Date().toISOString()
    });
  }

  // Real-time event methods for different modules
  public emitDonationReceived(donationData: any) {
    this.broadcastToRole('ngo_admin', 'donation:received', donationData);
    this.broadcastToRole('ngo', 'donation:received', donationData);
    this.broadcastToRole('ngo_manager', 'donation:received', donationData);
    if (donationData.ngoId) {
      this.broadcastToNGO(donationData.ngoId, 'donation:received', donationData);
    }
  }

  public emitVolunteerApplication(applicationData: any) {
    this.broadcastToRole('ngo_admin', 'volunteer:application', applicationData);
    this.broadcastToRole('ngo', 'volunteer:application', applicationData);
    this.broadcastToRole('ngo_manager', 'volunteer:application', applicationData);
    if (applicationData.ngoId) {
      this.broadcastToNGO(applicationData.ngoId, 'volunteer:application', applicationData);
    }
  }

  public emitEmergencyRequest(emergencyData: any) {
    this.broadcastToRole('ngo_admin', 'emergency:new', emergencyData);
    this.broadcastToRole('ngo', 'emergency:new', emergencyData);
    this.broadcastToRole('volunteer', 'emergency:new', emergencyData);
  }

  public emitServiceApplication(applicationData: any) {
    this.broadcastToRole('ngo_admin', 'service:application', applicationData);
    this.broadcastToRole('ngo', 'service:application', applicationData);
    this.broadcastToRole('ngo_manager', 'service:application', applicationData);
    if (applicationData.ngoId) {
      this.broadcastToNGO(applicationData.ngoId, 'service:application', applicationData);
    }
  }

  public getConnectedUsers(): number {
    return this.connectedUsers.size;
  }

  public getConnectedUsersByRole(role: string): number {
    return this.roleRooms.get(role)?.size || 0;
  }

  public getIO(): SocketIOServer {
    return this.io;
  }
}

// Global socket service instance
let enhancedSocketService: EnhancedSocketService | null = null;

export const initializeEnhancedSocket = (server: Server): EnhancedSocketService => {
  enhancedSocketService = new EnhancedSocketService(server);
  logger.info('Enhanced Socket.IO service initialized');
  return enhancedSocketService;
};

export const getEnhancedSocketService = (): EnhancedSocketService | null => {
  return enhancedSocketService;
};
