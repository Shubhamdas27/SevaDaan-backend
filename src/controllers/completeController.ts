import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { CustomError, asyncHandler } from '../middleware/errorMiddleware';
import User from '../models/User';
import NGO from '../models/NGO';
import Program from '../models/Program';
import Donation from '../models/Donation';
import Volunteer, { IVolunteer } from '../models/Volunteer';
import Certificate from '../models/Certificate';
import ServiceApplication from '../models/ServiceApplication';
import EmergencyRequest from '../models/EmergencyRequest';
import { getEnhancedSocketService } from '../socket/enhancedSocketService';
import logger from '../utils/logger';

// ==================== COMPLETE NGO MANAGEMENT ====================

/**
 * @desc    Get NGO profile with complete details
 * @route   GET /api/v1/admin/profile
 * @access  Private (NGO Admin/NGO)
 */
export const getNGOProfile = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const user = await User.findById(req.user?.id);
  if (!user || !user.ngoId) {
    return next(new CustomError('User not associated with any NGO', 400));
  }

  const ngo = await NGO.findById(user.ngoId)
    .populate('programs')
    .populate('volunteers')
    .populate('donations');

  if (!ngo) {
    return next(new CustomError('NGO not found', 404));
  }

  // Calculate basic NGO statistics
  const stats = {
    totalPrograms: await Program.countDocuments({ ngoId: ngo._id }),
    activePrograms: await Program.countDocuments({ ngoId: ngo._id, status: 'active' }),
    totalVolunteers: await Volunteer.countDocuments({ ngoId: ngo._id }),
    activeVolunteers: await Volunteer.countDocuments({ ngoId: ngo._id, status: 'active' }),
    totalDonations: await Donation.aggregate([
      { $match: { ngoId: ngo._id } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    totalBeneficiaries: await Program.aggregate([
      { $match: { ngoId: ngo._id } },
      { $group: { _id: null, total: { $sum: '$beneficiariesReached' } } }
    ])
  };

  const response = {
    profile: ngo,
    statistics: stats
  };

  res.status(200).json({
    success: true,
    data: response
  });
});

/**
 * @desc    Get comprehensive dashboard stats for NGO
 * @route   GET /api/v1/ngo/dashboard/stats
 * @access  Private (NGO)
 */
export const getNGODashboardStats = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const user = await User.findById(req.user?.id);
  if (!user || !user.ngoId) {
    return next(new CustomError('User not associated with any NGO', 400));
  }

  const ngoId = user.ngoId;

  // Get current date ranges
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  try {
    // Parallel execution of all statistics queries
    const [
      totalPrograms,
      activePrograms,
      totalVolunteers,
      activeVolunteers,
      totalDonationsResult,
      monthlyDonationsResult,
      totalBeneficiaries,
      upcomingEvents,
      pendingApplications,
      certificatesIssued
    ] = await Promise.all([
      Program.countDocuments({ ngoId }),
      Program.countDocuments({ ngoId, status: 'active' }),
      Volunteer.countDocuments({ ngoId }),
      Volunteer.countDocuments({ ngoId, status: 'active' }),
      Donation.aggregate([
        { $match: { ngoId } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Donation.aggregate([
        { $match: { ngoId, createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Program.aggregate([
        { $match: { ngoId } },
        { $group: { _id: null, total: { $sum: '$beneficiariesReached' } } }
      ]),
      // Count upcoming events (assuming you have an Event model)
      Program.countDocuments({ 
        ngoId, 
        status: 'planned',
        startDate: { $gte: now, $lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) }
      }),
      ServiceApplication.countDocuments({ ngoId, status: 'pending' }),
      Certificate.countDocuments({ 
        issuedBy: ngoId,
        createdAt: { $gte: startOfYear }
      })
    ]);

    const totalDonations = totalDonationsResult[0]?.total || 0;
    const monthlyDonations = monthlyDonationsResult[0]?.total || 0;
    const beneficiariesReached = totalBeneficiaries[0]?.total || 0;

    const stats = {
      totalPrograms,
      activePrograms,
      totalVolunteers,
      activeVolunteers,
      totalDonations,
      monthlyDonations,
      totalBeneficiaries: beneficiariesReached,
      upcomingEvents,
      pendingApplications,
      certificatesIssued
    };

    // Emit real-time update
    const socketService = getEnhancedSocketService();
    if (socketService) {
      socketService.broadcastToNGO(ngoId.toString(), 'dashboard-update', {
        type: 'stats',
        stats
      });
    }

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error fetching NGO dashboard stats:', error);
    return next(new CustomError('Failed to fetch dashboard statistics', 500));
  }
});

/**
 * @desc    Get recent activities for NGO dashboard
 * @route   GET /api/v1/ngo/dashboard/activities
 * @access  Private (NGO)
 */
export const getNGODashboardActivities = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const user = await User.findById(req.user?.id);
  if (!user || !user.ngoId) {
    return next(new CustomError('User not associated with any NGO', 400));
  }

  const ngoId = user.ngoId;

  try {
    // Get recent donations
    const recentDonations = await Donation.find({ ngoId })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('program', 'title')
      .select('amount donorName createdAt program message');

    // Get recent volunteer registrations
    const recentVolunteers = await Volunteer.find({ ngoId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'name')
      .select('user skills createdAt');

    // Get recent program applications
    const recentApplications = await ServiceApplication.find({ ngoId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('applicant', 'name')
      .select('applicant serviceType status createdAt');

    // Format activities
    const activities: any[] = [];

    // Add donations
    recentDonations.forEach(donation => {
      activities.push({
        id: donation._id,
        type: 'donation',
        title: 'New Donation Received',
        description: `${donation.amount} donated by ${donation.donorName} for ${donation.program}`,
        amount: donation.amount,
        timestamp: donation.createdAt,
        user: { name: donation.donorName }
      });
    });

    // Add volunteer registrations
    recentVolunteers.forEach(volunteer => {
      activities.push({
        id: volunteer._id,
        type: 'volunteer_join',
        title: 'New Volunteer Joined',
        description: `${volunteer.user} registered as a volunteer`,
        timestamp: volunteer.createdAt,
        user: volunteer.user
      });
    });

    // Add applications
    recentApplications.forEach(application => {
      activities.push({
        id: application._id,
        type: 'application',
        title: 'New Service Application',
        description: `${application.userId} applied for ${application.serviceType}`,
        timestamp: application.createdAt,
        user: application.userId
      });
    });

    // Sort by timestamp
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.status(200).json({
      success: true,
      data: activities.slice(0, 10)
    });
  } catch (error) {
    logger.error('Error fetching NGO dashboard activities:', error);
    return next(new CustomError('Failed to fetch dashboard activities', 500));
  }
});

/**
 * @desc    Get upcoming events for NGO
 * @route   GET /api/v1/ngo/events/upcoming
 * @access  Private (NGO)
 */
export const getUpcomingEvents = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const user = await User.findById(req.user?.id);
  if (!user || !user.ngoId) {
    return next(new CustomError('User not associated with any NGO', 400));
  }

  const ngoId = user.ngoId;
  const limit = parseInt(req.query.limit as string) || 10;

  try {
    const upcomingEvents = await Program.find({
      ngoId,
      status: { $in: ['planned', 'active'] },
      startDate: { $gte: new Date() }
    })
    .sort({ startDate: 1 })
    .limit(limit)
    .select('title description startDate endDate location volunteersNeeded volunteersRegistered');

    const events = upcomingEvents.map(program => ({
      id: program._id,
      title: program.title,
      description: program.description,
      date: program.startDate,
      location: program.location || 'TBD',
      attendeesExpected: program.volunteersNeeded || 0,
      attendeesRegistered: program.volunteersRegistered || 0,
      type: 'program'
    }));

    res.status(200).json({
      success: true,
      data: events
    });
  } catch (error) {
    logger.error('Error fetching upcoming events:', error);
    return next(new CustomError('Failed to fetch upcoming events', 500));
  }
});

/**
 * @desc    Update NGO profile
 * @route   PUT /api/v1/admin/profile
 * @access  Private (NGO Admin/NGO)
 */
export const updateNGOProfile = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const user = await User.findById(req.user?.id);
  if (!user || !user.ngoId) {
    return next(new CustomError('User not associated with any NGO', 400));
  }

  const ngo = await NGO.findByIdAndUpdate(
    user.ngoId,
    { ...req.body, updatedAt: new Date() },
    { new: true, runValidators: true }
  );

  if (!ngo) {
    return next(new CustomError('NGO not found', 404));
  }

  // Emit real-time update
  const socketService = getEnhancedSocketService();
  if (socketService) {
    socketService.broadcastToNGO(ngo._id.toString(), 'ngo:profile_updated', {
      ngoId: ngo._id,
      updates: req.body,
      updatedBy: req.user?.name
    });
  }

  logger.info(`NGO profile updated: ${ngo.name} by ${req.user?.name}`);

  res.json({
    success: true,
    message: 'NGO profile updated successfully',
    data: ngo
  });
});

// ==================== COMPLETE USER MANAGEMENT ====================

/**
 * @desc    Get all users with filtering and pagination
 * @route   GET /api/v1/admin/users
 * @access  Private (NGO Admin/NGO)
 */
export const getAllUsers = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;
  
  // Build filter query
  const filter: any = {};
  
  if (req.query.role) {
    filter.role = req.query.role;
  }
  
  if (req.query.isActive !== undefined) {
    filter.isActive = req.query.isActive === 'true';
  }
  
  if (req.query.search) {
    filter.$or = [
      { name: { $regex: req.query.search, $options: 'i' } },
      { email: { $regex: req.query.search, $options: 'i' } }
    ];
  }

  // For NGO users, only show users from their NGO
  const currentUser = await User.findById(req.user?.id);
  if (currentUser?.role === 'ngo' && currentUser.ngoId) {
    filter.ngoId = currentUser.ngoId;
  }

  const total = await User.countDocuments(filter);
  const users = await User.find(filter)
    .select('-password -refreshToken')
    .populate('ngoId', 'name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalUsers: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    }
  });
});

