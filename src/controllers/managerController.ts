import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import NGO from '../models/NGO';
import { CustomError, asyncHandler } from '../middleware/errorMiddleware';
import { AuthRequest } from '../middleware/authMiddleware';
import logger from '../utils/logger';
import SocketService from '../socket/socketService';

/**
 * @desc    Get all managers for an NGO
 * @route   GET /api/v1/ngo/managers
 * @access  Private (NGO Admin only)
 */
export const getManagers = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  const userRole = req.user?.role;

  if (!userId) {
    return next(new CustomError('Not authenticated', 401));
  }

  // Get user to find NGO ID
  const user = await User.findById(userId);
  if (!user || !user.ngoId) {
    return next(new CustomError('User not associated with any NGO', 400));
  }

  // Only NGO admin or users with appropriate permissions can view managers
  if (userRole !== 'ngo_admin' && !user.permissions?.includes('managers_view')) {
    return next(new CustomError('Not authorized to view managers', 403));
  }

  // Find all managers for the NGO
  const managers = await User.find({
    ngoId: user.ngoId,
    role: 'ngo_manager',
    isActive: true
  }).select('-password -refreshToken').populate('ngoId', 'name');

  res.json({
    success: true,
    count: managers.length,
    data: managers.map(manager => ({
      _id: manager._id,
      userId: {
        _id: manager._id,
        name: manager.name,
        email: manager.email,
        phone: manager.phone
      },
      permissions: manager.permissions || [],
      isActive: manager.isActive,
      joinDate: manager.createdAt
    }))
  });
});

/**
 * @desc    Add a new manager to NGO
 * @route   POST /api/v1/ngo/managers
 * @access  Private (NGO Admin only)
 */
export const addManager = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  const userRole = req.user?.role;
  const { name, email, phone, password, permissions } = req.body;

  if (!userId) {
    return next(new CustomError('Not authenticated', 401));
  }

  // Get user to find NGO ID
  const user = await User.findById(userId);
  if (!user || !user.ngoId) {
    return next(new CustomError('User not associated with any NGO', 400));
  }

  // Only NGO admin can add managers
  if (userRole !== 'ngo_admin') {
    return next(new CustomError('Only NGO admin can add managers', 403));
  }

  // Validation
  if (!name || !email || !password) {
    return next(new CustomError('Please provide name, email, and password', 400));
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new CustomError('User already exists with this email', 400));
  }

  // Create new manager
  const manager = await User.create({
    name,
    email,
    phone,
    password,
    role: 'ngo_manager',
    ngoId: user.ngoId,
    permissions: permissions || [],
    isActive: true,
    isEmailVerified: false,
    isPhoneVerified: false
  });

  logger.info(`New manager added: ${email} for NGO: ${user.ngoId}`);

  // Emit Socket.IO event for real-time updates
  const managerData = {
    _id: manager._id,
    userId: {
      _id: manager._id,
      name: manager.name,
      email: manager.email,
      phone: manager.phone
    },
    permissions: manager.permissions || [],
    isActive: manager.isActive,
    joinDate: manager.createdAt
  };

  // Emit to NGO members using the new socket service method
  SocketService.emitManagerAdded(user.ngoId.toString(), managerData);

  res.status(201).json({
    success: true,
    message: 'Manager added successfully',
    data: managerData
  });
});

/**
 * @desc    Update manager permissions
 * @route   PUT /api/v1/ngo/managers/:managerId
 * @access  Private (NGO Admin only)
 */
export const updateManagerPermissions = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  const userRole = req.user?.role;
  const { managerId } = req.params;
  const { permissions, isActive } = req.body;

  if (!userId) {
    return next(new CustomError('Not authenticated', 401));
  }

  // Get user to find NGO ID
  const user = await User.findById(userId);
  if (!user || !user.ngoId) {
    return next(new CustomError('User not associated with any NGO', 400));
  }

  // Only NGO admin can update manager permissions
  if (userRole !== 'ngo_admin') {
    return next(new CustomError('Only NGO admin can update manager permissions', 403));
  }

  // Find the manager
  const manager = await User.findOne({
    _id: managerId,
    ngoId: user.ngoId,
    role: 'ngo_manager'
  });

  if (!manager) {
    return next(new CustomError('Manager not found', 404));
  }

  // Update manager
  if (permissions !== undefined) {
    manager.permissions = permissions;
  }
  if (isActive !== undefined) {
    manager.isActive = isActive;
  }

  await manager.save();

  logger.info(`Manager permissions updated: ${manager.email} for NGO: ${user.ngoId}`);

  // Emit Socket.IO event for real-time updates
  const updatedManagerData = {
    _id: manager._id,
    userId: {
      _id: manager._id,
      name: manager.name,
      email: manager.email,
      phone: manager.phone
    },
    permissions: manager.permissions,
    isActive: manager.isActive
  };

  // Emit to NGO members using the new socket service method
  SocketService.emitManagerUpdated(user.ngoId.toString(), updatedManagerData);

  res.json({
    success: true,
    message: 'Manager permissions updated successfully',
    data: {
      _id: manager._id,
      permissions: manager.permissions,
      isActive: manager.isActive
    }
  });
});

/**
 * @desc    Delete/Deactivate manager
 * @route   DELETE /api/v1/ngo/managers/:managerId
 * @access  Private (NGO Admin only)
 */
export const deleteManager = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  const userRole = req.user?.role;
  const { managerId } = req.params;

  if (!userId) {
    return next(new CustomError('Not authenticated', 401));
  }

  // Get user to find NGO ID
  const user = await User.findById(userId);
  if (!user || !user.ngoId) {
    return next(new CustomError('User not associated with any NGO', 400));
  }

  // Only NGO admin can delete managers
  if (userRole !== 'ngo_admin') {
    return next(new CustomError('Only NGO admin can delete managers', 403));
  }

  // Find the manager
  const manager = await User.findOne({
    _id: managerId,
    ngoId: user.ngoId,
    role: 'ngo_manager'
  });

  if (!manager) {
    return next(new CustomError('Manager not found', 404));
  }

  // Deactivate instead of deleting
  manager.isActive = false;
  await manager.save();

  logger.info(`Manager deactivated: ${manager.email} for NGO: ${user.ngoId}`);

  // Emit Socket.IO event for real-time updates using the new socket service method
  SocketService.emitManagerDeleted(user.ngoId.toString(), {
    managerId: manager._id.toString(),
    email: manager.email
  });

  res.json({
    success: true,
    message: 'Manager removed successfully'
  });
});
