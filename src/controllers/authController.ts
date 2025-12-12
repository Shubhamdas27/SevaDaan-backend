import { Request, Response, NextFunction } from 'express';
import _bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import _NGO from '../models/NGO';
import { CustomError, asyncHandler } from '../middleware/errorMiddleware';
import { AuthRequest } from '../middleware/authMiddleware';
import config from '../config/config';
import { sendEmail } from '../services/emailService';
import logger from '../utils/logger';

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
export const register = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { name, email, password, role, phone } = req.body;

  // Validation
  if (!name || !email || !password || !role) {
    return next(new CustomError('Please provide name, email, password, and role', 400));
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new CustomError('User already exists with this email', 400));
  }

  // Create user
  const user = await User.create({
    name,
    email,
    password,
    role,
    phone
  });

  // Generate tokens
  const token = user.generateAuthToken();
  const refreshToken = user.generateRefreshToken();

  // Save refresh token
  user.refreshToken = refreshToken;
  await user.save();

  logger.info(`New user registered: ${email} with role: ${role}`);

  res.status(201).json({
    success: true,
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified
      },
      token,
      refreshToken
    }
  });
});

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
export const login = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  // Validation
  if (!email || !password) {
    return next(new CustomError('Please provide email and password', 400));
  }

  // Check for user and include password
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    return next(new CustomError('Invalid credentials', 401));
  }

  // Check if user is active
  if (!user.isActive) {
    return next(new CustomError('Account is deactivated. Please contact support.', 401));
  }

  // Check password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return next(new CustomError('Invalid credentials', 401));
  }

  // Update last login
  user.lastLogin = new Date();

  // Generate tokens
  const token = user.generateAuthToken();
  const refreshToken = user.generateRefreshToken();

  // Save refresh token
  user.refreshToken = refreshToken;
  await user.save();

  logger.info(`User logged in: ${email}`);

  res.json({
    success: true,
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        ngoId: user.ngoId,
        permissions: user.permissions
      },
      token,
      refreshToken
    }
  });
});

// @desc    Get current user
// @route   GET /api/v1/auth/me
// @access  Private
export const getMe = asyncHandler(async (req: AuthRequest, res: Response) => {
  let user: any = req.user;

  // If user has NGO, populate NGO details
  if (user?.ngoId) {
    user = await User.findById(user._id).populate('ngoId', 'name logo isVerified status');
  }

  res.json({
    success: true,
    data: { user }
  });
});

// @desc    Update user profile
// @route   PUT /api/v1/auth/profile
// @access  Private
export const updateProfile = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { name, phone, avatar } = req.body;
  const userId = req.user?._id;

  if (!userId) {
    return next(new CustomError('User not found', 404));
  }

  const updateData: any = {};
  if (name) updateData.name = name;
  if (phone) updateData.phone = phone;
  if (avatar) updateData.avatar = avatar;

  const user = await User.findByIdAndUpdate(userId, updateData, {
    new: true,
    runValidators: true
  });

  res.json({
    success: true,
    data: { user }
  });
});

// @desc    Change password
// @route   PUT /api/v1/auth/change-password
// @access  Private
export const changePassword = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user?._id;

  if (!currentPassword || !newPassword) {
    return next(new CustomError('Please provide current password and new password', 400));
  }

  if (newPassword.length < 6) {
    return next(new CustomError('New password must be at least 6 characters', 400));
  }

  // Get user with password
  const user = await User.findById(userId).select('+password');
  if (!user) {
    return next(new CustomError('User not found', 404));
  }

  // Check current password
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return next(new CustomError('Current password is incorrect', 400));
  }

  // Update password
  user.password = newPassword;
  await user.save();

  logger.info(`Password changed for user: ${user.email}`);

  res.json({
    success: true,
    message: 'Password updated successfully'
  });
});