/**
 * @desc    Get user by ID with complete details
 * @route   GET /api/v1/admin/users/:id
 * @access  Private (NGO Admin/NGO)
 */
export const getUserById = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const user = await User.findById(req.params.id)
    .select('-password -refreshToken')
    .populate('ngoId', 'name');

  if (!user) {
    return next(new CustomError('User not found', 404));
  }

  // Get user-specific data based on role
  let additionalData = {};
  
  switch (user.role) {
    case 'volunteer':
      additionalData = {
        volunteerProfile: await Volunteer.findOne({ userId: user._id }),
        totalHours: await Volunteer.aggregate([
          { $match: { userId: user._id } },
          { $group: { _id: null, hours: { $sum: '$hoursContributed' } } }
        ])
      };
      break;
    
    case 'donor':
      additionalData = {
        totalDonations: await Donation.aggregate([
          { $match: { donorId: user._id } },
          { $group: { _id: null, amount: { $sum: '$amount' }, count: { $sum: 1 } } }
        ])
      };
      break;
    
    case 'citizen':
      additionalData = {
        applications: await ServiceApplication.countDocuments({ citizenId: user._id }),
        emergencyRequests: await EmergencyRequest.countDocuments({ citizenId: user._id })
      };
      break;
  }

  res.json({
    success: true,
    data: {
      user,
      ...additionalData
    }
  });
});

