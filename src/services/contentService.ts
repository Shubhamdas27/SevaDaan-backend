import mongoose from 'mongoose';
import NGO from '../models/NGO';
import Announcement from '../models/Announcement';
import logger from '../utils/logger';

export class ContentService {
  
  /**
   * Get NGO by admin user ID
   */
  static async getNGOByAdminId(adminId: string): Promise<any> {
    return await NGO.findOne({ adminId });
  }

  /**
   * Create announcement with business logic
   */
  static async createAnnouncement(ngoId: string, announcementData: any, createdBy: string): Promise<any> {
    const announcement = new Announcement({
      ngoId,
      ...announcementData,
      createdBy,
      isActive: true
    });

    // Auto-publish if no scheduled date
    if (!announcement.publishedAt) {
      announcement.publishedAt = new Date();
    }

    await announcement.save();
    return announcement;
  }

  /**
   * Get announcements with advanced filtering
   */
  static async getAnnouncements(filters: any, pagination: any): Promise<{ announcements: any[], total: number }> {
    const query: any = { isActive: true };
    
    // Apply filters
    if (filters.ngoId) query.ngoId = filters.ngoId;
    if (filters.type) query.type = filters.type;
    if (filters.priority) query.priority = filters.priority;
    
    // Expiry filter
    query.$or = [
      { expiryDate: { $exists: false } },
      { expiryDate: { $gte: new Date() } }
    ];

    // Target audience filter
    if (filters.targetRole && filters.targetRole !== 'all') {
      query.targetAudience = { $in: [filters.targetRole, 'all'] };
    }

    // Published announcements only
    query.publishedAt = { $lte: new Date() };

    // Search filter
    if (filters.search) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { title: { $regex: filters.search, $options: 'i' } },
          { content: { $regex: filters.search, $options: 'i' } },
          { tags: { $in: [new RegExp(filters.search, 'i')] } }
        ]
      });
    }

    const skip = (pagination.page - 1) * pagination.limit;

    const [announcements, total] = await Promise.all([
      Announcement.find(query)
        .populate('ngoId', 'name logo')
        .populate('createdBy', 'name')
        .sort({ priority: -1, publishedAt: -1 })
        .skip(skip)
        .limit(pagination.limit),
      Announcement.countDocuments(query)
    ]);

    return { announcements, total };
  }

  /**
   * Update announcement with validation
   */
  static async updateAnnouncement(announcementId: string, ngoId: string, updateData: any, updatedBy: string): Promise<any> {
    const announcement = await Announcement.findOne({ _id: announcementId, ngoId });
    
    if (!announcement) {
      throw new Error('Announcement not found');
    }

    // Update allowed fields
    const allowedFields = ['title', 'content', 'type', 'priority', 'targetAudience', 'expiryDate', 'tags', 'isActive'];
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        (announcement as any)[field] = updateData[field];
      }
    });

    announcement.updatedBy = mongoose.Types.ObjectId.createFromHexString(updatedBy);
    await announcement.save();

    return announcement;
  }

  /**
   * Archive/restore announcement
   */
  static async toggleAnnouncementStatus(announcementId: string, ngoId: string, isActive: boolean, updatedBy: string): Promise<any> {
    const announcement = await Announcement.findOne({ _id: announcementId, ngoId });
    
    if (!announcement) {
      throw new Error('Announcement not found');
    }

    announcement.isActive = isActive;
    announcement.updatedBy = mongoose.Types.ObjectId.createFromHexString(updatedBy);
    await announcement.save();

    return announcement;
  }

  /**
   * Batch update announcements
   */
  static async batchUpdateAnnouncements(announcementIds: string[], ngoId: string, updates: any, updatedBy: string): Promise<number> {
    const result = await Announcement.updateMany(
      { 
        _id: { $in: announcementIds }, 
        ngoId 
      },
      { 
        ...updates,
        updatedBy,
        updatedAt: new Date()
      }
    );

    return result.modifiedCount;
  }

  /**
   * Get content analytics
   */
  static async getContentAnalytics(ngoId: string): Promise<any> {
    const [
      totalAnnouncements,
      activeAnnouncements,
      announcementStats,
      topPerforming,
      monthlyStats
    ] = await Promise.all([
      Announcement.countDocuments({ ngoId }),
      Announcement.countDocuments({ ngoId, isActive: true }),
      Announcement.aggregate([
        { $match: { ngoId: mongoose.Types.ObjectId.createFromHexString(ngoId) } },
        {
          $group: {
            _id: null,
            totalViews: { $sum: '$viewCount' },
            avgViews: { $avg: '$viewCount' }
          }
        }
      ]),
      Announcement.find({ ngoId })
        .sort({ viewCount: -1 })
        .limit(5)
        .select('title viewCount type priority'),
      Announcement.aggregate([
        { $match: { ngoId: mongoose.Types.ObjectId.createFromHexString(ngoId) } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            count: { $sum: 1 },
            views: { $sum: '$viewCount' }
          }
        },
        { $sort: { '_id.year': -1, '_id.month': -1 } },
        { $limit: 12 }
      ])
    ]);

    const stats = announcementStats[0] || { totalViews: 0, avgViews: 0 };

    return {
      content: {
        totalAnnouncements,
        activeAnnouncements,
        totalViews: stats.totalViews,
        averageViewsPerAnnouncement: Math.round(stats.avgViews || 0)
      },
      topPerforming,
      monthlyTrends: monthlyStats
    };
  }

  /**
   * Content search with advanced options
   */
  static async searchContent(searchQuery: string, ngoId?: string, options: any = {}): Promise<any> {
    const pipeline: any[] = [];

    // Match stage
    const matchStage: any = {
      isActive: true,
      $or: [
        { expiryDate: { $exists: false } },
        { expiryDate: { $gte: new Date() } }
      ],
      publishedAt: { $lte: new Date() }
    };

    if (ngoId) {
      matchStage.ngoId = mongoose.Types.ObjectId.createFromHexString(ngoId);
    }

    // Text search
    if (searchQuery) {
      matchStage.$text = { $search: searchQuery };
    }

    pipeline.push({ $match: matchStage });

    // Add scoring for text search
    if (searchQuery) {
      pipeline.push({ $addFields: { score: { $meta: 'textScore' } } });
      pipeline.push({ $sort: { score: { $meta: 'textScore' } } });
    } else {
      pipeline.push({ $sort: { publishedAt: -1 } });
    }

    // Pagination
    if (options.skip) pipeline.push({ $skip: options.skip });
    if (options.limit) pipeline.push({ $limit: options.limit });

    // Populate NGO data
    pipeline.push({
      $lookup: {
        from: 'ngos',
        localField: 'ngoId',
        foreignField: '_id',
        as: 'ngo',
        pipeline: [{ $project: { name: 1, logo: 1 } }]
      }
    });

    const results = await Announcement.aggregate(pipeline);
    return results;
  }

  /**
   * Get content templates for NGO
   */
  static async getContentTemplates(ngoId: string, type?: string): Promise<any[]> {
    const ngo = await NGO.findById(ngoId);
    if (!ngo) {
      throw new Error('NGO not found');
    }

    let templates = (ngo as any).contentTemplates || [];
    
    if (type) {
      templates = templates.filter((template: any) => template.type === type);
    }

    return templates;
  }

  /**
   * Create content template
   */
  static async createContentTemplate(ngoId: string, templateData: any, createdBy: string): Promise<any> {
    const ngo = await NGO.findById(ngoId);
    if (!ngo) {
      throw new Error('NGO not found');
    }

    const templates = (ngo as any).contentTemplates || [];
    const newTemplate = {
      id: new mongoose.Types.ObjectId().toString(),
      ...templateData,
      createdBy,
      createdAt: new Date()
    };

    templates.push(newTemplate);
    (ngo as any).contentTemplates = templates;
    await ngo.save();

    return newTemplate;
  }

  /**
   * Schedule announcement for future publication
   */
  static async scheduleAnnouncement(ngoId: string, announcementData: any, createdBy: string): Promise<any> {
    const announcement = new Announcement({
      ngoId,
      ...announcementData,
      createdBy,
      isActive: true,
      publishedAt: new Date(announcementData.scheduledDate)
    });

    await announcement.save();
    return announcement;
  }

  /**
   * Get scheduled announcements
   */
  static async getScheduledAnnouncements(ngoId: string, pagination: any): Promise<{ announcements: any[], total: number }> {
    const query = { 
      ngoId, 
      isActive: true,
      publishedAt: { $gt: new Date() }
    };

    const skip = (pagination.page - 1) * pagination.limit;

    const [announcements, total] = await Promise.all([
      Announcement.find(query)
        .populate('createdBy', 'name')
        .sort({ publishedAt: 1 })
        .skip(skip)
        .limit(pagination.limit),
      Announcement.countDocuments(query)
    ]);

    return { announcements, total };
  }

  /**
   * Content moderation and approval workflow
   */
  static async submitForApproval(announcementId: string, ngoId: string, submittedBy: string): Promise<any> {
    const announcement = await Announcement.findOne({ _id: announcementId, ngoId });
    
    if (!announcement) {
      throw new Error('Announcement not found');
    }

    (announcement as any).approvalStatus = 'pending';
    (announcement as any).submittedForApprovalAt = new Date();
    (announcement as any).submittedBy = submittedBy;
    announcement.isActive = false; // Inactive until approved
    await announcement.save();

    return announcement;
  }

  /**
   * Approve or reject content
   */
  static async processApproval(announcementId: string, ngoId: string, action: 'approve' | 'reject', approvedBy: string, comments?: string): Promise<any> {
    const announcement = await Announcement.findOne({ _id: announcementId, ngoId });
    
    if (!announcement) {
      throw new Error('Announcement not found');
    }

    if (action === 'approve') {
      (announcement as any).approvalStatus = 'approved';
      announcement.isActive = true;
      if (!announcement.publishedAt || announcement.publishedAt > new Date()) {
        announcement.publishedAt = new Date();
      }
    } else {
      (announcement as any).approvalStatus = 'rejected';
      announcement.isActive = false;
    }

    (announcement as any).approvedBy = approvedBy;
    (announcement as any).approvedAt = new Date();
    (announcement as any).approvalComments = comments;
    announcement.updatedBy = mongoose.Types.ObjectId.createFromHexString(approvedBy);
    await announcement.save();

    return announcement;
  }

  /**
   * Export content data
   */
  static async exportContentData(ngoId: string, options: any = {}): Promise<any> {
    const query: any = { ngoId };
    if (!options.includeArchived) {
      query.isActive = true;
    }

    const [announcements, ngoContent] = await Promise.all([
      Announcement.find(query)
        .populate('createdBy', 'name')
        .populate('updatedBy', 'name')
        .sort({ createdAt: -1 }),
      NGO.findById(ngoId).select(
        'name description mission vision logo coverImage website seoMetadata homepageContent contentTemplates'
      )
    ]);

    return {
      ngo: ngoContent,
      announcements,
      exportedAt: new Date(),
      totalItems: announcements.length,
      filters: options
    };
  }

  /**
   * Content statistics for dashboard
   */
  static async getContentStats(ngoId: string): Promise<any> {
    const stats = await Promise.all([
      Announcement.countDocuments({ ngoId, isActive: true }),
      Announcement.countDocuments({ ngoId, isActive: false }),
      Announcement.countDocuments({ ngoId, priority: 'high', isActive: true }),
      Announcement.countDocuments({ ngoId, publishedAt: { $gt: new Date() }, isActive: true }),
      Announcement.countDocuments({ ngoId, 'approvalStatus': 'pending' })
    ]);

    const [active, archived, urgent, scheduled, pendingApproval] = stats;

    return {
      active,
      archived,
      urgent,
      scheduled,
      pendingApproval,
      total: active + archived
    };
  }

  /**
   * Update SEO metadata
   */
  static async updateSEOMetadata(ngoId: string, seoData: any, updatedBy: string): Promise<any> {
    const ngo = await NGO.findById(ngoId);
    if (!ngo) {
      throw new Error('NGO not found');
    }

    const seoMetadata = {
      metaTitle: seoData.metaTitle || ngo.name,
      metaDescription: seoData.metaDescription || ngo.description,
      keywords: seoData.keywords || [],
      ogTitle: seoData.ogTitle || ngo.name,
      ogDescription: seoData.ogDescription || ngo.description,
      ogImage: seoData.ogImage || ngo.logo,
      schema: seoData.schema || {},
      lastUpdated: new Date(),
      updatedBy
    };

    (ngo as any).seoMetadata = seoMetadata;
    await ngo.save();

    return seoMetadata;
  }

  /**
   * Update homepage content
   */
  static async updateHomepageContent(ngoId: string, contentData: any, updatedBy: string): Promise<any> {
    const ngo = await NGO.findById(ngoId);
    if (!ngo) {
      throw new Error('NGO not found');
    }

    const homepageContent = {
      featuredPrograms: contentData.featuredPrograms || [],
      heroSection: contentData.heroSection || {},
      aboutSection: contentData.aboutSection || {},
      testimonialIds: contentData.testimonialIds || [],
      lastUpdated: new Date(),
      updatedBy
    };

    (ngo as any).homepageContent = homepageContent;
    await ngo.save();

    return homepageContent;
  }
}

export default ContentService;
