import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Donation, { IDonation as _IDonation } from '../models/Donation';
import Program from '../models/Program';
import NGO from '../models/NGO';
import { AuthRequest } from '../middleware/authMiddleware';
import logger from '../utils/logger';
import { SocketService } from '../socket/socketService';
import { DonationSocketData } from '../socket/socketTypes';
import notificationService from '../services/notificationService';

// Create a new donation
export const createDonation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { programId, amount, donorName, donorEmail, donorPhone, isAnonymous, message, currency } = req.body;

    // Validate program exists and is active
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
        message: 'Cannot donate to inactive programs' 
      });
      return;
    }

    // Get NGO details
    const ngo = await NGO.findById(program.ngo);
    if (!ngo) {
      res.status(404).json({ 
        success: false, 
        message: 'Associated NGO not found' 
      });
      return;
    }    if (ngo.status !== 'verified') {
      res.status(400).json({ 
        success: false, 
        message: 'Cannot donate to unverified NGOs' 
      });
      return;
    }

    // Extract metadata
    const metadata = {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      source: 'web' as const,
      campaign: req.body.campaign,
      referrer: req.get('Referer')
    };    // Create donation
    const donationData: any = {
      program: programId,
      ngo: program.ngo,
      amount,
      currency: currency || 'INR',
      donorName,
      donorEmail,
      donorPhone,
      isAnonymous: isAnonymous || false,
      message,
      paymentMethod: 'razorpay',
      paymentStatus: 'pending',
      metadata
    };

    // Add donor reference if user is authenticated
    if ((req as AuthRequest).user && !isAnonymous) {
      donationData.donor = (req as AuthRequest).user!._id;
    }

    const donation = new Donation(donationData);
    await donation.save();

    await donation.populate([
      { path: 'program', select: 'title description targetAmount raisedAmount' },
      { path: 'ngo', select: 'name email logo' }
    ]);

    logger.info(`Donation created: ${donation._id} for program: ${programId}`);    // Emit donation created event
    const donationSocketData: DonationSocketData = {
      donationId: donation._id.toString(),
      amount: donation.amount,
      donorName: donation.donorName,
      ngoId: donation.ngo.toString(),
      programId: donation.program.toString(),
      timestamp: new Date().toISOString()
    };
    
    SocketService.emitNewDonation(donationSocketData);res.status(201).json({
      success: true,
      message: 'Donation created successfully',
      data: donation
    });
  } catch (error: any) {
    logger.error('Error creating donation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create donation',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Update donation payment status
export const updateDonationStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { paymentStatus, paymentId, razorpayPaymentId, razorpaySignature, transactionId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ 
        success: false, 
        message: 'Invalid donation ID' 
      });
      return;
    }

    const donation = await Donation.findById(id);
    if (!donation) {
      res.status(404).json({ 
        success: false, 
        message: 'Donation not found' 
      });
      return;
    }

    // Update donation status
    donation.paymentStatus = paymentStatus;
    if (paymentId) donation.paymentId = paymentId;
    if (razorpayPaymentId) donation.razorpayPaymentId = razorpayPaymentId;
    if (razorpaySignature) donation.razorpaySignature = razorpaySignature;
    if (transactionId) donation.transactionId = transactionId;

    await donation.save();

    // If donation is completed, update program raised amount
    if (paymentStatus === 'completed') {
      await Program.findByIdAndUpdate(
        donation.program,
        { $inc: { raisedAmount: donation.amount } }
      );

      // Update NGO total donations
      await NGO.findByIdAndUpdate(
        donation.ngo,
        { 
          $inc: { 
            totalDonations: donation.amount,
            donorCount: 1 
          } 
        }
      );
    }    logger.info(`Donation status updated: ${id} to ${paymentStatus}`);

    // Emit donation status updated event if payment is completed
    if (paymentStatus === 'completed') {
      const donationSocketData: DonationSocketData = {
        donationId: donation._id.toString(),
        amount: donation.amount,
        donorName: donation.donorName,
        ngoId: donation.ngo.toString(),
        programId: donation.program.toString(),
        timestamp: new Date().toISOString()
      };
      
      SocketService.emitNewDonation(donationSocketData);

      // Send notification to NGO admin about new donation
      try {
        const ngo = await NGO.findById(donation.ngo).select('adminId');
        const ngoAdminId = ngo?.adminId;

        if (ngoAdminId) {
          await notificationService.notifyDonationReceived(
            donation._id,
            donation.donorName,
            donation.amount,
            donation.currency,
            donation.program as mongoose.Types.ObjectId,
            donation.ngo as mongoose.Types.ObjectId,
            [ngoAdminId]
          );
        }
      } catch (notificationError) {
        logger.error('Error sending donation notification:', notificationError);
        // Don't fail the donation processing if notification fails
      }
    }

    res.json({
      success: true,
      message: 'Donation status updated successfully',
      data: donation
    });
  } catch (error: any) {
    logger.error('Error updating donation status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update donation status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get donation by ID
export const getDonationById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ 
        success: false, 
        message: 'Invalid donation ID' 
      });
      return;
    }

    const donation = await Donation.findById(id)
      .populate('program', 'title description targetAmount raisedAmount')
      .populate('ngo', 'name email logo')
      .populate('donor', 'fullName email')
      .lean();

    if (!donation) {
      res.status(404).json({ 
        success: false, 
        message: 'Donation not found' 
      });
      return;
    }

    res.json({
      success: true,
      data: donation
    });
  } catch (error: any) {
    logger.error('Error fetching donation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch donation',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get donations with filtering and pagination
export const getDonations = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      program,
      ngo,
      donor,
      paymentMethod,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query: any = {};

    // Build query filters
    if (status) query.paymentStatus = status;
    if (program) query.program = program;
    if (ngo) query.ngo = ngo;
    if (donor) query.donor = donor;
    if (paymentMethod) query.paymentMethod = paymentMethod;

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate as string);
      if (endDate) query.createdAt.$lte = new Date(endDate as string);
    }

    // Amount range filter
    if (minAmount || maxAmount) {
      query.amount = {};
      if (minAmount) query.amount.$gte = Number(minAmount);
      if (maxAmount) query.amount.$lte = Number(maxAmount);
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    // Sort options
    const sortOptions: any = {};
    sortOptions[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const [donations, total] = await Promise.all([
      Donation.find(query)
        .populate('program', 'title description')
        .populate('ngo', 'name logo')
        .populate('donor', 'fullName email')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Donation.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: donations,
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
    logger.error('Error fetching donations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch donations',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get user donations
export const getUserDonations = async (req: AuthRequest, res: Response): Promise<void> => {
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
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query: any = { donor: userId };
    if (status) query.paymentStatus = status;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    const sortOptions: any = {};
    sortOptions[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

    const [donations, total] = await Promise.all([
      Donation.find(query)
        .populate('program', 'title description targetAmount raisedAmount')
        .populate('ngo', 'name logo')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Donation.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: donations,
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
    logger.error('Error fetching user donations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user donations',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get donations for a program
export const getProgramDonations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { programId } = req.params;
    const {
      page = 1,
      limit = 20,
      status = 'completed',
      includeAnonymous = 'false'
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
      paymentStatus: status 
    };

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;    // Select fields based on whether to include anonymous donations
    const selectFields = includeAnonymous === 'true' 
      ? '' 
      : '-donorName -donorEmail -donorPhone';

    const [donations, total, stats] = await Promise.all([
      Donation.find(query)
        .select(selectFields)
        .populate('donor', 'fullName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Donation.countDocuments(query),
      Donation.aggregate([
        { $match: { program: new mongoose.Types.ObjectId(programId), paymentStatus: 'completed' } },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' },
            totalDonations: { $sum: 1 },
            avgDonation: { $avg: '$amount' }
          }
        }
      ])
    ]);

    res.json({
      success: true,
      data: donations,
      stats: stats[0] || { totalAmount: 0, totalDonations: 0, avgDonation: 0 },
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
    logger.error('Error fetching program donations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch program donations',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Request refund
export const requestRefund = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ 
        success: false, 
        message: 'Invalid donation ID' 
      });
      return;
    }

    const donation = await Donation.findById(id);
    if (!donation) {
      res.status(404).json({ 
        success: false, 
        message: 'Donation not found' 
      });
      return;
    }

    // Check if user owns the donation
    if (donation.donor?.toString() !== userId.toString()) {
      res.status(403).json({ 
        success: false, 
        message: 'You can only request refunds for your own donations' 
      });
      return;
    }

    // Check if donation is refundable
    if (!donation.isRefundable()) {
      res.status(400).json({ 
        success: false, 
        message: 'This donation is not eligible for refund' 
      });
      return;
    }

    // Create refund request
    donation.refund = {
      amount: donation.amount,
      reason: reason || 'Refund requested by donor',
      status: 'pending'
    };

    await donation.save();

    logger.info(`Refund requested for donation: ${id} by user: ${userId}`);

    res.json({
      success: true,
      message: 'Refund request submitted successfully',
      data: donation
    });
  } catch (error: any) {
    logger.error('Error requesting refund:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to request refund',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get donation statistics
export const getDonationStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, ngo, program } = req.query;

    const matchQuery: any = { paymentStatus: 'completed' };
    
    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) matchQuery.createdAt.$gte = new Date(startDate as string);
      if (endDate) matchQuery.createdAt.$lte = new Date(endDate as string);
    }
    
    if (ngo) matchQuery.ngo = new mongoose.Types.ObjectId(ngo as string);
    if (program) matchQuery.program = new mongoose.Types.ObjectId(program as string);

    const stats = await Donation.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          totalDonations: { $sum: 1 },
          avgDonation: { $avg: '$amount' },
          minDonation: { $min: '$amount' },
          maxDonation: { $max: '$amount' }
        }
      }
    ]);

    const paymentMethodStats = await Donation.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    const monthlyStats = await Donation.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          totalAmount: { $sum: '$amount' },
          totalDonations: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json({
      success: true,
      data: {
        overall: stats[0] || {
          totalAmount: 0,
          totalDonations: 0,
          avgDonation: 0,
          minDonation: 0,
          maxDonation: 0
        },
        byPaymentMethod: paymentMethodStats,
        monthly: monthlyStats
      }
    });
  } catch (error: any) {
    logger.error('Error fetching donation statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch donation statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};
