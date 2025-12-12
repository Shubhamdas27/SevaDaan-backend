import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import { EnhancedSocketServer } from './enhancedSocketServer';
import logger from '../utils/logger';

export class SocketServer {
  private enhancedServer: EnhancedSocketServer;

  constructor(httpServer: HttpServer) {
    this.enhancedServer = new EnhancedSocketServer(httpServer);
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      await this.enhancedServer.initialize();
      logger.info('Socket server initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize socket server:', error);
    }
  }

  getServer(): Server {
    return this.enhancedServer.getServer();
  }

  async shutdown(): Promise<void> {
    await this.enhancedServer.shutdown();
  }

  // Public methods for emitting events from controllers
  public emitToUser(userId: string, event: string, data: any) {
    this.enhancedServer.sendToUser(userId, event, data);
  }

  public emitToRole(role: string, event: string, data: any) {
    this.enhancedServer.broadcastToRole(role, event, data);
  }

  public emitToNGO(ngoId: string, event: string, data: any) {
    this.enhancedServer.broadcastToNGO(ngoId, event, data);
  }

  public emitToAll(event: string, data: any) {
    this.enhancedServer.broadcastToAll(event, data);
  }

  // Get the io instance for direct access if needed
  public getIO(): Server {
    return this.enhancedServer.getServer();
  }
}

let socketServer: SocketServer | null = null;

export const initializeSocket = (httpServer: HttpServer): Server => {
  socketServer = new SocketServer(httpServer);
  return socketServer.getServer();
};

export const getSocketServer = (): SocketServer | null => {
  return socketServer;
};