/**
 * @desc    Update user
 * @route   PUT /api/v1/admin/users/:id
 * @access  Private (NGO Admin/NGO)
 */
export const updateUser = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { name, email, role, isActive, permissions } = req.body;

  const user = await User.findById(req.params.id);
  if (!user) {
    return next(new CustomError('User not found', 404));
  }

  // Update user fields
  if (name) user.name = name;
  if (email) user.email = email;
  if (role) user.role = role;
  if (isActive !== undefined) user.isActive = isActive;
  if (permissions) user.permissions = permissions;

  await user.save();

  // Emit real-time update
  const socketService = getEnhancedSocketService();
  if (socketService) {
    socketService.sendToUser(user._id.toString(), 'user:profile_updated', {
      updates: req.body,
      updatedBy: req.user?.name
    });
    
    socketService.broadcastToRole('ngo_admin', 'user:updated', {
      userId: user._id,
      updates: req.body,
      updatedBy: req.user?.id
    });
  }

  logger.info(`User updated: ${user.email} by ${req.user?.name}`);

  res.json({
    success: true,
    message: 'User updated successfully',
    data: user
  });
});

/**
 * @desc    Delete user (soft delete)
 * @route   DELETE /api/v1/admin/users/:id
 * @access  Private (NGO Admin only)
 */
