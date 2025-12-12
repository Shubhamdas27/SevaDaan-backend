import { Request, Response } from 'express';
import Testimonial from '../models/Testimonial';
import NGO from '../models/NGO';
import Program from '../models/Program';
import { checkPermission } from '../utils/permissions';
import logger from '../utils/logger';

// Create testimonial
export const createTestimonial = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      ngo,
      name,
      designation,
      company,
      message,
      rating,
      image,
      program,
      donationId,
      volunteerExperience,
      contactEmail,
      location
    } = req.body;

    // Verify NGO exists
    const ngoExists = await NGO.findById(ngo);
    if (!ngoExists) {
      res.status(404).json({
        success: false,
        message: 'NGO not found'
      });
      return;
    }

    // Verify program if provided
    if (program) {
      const programExists = await Program.findById(program);
      if (!programExists) {
        res.status(404).json({
          success: false,
          message: 'Program not found'
        });
        return;
      }
    }

    const testimonial = new Testimonial({
      ngo,
      name,
      designation,
      company,
      message,
      rating,
      image,
      program,
      donationId,
      volunteerExperience,
      contactEmail,
      location
    });

    await testimonial.save();

    res.status(201).json({
      success: true,
      message: 'Testimonial submitted successfully',
      data: testimonial
    });

    logger.info(`Testimonial created for NGO ${ngo}`);
  } catch (error: any) {
    logger.error('Error creating testimonial:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create testimonial',
      error: error.message
    });
  }
};

// Get testimonials with filters
export const getTestimonials = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      ngo,
      program,
      rating,
      approved,
      featured,
      visible,
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
    
    if (ngo) query.ngo = ngo;
    if (program) query.program = program;
    if (rating) query.rating = { $gte: parseInt(rating as string) };
    if (approved !== undefined) query.isApproved = approved === 'true';
    if (featured !== undefined) query.isFeatured = featured === 'true';
    if (visible !== undefined) query.isVisible = visible === 'true';

    // Build sort object
    const sortObj: any = {};
    sortObj[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

    const [testimonials, total] = await Promise.all([
      Testimonial.find(query)
        .populate('ngo', 'name logo')
        .populate('program', 'title')
        .populate('approvedBy', 'name')
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Testimonial.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: testimonials,
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
    logger.error('Error fetching testimonials:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch testimonials',
      error: error.message
    });
  }
};

// Get single testimonial
export const getTestimonial = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const testimonial = await Testimonial.findById(id)
      .populate('ngo', 'name logo')
      .populate('program', 'title')
      .populate('approvedBy', 'name');

    if (!testimonial) {
      res.status(404).json({
        success: false,
        message: 'Testimonial not found'
      });
      return;
    }

    res.json({
      success: true,
      data: testimonial
    });
  } catch (error: any) {
    logger.error('Error fetching testimonial:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch testimonial',
      error: error.message
    });
  }
};

// Update testimonial
export const updateTestimonial = async (req: Request, res: Response): Promise<void> => {
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

    const testimonial = await Testimonial.findById(id);
    if (!testimonial) {
      res.status(404).json({
        success: false,
        message: 'Testimonial not found'
      });
      return;
    }

    // Check permissions
    const ngo = await NGO.findById(testimonial.ngo);
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
        message: 'Not authorized to update this testimonial'
      });
      return;
    }

    const updateFields = {
      name: req.body.name,
      designation: req.body.designation,
      company: req.body.company,
      message: req.body.message,
      rating: req.body.rating,
      image: req.body.image,
      contactEmail: req.body.contactEmail,
      location: req.body.location
    };

    // Remove undefined fields
    Object.keys(updateFields).forEach(key => 
      updateFields[key as keyof typeof updateFields] === undefined && 
      delete updateFields[key as keyof typeof updateFields]
    );

    const updatedTestimonial = await Testimonial.findByIdAndUpdate(
      id,
      updateFields,
      { new: true, runValidators: true }
    ).populate('ngo', 'name logo').populate('program', 'title');

    res.json({
      success: true,
      message: 'Testimonial updated successfully',
      data: updatedTestimonial
    });

    logger.info(`Testimonial ${id} updated by user ${userId}`);
  } catch (error: any) {
    logger.error('Error updating testimonial:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update testimonial',
      error: error.message
    });
  }
};

