import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import { CustomError } from './errorMiddleware';
import config from '../config/config';
import { IUser } from '../types';

export interface AuthRequest extends Request {
  user?: IUser;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    let token: string | undefined;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new CustomError('Access denied. No token provided.', 401));
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, config.jwtSecret) as any;
      
      // Get user from database
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return next(new CustomError('Token is valid but user not found', 401));
      }

      if (!user.isActive) {
        return next(new CustomError('User account is deactivated', 401));
      }

      // Add user to request object
      req.user = user;
      next();
    } catch (jwtError) {
      return next(new CustomError('Invalid token', 401));
    }
  } catch (error) {
    next(error);
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new CustomError('Access denied. User not authenticated.', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new CustomError(`Access denied. Required roles: ${roles.join(', ')}`, 403));
    }

    next();
  };
};

export const optionalAuthenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    let token: string | undefined;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        // Verify token
        const decoded = jwt.verify(token, config.jwtSecret) as any;
        
        // Get user from database
        const user = await User.findById(decoded.id).select('-password');
        if (user && user.isActive) {
          req.user = user;
        }
      } catch (jwtError) {
        // Token is invalid, but we continue without user
        // This allows public access while still identifying authenticated users
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    let token: string | undefined;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // If no token, continue without authentication
    if (!token) {
      return next();
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, config.jwtSecret) as any;
      
      // Get user from database
      const user = await User.findById(decoded.id).select('-password');
      if (user && user.isActive) {
        // Add user to request object
        req.user = user;
      }
      // Continue regardless of token validity
      next();
    } catch (jwtError) {
      // If token is invalid, continue without authentication
      next();
    }
  } catch (error) {
    next(error);
  }
};

export const checkNGOOwnership = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new CustomError('Access denied. User not authenticated.', 401));
    }

    const ngoId = req.params.id || req.params.ngoId || req.body.ngoId;
    
    if (!ngoId) {
      return next(new CustomError('NGO ID is required', 400));
    }

    // Super admin can access any NGO
    if (req.user.role === 'ngo') {
      return next();
    }

    // NGO admin can only access their own NGO
    if (req.user.role === 'ngo_admin' && req.user.ngoId?.toString() === ngoId) {
      return next();
    }

    // NGO manager can only access their NGO
    if (req.user.role === 'ngo_manager' && req.user.ngoId?.toString() === ngoId) {
      return next();
    }

    return next(new CustomError('Access denied. You can only access your own NGO data.', 403));
  } catch (error) {
    next(error);
  }
};

export const checkPermission = (permission: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new CustomError('Access denied. User not authenticated.', 401));
    }

    // Super admin has all permissions
    if (req.user.role === 'ngo') {
      return next();
    }

    // Check if user has the required permission
    if (!req.user.permissions || !req.user.permissions.includes(permission)) {
      return next(new CustomError(`Access denied. Required permission: ${permission}`, 403));
    }

    next();
  };
};

export const refreshTokenMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return next(new CustomError('Refresh token is required', 400));
    }

    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, config.jwtRefreshSecret) as any;
      
      // Get user from database
      const user = await User.findById(decoded.id);
      if (!user || user.refreshToken !== refreshToken) {
        return next(new CustomError('Invalid refresh token', 401));
      }

      if (!user.isActive) {
        return next(new CustomError('User account is deactivated', 401));
      }

      // Generate new tokens
      const newToken = user.generateAuthToken();
      const newRefreshToken = user.generateRefreshToken();

      // Update refresh token in database
      user.refreshToken = newRefreshToken;
      await user.save();

      res.json({
        success: true,
        data: {
          token: newToken,
          refreshToken: newRefreshToken,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar
          }
        }
      });
    } catch (jwtError) {
      return next(new CustomError('Invalid refresh token', 401));
    }
  } catch (error) {
    next(error);
  }
};
