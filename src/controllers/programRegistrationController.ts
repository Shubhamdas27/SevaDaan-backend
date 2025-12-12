import { Response, NextFunction } from 'express';
import ProgramRegistration from '../models/ProgramRegistration';
import Program from '../models/Program';
import { AuthRequest } from '../middleware/authMiddleware';
import { CustomError } from '../middleware/errorMiddleware';
import mongoose from 'mongoose';

// Create new program registration
export const createProgramRegistration = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { programId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(programId)) {
      return next(new CustomError('Invalid program ID', 400));
    }

    // Check if program exists
    const program = await Program.findById(programId);
    if (!program) {
      return next(new CustomError('Program not found', 404));
    }

    // Check if user is already registered for this program
    const existingRegistration = await ProgramRegistration.findOne({
      program: programId,
      user: req.user!._id
    });

    if (existingRegistration) {
      return next(new CustomError('You are already registered for this program', 400));
    }

    const registrationData = {
      ...req.body,
      program: programId,
      user: req.user!._id
    };

    const registration = new ProgramRegistration(registrationData);
    await registration.save();

    await registration.populate([
      { path: 'program', select: 'title description startDate endDate' },
      { path: 'user', select: 'name email phone' }
    ]);
    
    res.status(201).json({
      success: true,
      message: 'Program registration created successfully',
      data: registration
    });
  } catch (error) {
    next(error);
  }
};

// Get program registrations with filters and pagination
export const getProgramRegistrations = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter: any = {};
    
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    if (req.query.registrationType) {
      filter.registrationType = req.query.registrationType;
    }
    
    if (req.query.programId) {
      filter.program = req.query.programId;
    }

    // Role-based filtering
    if (req.user?.role === 'citizen' || req.user?.role === 'volunteer' || req.user?.role === 'donor') {
      filter.user = req.user._id;
    } else if (req.user?.role === 'ngo_admin' || req.user?.role === 'ngo_manager') {
      // NGO staff can see registrations for their programs
      const ngoPrograms = await Program.find({ createdBy: req.user._id }).select('_id');
      const programIds = ngoPrograms.map(p => p._id);
      filter.program = { $in: programIds };
    }

    const registrations = await ProgramRegistration.find(filter)
      .populate('program', 'title description startDate endDate programType')
      .populate('user', 'name email phone')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ProgramRegistration.countDocuments(filter);

    res.json({
      success: true,
      data: {
        registrations,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get program registration by ID
export const getProgramRegistrationById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new CustomError('Invalid registration ID', 400));
    }

    const registration = await ProgramRegistration.findById(id)
      .populate('program', 'title description startDate endDate programType requirements')
      .populate('user', 'name email phone')
      .populate('approvedBy', 'name email');

    if (!registration) {
      return next(new CustomError('Program registration not found', 404));
    }

    // Check access permissions
    const canAccess = req.user?.role === 'ngo' || 
                     registration.user.toString() === req.user?._id.toString() ||
                     registration.approvedBy?.toString() === req.user?._id.toString();

    // NGO staff can access registrations for their programs
    if (!canAccess && (req.user?.role === 'ngo_admin' || req.user?.role === 'ngo_manager')) {
      const program = await Program.findById(registration.program);
      if (program && program.createdBy.toString() === req.user._id.toString()) {
        // Access granted
      } else {
        return next(new CustomError('Access denied', 403));
      }
    } else if (!canAccess) {
      return next(new CustomError('Access denied', 403));
    }

    res.json({
      success: true,
      data: registration
    });
  } catch (error) {
    next(error);
  }
};

