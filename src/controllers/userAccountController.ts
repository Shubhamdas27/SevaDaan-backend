import { Request, Response, NextFunction } from 'express';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import User from '../models/User';
import { CustomError } from '../middleware/errorMiddleware';

// Async handler utility function
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
import { AuthRequest } from '../middleware/authMiddleware';
import config from '../config/config';

/**
 * @desc    Get current user profile
 * @route   GET /api/v1/users/me
 * @access  Private
 */
export const getCurrentUser = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  // User should already be available from the auth middleware
  const userId = req.user?.id;
  
  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }
  
  const user = await User.findById(userId).select('-password -refreshToken');
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }
    return res.status(200).json({
    success: true,
    data: user
  });
});

/**
 * @desc    Update user profile
 * @route   PATCH /api/v1/users/update-profile
 * @access  Private
 */
export const updateProfile = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  
  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }
  
  // Fields that can be updated
  const { name, phone, city, state, pincode } = req.body;
  
  // Prepare update object with only valid fields
  const updateData: Record<string, any> = {};
  if (name) updateData.name = name;
  if (phone) updateData.phone = phone;
  if (city) updateData.city = city;
  if (state) updateData.state = state;
  if (pincode) updateData.pincode = pincode;
  
  // Check if user exists and update
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: updateData },
    { new: true, runValidators: true }
  ).select('-password -refreshToken');
  
  if (!updatedUser) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }
    return res.status(200).json({
    success: true,
    data: updatedUser,
    message: 'Profile updated successfully'
  });
});

/**
 * @desc    Change user password
 * @route   PATCH /api/v1/users/change-password
 * @access  Private
 */
export const changePassword = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  
  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }
  
  const { currentPassword, newPassword } = req.body;
  
  // Validate required fields
  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Current password and new password are required'
    });
  }
  
  // Validate password complexity
  if (newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'New password must be at least 6 characters'
    });
  }
  
  // Get user with password
  const user = await User.findById(userId);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }
  
  // Check if current password is correct
  const isMatch = await bcrypt.compare(currentPassword, user.password);
  
  if (!isMatch) {
    return res.status(400).json({
      success: false,
      message: 'Current password is incorrect'
    });
  }
  
  // Hash new password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);
  
  // Update password
  user.password = hashedPassword;
  await user.save();
    return res.status(200).json({
    success: true,
    message: 'Password changed successfully'
  });
});

/**
 * @desc    Upload user avatar
 * @route   POST /api/v1/users/upload-avatar
 * @access  Private
 */
export const uploadAvatar = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  
  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }
  
  // Check if file is uploaded
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'Please upload an image file'
    });
  }
  
  // Get user
  const user = await User.findById(userId);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }
  
  // Delete old avatar if exists
  if (user.avatar) {
    const oldAvatarPath = path.join(config.uploadDir, user.avatar);
    if (fs.existsSync(oldAvatarPath)) {
      fs.unlinkSync(oldAvatarPath);
    }
  }
  
  // Generate unique filename
  const filename = `avatar-${userId}-${uuidv4()}${path.extname(req.file.originalname)}`;
  const uploadPath = path.join(config.uploadDir, filename);
  
  // Move file to uploads directory
  fs.writeFileSync(uploadPath, req.file.buffer);
  
  // Update user avatar
  user.avatar = filename;
  await user.save();
    return res.status(200).json({
    success: true,
    data: {
      avatar: filename,
      avatarUrl: `${config.frontendUrl}/uploads/${filename}`
    },
    message: 'Avatar uploaded successfully'
  });
});
