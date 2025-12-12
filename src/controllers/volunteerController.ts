import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Volunteer, { IVolunteer as _IVolunteer } from '../models/Volunteer';
import Program from '../models/Program';
import NGO from '../models/NGO';
import { AuthRequest } from '../middleware/authMiddleware';
import logger from '../utils/logger';
import { SocketService } from '../socket/socketService';
import { VolunteerSocketData } from '../socket/socketTypes';
import notificationService from '../services/notificationService';

// Apply for volunteer position
export const applyVolunteer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { programId } = req.params;
    const {
      skills,
      experience,
      motivation,
      availability,
      preferences,
      background,
      documents
    } = req.body;

    // Validate program exists and accepts volunteers
    const program = await Program.findById(programId);
    if (!program) {
      res.status(404).json({ 
        success: false, 
        message: 'Program not found' 
      });
      return;
    }

    if (program.status !== 'active') {
      res.status(400).json({ 
        success: false, 
        message: 'Cannot apply to inactive programs' 
      });
      return;
    }

    if (program.volunteersRegistered >= program.volunteersNeeded && program.volunteersNeeded > 0) {
      res.status(400).json({ 
        success: false, 
        message: 'Program has reached maximum volunteers' 
      });
      return;
    }

    // Check if user already applied for this program
    const existingApplication = await Volunteer.findOne({
      user: userId,
      program: programId,
      status: { $in: ['pending', 'approved'] }
    });

    if (existingApplication) {
      res.status(400).json({ 
        success: false, 
        message: 'You have already applied for this program' 
      });
      return;
    }

    // Create volunteer application
    const volunteerData = {
      user: userId,
      program: programId,
      ngo: program.ngo,
      skills,
      experience,
      motivation,
      availability,
      preferences,
      background,
      documents
    };

    const volunteer = new Volunteer(volunteerData);
    await volunteer.save();

    await volunteer.populate([
      { path: 'program', select: 'title description volunteersNeeded' },
      { path: 'ngo', select: 'name email logo team' },
      { path: 'user', select: 'fullName email phone' }
    ]);

    // Send notification to NGO managers about new volunteer application
    try {
      const ngo = await NGO.findById(program.ngo).select('adminId');
      if (ngo?.adminId) {
        await notificationService.notifyVolunteerApplication(
          volunteer._id,
          (volunteer.user as any).fullName || 'Unknown Volunteer',
          program.ngo as mongoose.Types.ObjectId,
          [ngo.adminId]
        );
      }
    } catch (notificationError) {
      logger.error('Error sending volunteer application notification:', notificationError);
      // Don't fail the application if notification fails
    }

    logger.info(`Volunteer application submitted: ${volunteer._id} for program: ${programId}`);

    // Emit volunteer update event
    const volunteerSocketData: VolunteerSocketData = {
      volunteerId: volunteer.user.toString(),
      volunteerName: req.user?.name || 'Unknown',
      activity: 'application_submitted',
      programId: volunteer.program.toString(),
      ngoId: volunteer.ngo.toString(),
      status: 'assigned', // As per the enum, using 'assigned' for new application
      timestamp: new Date().toISOString()
    };
    
    SocketService.emitVolunteerUpdate(volunteerSocketData);

    res.status(201).json({
      success: true,
      message: 'Volunteer application submitted successfully',
      data: volunteer
    });
  } catch (error: any) {
    logger.error('Error applying for volunteer position:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit volunteer application',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get volunteer applications with filtering
export const getVolunteers = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      program,
      ngo,
      user,
      skills,
      startDate,
      endDate,
      sortBy = 'applicationDate',
      sortOrder = 'desc'
    } = req.query;

    const query: any = {};

    // Build query filters
    if (status) query.status = status;
    if (program) query.program = program;
    if (ngo) query.ngo = ngo;
    if (user) query.user = user;
    if (skills) {
      const skillsArray = (skills as string).split(',').map(s => s.trim());
      query.skills = { $in: skillsArray };
    }

    // Date range filter
    if (startDate || endDate) {
      query.applicationDate = {};
      if (startDate) query.applicationDate.$gte = new Date(startDate as string);
      if (endDate) query.applicationDate.$lte = new Date(endDate as string);
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    // Sort options
    const sortOptions: any = {};
    sortOptions[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const [volunteers, total] = await Promise.all([
      Volunteer.find(query)
        .populate('program', 'title description volunteersNeeded volunteersRegistered')
        .populate('ngo', 'name logo')
        .populate('user', 'fullName email phone')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Volunteer.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: volunteers,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalItems: total,
        itemsPerPage: limitNum,
        hasNextPage: pageNum < Math.ceil(total / limitNum),
        hasPrevPage: pageNum > 1
      }
    });
  } catch (error: any) {
    logger.error('Error fetching volunteers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch volunteers',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get volunteer by ID
// Get volunteer opportunity (Program) by ID for detail view
export const getVolunteerOpportunityById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ 
        success: false, 
        message: 'Invalid opportunity ID' 
      });
      return;
    }

    const program = await Program.findById(id)
      .populate('ngo', 'name logo email phone website address description')
      .populate('createdBy', 'fullName email')
      .lean();

    if (!program) {
      res.status(404).json({ 
        success: false, 
        message: 'Volunteer opportunity not found' 
      });
      return;
    }

    // Transform to volunteer opportunity format
    const opportunity = {
      id: program._id,
      title: program.title,
      description: program.description,
      category: program.category,
      location: program.location,
      startDate: program.startDate,
      endDate: program.endDate,
      volunteersNeeded: program.volunteersNeeded,
      volunteersRegistered: program.volunteersRegistered,
      availableSpots: (program.volunteersNeeded || 0) - (program.volunteersRegistered || 0),
      requirements: program.requirements,
      tags: program.tags || [],
      images: program.images || [],
      status: program.status,
      ngo: program.ngo,
      createdBy: program.createdBy,
      createdAt: program.createdAt,
      updatedAt: program.updatedAt
    };

    res.json({
      success: true,
      data: opportunity
    });
  } catch (error: any) {
    logger.error('Error fetching volunteer opportunity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch volunteer opportunity',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get volunteer application by ID
export const getVolunteerById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ 
        success: false, 
        message: 'Invalid volunteer ID' 
      });
      return;
    }

    const volunteer = await Volunteer.findById(id)
      .populate('program', 'title description targetAmount raisedAmount volunteersNeeded volunteersRegistered')
      .populate('ngo', 'name email phone website logo')
      .populate('user', 'fullName email phone')
      .populate('approval.approvedBy', 'fullName email')
      .lean();

    if (!volunteer) {
      res.status(404).json({ 
        success: false, 
        message: 'Volunteer application not found' 
      });
      return;
    }

    res.json({
      success: true,
      data: volunteer
    });
  } catch (error: any) {
    logger.error('Error fetching volunteer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch volunteer',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Update volunteer application status
export const updateVolunteerStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, rejectionReason, notes } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ 
        success: false, 
        message: 'Invalid volunteer ID' 
      });
      return;
    }

    const volunteer = await Volunteer.findById(id);
    if (!volunteer) {
      res.status(404).json({ 
        success: false, 
        message: 'Volunteer application not found' 
      });
      return;
    }    // Check permissions - only NGO admins and super admins can update status
    const ngo = await NGO.findById(volunteer.ngo);
    if (!ngo) {
      res.status(404).json({ 
        success: false, 
        message: 'Associated NGO not found' 
      });
      return;
    }

    const hasPermission = 
      ngo.adminId.toString() === userId.toString() ||
      req.user?.role === 'ngo';

    if (!hasPermission) {
      res.status(403).json({ 
        success: false, 
        message: 'You do not have permission to update this volunteer application' 
      });
      return;
    }    // Update volunteer status
    if (status === 'approved') {
      volunteer.status = 'approved';
      volunteer.approval = {
        approvedBy: userId,
        approvedAt: new Date(),
        notes: notes || ''
      };
      
      // Update program volunteer count
      await Program.findByIdAndUpdate(
        volunteer.program,
        { $inc: { volunteersRegistered: 1 } }
      );    } else if (status === 'rejected') {
      volunteer.status = 'rejected';
      volunteer.approval = {
        rejectionReason: rejectionReason || 'Application rejected',
        notes: notes || ''
      };
    } else {
      volunteer.status = status;
      if (notes) volunteer.approval.notes = notes;
    }

    await volunteer.save();

    await volunteer.populate([
      { path: 'program', select: 'title description' },
      { path: 'ngo', select: 'name email logo' },
      { path: 'user', select: 'fullName email' }
    ]);

    // Send notification to volunteer about status update
    if (status === 'approved' || status === 'rejected') {
      try {
        await notificationService.notifyVolunteerStatusUpdate(
          volunteer.user as mongoose.Types.ObjectId,
          status,
          (volunteer.ngo as any).name || 'NGO',
          volunteer._id
        );
      } catch (notificationError) {
        logger.error('Error sending volunteer status notification:', notificationError);
        // Don't fail the status update if notification fails
      }
    }

    logger.info(`Volunteer status updated: ${id} to ${status} by user: ${userId}`);

    res.json({
      success: true,
      message: 'Volunteer status updated successfully',
      data: volunteer
    });
  } catch (error: any) {
    logger.error('Error updating volunteer status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update volunteer status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get user's volunteer applications
export const getUserVolunteerApplications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const {
      page = 1,
      limit = 20,
      status,
      sortBy = 'applicationDate',
      sortOrder = 'desc'
    } = req.query;

    const query: any = { user: userId };
    if (status) query.status = status;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    const sortOptions: any = {};
    sortOptions[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

    const [volunteers, total] = await Promise.all([
      Volunteer.find(query)
        .populate('program', 'title description status volunteersNeeded volunteersRegistered')
        .populate('ngo', 'name logo')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Volunteer.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: volunteers,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalItems: total,
        itemsPerPage: limitNum,
        hasNextPage: pageNum < Math.ceil(total / limitNum),
        hasPrevPage: pageNum > 1
      }
    });
  } catch (error: any) {
    logger.error('Error fetching user volunteer applications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch volunteer applications',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get volunteers for a program
export const getProgramVolunteers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { programId } = req.params;
    const {
      page = 1,
      limit = 20,
      status = 'approved'
    } = req.query;

    if (!mongoose.Types.ObjectId.isValid(programId)) {
      res.status(400).json({ 
        success: false, 
        message: 'Invalid program ID' 
      });
      return;
    }

    const query: any = { 
      program: programId,
      status: status 
    };

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    const [volunteers, total, stats] = await Promise.all([
      Volunteer.find(query)
        .populate('user', 'fullName email')
        .select('-documents -background.references -approval.notes')
        .sort({ 'approval.approvedAt': -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Volunteer.countDocuments(query),
      Volunteer.aggregate([
        { $match: { program: new mongoose.Types.ObjectId(programId) } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const statusStats = stats.reduce((acc: any, stat: any) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {});

    res.json({
      success: true,
      data: volunteers,
      stats: statusStats,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalItems: total,
        itemsPerPage: limitNum,
        hasNextPage: pageNum < Math.ceil(total / limitNum),
        hasPrevPage: pageNum > 1
      }
    });
  } catch (error: any) {
    logger.error('Error fetching program volunteers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch program volunteers',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Update volunteer participation
export const updateVolunteerParticipation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { hoursContributed, tasksCompleted, rating, feedback } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ 
        success: false, 
        message: 'Invalid volunteer ID' 
      });
      return;
    }

    const volunteer = await Volunteer.findById(id);
    if (!volunteer) {
      res.status(404).json({ 
        success: false, 
        message: 'Volunteer application not found' 
      });
      return;
    }

    // Check permissions
    const ngo = await NGO.findById(volunteer.ngo);
    if (!ngo) {
      res.status(404).json({ 
        success: false, 
        message: 'Associated NGO not found' 
      });
      return;
    }    const hasPermission = 
      ngo.adminId.toString() === userId.toString() ||
      ngo.representative.email === req.user?.email ||
      req.user?.role === 'ngo';

    if (!hasPermission) {
      res.status(403).json({ 
        success: false, 
        message: 'You do not have permission to update volunteer participation' 
      });
      return;
    }

    // Update participation data
    if (hoursContributed !== undefined) {
      volunteer.participation.hoursContributed = Math.max(0, hoursContributed);
    }
    if (tasksCompleted !== undefined) {
      volunteer.participation.tasksCompleted = Math.max(0, tasksCompleted);
    }
    if (rating !== undefined) {
      volunteer.participation.rating = Math.min(5, Math.max(1, rating));
    }
    if (feedback !== undefined) {
      volunteer.participation.feedback = feedback;
    }

    await volunteer.save();

    logger.info(`Volunteer participation updated: ${id} by user: ${userId}`);

    res.json({
      success: true,
      message: 'Volunteer participation updated successfully',
      data: volunteer
    });
  } catch (error: any) {
    logger.error('Error updating volunteer participation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update volunteer participation',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Withdraw volunteer application
export const withdrawVolunteerApplication = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ 
        success: false, 
        message: 'Invalid volunteer ID' 
      });
      return;
    }

    const volunteer = await Volunteer.findById(id);
    if (!volunteer) {
      res.status(404).json({ 
        success: false, 
        message: 'Volunteer application not found' 
      });
      return;
    }

    // Check if user owns the application
    if (volunteer.user.toString() !== userId.toString()) {
      res.status(403).json({ 
        success: false, 
        message: 'You can only withdraw your own applications' 
      });
      return;
    }

    // Can only withdraw pending or approved applications
    if (!['pending', 'approved'].includes(volunteer.status)) {
      res.status(400).json({ 
        success: false, 
        message: 'Cannot withdraw application in current status' 
      });
      return;
    }

    // If approved, decrease program volunteer count
    if (volunteer.status === 'approved') {
      await Program.findByIdAndUpdate(
        volunteer.program,
        { $inc: { volunteersRegistered: -1 } }
      );
    }

    volunteer.status = 'withdrawn';
    volunteer.isActive = false;
    await volunteer.save();

    logger.info(`Volunteer application withdrawn: ${id} by user: ${userId}`);

    res.json({
      success: true,
      message: 'Volunteer application withdrawn successfully'
    });
  } catch (error: any) {
    logger.error('Error withdrawing volunteer application:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to withdraw volunteer application',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get volunteer statistics
export const getVolunteerStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, ngo, program } = req.query;

    const matchQuery: any = {};
    
    if (startDate || endDate) {
      matchQuery.applicationDate = {};
      if (startDate) matchQuery.applicationDate.$gte = new Date(startDate as string);
      if (endDate) matchQuery.applicationDate.$lte = new Date(endDate as string);
    }
    
    if (ngo) matchQuery.ngo = new mongoose.Types.ObjectId(ngo as string);
    if (program) matchQuery.program = new mongoose.Types.ObjectId(program as string);

    const stats = await Volunteer.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalApplications: { $sum: 1 },
          approvedVolunteers: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
          },
          pendingApplications: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          totalHoursContributed: { $sum: '$participation.hoursContributed' },
          totalTasksCompleted: { $sum: '$participation.tasksCompleted' },
          avgRating: { $avg: '$participation.rating' }
        }
      }
    ]);

    const statusStats = await Volunteer.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const skillsStats = await Volunteer.aggregate([
      { $match: { ...matchQuery, status: 'approved' } },
      { $unwind: '$skills' },
      {
        $group: {
          _id: '$skills',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      data: {
        overall: stats[0] || {
          totalApplications: 0,
          approvedVolunteers: 0,
          pendingApplications: 0,
          totalHoursContributed: 0,
          totalTasksCompleted: 0,
          avgRating: 0
        },
        byStatus: statusStats,
        topSkills: skillsStats
      }
    });
  } catch (error: any) {
    logger.error('Error fetching volunteer statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch volunteer statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get public volunteer opportunities (programs that need volunteers)
export const getVolunteerOpportunities = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      location,
      ngo,
      skills,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Find programs that need volunteers
    const query: any = {
      status: 'active',
      $expr: { $lt: ['$volunteersRegistered', '$volunteersNeeded'] } // Programs with available spots
    };

    // Build query filters
    if (category) query.category = category;
    if (location) {
      query.$or = [
        { 'location.city': new RegExp(location as string, 'i') },
        { 'location.state': new RegExp(location as string, 'i') }
      ];
    }
    if (ngo) query.ngo = ngo;

    // Pagination
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    // Sort options
    const sortOptions: any = {};
    sortOptions[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const [opportunities, total] = await Promise.all([
      Program.find(query)
        .populate('ngo', 'name logo email phone website')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .select('title description category location startDate endDate volunteersNeeded volunteersRegistered requirements tags createdAt')
        .lean(),
      Program.countDocuments(query)
    ]);

    // Transform data to include volunteer opportunity specific fields
    const transformedOpportunities = opportunities.map(program => ({
      id: program._id,
      title: program.title,
      description: program.description,
      category: program.category,
      location: program.location,
      startDate: program.startDate,
      endDate: program.endDate,
      volunteersNeeded: program.volunteersNeeded,
      volunteersRegistered: program.volunteersRegistered,
      availableSpots: (program.volunteersNeeded || 0) - (program.volunteersRegistered || 0),
      requirements: program.requirements,
      tags: program.tags || [],
      ngo: program.ngo,
      createdAt: program.createdAt
    }));

    res.json({
      success: true,
      data: transformedOpportunities,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalItems: total,
        itemsPerPage: limitNum,
        hasNextPage: pageNum < Math.ceil(total / limitNum),
        hasPrevPage: pageNum > 1
      },
      message: `Found ${total} volunteer opportunities`
    });
  } catch (error: any) {
    logger.error('Error fetching volunteer opportunities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch volunteer opportunities',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// NGO Volunteer Management Functions

/**
 * @desc    Get all volunteers for an NGO
 * @route   GET /api/v1/volunteers/ngo
 * @access  Private (NGO Admin/Manager)
 */
export const getNGOVolunteers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const userRole = req.user?.role;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Get user to find NGO ID
    const User = require('../models/User');
    const user = await User.findById(userId);
    if (!user || !user.ngoId) {
      res.status(400).json({
        success: false,
        message: 'User not associated with any NGO'
      });
      return;
    }

    // Only NGO admin or users with appropriate permissions can view volunteers
    if (userRole !== 'ngo_admin' && !user.permissions?.includes('volunteers_manage')) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to view volunteers'
      });
      return;
    }

    // Find all volunteers for programs belonging to this NGO
    const volunteers = await Volunteer.find({
      ngoId: user.ngoId,
      status: { $in: ['pending', 'approved', 'active'] }
    })
    .populate('userId', 'name email phone avatar')
    .populate('programId', 'title')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: volunteers.length,
      data: volunteers
    });
  } catch (error) {
    logger.error('Error fetching NGO volunteers:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching volunteers'
    });
  }
};