// Update program registration status
export const updateProgramRegistration = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new CustomError('Invalid registration ID', 400));
    }

    const registration = await ProgramRegistration.findById(id).populate('program');
    if (!registration) {
      return next(new CustomError('Program registration not found', 404));
    }

    // Check permissions - NGO staff can approve/reject, users can update their application data
    let canUpdate = false;
    
    if (req.user?.role === 'ngo') {
      canUpdate = true;
    } else if (registration.user.toString() === req.user?._id.toString()) {
      // Users can only update application data and cannot change status
      const allowedFields = ['applicationData'];
      const updates = Object.keys(req.body);
      const isValidUpdate = updates.every(update => allowedFields.includes(update));
      
      if (!isValidUpdate) {
        return next(new CustomError('You can only update application data', 400));
      }
      canUpdate = true;
    } else if (req.user?.role === 'ngo_admin' || req.user?.role === 'ngo_manager') {
      // Check if this is their program
      const program = registration.program as any;
      if (program.createdBy.toString() === req.user._id.toString()) {
        canUpdate = true;
        
        // If approving, set approvedBy and approvedAt
        if (req.body.status === 'approved') {
          req.body.approvedBy = req.user._id;
          req.body.approvedAt = new Date();
        }
      }
    }

    if (!canUpdate) {
      return next(new CustomError('Access denied', 403));
    }

    const updatedRegistration = await ProgramRegistration.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    ).populate([
      { path: 'program', select: 'title description startDate endDate' },
      { path: 'user', select: 'name email phone' },
      { path: 'approvedBy', select: 'name email' }
    ]);

    res.json({
      success: true,
      message: 'Program registration updated successfully',
      data: updatedRegistration
    });
  } catch (error) {
    next(error);
  }
};

// Cancel program registration
export const cancelProgramRegistration = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new CustomError('Invalid registration ID', 400));
    }

    const registration = await ProgramRegistration.findById(id);
    if (!registration) {
      return next(new CustomError('Program registration not found', 404));
    }

    // Check permissions - user can cancel their own registration
    const canCancel = req.user?.role === 'ngo' || 
                     registration.user.toString() === req.user?._id.toString();

    if (!canCancel) {
      return next(new CustomError('Access denied', 403));
    }

    if (registration.status === 'completed') {
      return next(new CustomError('Cannot cancel completed registration', 400));
    }

    registration.status = 'cancelled';
    await registration.save();

    res.json({
      success: true,
      message: 'Program registration cancelled successfully',
      data: registration
    });
  } catch (error) {
    next(error);
  }
};

// Add feedback to program registration
export const addFeedback = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new CustomError('Invalid registration ID', 400));
    }

    const registration = await ProgramRegistration.findById(id);
    if (!registration) {
      return next(new CustomError('Program registration not found', 404));
    }

    // Only the registered user can add feedback
    if (registration.user.toString() !== req.user?._id.toString()) {
      return next(new CustomError('Access denied', 403));
    }

    // Can only add feedback if registration is completed
    if (registration.status !== 'completed') {
      return next(new CustomError('Can only add feedback for completed registrations', 400));
    }

    registration.feedback = {
      rating,
      comment,
      submittedAt: new Date()
    };

    await registration.save();

    res.json({
      success: true,
      message: 'Feedback added successfully',
      data: registration
    });
  } catch (error) {
    next(error);
  }
};

// Get program registration statistics
export const getProgramRegistrationStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Only allow NGO staff and super admin to view stats
    if (!['ngo', 'ngo_admin', 'ngo_manager'].includes(req.user?.role || '')) {
      return next(new CustomError('Access denied', 403));
    }

    const filter: any = {};
    
    // If not super admin, filter by user's programs
    if (req.user?.role !== 'ngo') {
      const ngoPrograms = await Program.find({ createdBy: req.user!._id }).select('_id');
      const programIds = ngoPrograms.map(p => p._id);
      filter.program = { $in: programIds };
    }

    const stats = await ProgramRegistration.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalRegistrations: { $sum: 1 },
          pendingRegistrations: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          approvedRegistrations: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
          },
          completedRegistrations: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          cancelledRegistrations: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          }
        }
      }
    ]);

    const typeStats = await ProgramRegistration.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$registrationType',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        overview: stats[0] || {
          totalRegistrations: 0,
          pendingRegistrations: 0,
          approvedRegistrations: 0,
          completedRegistrations: 0,
          cancelledRegistrations: 0
        },
        byType: typeStats
      }
    });
  } catch (error) {
    next(error);
  }
};
