import jwt from 'jsonwebtoken';
import { Socket } from 'socket.io';
import config from '../config/config';
import logger from '../utils/logger';
import User from '../models/User';

export interface AuthenticatedSocket extends Socket {
  user?: {
    userId: string;
    email: string;
    role: string;
    ngoId?: string;
  };
}

export const socketAuthMiddleware = async (socket: AuthenticatedSocket, next: any) => {
  try {
    const token = socket.handshake?.auth?.token;
    
    if (!token) {
      logger.warn('Socket connection attempted without token');
      return next(new Error('Authentication token required'));
    }

    // Verify JWT token
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    
    // Get user details from database
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      logger.warn(`Socket auth failed: User not found for ID ${decoded.userId}`);
      return next(new Error('User not found'));
    }

    // Attach user info to socket
    socket.user = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      ngoId: user.ngoId?.toString()
    };

    logger.info(`Socket authenticated: ${user.email} (${user.role})`);
    next();
  } catch (error) {
    logger.error('Socket authentication error:', error);
    next(new Error('Invalid authentication token'));
  }
};