/**
 * @desc    Delete/Remove volunteer
 * @route   DELETE /api/v1/volunteers/:volunteerId
 * @access  Private (NGO Admin/Manager)
 */
export const deleteVolunteer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const userRole = req.user?.role;
    const { volunteerId } = req.params;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Get user to find NGO ID
    const User = require('../models/User');
    const user = await User.findById(userId);
    if (!user || !user.ngoId) {
      res.status(400).json({
        success: false,
        message: 'User not associated with any NGO'
      });
      return;
    }

    // Only NGO admin or users with appropriate permissions can delete volunteers
    if (userRole !== 'ngo_admin' && !user.permissions?.includes('volunteers_manage')) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to delete volunteers'
      });
      return;
    }

    // Find the volunteer and verify it belongs to this NGO
    const volunteer = await Volunteer.findOne({
      _id: volunteerId,
      ngo: user.ngoId
    });

    if (!volunteer) {
      res.status(404).json({
        success: false,
        message: 'Volunteer not found'
      });
      return;
    }

    // Update status to removed instead of actually deleting
    volunteer.status = 'removed';
    volunteer.reviewedAt = new Date();
    volunteer.reviewedBy = userId;
    await volunteer.save();

    logger.info(`Volunteer removed: ${volunteerId} for NGO: ${user.ngoId}`);

    res.json({
      success: true,
      message: 'Volunteer removed successfully'
    });
  } catch (error) {
    logger.error('Error removing volunteer:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while removing volunteer'
    });
  }
};

