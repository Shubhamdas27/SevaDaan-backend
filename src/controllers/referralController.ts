import { Request, Response, NextFunction } from 'express';
import Referral from '../models/Referral';
import { AuthRequest } from '../middleware/authMiddleware';
import { CustomError } from '../middleware/errorMiddleware';
import mongoose from 'mongoose';

// Create new referral
export const createReferral = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const referralData = {
      ...req.body,
      referredBy: (req as AuthRequest).user?._id || null
    };

    const referral = new Referral(referralData);
    await referral.save();

    await referral.populate('referredBy', 'name email');
    
    res.status(201).json({
      success: true,
      message: 'Referral created successfully',
      data: referral
    });
  } catch (error) {
    next(error);
  }
};

// Get referrals with filters and pagination
export const getReferrals = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter: any = {};
    
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    if (req.query.category) {
      filter.category = req.query.category;
    }
    
    if (req.query.priority) {
      filter.priority = req.query.priority;
    }
    
    if (req.query.urgencyLevel) {
      filter['beneficiary.urgencyLevel'] = req.query.urgencyLevel;
    }
    
    if (req.query.referralType) {
      filter.referralType = req.query.referralType;
    }

    // If user is not admin/manager, only show referrals they can access
    if (req.user?.role === 'volunteer') {
      filter.$or = [
        { referredBy: req.user._id },
        { assignedTo: req.user._id }
      ];
    } else if (req.user?.role === 'citizen' || req.user?.role === 'donor') {
      filter.referredBy = req.user._id;
    }

    const referrals = await Referral.find(filter)
      .populate('referredBy', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Referral.countDocuments(filter);

    res.json({
      success: true,
      data: {
        referrals,
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

// Get referral by ID
export const getReferralById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new CustomError('Invalid referral ID', 400));
    }

    const referral = await Referral.findById(id)
      .populate('referredBy', 'name email phone')
      .populate('assignedTo', 'name email phone')
      .populate('followUpNotes.addedBy', 'name')
      .populate('resolution.resolvedBy', 'name');

    if (!referral) {
      return next(new CustomError('Referral not found', 404));
    }    // Check access permissions
    const canAccess = req.user?.role === 'ngo' || 
                     req.user?.role === 'ngo_admin' ||
                     req.user?.role === 'ngo_manager' ||
                     referral.referredBy.toString() === req.user?._id.toString() ||
                     referral.assignedTo?.toString() === req.user?._id.toString();

    if (!canAccess) {
      return next(new CustomError('Access denied', 403));
    }

    res.json({
      success: true,
      data: referral
    });
  } catch (error) {
    next(error);
  }
};

// Update referral
export const updateReferral = async (req: AuthRequest, res: Response, next: NextFunction) => {  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new CustomError('Invalid referral ID', 400));
    }

    const referral = await Referral.findById(id);
    if (!referral) {
      return next(new CustomError('Referral not found', 404));
    }

    // Check permissions
    const canUpdate = req.user?.role === 'ngo' || 
                     req.user?.role === 'ngo_admin' ||
                     req.user?.role === 'ngo_manager' ||
                     referral.assignedTo?.toString() === req.user?._id.toString();

    if (!canUpdate) {
      return next(new CustomError('Access denied', 403));
    }

    // Update allowed fields
    const allowedUpdates = ['description', 'category', 'priority', 'beneficiary'];
    const updates: any = {};
    
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const updatedReferral = await Referral.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).populate('referredBy', 'name email');

    res.json({
      success: true,
      message: 'Referral updated successfully',
      data: updatedReferral
    });
  } catch (error) {
    next(error);
  }
};

