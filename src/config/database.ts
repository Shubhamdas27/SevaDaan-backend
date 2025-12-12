import mongoose from 'mongoose';
import config from './config';
import logger from '../utils/logger';

let cachedConnection: typeof mongoose | null = null;
let connectionRetries = 0;
const MAX_RETRIES = 5;

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
  },
  warn: (message: string) => {
    console.warn(message);
    try {
      logger.warn(message);
    } catch (e) {
      console.error('Logger error:', e);
    }
  }
};

export const connectDB = async (): Promise<typeof mongoose | null> => {
  if (cachedConnection) {
    return cachedConnection;
  }

  try {
    // Set mongoose options
    mongoose.set('strictQuery', false);
    
    // Check for MOCK_DB environment variable
    if (process.env.MOCK_DB === 'true') {
      safeLog.info('🔧 Mock database mode enabled. Skipping MongoDB connection.');
      return mongoose; // Return mongoose instance without connecting
    }
    
    // For development, use a default MongoDB URI if not configured
    const uri = config.mongodbUri || 'mongodb://localhost:27017/sevadaan_dev';
    
    console.log(`Connecting to MongoDB at: ${uri.split('@').length > 1 ? uri.split('@')[1] : 'localhost'}`);    const conn = await mongoose.connect(uri, {
      // Connection options
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 10000, // Keep trying to send operations for 10 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      bufferCommands: true, // Enable mongoose buffering to queue operations
    });

    cachedConnection = conn;
    connectionRetries = 0;

    safeLog.info(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Connection event listeners
    mongoose.connection.on('error', (err) => {
      safeLog.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      safeLog.warn('MongoDB disconnected');
      cachedConnection = null;
    });

    mongoose.connection.on('reconnected', () => {
      safeLog.info('MongoDB reconnected');
    });

    // Handle app termination
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        safeLog.info('MongoDB connection closed due to app termination');
        process.exit(0);
      } catch (err) {
        safeLog.error('Error closing MongoDB connection:', err);
        process.exit(1);
      }
    });

    return conn;
  } catch (error: any) {
    connectionRetries++;
    safeLog.error(`MongoDB connection error (attempt ${connectionRetries}/${MAX_RETRIES}):`, error);
    
    if (connectionRetries < MAX_RETRIES) {
      safeLog.info(`Retrying connection in 5 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      return connectDB();
    } else {
      safeLog.error(`Failed to connect to MongoDB after ${MAX_RETRIES} attempts. Application will continue without database.`);
      // Return null instead of throwing to allow the app to start without DB
      return null;
    }
  }
};

export const disconnectDB = async (): Promise<void> => {
  if (cachedConnection) {
    await mongoose.connection.close();
    cachedConnection = null;
    logger.info('MongoDB connection closed');
  }
};
