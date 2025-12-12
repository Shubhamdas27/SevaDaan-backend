// Test auth endpoint to verify login functionality
// Updated to trigger restart
import { Request, Response } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { AuthRequest } from '../middleware/authMiddleware';
import logger from '../utils/logger';

// Simple test endpoint to verify authentication
export const testAuth = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Authentication failed'
      });
      return;
    }

    logger.info(`Auth test successful for user: ${user.email}`);

    res.json({
      success: true,
      message: 'Authentication successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        isEmailVerified: user.isEmailVerified,
        lastLogin: user.lastLogin
      }
    });
  } catch (error: any) {
    logger.error('Auth test error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during auth test',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Test login with detailed response
export const testLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    
    logger.info(`Login test attempt for email: ${email}`);
    
    // Simple validation
    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
      return;
    }

    // Return test response with detailed info
    res.json({
      success: true,
      message: 'Login test endpoint working',
      data: {
        receivedEmail: email,
        passwordProvided: !!password,
        passwordLength: password.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    logger.error('Login test error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login test',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};