export const deleteUser = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return next(new CustomError('User not found', 404));
  }

  // Soft delete - deactivate user
  user.isActive = false;
  await user.save();

  // Emit real-time update
  const socketService = getEnhancedSocketService();
  if (socketService) {
    socketService.broadcastToRole('ngo_admin', 'user:deleted', {
      userId: user._id,
      userEmail: user.email,
      deletedBy: req.user?.id
    });
  }

  logger.info(`User deleted: ${user.email} by ${req.user?.name}`);

  res.json({
    success: true,
    message: 'User deleted successfully'
  });
});

// ==================== VOLUNTEER MANAGEMENT ====================

/**
 * @desc    Get volunteer profile
 * @route   GET /api/v1/volunteer/profile
 * @access  Private (Volunteer)
 */
export const getVolunteerProfile = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const volunteer = await Volunteer.findOne({ userId: req.user?.id })
    .populate('userId', 'name email phone')
    .populate('assignedPrograms.programId', 'title category')
    .populate('ngoId', 'name');

  if (!volunteer) {
    return next(new CustomError('Volunteer profile not found', 404));
  }

  // Get volunteer statistics
  const stats = {
    totalHours: volunteer.participation?.hoursContributed || 0,
    completedTasks: volunteer.participation?.tasksCompleted || 0,
    activePrograms: 0, // Will be calculated separately
    certificates: await Certificate.countDocuments({ recipientId: req.user?.id, type: 'volunteer' })
  };

  res.json({
    success: true,
    data: {
      volunteer,
      stats
    }
  });
});

/**
 * @desc    Update volunteer profile
 * @route   PUT /api/v1/volunteer/profile
 * @access  Private (Volunteer)
 */
export const updateVolunteerProfile = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { skills, availability } = req.body;
  
  let volunteer = await Volunteer.findOne({ user: req.user?.id });
  
  if (!volunteer) {
    // Create new volunteer profile if doesn't exist
    volunteer = await Volunteer.create({
      user: req.user?.id,
      skills,
      availability
    });
  } else {
    // Update existing profile
    if (skills) volunteer.skills = skills;
    if (availability) volunteer.availability = availability;
    
    await volunteer.save();
  }

  // Emit real-time update
  const socketService = getEnhancedSocketService();
  if (socketService) {
    socketService.sendToUser(req.user!.id, 'volunteer:profile_updated', {
      updates: req.body
    });
  }

  res.json({
    success: true,
    message: 'Volunteer profile updated successfully',
    data: volunteer
  });
});

// ==================== SERVICE APPLICATION MANAGEMENT ====================

/**
 * @desc    Create service application
 * @route   POST /api/v1/citizen/applications
 * @access  Private (Citizen)
 */
export const createServiceApplication = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { serviceType, description, urgency, ngoId, contactPreference } = req.body;

  const application = await ServiceApplication.create({
    citizenId: req.user?.id,
    serviceType,
    description,
    urgency,
    ngoId,
    contactPreference,
    status: 'pending'
  });

  await application.populate('citizenId', 'name email phone');
  await application.populate('ngoId', 'name');

  // Emit real-time notification to NGO
  const socketService = getEnhancedSocketService();
  if (socketService) {
    socketService.emitServiceApplication({
      applicationId: application._id,
      citizenName: req.user?.name,
      serviceType,
      urgency,
      ngoId: ngoId?.toString()
    });
  }

  logger.info(`New service application created: ${application._id} by ${req.user?.name}`);

  res.status(201).json({
    success: true,
    message: 'Service application created successfully',
    data: application
  });
});

/**
 * @desc    Get my service applications
 * @route   GET /api/v1/citizen/applications
 * @access  Private (Citizen)
 */
export const getMyCitizenApplications = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { status, serviceType } = req.query;
  
  const filter: any = { citizenId: req.user?.id };
  
  if (status) filter.status = status;
  if (serviceType) filter.serviceType = serviceType;

  const applications = await ServiceApplication.find(filter)
    .populate('ngoId', 'name contactEmail contactPhone')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: applications
  });
});

export default {
  // NGO Management
  getNGOProfile,
  updateNGOProfile,
  
  // User Management
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  
  // Volunteer Management
  getVolunteerProfile,
  updateVolunteerProfile,
  
  // Service Applications
  createServiceApplication,
  getMyCitizenApplications
};