// Update referral status
export const updateReferralStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new CustomError('Invalid referral ID', 400));
    }

    const referral = await Referral.findById(id);
    if (!referral) {
      return next(new CustomError('Referral not found', 404));
    }    // Check permissions
    const canUpdate = req.user?.role === 'ngo' || 
                     req.user?.role === 'ngo_admin' ||
                     req.user?.role === 'ngo_manager' ||
                     referral.assignedTo?.toString() === req.user?._id.toString();

    if (!canUpdate) {
      return next(new CustomError('Access denied', 403));
    }

    referral.status = status;
    await referral.save();

    res.json({
      success: true,
      message: 'Referral status updated successfully',
      data: referral
    });
  } catch (error) {
    next(error);
  }
};

// Assign referral to user
export const assignReferral = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { assignedTo } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new CustomError('Invalid referral ID', 400));
    }

    const referral = await Referral.findById(id);
    if (!referral) {
      return next(new CustomError('Referral not found', 404));
    }

    referral.assignedTo = assignedTo;
    referral.assignedAt = new Date();
    if (referral.status === 'pending') {
      referral.status = 'accepted';
    }

    await referral.save();
    await referral.populate('assignedTo', 'name email');

    res.json({
      success: true,
      message: 'Referral assigned successfully',
      data: referral
    });
  } catch (error) {
    next(error);
  }
};

// Add follow-up note
export const addFollowUpNote = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new CustomError('Invalid referral ID', 400));
    }

    const referral = await Referral.findById(id);
    if (!referral) {
      return next(new CustomError('Referral not found', 404));
    }

    referral.followUpNotes.push({
      note,
      addedBy: req.user!._id,
      addedAt: new Date()
    });

    await referral.save();
    await referral.populate('followUpNotes.addedBy', 'name');

    res.json({
      success: true,
      message: 'Follow-up note added successfully',
      data: referral
    });
  } catch (error) {
    next(error);
  }
};

// Resolve referral
export const resolveReferral = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { description, outcome, beneficiaryFeedback, rating } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new CustomError('Invalid referral ID', 400));
    }

    const referral = await Referral.findById(id);
    if (!referral) {
      return next(new CustomError('Referral not found', 404));
    }    referral.status = 'completed';
    referral.resolution = {
      notes: description,
      outcome,
      resolvedBy: req.user!._id,
      resolvedAt: new Date()
    };

    await referral.save();
    await referral.populate('resolution.resolvedBy', 'name');

    res.json({
      success: true,
      message: 'Referral resolved successfully',
      data: referral
    });
  } catch (error) {
    next(error);
  }
};

// Get referral statistics
export const getReferralStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Manual aggregation instead of static methods
    const statusStats = await Referral.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    const urgencyStats = await Referral.aggregate([
      {
        $group: {
          _id: '$beneficiary.urgencyLevel',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    const totalReferrals = await Referral.countDocuments();
    const pendingReferrals = await Referral.countDocuments({ status: 'pending' });
    const completedReferrals = await Referral.countDocuments({ status: 'completed' });
    const criticalReferrals = await Referral.countDocuments({ 'beneficiary.urgencyLevel': 'critical' });

    res.json({
      success: true,
      data: {
        overview: {
          total: totalReferrals,
          pending: pendingReferrals,
          completed: completedReferrals,
          critical: criticalReferrals
        },
        statusDistribution: statusStats,
        urgencyDistribution: urgencyStats
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get user's referrals
export const getUserReferrals = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const referrals = await Referral.find({ referredBy: req.user!._id })
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: referrals
    });
  } catch (error) {
    next(error);
  }
};

// Get NGO's referrals
export const getNGOReferrals = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { ngoId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(ngoId)) {
      return next(new CustomError('Invalid NGO ID', 400));
    }

    const referrals = await Referral.find({ 
      referralType: 'ngo',
      referredTo: ngoId
    })
      .populate('referredBy', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: referrals
    });
  } catch (error) {
    next(error);
  }
};

// Delete referral
export const deleteReferral = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new CustomError('Invalid referral ID', 400));
    }

    const referral = await Referral.findByIdAndDelete(id);
    if (!referral) {
      return next(new CustomError('Referral not found', 404));
    }

    res.json({
      success: true,
      message: 'Referral deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
