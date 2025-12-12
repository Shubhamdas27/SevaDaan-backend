import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Grant, { IGrant as _IGrant } from '../models/Grant';
import NGO from '../models/NGO';
import { AuthRequest } from '../middleware/authMiddleware';
import logger from '../utils/logger';
import notificationService from '../services/notificationService';

// Create a new grant request
export const createGrantRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Check if user has an NGO
    const ngo = await NGO.findOne({ 
      $or: [
        { createdBy: userId },
        { contactPerson: userId },
        { 'team.user': userId, 'team.role': { $in: ['admin', 'manager'] } }
      ]
    });

    if (!ngo) {
      res.status(403).json({ 
        success: false, 
        message: 'You must be associated with an NGO to request grants' 
      });
      return;
    }    if (ngo.status !== 'verified') {
      res.status(403).json({ 
        success: false, 
        message: 'NGO must be verified to request grants' 
      });
      return;
    }

    const grantData = {
      ...req.body,
      ngo: ngo._id,
      requestedBy: userId
    };

    const grant = new Grant(grantData);
    await grant.save();

    await grant.populate([
      { path: 'ngo', select: 'name email logo adminId' },
      { path: 'requestedBy', select: 'fullName email' }
    ]);

    // Send notification to NGO admin when grant is posted and approved
    if (grant.status === 'approved') {
      try {
        const ngoAdminId = (grant.ngo as any)?.adminId;
        if (ngoAdminId) {
          await notificationService.notifyGrantPosted(
            grant._id,
            grant.title,
            grant.ngo as mongoose.Types.ObjectId,
            [ngoAdminId]
          );
        }
      } catch (notificationError) {
        logger.error('Error sending grant notification:', notificationError);
        // Don't fail the grant creation if notification fails
      }
    }

    logger.info(`Grant request created: ${grant._id} by user: ${userId}`);

    res.status(201).json({
      success: true,
      message: 'Grant request created successfully',
      data: grant
    });
  } catch (error: any) {
    logger.error('Error creating grant request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create grant request',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get grants with filtering
export const getGrants = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      category,
      ngo,
      priority,
      minAmount,
      maxAmount,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query: any = {};

    // Build query filters
    if (status) query.status = status;
    if (category) query.category = category;
    if (ngo) query.ngo = ngo;
    if (priority) query.priority = priority;

    // Amount range filter
    if (minAmount || maxAmount) {
      query.requestedAmount = {};
      if (minAmount) query.requestedAmount.$gte = Number(minAmount);
      if (maxAmount) query.requestedAmount.$lte = Number(maxAmount);
    }

    // Text search
    if (search) {
      query.$text = { $search: search as string };
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    // Sort options
    const sortOptions: any = {};
    if (search) {
      sortOptions.score = { $meta: 'textScore' };
    }
    sortOptions[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

    const [grants, total] = await Promise.all([
      Grant.find(query)
        .populate('ngo', 'name email logo')
        .populate('requestedBy', 'fullName email')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Grant.countDocuments(query)
    ]);

    // If no grants found, return mock data for demonstration
    if (grants.length === 0 && pageNum === 1) {
      const mockGrants = [
        {
          id: 'mock-1',
          title: 'Education Support Grant 2024',
          description: 'Funding opportunity for NGOs working in the education sector to support underprivileged children with quality education, learning materials, and infrastructure development.',
          amount: 500000,
          deadline: '2024-08-31T23:59:59.999Z',
          eligibilityCriteria: 'Registered NGOs with minimum 2 years of experience in education sector, audited financial statements, and valid 12A/80G certificates required.',
          provider: 'Ministry of Education, Government of India',
          status: 'open' as const,
          applicationLink: 'https://grants.gov.in/education-support-2024',
          createdAt: '2024-01-15T10:00:00.000Z',
          updatedAt: '2024-01-15T10:00:00.000Z'
        },
        {
          id: 'mock-2',
          title: 'Healthcare Innovation Fund',
          description: 'Grant program designed to support innovative healthcare solutions in rural and remote areas. Focus on telemedicine, mobile health clinics, and community health programs.',
          amount: 750000,
          deadline: '2024-09-15T23:59:59.999Z',
          eligibilityCriteria: 'Healthcare-focused NGOs with proven track record, partnerships with medical institutions, and experience in rural healthcare delivery.',
          provider: 'National Health Mission',
          status: 'open' as const,
          applicationLink: 'https://nhm.gov.in/healthcare-innovation-fund',
          createdAt: '2024-01-20T09:00:00.000Z',
          updatedAt: '2024-01-20T09:00:00.000Z'
        },
        {
          id: 'mock-3',
          title: 'Environmental Conservation Grant',
          description: 'Supporting environmental conservation projects including afforestation, water conservation, waste management, and renewable energy initiatives in local communities.',
          amount: 300000,
          deadline: '2024-07-30T23:59:59.999Z',
          eligibilityCriteria: 'Environmental NGOs with environmental clearances, community partnerships, and measurable impact assessment capabilities.',
          provider: 'Ministry of Environment, Forest and Climate Change',
          status: 'reviewing' as const,
          createdAt: '2024-01-10T08:00:00.000Z',
          updatedAt: '2024-02-15T14:30:00.000Z'
        },
        {
          id: 'mock-4',
          title: 'Women Empowerment Initiative',
          description: 'Grant for NGOs working on women empowerment, skill development, financial inclusion, and promoting gender equality through various community-based programs.',
          amount: 400000,
          deadline: '2024-10-31T23:59:59.999Z',
          eligibilityCriteria: 'Women-focused NGOs with documented success stories, partnerships with SHGs, and experience in microfinance or skill development programs.',
          provider: 'Ministry of Women and Child Development',
          status: 'open' as const,
          applicationLink: 'https://wcd.nic.in/women-empowerment-grant',
          createdAt: '2024-02-01T11:00:00.000Z',
          updatedAt: '2024-02-01T11:00:00.000Z'
        },
        {
          id: 'mock-5',
          title: 'Digital Literacy Program Grant',
          description: 'Funding for digital literacy and technology access programs targeting underserved communities, including computer training, internet access, and digital skills development.',
          amount: 250000,
          deadline: '2024-06-30T23:59:59.999Z',
          eligibilityCriteria: 'Tech-education NGOs with infrastructure capabilities, certified trainers, and partnerships with educational institutions or community centers.',
          provider: 'Digital India Corporation',
          status: 'closed' as const,
          createdAt: '2024-01-05T07:00:00.000Z',
          updatedAt: '2024-03-01T16:00:00.000Z'
        },
        {
          id: 'mock-6',
          title: 'Rural Development Fund',
          description: 'Comprehensive rural development grant covering agriculture, infrastructure, livelihood generation, and community capacity building in rural and tribal areas.',
          amount: 1000000,
          deadline: '2024-11-30T23:59:59.999Z',
          eligibilityCriteria: 'Rural development NGOs with grassroots presence, agricultural expertise, and experience in implementing large-scale community development projects.',
          provider: 'Ministry of Rural Development',
          status: 'open' as const,
          applicationLink: 'https://rural.nic.in/development-fund-2024',
          createdAt: '2024-02-10T12:00:00.000Z',
          updatedAt: '2024-02-10T12:00:00.000Z'
        }
      ];

      res.json({
        success: true,
        data: mockGrants,
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: mockGrants.length,
          itemsPerPage: limitNum,
          hasNextPage: false,
          hasPrevPage: false
        },
        message: 'Demo grants data - showing available funding opportunities'
      });
      return;
    }

    res.json({
      success: true,
      data: grants,
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
    logger.error('Error fetching grants:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch grants',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get grant by ID
export const getGrantById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ 
        success: false, 
        message: 'Invalid grant ID' 
      });
      return;
    }

    const grant = await Grant.findById(id)
      .populate('ngo', 'name email phone website logo address')
      .populate('requestedBy', 'fullName email')
      .populate('review.reviewedBy', 'fullName email')
      .populate('disbursement.disbursedBy', 'fullName email')
      .lean();

    if (!grant) {
      res.status(404).json({ 
        success: false, 
        message: 'Grant not found' 
      });
      return;
    }

    res.json({
      success: true,
      data: grant
    });
  } catch (error: any) {
    logger.error('Error fetching grant:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch grant',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get grant by slug (SEO-friendly)
export const getGrantBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;

    const grant = await Grant.findOne({ slug })
      .populate('ngo', 'name email phone website logo address description foundedYear teamSize')
      .populate('requestedBy', 'fullName email')
      .lean();

    if (!grant) {
      res.status(404).json({ 
        success: false, 
        message: 'Grant not found' 
      });
      return;
    }

    // Only show approved grants publicly, unless user is authenticated and authorized
    if (grant.status !== 'approved' && grant.status !== 'disbursed' && grant.status !== 'completed') {
      res.status(404).json({ 
        success: false, 
        message: 'Grant not found' 
      });
      return;
    }

    res.json({
      success: true,
      data: grant
    });
  } catch (error: any) {
    logger.error('Error fetching grant by slug:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch grant',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Update grant status
export const updateGrantStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, approvedAmount, reviewComments, score, recommendations } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ 
        success: false, 
        message: 'Invalid grant ID' 
      });
      return;
    }

    const grant = await Grant.findById(id);
    if (!grant) {
      res.status(404).json({ 
        success: false, 
        message: 'Grant not found' 
      });
      return;
    }

    // Only admins can update grant status
    if (req.user?.role !== 'ngo') {
      res.status(403).json({ 
        success: false, 
        message: 'Only administrators can update grant status' 
      });
      return;
    }

    // Update grant status and review information
    grant.status = status;
    
    if (status === 'approved' && approvedAmount) {
      grant.approvedAmount = approvedAmount;
    }

    // Update review information
    grant.review.reviewedBy = userId;
    grant.review.reviewedAt = new Date();
    if (reviewComments) grant.review.reviewComments = reviewComments;
    if (score) grant.review.score = score;
    if (recommendations) grant.review.recommendations = recommendations;

    await grant.save();

    await grant.populate([
      { path: 'ngo', select: 'name email logo' },
      { path: 'requestedBy', select: 'fullName email' },
      { path: 'review.reviewedBy', select: 'fullName email' }
    ]);

    logger.info(`Grant status updated: ${id} to ${status} by user: ${userId}`);

    res.json({
      success: true,
      message: 'Grant status updated successfully',
      data: grant
    });
  } catch (error: any) {
    logger.error('Error updating grant status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update grant status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get user's grant requests
export const getUserGrants = async (req: AuthRequest, res: Response): Promise<void> => {
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

    // Find NGOs associated with the user
    const ngos = await NGO.find({ 
      $or: [
        { createdBy: userId },
        { contactPerson: userId },
        { 'team.user': userId }
      ]
    }).select('_id');

    const ngoIds = ngos.map((ngo: any) => ngo._id);

    const query: any = { 
      $or: [
        { requestedBy: userId },
        { ngo: { $in: ngoIds } }
      ]
    };
    
    if (status) query.status = status;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    const sortOptions: any = {};
    sortOptions[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

    const [grants, total] = await Promise.all([
      Grant.find(query)
        .populate('ngo', 'name logo')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Grant.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: grants,
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
    logger.error('Error fetching user grants:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch grants',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get grant statistics
export const getGrantStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, ngo } = req.query;

    const matchQuery: any = {};
    
    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) matchQuery.createdAt.$gte = new Date(startDate as string);
      if (endDate) matchQuery.createdAt.$lte = new Date(endDate as string);
    }
    
    if (ngo) matchQuery.ngo = new mongoose.Types.ObjectId(ngo as string);

    const stats = await Grant.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalRequests: { $sum: 1 },
          approvedRequests: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
          },
          totalRequestedAmount: { $sum: '$requestedAmount' },
          totalApprovedAmount: { $sum: '$approvedAmount' },
          avgRequestedAmount: { $avg: '$requestedAmount' },
          avgApprovedAmount: { $avg: '$approvedAmount' }
        }
      }
    ]);

    const statusStats = await Grant.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$requestedAmount' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const categoryStats = await Grant.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalRequested: { $sum: '$requestedAmount' },
          totalApproved: { $sum: '$approvedAmount' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        overall: stats[0] || {
          totalRequests: 0,
          approvedRequests: 0,
          totalRequestedAmount: 0,
          totalApprovedAmount: 0,
          avgRequestedAmount: 0,
          avgApprovedAmount: 0
        },
        byStatus: statusStats,
        byCategory: categoryStats
      }
    });
  } catch (error: any) {
    logger.error('Error fetching grant statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch grant statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};