// Add volunteer directly by NGO (manual recruitment)
export const addVolunteer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const userRole = req.user?.role;
    
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Get user to find NGO ID
    const User = require('../models/User');
    const user = await User.findById(userId);
    if (!user || !user.ngoId) {
      res.status(400).json({
        success: false,
        message: 'User not associated with any NGO'
      });
      return;
    }

    // Only NGO admin or users with appropriate permissions can add volunteers
    if (userRole !== 'ngo_admin' && !user.permissions?.includes('volunteers_manage')) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to add volunteers'
      });
      return;
    }

    const {
      fullName,
      email,
      phone,
      programId,
      skills,
      experience,
      motivation,
      availability,
      preferences,
      background,
      documents
    } = req.body;

    // Validate required fields
    if (!fullName || !email || !programId || !skills) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: fullName, email, programId, skills'
      });
      return;
    }

    // Validate program exists and belongs to this NGO
    const program = await Program.findOne({
      _id: programId,
      ngo: user.ngoId
    });

    if (!program) {
      res.status(404).json({
        success: false,
        message: 'Program not found or not associated with your NGO'
      });
      return;
    }

    // Check if user exists with this email
    let volunteerUser = await User.findOne({ email });
    
    // If user doesn't exist, create a basic user record
    if (!volunteerUser) {
      volunteerUser = new User({
        fullName,
        email,
        phone,
        role: 'volunteer',
        isVerified: false,
        password: Math.random().toString(36).slice(-8), // Temporary password
        permissions: []
      });
      await volunteerUser.save();
    }

    // Check if volunteer application already exists
    const existingVolunteer = await Volunteer.findOne({
      user: volunteerUser._id,
      program: programId,
      status: { $in: ['pending', 'approved'] }
    });

    if (existingVolunteer) {
      res.status(400).json({
        success: false,
        message: 'Volunteer application already exists for this program'
      });
      return;
    }

    // Create volunteer application
    const volunteerData = {
      user: volunteerUser._id,
      program: programId,
      ngo: user.ngoId,
      skills: Array.isArray(skills) ? skills : skills.split(',').map((s: string) => s.trim()).filter(Boolean),
      experience: experience || '',
      motivation: motivation || '',
      availability: {
        daysPerWeek: availability?.daysPerWeek || 1,
        hoursPerDay: availability?.hoursPerDay || 1,
        preferredTime: availability?.preferredTime || 'flexible',
        startDate: availability?.startDate ? new Date(availability.startDate) : new Date(),
        endDate: availability?.endDate ? new Date(availability.endDate) : undefined
      },
      preferences: {
        workLocation: preferences?.workLocation || 'onsite',
        travelWillingness: preferences?.travelWillingness || false,
        languagesSpoken: preferences?.languagesSpoken || ['English'],
        specialRequirements: preferences?.specialRequirements || ''
      },
      background: {
        education: background?.education || '',
        occupation: background?.occupation || '',
        previousVolunteerExperience: background?.previousVolunteerExperience || '',
        references: background?.references || []
      },
      documents: documents || {},
      status: 'approved', // Directly approve since NGO is adding them
      approval: {
        approvedBy: userId,
        approvedAt: new Date(),
        notes: 'Directly added by NGO admin'
      }
    };

    const volunteer = new Volunteer(volunteerData);
    await volunteer.save();

    await volunteer.populate([
      { path: 'program', select: 'title description volunteersNeeded' },
      { path: 'ngo', select: 'name email logo' },
      { path: 'user', select: 'fullName email phone' }
    ]);

    logger.info(`Volunteer added directly: ${volunteer._id} for program: ${programId} by NGO: ${user.ngoId}`);

    res.status(201).json({
      success: true,
      message: 'Volunteer added successfully',
      data: volunteer
    });
  } catch (error: any) {
    logger.error('Error adding volunteer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add volunteer',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};
