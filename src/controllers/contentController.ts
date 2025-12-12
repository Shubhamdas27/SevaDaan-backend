import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import NGO from '../models/NGO';
import Announcement from '../models/Announcement';
import logger from '../utils/logger';

// File upload utility function
const getFileUrl = (fileName: string, fileType: 'logo' | 'banner' | 'event' | 'document' = 'document'): string => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  return `${baseUrl}/uploads/${fileType}s/${fileName}`;
};

// Content Management Controller
export class ContentController {
  
  /**
   * Upload NGO logo
   */
  static async uploadLogo(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?._id;
      const file = req.file;

      if (!file) {
        res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
        return;
      }

      // Find user's NGO
      const ngo = await NGO.findOne({ adminId: userId });
      if (!ngo) {
        res.status(404).json({
          success: false,
          message: 'NGO not found'
        });
        return;
      }

      // Get file URL based on uploaded file
      const logoUrl = getFileUrl(file.filename, 'logo');
      
      // Update NGO with new logo
      ngo.logo = logoUrl;
      await ngo.save();

      res.json({
        success: true,
        message: 'Logo uploaded successfully',
        data: { logoUrl }
      });

      logger.info(`Logo uploaded for NGO: ${ngo._id}`);
    } catch (error: any) {
      logger.error('Error uploading logo:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload logo',
        error: error.message
      });
    }
  }

  /**
   * Upload banner images
   */
  static async uploadBanner(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?._id;
      const file = req.file;

      if (!file) {
        res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
        return;
      }

      const ngo = await NGO.findOne({ adminId: userId });
      if (!ngo) {
        res.status(404).json({
          success: false,
          message: 'NGO not found'
        });
        return;
      }

      // Get banner URL from uploaded file
      const bannerUrl = getFileUrl(file.filename, 'banner');

      // Update NGO with banner URL (store as coverImage)
      ngo.coverImage = bannerUrl;
      await ngo.save();

      res.json({
        success: true,
        message: 'Banner uploaded successfully',
        data: { bannerUrl }
      });

      logger.info(`Banner uploaded for NGO: ${ngo._id}`);
    } catch (error: any) {
      logger.error('Error uploading banner:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload banner',
        error: error.message
      });
    }
  }

  /**
   * Update NGO content
   */
  static async updateContent(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?._id;
      const {
        description,
        mission,
        vision,
        website,
        operationalAreas,
        targetBeneficiaries
      } = req.body;

      const ngo = await NGO.findOne({ adminId: userId });
      if (!ngo) {
        res.status(404).json({
          success: false,
          message: 'NGO not found'
        });
        return;
      }

      // Update content fields that exist in the NGO model
      if (description) ngo.description = description;
      if (mission) ngo.mission = mission;
      if (vision) ngo.vision = vision;
      if (website) ngo.website = website;
      if (operationalAreas) ngo.operationalAreas = operationalAreas;
      if (targetBeneficiaries) ngo.targetBeneficiaries = targetBeneficiaries;

      await ngo.save();

      res.json({
        success: true,
        message: 'Content updated successfully',
        data: ngo
      });

      logger.info(`Content updated for NGO: ${ngo._id}`);
    } catch (error: any) {
      logger.error('Error updating content:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update content',
        error: error.message
      });
    }
  }

  /**
   * Get NGO content
   */
  static async getContent(req: Request, res: Response): Promise<void> {
    try {
      const { ngoId } = req.params;

      const ngo = await NGO.findById(ngoId).select(
        'name description mission vision logo coverImage website operationalAreas targetBeneficiaries socialLinks'
      );

      if (!ngo) {
        res.status(404).json({
          success: false,
          message: 'NGO not found'
        });
        return;
      }

      res.json({
        success: true,
        data: ngo
      });
    } catch (error: any) {
      logger.error('Error fetching content:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch content',
        error: error.message
      });
    }
  }

  /**
   * Create announcement
   */
  static async createAnnouncement(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?._id;
      const { 
        title, 
        content, 
        type = 'general',
        priority = 'medium',
        targetAudience = ['all'],
        expiryDate,
        tags = []
      } = req.body;

      const ngo = await NGO.findOne({ adminId: userId });
      if (!ngo) {
        res.status(404).json({
          success: false,
          message: 'NGO not found'
        });
        return;
      }

      // Create new announcement using the Announcement model
      const announcement = new Announcement({
        ngoId: ngo._id,
        title,
        content,
        type,
        priority,
        targetAudience,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        createdBy: userId,
        tags,
        isActive: true
      });

      await announcement.save();

      res.json({
        success: true,
        message: 'Announcement created successfully',
        data: announcement
      });

      logger.info(`Announcement created for NGO: ${ngo._id}`);
    } catch (error: any) {
      logger.error('Error creating announcement:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create announcement',
        error: error.message
      });
    }
  }

  /**
   * Get announcements (with pagination and filtering)
   */
  static async getAnnouncements(req: Request, res: Response): Promise<void> {
    try {
      const { ngoId, type, priority, page = 1, limit = 10, targetRole } = req.query;
      
      const query: any = { isActive: true };
      
      if (ngoId) query.ngoId = ngoId;
      if (type) query.type = type;
      if (priority) query.priority = priority;
      
      // Add expiry filter
      query.$or = [
        { expiryDate: { $exists: false } },
        { expiryDate: { $gte: new Date() } }
      ];

      // Add target audience filter
      if (targetRole && targetRole !== 'all') {
        query.targetAudience = { $in: [targetRole, 'all'] };
      }

      // Ensure published announcements only
      query.publishedAt = { $lte: new Date() };

      const skip = (Number(page) - 1) * Number(limit);
      
      const [announcements, total] = await Promise.all([
        Announcement.find(query)
          .populate('ngoId', 'name logo')
          .populate('createdBy', 'name')
          .sort({ priority: -1, publishedAt: -1 })
          .skip(skip)
          .limit(Number(limit)),
        Announcement.countDocuments(query)
      ]);

      res.json({
        success: true,
        data: {
          announcements,
          pagination: {
            current: Number(page),
            total: Math.ceil(total / Number(limit)),
            count: announcements.length,
            totalItems: total
          }
        }
      });
    } catch (error: any) {
      logger.error('Error fetching announcements:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch announcements',
        error: error.message
      });
    }
  }

  /**
   * Update NGO content (description, contact info, etc.)
   */
  static async updateNGOContent(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?._id;
      const updateData = req.body;

      const ngo = await NGO.findOne({ adminId: userId });
      if (!ngo) {
        res.status(404).json({
          success: false,
          message: 'NGO not found'
        });
        return;
      }

      // Update allowed fields
      const allowedFields = [
        'description', 'location', 'contactDetails', 
        'businessHours', 'services', 'website', 'about'
      ];

      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          (ngo as any)[field] = updateData[field];
        }
      });

      await ngo.save();

      res.json({
        success: true,
        message: 'NGO content updated successfully',
        data: ngo
      });

      logger.info(`NGO content updated: ${ngo._id}`);
    } catch (error: any) {
      logger.error('Error updating NGO content:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update NGO content',
        error: error.message
      });
    }
  }

  /**
   * Get NGO content (public access)
   */
  static async getNGOContent(req: Request, res: Response): Promise<void> {
    try {
      const { ngoId } = req.params;
      
      let ngo;
      if (ngoId) {
        ngo = await NGO.findById(ngoId).select('-adminId -createdAt -updatedAt');
      } else {
        // Return first NGO if no ID specified (for demo purposes)
        ngo = await NGO.findOne({}).select('-adminId -createdAt -updatedAt');
      }

      if (!ngo) {
        res.status(404).json({
          success: false,
          message: 'NGO not found'
        });
        return;
      }

      res.json({
        success: true,
        data: ngo
      });
    } catch (error: any) {
      logger.error('Error fetching NGO content:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch NGO content',
        error: error.message
      });
    }
  }

  /**
   * Get content analytics
   */
  static async getContentAnalytics(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?._id;

      const ngo = await NGO.findOne({ adminId: userId });
      if (!ngo) {
        res.status(404).json({
          success: false,
          message: 'NGO not found'
        });
        return;
      }

      // Calculate analytics from real announcement data
      const [
        totalAnnouncements,
        activeAnnouncements,
        announcementStats,
        topPerforming
      ] = await Promise.all([
        Announcement.countDocuments({ ngoId: ngo._id }),
        Announcement.countDocuments({ ngoId: ngo._id, isActive: true }),
        Announcement.aggregate([
          { $match: { ngoId: ngo._id } },
          {
            $group: {
              _id: null,
              totalViews: { $sum: '$viewCount' },
              avgViews: { $avg: '$viewCount' }
            }
          }
        ]),
        Announcement.find({ ngoId: ngo._id })
          .sort({ viewCount: -1 })
          .limit(5)
          .select('title viewCount type priority')
      ]);

      const stats = announcementStats[0] || { totalViews: 0, avgViews: 0 };

      const analytics = {
        content: {
          totalAnnouncements,
          activeAnnouncements,
          totalViews: stats.totalViews,
          averageViewsPerAnnouncement: Math.round(stats.avgViews || 0)
        },
        engagement: {
          thisMonth: {
            announcements: await Announcement.countDocuments({
              ngoId: ngo._id,
              createdAt: {
                $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
              }
            }),
            views: 0 // TODO: Implement monthly view tracking
          },
          lastMonth: {
            announcements: await Announcement.countDocuments({
              ngoId: ngo._id,
              createdAt: {
                $gte: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
                $lt: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
              }
            }),
            views: 0
          }
        },
        topPerforming
      };

      res.json({
        success: true,
        data: analytics
      });
    } catch (error: any) {
      logger.error('Error fetching content analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch content analytics',
        error: error.message
      });
    }
  }

  /**
   * Update announcement
   */
  static async updateAnnouncement(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?._id;
      const updateData = req.body;

      const ngo = await NGO.findOne({ adminId: userId });
      if (!ngo) {
        res.status(404).json({
          success: false,
          message: 'NGO not found'
        });
        return;
      }

      const announcement = await Announcement.findOne({ _id: id, ngoId: ngo._id });
      if (!announcement) {
        res.status(404).json({
          success: false,
          message: 'Announcement not found'
        });
        return;
      }

      // Update allowed fields
      const allowedFields = ['title', 'content', 'type', 'priority', 'targetAudience', 'expiryDate', 'tags', 'isActive'];
      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          (announcement as any)[field] = updateData[field];
        }
      });

      announcement.updatedBy = userId;
      await announcement.save();

      res.json({
        success: true,
        message: 'Announcement updated successfully',
        data: announcement
      });

      logger.info(`Announcement updated: ${id}`);
    } catch (error: any) {
      logger.error('Error updating announcement:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update announcement',
        error: error.message
      });
    }
  }

  /**
   * Delete announcement
   */
  static async deleteAnnouncement(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?._id;

      const ngo = await NGO.findOne({ adminId: userId });
      if (!ngo) {
        res.status(404).json({
          success: false,
          message: 'NGO not found'
        });
        return;
      }

      const announcement = await Announcement.findOneAndDelete({ _id: id, ngoId: ngo._id });
      if (!announcement) {
        res.status(404).json({
          success: false,
          message: 'Announcement not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Announcement deleted successfully'
      });

      logger.info(`Announcement deleted: ${id}`);
    } catch (error: any) {
      logger.error('Error deleting announcement:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete announcement',
        error: error.message
      });
    }
  }

  /**
   * Get single announcement by ID
   */
  static async getAnnouncementById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const announcement = await Announcement.findById(id)
        .populate('ngoId', 'name logo')
        .populate('createdBy', 'name')
        .populate('updatedBy', 'name');

      if (!announcement) {
        res.status(404).json({
          success: false,
          message: 'Announcement not found'
        });
        return;
      }

      // Increment view count
      announcement.viewCount += 1;
      await announcement.save();

      res.json({
        success: true,
        data: announcement
      });

      logger.info(`Announcement viewed: ${id}`);
    } catch (error: any) {
      logger.error('Error fetching announcement:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch announcement',
        error: error.message
      });
    }
  }

  /**
   * Get urgent announcements for a specific NGO
   */
  static async getUrgentAnnouncements(req: Request, res: Response): Promise<void> {
    try {
      const { ngoId } = req.params;

      const urgentAnnouncements = await (Announcement as any).getUrgentAnnouncements(ngoId);

      res.json({
        success: true,
        data: urgentAnnouncements
      });
    } catch (error: any) {
      logger.error('Error fetching urgent announcements:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch urgent announcements',
        error: error.message
      });
    }
  }

  /**
   * Update homepage content
   */
  static async updateHomepageContent(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?._id;
      const { featuredPrograms, heroSection, aboutSection, testimonialIds } = req.body;

      const ngo = await NGO.findOne({ adminId: userId });
      if (!ngo) {
        res.status(404).json({
          success: false,
          message: 'NGO not found'
        });
        return;
      }

      // For now, store homepage content in NGO's metadata or create a separate collection
      // This is a simplified approach - in production, you might want a separate HomePage model
      const homepageContent = {
        featuredPrograms: featuredPrograms || [],
        heroSection: heroSection || {},
        aboutSection: aboutSection || {},
        testimonialIds: testimonialIds || [],
        lastUpdated: new Date(),
        updatedBy: userId
      };

      // Store in NGO document temporarily (would be better in separate collection)
      (ngo as any).homepageContent = homepageContent;
      await ngo.save();

      res.json({
        success: true,
        message: 'Homepage content updated successfully',
        data: homepageContent
      });

      logger.info(`Homepage content updated for NGO: ${ngo._id}`);
    } catch (error: any) {
      logger.error('Error updating homepage content:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update homepage content',
        error: error.message
      });
    }
  }

  /**
   * Get homepage content
   */
  static async getHomepageContent(req: Request, res: Response): Promise<void> {
    try {
      const { ngoId } = req.params;

      let ngo;
      if (ngoId) {
        ngo = await NGO.findById(ngoId);
      } else {
        ngo = await NGO.findOne({});
      }

      if (!ngo) {
        res.status(404).json({
          success: false,
          message: 'NGO not found'
        });
        return;
      }

      const homepageContent = (ngo as any).homepageContent || {
        featuredPrograms: [],
        heroSection: {
          title: ngo.name,
          subtitle: ngo.description,
          backgroundImage: ngo.coverImage
        },
        aboutSection: {
          mission: ngo.mission,
          vision: ngo.vision
        },
        testimonialIds: []
      };

      res.json({
        success: true,
        data: homepageContent
      });
    } catch (error: any) {
      logger.error('Error fetching homepage content:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch homepage content',
        error: error.message
      });
    }
  }

  /**
   * Batch update announcements
   */
  static async batchUpdateAnnouncements(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?._id;
      const { announcementIds, updates } = req.body;

      if (!announcementIds || !Array.isArray(announcementIds) || announcementIds.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Invalid announcement IDs provided'
        });
        return;
      }

      const ngo = await NGO.findOne({ adminId: userId });
      if (!ngo) {
        res.status(404).json({
          success: false,
          message: 'NGO not found'
        });
        return;
      }

      // Update announcements
      const result = await Announcement.updateMany(
        { 
          _id: { $in: announcementIds }, 
          ngoId: ngo._id 
        },
        { 
          ...updates,
          updatedBy: userId,
          updatedAt: new Date()
        }
      );

      res.json({
        success: true,
        message: `${result.modifiedCount} announcements updated successfully`,
        data: { modifiedCount: result.modifiedCount }
      });

      logger.info(`Batch update: ${result.modifiedCount} announcements updated for NGO: ${ngo._id}`);
    } catch (error: any) {
      logger.error('Error in batch update announcements:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update announcements',
        error: error.message
      });
    }
  }

  /**
   * Archive announcement
   */
  static async archiveAnnouncement(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?._id;

      const ngo = await NGO.findOne({ adminId: userId });
      if (!ngo) {
        res.status(404).json({
          success: false,
          message: 'NGO not found'
        });
        return;
      }

      const announcement = await Announcement.findOne({ _id: id, ngoId: ngo._id });
      if (!announcement) {
        res.status(404).json({
          success: false,
          message: 'Announcement not found'
        });
        return;
      }

      announcement.isActive = false;
      announcement.updatedBy = userId;
      await announcement.save();

      res.json({
        success: true,
        message: 'Announcement archived successfully',
        data: announcement
      });

      logger.info(`Announcement archived: ${id}`);
    } catch (error: any) {
      logger.error('Error archiving announcement:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to archive announcement',
        error: error.message
      });
    }
  }

  /**
   * Restore archived announcement
   */
  static async restoreAnnouncement(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?._id;

      const ngo = await NGO.findOne({ adminId: userId });
      if (!ngo) {
        res.status(404).json({
          success: false,
          message: 'NGO not found'
        });
        return;
      }

      const announcement = await Announcement.findOne({ _id: id, ngoId: ngo._id });
      if (!announcement) {
        res.status(404).json({
          success: false,
          message: 'Announcement not found'
        });
        return;
      }

      announcement.isActive = true;
      announcement.updatedBy = userId;
      await announcement.save();

      res.json({
        success: true,
        message: 'Announcement restored successfully',
        data: announcement
      });

      logger.info(`Announcement restored: ${id}`);
    } catch (error: any) {
      logger.error('Error restoring announcement:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to restore announcement',
        error: error.message
      });
    }
  }

  /**
   * Get archived announcements
   */
  static async getArchivedAnnouncements(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?._id;
      const { page = 1, limit = 10 } = req.query;

      const ngo = await NGO.findOne({ adminId: userId });
      if (!ngo) {
        res.status(404).json({
          success: false,
          message: 'NGO not found'
        });
        return;
      }

      const skip = (Number(page) - 1) * Number(limit);
      const query = { ngoId: ngo._id, isActive: false };

      const [announcements, total] = await Promise.all([
        Announcement.find(query)
          .populate('createdBy', 'name')
          .populate('updatedBy', 'name')
          .sort({ updatedAt: -1 })
          .skip(skip)
          .limit(Number(limit)),
        Announcement.countDocuments(query)
      ]);

      res.json({
        success: true,
        data: {
          announcements,
          pagination: {
            current: Number(page),
            total: Math.ceil(total / Number(limit)),
            count: announcements.length,
            totalItems: total
          }
        }
      });
    } catch (error: any) {
      logger.error('Error fetching archived announcements:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch archived announcements',
        error: error.message
      });
    }
  }

  /**
   * Create content template
   */
  static async createContentTemplate(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?._id;
      const { name, type, templateData } = req.body;

      const ngo = await NGO.findOne({ adminId: userId });
      if (!ngo) {
        res.status(404).json({
          success: false,
          message: 'NGO not found'
        });
        return;
      }

      // Store template in NGO's metadata (or create separate Template model)
      const templates = (ngo as any).contentTemplates || [];
      const newTemplate = {
        id: Date.now().toString(),
        name,
        type, // 'announcement', 'email', 'page'
        templateData,
        createdBy: userId,
        createdAt: new Date()
      };

      templates.push(newTemplate);
      (ngo as any).contentTemplates = templates;
      await ngo.save();

      res.json({
        success: true,
        message: 'Content template created successfully',
        data: newTemplate
      });

      logger.info(`Content template created for NGO: ${ngo._id}`);
    } catch (error: any) {
      logger.error('Error creating content template:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create content template',
        error: error.message
      });
    }
  }

  /**
   * Get content templates
   */
  static async getContentTemplates(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?._id;
      const { type } = req.query;

      const ngo = await NGO.findOne({ adminId: userId });
      if (!ngo) {
        res.status(404).json({
          success: false,
          message: 'NGO not found'
        });
        return;
      }

      let templates = (ngo as any).contentTemplates || [];
      
      if (type) {
        templates = templates.filter((template: any) => template.type === type);
      }

      res.json({
        success: true,
        data: templates
      });
    } catch (error: any) {
      logger.error('Error fetching content templates:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch content templates',
        error: error.message
      });
    }
  }

  /**
   * Schedule announcement
   */
  static async scheduleAnnouncement(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?._id;
      const { 
        title, 
        content, 
        type = 'general',
        priority = 'medium',
        targetAudience = ['all'],
        scheduledDate,
        expiryDate,
        tags = []
      } = req.body;

      if (!scheduledDate) {
        res.status(400).json({
          success: false,
          message: 'Scheduled date is required'
        });
        return;
      }

      const scheduledDateObj = new Date(scheduledDate);
      if (scheduledDateObj <= new Date()) {
        res.status(400).json({
          success: false,
          message: 'Scheduled date must be in the future'
        });
        return;
      }

      const ngo = await NGO.findOne({ adminId: userId });
      if (!ngo) {
        res.status(404).json({
          success: false,
          message: 'NGO not found'
        });
        return;
      }

      // Create announcement with future publishedAt date
      const announcement = new Announcement({
        ngoId: ngo._id,
        title,
        content,
        type,
        priority,
        targetAudience,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        createdBy: userId,
        tags,
        isActive: true,
        publishedAt: scheduledDateObj
      });

      await announcement.save();

      res.json({
        success: true,
        message: 'Announcement scheduled successfully',
        data: announcement
      });

      logger.info(`Announcement scheduled for NGO: ${ngo._id}, publish date: ${scheduledDateObj}`);
    } catch (error: any) {
      logger.error('Error scheduling announcement:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to schedule announcement',
        error: error.message
      });
    }
  }

  /**
   * Get scheduled announcements
   */
  static async getScheduledAnnouncements(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?._id;
      const { page = 1, limit = 10 } = req.query;

      const ngo = await NGO.findOne({ adminId: userId });
      if (!ngo) {
        res.status(404).json({
          success: false,
          message: 'NGO not found'
        });
        return;
      }

      const skip = (Number(page) - 1) * Number(limit);
      const query = { 
        ngoId: ngo._id, 
        isActive: true,
        publishedAt: { $gt: new Date() }
      };

      const [announcements, total] = await Promise.all([
        Announcement.find(query)
          .populate('createdBy', 'name')
          .sort({ publishedAt: 1 })
          .skip(skip)
          .limit(Number(limit)),
        Announcement.countDocuments(query)
      ]);

      res.json({
        success: true,
        data: {
          announcements,
          pagination: {
            current: Number(page),
            total: Math.ceil(total / Number(limit)),
            count: announcements.length,
            totalItems: total
          }
        }
      });
    } catch (error: any) {
      logger.error('Error fetching scheduled announcements:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch scheduled announcements',
        error: error.message
      });
    }
  }

  /**
   * Update SEO metadata for NGO
   */
  static async updateSEOMetadata(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?._id;
      const { 
        metaTitle, 
        metaDescription, 
        keywords, 
        ogTitle, 
        ogDescription, 
        ogImage,
        schema
      } = req.body;

      const ngo = await NGO.findOne({ adminId: userId });
      if (!ngo) {
        res.status(404).json({
          success: false,
          message: 'NGO not found'
        });
        return;
      }

      // Store SEO metadata in NGO document
      const seoMetadata = {
        metaTitle: metaTitle || ngo.name,
        metaDescription: metaDescription || ngo.description,
        keywords: keywords || [],
        ogTitle: ogTitle || ngo.name,
        ogDescription: ogDescription || ngo.description,
        ogImage: ogImage || ngo.logo,
        schema: schema || {},
        lastUpdated: new Date(),
        updatedBy: userId
      };

      (ngo as any).seoMetadata = seoMetadata;
      await ngo.save();

      res.json({
        success: true,
        message: 'SEO metadata updated successfully',
        data: seoMetadata
      });

      logger.info(`SEO metadata updated for NGO: ${ngo._id}`);
    } catch (error: any) {
      logger.error('Error updating SEO metadata:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update SEO metadata',
        error: error.message
      });
    }
  }

  /**
   * Get SEO metadata
   */
  static async getSEOMetadata(req: Request, res: Response): Promise<void> {
    try {
      const { ngoId } = req.params;

      let ngo;
      if (ngoId) {
        ngo = await NGO.findById(ngoId);
      } else {
        ngo = await NGO.findOne({});
      }

      if (!ngo) {
        res.status(404).json({
          success: false,
          message: 'NGO not found'
        });
        return;
      }

      const seoMetadata = (ngo as any).seoMetadata || {
        metaTitle: ngo.name,
        metaDescription: ngo.description,
        keywords: [],
        ogTitle: ngo.name,
        ogDescription: ngo.description,
        ogImage: ngo.logo,
        schema: {}
      };

      res.json({
        success: true,
        data: seoMetadata
      });
    } catch (error: any) {
      logger.error('Error fetching SEO metadata:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch SEO metadata',
        error: error.message
      });
    }
  }

  /**
   * Export content data
   */
  static async exportContentData(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?._id;
      const { format = 'json', includeArchived = false } = req.query;

      const ngo = await NGO.findOne({ adminId: userId });
      if (!ngo) {
        res.status(404).json({
          success: false,
          message: 'NGO not found'
        });
        return;
      }

      const query: any = { ngoId: ngo._id };
      if (!includeArchived) {
        query.isActive = true;
      }

      const [announcements, ngoContent] = await Promise.all([
        Announcement.find(query)
          .populate('createdBy', 'name')
          .populate('updatedBy', 'name')
          .sort({ createdAt: -1 }),
        NGO.findById(ngo._id).select(
          'name description mission vision logo coverImage website seoMetadata homepageContent contentTemplates'
        )
      ]);

      const exportData = {
        ngo: ngoContent,
        announcements,
        exportedAt: new Date(),
        exportedBy: userId,
        totalItems: announcements.length
      };

      if (format === 'csv') {
        // For CSV format, we'd need to flatten the data structure
        // This is a simplified implementation
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="content-export-${Date.now()}.csv"`);
        
        // Basic CSV implementation (would need proper CSV library for production)
        let csvContent = 'ID,Title,Content,Type,Priority,Created At,Status\n';
        announcements.forEach(ann => {
          csvContent += `"${ann._id}","${ann.title}","${ann.content.replace(/"/g, '""')}","${ann.type}","${ann.priority}","${ann.createdAt}","${ann.isActive ? 'Active' : 'Archived'}"\n`;
        });
        
        res.send(csvContent);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="content-export-${Date.now()}.json"`);
        res.json(exportData);
      }

      logger.info(`Content data exported for NGO: ${ngo._id}, format: ${format}`);
    } catch (error: any) {
      logger.error('Error exporting content data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export content data',
        error: error.message
      });
    }
  }

  /**
   * Get content statistics for dashboard
   */
  static async getContentStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?._id;

      const ngo = await NGO.findOne({ adminId: userId });
      if (!ngo) {
        res.status(404).json({
          success: false,
          message: 'NGO not found'
        });
        return;
      }

      const stats = await Promise.all([
        Announcement.countDocuments({ ngoId: ngo._id, isActive: true }),
        Announcement.countDocuments({ ngoId: ngo._id, isActive: false }),
        Announcement.countDocuments({ 
          ngoId: ngo._id, 
          priority: 'high',
          isActive: true 
        }),
        Announcement.countDocuments({ 
          ngoId: ngo._id, 
          publishedAt: { $gt: new Date() },
          isActive: true 
        })
      ]);

      const [activeCount, archivedCount, urgentCount, scheduledCount] = stats;

      res.json({
        success: true,
        data: {
          active: activeCount,
          archived: archivedCount,
          urgent: urgentCount,
          scheduled: scheduledCount,
          total: activeCount + archivedCount
        }
      });
    } catch (error: any) {
      logger.error('Error fetching content stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch content statistics',
        error: error.message
      });
    }
  }

  /**
   * Submit announcement for approval
   */
  static async submitForApproval(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?._id;

      const ngo = await NGO.findOne({ adminId: userId });
      if (!ngo) {
        res.status(404).json({
          success: false,
          message: 'NGO not found'
        });
        return;
      }

      const announcement = await Announcement.findOne({ _id: id, ngoId: ngo._id });
      if (!announcement) {
        res.status(404).json({
          success: false,
          message: 'Announcement not found'
        });
        return;
      }

      // Add approval status to announcement
      (announcement as any).approvalStatus = 'pending';
      (announcement as any).submittedForApprovalAt = new Date();
      (announcement as any).submittedBy = userId;
      announcement.isActive = false; // Inactive until approved
      await announcement.save();

      res.json({
        success: true,
        message: 'Announcement submitted for approval',
        data: announcement
      });

      logger.info(`Announcement submitted for approval: ${id}`);
    } catch (error: any) {
      logger.error('Error submitting announcement for approval:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit announcement for approval',
        error: error.message
      });
    }
  }

  /**
   * Approve or reject announcement
   */
  static async approveAnnouncement(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { action, comments } = req.body; // action: 'approve' | 'reject'
      const userId = req.user?._id;

      const ngo = await NGO.findOne({ adminId: userId });
      if (!ngo) {
        res.status(404).json({
          success: false,
          message: 'NGO not found'
        });
        return;
      }

      const announcement = await Announcement.findOne({ _id: id, ngoId: ngo._id });
      if (!announcement) {
        res.status(404).json({
          success: false,
          message: 'Announcement not found'
        });
        return;
      }

      if (action === 'approve') {
        (announcement as any).approvalStatus = 'approved';
        announcement.isActive = true;
        if (!announcement.publishedAt || announcement.publishedAt > new Date()) {
          announcement.publishedAt = new Date();
        }
      } else if (action === 'reject') {
        (announcement as any).approvalStatus = 'rejected';
        announcement.isActive = false;
      }

      (announcement as any).approvedBy = userId;
      (announcement as any).approvedAt = new Date();
      (announcement as any).approvalComments = comments;
      announcement.updatedBy = userId;
      await announcement.save();

      res.json({
        success: true,
        message: `Announcement ${action}d successfully`,
        data: announcement
      });

      logger.info(`Announcement ${action}d: ${id}`);
    } catch (error: any) {
      logger.error(`Error ${req.body.action}ing announcement:`, error);
      res.status(500).json({
        success: false,
        message: `Failed to ${req.body.action} announcement`,
        error: error.message
      });
    }
  }

  /**
   * Get pending approvals
   */
  static async getPendingApprovals(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?._id;
      const { page = 1, limit = 10 } = req.query;

      const ngo = await NGO.findOne({ adminId: userId });
      if (!ngo) {
        res.status(404).json({
          success: false,
          message: 'NGO not found'
        });
        return;
      }

      const skip = (Number(page) - 1) * Number(limit);
      const query = { 
        ngoId: ngo._id, 
        'approvalStatus': 'pending'
      };

      const [announcements, total] = await Promise.all([
        Announcement.find(query)
          .populate('createdBy', 'name')
          .populate('submittedBy', 'name')
          .sort({ submittedForApprovalAt: -1 })
          .skip(skip)
          .limit(Number(limit)),
        Announcement.countDocuments(query)
      ]);

      res.json({
        success: true,
        data: {
          announcements,
          pagination: {
            current: Number(page),
            total: Math.ceil(total / Number(limit)),
            count: announcements.length,
            totalItems: total
          }
        }
      });
    } catch (error: any) {
      logger.error('Error fetching pending approvals:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch pending approvals',
        error: error.message
      });
    }
  }
}
