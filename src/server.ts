import { createServer } from 'http';
import app, { startApp } from './app';
import config from './config/config';
import logger from './utils/logger';
import { initializeSocket } from './socket/socketServer';

// Basic console fallback in case logger fails
const safeLog = {
  info: (message: string) => {
    console.log(message);
    try {
      logger.info(message);
    } catch (e) {
      console.error('Logger error:', e);
    }
  },
  error: (message: string, error?: any) => {
    console.error(message, error);
    try {
      if (error) {
        logger.error(message, { error });
      } else {
        logger.error(message);
      }
    } catch (e) {
      console.error('Logger error:', e);
    }
  }
};

let server: any;

async function startServer() {
  try {
    // Initialize database connection first
    await startApp();
    
    // Create HTTP server
    const httpServer = createServer(app);
    
    // Initialize Socket.IO
    const socketServer = initializeSocket(httpServer);
    
    // Start the server
    server = httpServer.listen(config.port, () => {
      safeLog.info(`🚀 Server running in ${config.nodeEnv} mode on port ${config.port}`);
      safeLog.info(`📱 Health check available at http://localhost:${config.port}/health`);
      safeLog.info(`⚡ Socket.IO server initialized and ready for real-time connections`);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err: Error) => {
      safeLog.error('Unhandled Rejection:', err);
      // Don't crash the server, just log the error
      // In production, you might want to implement a circuit breaker pattern here
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (err: Error) => {
      safeLog.error('Uncaught Exception:', err);
      // Don't crash the server unless it's a critical error
      // For critical errors, consider a controlled shutdown:
      
      if (err.message.includes('EADDRINUSE') || 
          err.message.includes('FATAL') || 
          err.message.includes('CRITICAL') ||
          err.message.includes('listen EACCES')) {
        
        safeLog.error('Critical error, shutting down the server gracefully');
        if (server) {
          server.close(() => {
            process.exit(1);
          });
          
          // Force shutdown after 10 seconds if graceful shutdown fails
          setTimeout(() => {
            safeLog.error('Forced shutdown after timeout');
            process.exit(1);
          }, 10000);
        } else {
          process.exit(1);
        }
      }
    });
    
  } catch (error) {
    safeLog.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

// For testing purposes, export the server
export default server;
