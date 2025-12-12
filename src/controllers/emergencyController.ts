import { Request, Response } from 'express';
import EmergencyHelp from '../models/EmergencyHelp';
import NGO from '../models/NGO';
import { checkPermission } from '../utils/permissions';
import logger from '../utils/logger';

// Create emergency help request
export const createEmergencyRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      phone,
      email,
      emergencyType,
      urgencyLevel,
      description,
      location,
      helpNeeded,
      estimatedCost,
      attachmentUrls
    } = req.body;

    const userId = req.user?._id;

    const emergencyRequest = new EmergencyHelp({
      userId,
      name,
      phone,
      email,
      emergencyType,
      urgencyLevel,
      description,
      location,
      helpNeeded: helpNeeded || [],
      estimatedCost,
      attachmentUrls: attachmentUrls || []
    });

    await emergencyRequest.save();

    res.status(201).json({
      success: true,
      message: 'Emergency help request submitted successfully',
      data: emergencyRequest
    });

    logger.info(`Emergency help request created: ${emergencyRequest._id}`);
  } catch (error: any) {
    logger.error('Error creating emergency help request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create emergency help request',
      error: error.message
    });
  }
};

// Get emergency help requests with filters
export const getEmergencyRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      type,
      urgency,
      status,
      state,
      city,
      verified,
      assigned,
      page = '1',
      limit = '10',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    // Build query
    const query: any = { isActive: true };

    if (type) query.emergencyType = type;
    if (urgency) query.urgencyLevel = urgency;
    if (status) query.status = status;
    if (state) query['location.state'] = new RegExp(state as string, 'i');
    if (city) query['location.city'] = new RegExp(city as string, 'i');
    if (verified === 'true') query.verificationStatus = 'verified';
    if (verified === 'false') query.verificationStatus = { $ne: 'verified' };
    if (assigned === 'true') query.assignedToNGO = { $exists: true };
    if (assigned === 'false') query.assignedToNGO = { $exists: false };

    // Build sort object
    const sortObj: any = {};
    sortObj[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

    const [requests, total] = await Promise.all([
      EmergencyHelp.find(query)
        .populate('userId', 'name email')
        .populate('assignedToNGO', 'name logo contactPhone')
        .populate('verifiedBy', 'name')
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      EmergencyHelp.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: requests,
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
    logger.error('Error fetching emergency help requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch emergency help requests',
      error: error.message
    });
  }
};

// Get single emergency help request
export const getEmergencyRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const request = await EmergencyHelp.findById(id)
      .populate('userId', 'name email phone')
      .populate('assignedToNGO', 'name logo contactPhone contactEmail')
      .populate('assignedBy', 'name')
      .populate('verifiedBy', 'name');

    if (!request) {
      res.status(404).json({
        success: false,
        message: 'Emergency help request not found'
      });
      return;
    }

    res.json({
      success: true,
      data: request
    });
  } catch (error: any) {
    logger.error('Error fetching emergency help request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch emergency help request',
      error: error.message
    });
  }
};

// Assign emergency request to NGO (Admin only)
export const assignToNGO = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { ngoId } = req.body;
    const userId = req.user?._id?.toString();

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    // Check admin permissions
    if (!['admin', 'ngo'].includes(req.user?.role || '')) {
      res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
      return;
    }

    const request = await EmergencyHelp.findById(id);
    if (!request) {
      res.status(404).json({
        success: false,
        message: 'Emergency help request not found'
      });
      return;
    }

    // Verify NGO exists
    const ngo = await NGO.findById(ngoId);
    if (!ngo) {
      res.status(404).json({
        success: false,
        message: 'NGO not found'
      });
      return;
    }

    await (request as any).assignToNGO(ngoId, userId);

    const updatedRequest = await EmergencyHelp.findById(id)
      .populate('assignedToNGO', 'name logo contactPhone')
      .populate('assignedBy', 'name');

    res.json({
      success: true,
      message: 'Emergency request assigned to NGO successfully',
      data: updatedRequest
    });

    logger.info(`Emergency request ${id} assigned to NGO ${ngoId} by admin ${userId}`);
  } catch (error: any) {
    logger.error('Error assigning emergency request to NGO:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign emergency request to NGO',
      error: error.message
    });
  }
};

