import { Request, Response } from 'express';
import Notice from '../models/Notice';
import NGO from '../models/NGO';
import { checkPermission } from '../utils/permissions';
import logger from '../utils/logger';

// Create notice
export const createNotice = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      ngoId,
      title,
      content,
      type,
      isHighlighted,
      expiryDate,
      attachmentUrls
    } = req.body;
    
    const userId = req.user?._id?.toString();
    
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    // Verify NGO exists and user has permission
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
        message: 'Not authorized to create notices for this NGO'
      });
      return;
    }

    const notice = new Notice({
      ngoId,
      title,
      content,
      type,
      isHighlighted,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      attachmentUrls: attachmentUrls || [],
      createdBy: userId
    });

    await notice.save();

    const populatedNotice = await Notice.findById(notice._id)
      .populate('ngoId', 'name logo')
      .populate('createdBy', 'name');

    res.status(201).json({
      success: true,
      message: 'Notice created successfully',
      data: populatedNotice
    });

    logger.info(`Notice created for NGO ${ngoId} by user ${userId}`);
  } catch (error: any) {
    logger.error('Error creating notice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create notice',
      error: error.message
    });
  }
};

// Get notices with filters
export const getNotices = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      ngoId,
      type,
      highlighted,
      active,
      page = '1',
      limit = '10',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    // Build query
    const query: any = {};
    
    if (ngoId) query.ngoId = ngoId;
    if (type) query.type = type;
    if (highlighted !== undefined) query.isHighlighted = highlighted === 'true';
    if (active !== undefined) query.isActive = active === 'true';

    // Filter out expired notices by default
    if (active !== 'false') {
      query.$or = [
        { expiryDate: { $exists: false } },
        { expiryDate: null },
        { expiryDate: { $gt: new Date() } }
      ];
    }

    // Build sort object
    const sortObj: any = {};
    sortObj[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

    const [notices, total] = await Promise.all([
      Notice.find(query)
        .populate('ngoId', 'name logo')
        .populate('createdBy', 'name')
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Notice.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: notices,
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
    logger.error('Error fetching notices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notices',
      error: error.message
    });
  }
};

// Get single notice
export const getNotice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const notice = await Notice.findById(id)
      .populate('ngoId', 'name logo')
      .populate('createdBy', 'name');

    if (!notice) {
      res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
      return;
    }

    res.json({
      success: true,
      data: notice
    });
  } catch (error: any) {
    logger.error('Error fetching notice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notice',
      error: error.message
    });
  }
};

// Update notice
export const updateNotice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?._id?.toString();

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    const notice = await Notice.findById(id);
    if (!notice) {
      res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
      return;
    }

    // Check permissions
    const ngo = await NGO.findById(notice.ngoId);
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
        message: 'Not authorized to update this notice'
      });
      return;
    }

    const updateFields = {
      title: req.body.title,
      content: req.body.content,
      type: req.body.type,
      isHighlighted: req.body.isHighlighted,
      expiryDate: req.body.expiryDate ? new Date(req.body.expiryDate) : undefined,
      attachmentUrls: req.body.attachmentUrls,
      isActive: req.body.isActive
    };

    // Remove undefined fields
    Object.keys(updateFields).forEach(key => 
      updateFields[key as keyof typeof updateFields] === undefined && 
      delete updateFields[key as keyof typeof updateFields]
    );

    const updatedNotice = await Notice.findByIdAndUpdate(
      id,
      updateFields,
      { new: true, runValidators: true }
    ).populate('ngoId', 'name logo').populate('createdBy', 'name');

    res.json({
      success: true,
      message: 'Notice updated successfully',
      data: updatedNotice
    });

    logger.info(`Notice ${id} updated by user ${userId}`);
  } catch (error: any) {
    logger.error('Error updating notice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notice',
      error: error.message
    });
  }
};

// Delete notice
export const deleteNotice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?._id?.toString();

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    const notice = await Notice.findById(id);
    if (!notice) {
      res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
      return;
    }

    // Check permissions
    const ngo = await NGO.findById(notice.ngoId);
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
        message: 'Not authorized to delete this notice'
      });
      return;
    }

    await Notice.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Notice deleted successfully'
    });

    logger.info(`Notice ${id} deleted by user ${userId}`);
  } catch (error: any) {
    logger.error('Error deleting notice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notice',
      error: error.message
    });
  }
};

// Toggle highlight status
export const toggleHighlight = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?._id?.toString();

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    const notice = await Notice.findById(id);
    if (!notice) {
      res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
      return;
    }

    // Check permissions
    const ngo = await NGO.findById(notice.ngoId);
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
        message: 'Not authorized to modify this notice'
      });
      return;
    }

    await (notice as any).toggleHighlight();

    res.json({
      success: true,
      message: `Notice ${notice.isHighlighted ? 'highlighted' : 'unhighlighted'} successfully`,
      data: notice
    });

    logger.info(`Notice ${id} highlight status toggled by user ${userId}`);
  } catch (error: any) {
    logger.error('Error toggling highlight status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle highlight status',
      error: error.message
    });
  }
};

// Get highlighted notices
export const getHighlightedNotices = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ngoId } = req.query;

    const notices = await (Notice as any).getHighlighted(ngoId as string);

    res.json({
      success: true,
      data: notices
    });
  } catch (error: any) {
    logger.error('Error fetching highlighted notices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch highlighted notices',
      error: error.message
    });
  }
};

// Get notice statistics for NGO
export const getNoticeStats = async (req: Request, res: Response): Promise<void> => {
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

    const stats = await (Notice as any).getStatsByNGO(ngoId);

    res.json({
      success: true,
      data: stats[0] || {
        totalNotices: 0,
        activeNotices: 0,
        highlightedNotices: 0,
        expiredNotices: 0,
        noticesByType: []
      }
    });
  } catch (error: any) {
    logger.error('Error fetching notice stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notice statistics',
      error: error.message
    });
  }
};

// Cleanup expired notices
export const cleanupExpired = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check admin permissions
    if (!['admin', 'ngo'].includes(req.user?.role || '')) {
      res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
      return;
    }

    const result = await (Notice as any).cleanupExpired();

    res.json({
      success: true,
      message: 'Expired notices cleaned up successfully',
      data: {
        modifiedCount: result.modifiedCount
      }
    });

    logger.info(`Expired notices cleanup: ${result.modifiedCount} notices deactivated`);
  } catch (error: any) {
    logger.error('Error cleaning up expired notices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup expired notices',
      error: error.message
    });
  }
};