// Delete testimonial
export const deleteTestimonial = async (req: Request, res: Response): Promise<void> => {
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

    const testimonial = await Testimonial.findById(id);
    if (!testimonial) {
      res.status(404).json({
        success: false,
        message: 'Testimonial not found'
      });
      return;
    }

    // Check permissions
    const ngo = await NGO.findById(testimonial.ngo);
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
        message: 'Not authorized to delete this testimonial'
      });
      return;
    }

    await Testimonial.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Testimonial deleted successfully'
    });

    logger.info(`Testimonial ${id} deleted by user ${userId}`);
  } catch (error: any) {
    logger.error('Error deleting testimonial:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete testimonial',
      error: error.message
    });
  }
};

// Approve testimonial (Admin only)
export const approveTestimonial = async (req: Request, res: Response): Promise<void> => {
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

    const testimonial = await Testimonial.findById(id);
    if (!testimonial) {
      res.status(404).json({
        success: false,
        message: 'Testimonial not found'
      });
      return;
    }

    await testimonial.approve(userId, notes);

    res.json({
      success: true,
      message: 'Testimonial approved successfully',
      data: testimonial
    });

    logger.info(`Testimonial ${id} approved by admin ${userId}`);
  } catch (error: any) {
    logger.error('Error approving testimonial:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve testimonial',
      error: error.message
    });
  }
};

// Reject testimonial (Admin only)
export const rejectTestimonial = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
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

    if (!reason) {
      res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
      return;
    }

    const testimonial = await Testimonial.findById(id);
    if (!testimonial) {
      res.status(404).json({
        success: false,
        message: 'Testimonial not found'
      });
      return;
    }

    await testimonial.reject(reason, userId);

    res.json({
      success: true,
      message: 'Testimonial rejected successfully',
      data: testimonial
    });

    logger.info(`Testimonial ${id} rejected by admin ${userId}`);
  } catch (error: any) {
    logger.error('Error rejecting testimonial:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject testimonial',
      error: error.message
    });
  }
};

// Toggle featured status
export const toggleFeatured = async (req: Request, res: Response): Promise<void> => {
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

    // Check admin permissions
    if (!['admin', 'ngo'].includes(req.user?.role || '')) {
      res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
      return;
    }

    const testimonial = await Testimonial.findById(id);
    if (!testimonial) {
      res.status(404).json({
        success: false,
        message: 'Testimonial not found'
      });
      return;
    }

    await testimonial.toggleFeatured();

    res.json({
      success: true,
      message: `Testimonial ${testimonial.isFeatured ? 'featured' : 'unfeatured'} successfully`,
      data: testimonial
    });

    logger.info(`Testimonial ${id} featured status toggled by admin ${userId}`);
  } catch (error: any) {
    logger.error('Error toggling featured status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle featured status',
      error: error.message
    });
  }
};

// Get featured testimonials
export const getFeaturedTestimonials = async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit = '6' } = req.query;
    const limitNum = Math.min(20, Math.max(1, parseInt(limit as string)));

    const testimonials = await (Testimonial as any).getFeatured(limitNum);

    res.json({
      success: true,
      data: testimonials
    });
  } catch (error: any) {
    logger.error('Error fetching featured testimonials:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch featured testimonials',
      error: error.message
    });
  }
};

// Get testimonial statistics for NGO
export const getTestimonialStats = async (req: Request, res: Response): Promise<void> => {
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

    const stats = await (Testimonial as any).getStatsByNGO(ngoId);

    res.json({
      success: true,
      data: stats[0] || {
        totalTestimonials: 0,
        approvedTestimonials: 0,
        pendingTestimonials: 0,
        averageRating: 0,
        featuredCount: 0
      }
    });
  } catch (error: any) {
    logger.error('Error fetching testimonial stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch testimonial statistics',
      error: error.message
    });
  }
};