// @desc    Forgot password
// @route   POST /api/v1/auth/forgot-password
// @access  Public
export const forgotPassword = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { email } = req.body;

  if (!email) {
    return next(new CustomError('Please provide email address', 400));
  }

  const user = await User.findOne({ email });
  if (!user) {
    return next(new CustomError('No user found with this email address', 404));
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  // Set reset token and expiry
  user.passwordResetToken = hashedResetToken;
  user.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
  await user.save();

  // Create reset URL
  const resetUrl = `${config.frontendUrl}/reset-password?token=${resetToken}`;

  // Send email
  const message = `
    <h2>Password Reset Request</h2>
    <p>Hi ${user.name},</p>
    <p>You requested a password reset for your SevaDaan account.</p>
    <p>Click the link below to reset your password:</p>
    <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
    <p>This link will expire in 30 minutes.</p>
    <p>If you didn't request this, please ignore this email.</p>
    <p>Best regards,<br>SevaDaan Team</p>
  `;

  try {
    await sendEmail({
      to: user.email,
      subject: 'Password Reset Request - SevaDaan',
      html: message
    });

    logger.info(`Password reset email sent to: ${user.email}`);

    res.json({
      success: true,
      message: 'Password reset email sent'
    });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    logger.error('Error sending password reset email:', error);
    return next(new CustomError('Email could not be sent', 500));
  }
});

// @desc    Reset password
// @route   PUT /api/v1/auth/reset-password
// @access  Public
export const resetPassword = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return next(new CustomError('Please provide token and new password', 400));
  }

  if (password.length < 6) {
    return next(new CustomError('Password must be at least 6 characters', 400));
  }

  // Hash token and find user
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  if (!user) {
    return next(new CustomError('Invalid or expired reset token', 400));
  }

  // Set new password
  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  logger.info(`Password reset successful for user: ${user.email}`);

  res.json({
    success: true,
    message: 'Password reset successful'
  });
});

// @desc    Refresh token
// @route   POST /api/v1/auth/refresh-token
// @access  Public
export const refreshToken = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { refreshToken } = req.body;

  logger.info(`Refresh token request received. Token provided: ${!!refreshToken}`);

  if (!refreshToken) {
    logger.warn('Refresh token request failed: No token provided');
    return next(new CustomError('Refresh token is required', 400));
  }

  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, config.jwtRefreshSecret) as any;
    logger.info(`Refresh token decoded successfully for user: ${decoded.id}`);
    
    // Get user from database
    const user = await User.findById(decoded.id);
    if (!user) {
      logger.warn(`Refresh token validation failed: User not found for ID: ${decoded.id}`);
      return next(new CustomError('Invalid refresh token', 401));
    }

    if (user.refreshToken !== refreshToken) {
      logger.warn(`Refresh token validation failed: Token mismatch for user: ${user.email}`);
      return next(new CustomError('Invalid refresh token', 401));
    }

    if (!user.isActive) {
      logger.warn(`Refresh token failed: User account deactivated: ${user.email}`);
      return next(new CustomError('User account is deactivated', 401));
    }

    // Generate new tokens
    const newToken = user.generateAuthToken();
    const newRefreshToken = user.generateRefreshToken();

    // Update refresh token in database
    user.refreshToken = newRefreshToken;
    await user.save();

    logger.info(`Tokens refreshed successfully for user: ${user.email}`);

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
          avatar: user.avatar,
          ngoId: user.ngoId,
          permissions: user.permissions
        }
      }
    });
  } catch (jwtError: any) {
    logger.warn(`Refresh token JWT verification failed: ${jwtError.message}`);
    return next(new CustomError('Invalid refresh token', 401));
  }
});

// @desc    Logout user
// @route   POST /api/v1/auth/logout
// @access  Private
export const logout = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user;

  if (user) {
    // Clear refresh token
    user.refreshToken = undefined;
    const userDoc = await User.findById(user._id);
    if (userDoc) {
      userDoc.refreshToken = undefined;
      await userDoc.save();
    }

    logger.info(`User logged out: ${user.email}`);
  }

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});