// Mark emergency request as resolved
export const markResolved = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { resolution } = req.body;
    const userId = req.user?._id?.toString();

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    const request = await EmergencyHelp.findById(id);
    if (!request) {
      res.status(404).json({
        success: false,
        message: 'Emergency help request not found'
      });
      return;
    }

    // Check permissions (assigned NGO admin or super admin)
    if (request.assignedToNGO) {
      const ngo = await NGO.findById(request.assignedToNGO);
      if (!ngo) {
        res.status(404).json({
          success: false,
          message: 'Associated NGO not found'
        });
        return;
      }

      const hasPermission = checkPermission(ngo, userId, req.user?.role);
      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Not authorized to resolve this request'
        });
        return;
      }
    } else {
      // Only super admin can resolve unassigned requests
      if (req.user?.role !== 'ngo') {
        res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
        return;
      }
    }

    await (request as any).markResolved(resolution);

    const updatedRequest = await EmergencyHelp.findById(id)
      .populate('assignedToNGO', 'name logo')
      .populate('assignedBy', 'name');

    res.json({
      success: true,
      message: 'Emergency request marked as resolved',
      data: updatedRequest
    });

    logger.info(`Emergency request ${id} marked as resolved by user ${userId}`);
  } catch (error: any) {
    logger.error('Error marking emergency request as resolved:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark emergency request as resolved',
      error: error.message
    });
  }
};

// Verify emergency request (Admin only)
export const verifyRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const userId = req.user?._id?.toString();

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    // Check admin permissions
    if (!['admin', 'ngo'].includes(req.user?.role || '')) {
      res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
      return;
    }

    const request = await EmergencyHelp.findById(id);
    if (!request) {
      res.status(404).json({
        success: false,
        message: 'Emergency help request not found'
      });
      return;
    }

    await (request as any).verify(userId, notes);

    res.json({
      success: true,
      message: 'Emergency request verified successfully',
      data: request
    });

    logger.info(`Emergency request ${id} verified by admin ${userId}`);
  } catch (error: any) {
    logger.error('Error verifying emergency request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify emergency request',
      error: error.message
    });
  }
};

// Reject emergency request (Admin only)
export const rejectRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const userId = req.user?._id?.toString();

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    // Check admin permissions
    if (!['admin', 'ngo'].includes(req.user?.role || '')) {
      res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
      return;
    }

    if (!notes) {
      res.status(400).json({
        success: false,
        message: 'Rejection notes are required'
      });
      return;
    }

    const request = await EmergencyHelp.findById(id);
    if (!request) {
      res.status(404).json({
        success: false,
        message: 'Emergency help request not found'
      });
      return;
    }

    await (request as any).reject(userId, notes);

    res.json({
      success: true,
      message: 'Emergency request rejected',
      data: request
    });

    logger.info(`Emergency request ${id} rejected by admin ${userId}`);
  } catch (error: any) {
    logger.error('Error rejecting emergency request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject emergency request',
      error: error.message
    });
  }
};

// Get emergency statistics for NGO
export const getEmergencyStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ngoId } = req.params;
    const userId = req.user?._id?.toString();

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    // Check permissions
    const ngo = await NGO.findById(ngoId);
    if (!ngo) {
      res.status(404).json({
        success: false,
        message: 'NGO not found'
      });
      return;
    }

    const hasPermission = checkPermission(ngo, userId, req.user?.role);
    if (!hasPermission) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to view these statistics'
      });
      return;
    }

    const stats = await (EmergencyHelp as any).getStatsByNGO(ngoId);

    res.json({
      success: true,
      data: stats[0] || {
        totalAssigned: 0,
        resolved: 0,
        inProgress: 0,
        pending: 0,
        totalCostIncurred: 0,
        averageResolutionTime: 0
      }
    });
  } catch (error: any) {
    logger.error('Error fetching emergency statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch emergency statistics',
      error: error.message
    });
  }
};
