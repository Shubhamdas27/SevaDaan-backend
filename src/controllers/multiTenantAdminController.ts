import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import NGO from '../models/NGO';
import User from '../models/User';
import Program from '../models/Program';
import Event from '../models/Event';
import logger from '../utils/logger';
import mongoose from 'mongoose';

// Multi-Tenant Admin Controller
export class MultiTenantAdminController {

  /**
   * Get system-wide overview (Super Admin only)
   */
  static async getSystemOverview(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Verify super admin access
      if (req.user?.role !== 'system_admin') {
        res.status(403).json({
          success: false,
          message: 'Access denied. Super admin access required.'
        });
        return;
      }

      const [
        totalNGOs,
        totalUsers,
        totalPrograms,
        totalEvents,
        activeNGOs,
        recentRegistrations
      ] = await Promise.all([
        NGO.countDocuments(),
        User.countDocuments(),
        Program.countDocuments(),
        Event.countDocuments(),
        NGO.countDocuments({ status: 'active' }),
        NGO.find({}).sort({ createdAt: -1 }).limit(10).select('name location createdAt status')
      ]);

      const overview = {
        system: {
          totalNGOs,
          totalUsers,
          totalPrograms,
          totalEvents,
          activeNGOs,
          inactiveNGOs: totalNGOs - activeNGOs
        },
        recent: {
          registrations: recentRegistrations
        },
        health: {
          status: 'operational',
          uptime: process.uptime(),
          lastUpdate: new Date()
        }
      };

      res.json({
        success: true,
        data: overview
      });

      logger.info('System overview fetched by super admin');
    } catch (error: any) {
      logger.error('Error fetching system overview:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch system overview',
        error: error.message
      });
    }
  }

  /**
   * Get all NGOs (with filtering and pagination)
   */
  static async getAllNGOs(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'system_admin') {
        res.status(403).json({
          success: false,
          message: 'Access denied. Super admin access required.'
        });
        return;
      }

      const { 
        page = 1, 
        limit = 20, 
        status, 
        type, 
        city, 
        search 
      } = req.query;

      // Build query
      const query: any = {};
      
      if (status) query.status = status;
      if (type) query.type = type;
      if (city) query.city = new RegExp(city as string, 'i');
      
      if (search) {
        query.$or = [
          { name: new RegExp(search as string, 'i') },
          { description: new RegExp(search as string, 'i') },
          { registrationNumber: new RegExp(search as string, 'i') }
        ];
      }

      const skip = (Number(page) - 1) * Number(limit);
      
      const [ngos, total] = await Promise.all([
        NGO.find(query)
          .select('name description city state status type registrationNumber createdAt')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(Number(limit)),
        NGO.countDocuments(query)
      ]);

      res.json({
        success: true,
        data: {
          ngos,
          pagination: {
            current: Number(page),
            total: Math.ceil(total / Number(limit)),
            count: ngos.length,
            totalItems: total
          }
        }
      });

      logger.info(`NGO list fetched: ${ngos.length} items`);
    } catch (error: any) {
      logger.error('Error fetching NGOs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch NGOs',
        error: error.message
      });
    }
  }

  /**
   * Get NGO details by ID
   */
  static async getNGODetails(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { ngoId } = req.params;
      
      if (req.user?.role !== 'system_admin') {
        res.status(403).json({
          success: false,
          message: 'Access denied. Super admin access required.'
        });
        return;
      }

      const ngo = await NGO.findById(ngoId);
      if (!ngo) {
        res.status(404).json({
          success: false,
          message: 'NGO not found'
        });
        return;
      }

      // Get additional statistics
      const [
        programCount,
        eventCount,
        userCount,
        applicationCount
      ] = await Promise.all([
        Program.countDocuments({ ngoId: ngo._id }),
        Event.countDocuments({ ngoId: ngo._id }),
        User.countDocuments({ ngoId: ngo._id }),
        // ServiceApplication.countDocuments({ ngoId: ngo._id }) // Uncomment when needed
        0 // Placeholder
      ]);

      const ngoDetails = {
        ...ngo.toObject(),
        statistics: {
          programs: programCount,
          events: eventCount,
          users: userCount,
          applications: applicationCount
        }
      };

      res.json({
        success: true,
        data: ngoDetails
      });

      logger.info(`NGO details fetched for: ${ngoId}`);
    } catch (error: any) {
      logger.error('Error fetching NGO details:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch NGO details',
        error: error.message
      });
    }
  }

  /**
   * Update NGO status (approve/suspend/activate)
   */
  static async updateNGOStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { ngoId } = req.params;
      const { status, reason } = req.body;

      if (req.user?.role !== 'system_admin') {
        res.status(403).json({
          success: false,
          message: 'Access denied. Super admin access required.'
        });
        return;
      }

      const validStatuses = ['pending', 'active', 'suspended', 'rejected'];
      if (!validStatuses.includes(status)) {
        res.status(400).json({
          success: false,
          message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
        });
        return;
      }

      const ngo = await NGO.findById(ngoId);
      if (!ngo) {
        res.status(404).json({
          success: false,
          message: 'NGO not found'
        });
        return;
      }

      // Update NGO status
      ngo.status = status;
      if (reason) {
        // Add status change history
        if (!ngo.statusHistory) {
          (ngo as any).statusHistory = [];
        }
        (ngo as any).statusHistory.push({
          status,
          reason,
          changedBy: req.user?._id,
          changedAt: new Date()
        });
      }

      await ngo.save();

      res.json({
        success: true,
        message: `NGO status updated to ${status}`,
        data: ngo
      });

      logger.info(`NGO status updated: ${ngoId} -> ${status} by ${req.user?._id}`);
    } catch (error: any) {
      logger.error('Error updating NGO status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update NGO status',
        error: error.message
      });
    }
  }

  /**
   * Get system-wide user management
   */
  static async getSystemUsers(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'system_admin') {
        res.status(403).json({
          success: false,
          message: 'Access denied. Super admin access required.'
        });
        return;
      }

      const { 
        page = 1, 
        limit = 20, 
        role, 
        status, 
        search 
      } = req.query;

      const query: any = {};
      
      if (role) query.role = role;
      if (status) query.status = status;
      
      if (search) {
        query.$or = [
          { name: new RegExp(search as string, 'i') },
          { email: new RegExp(search as string, 'i') }
        ];
      }

      const skip = (Number(page) - 1) * Number(limit);
      
      const [users, total] = await Promise.all([
        User.find(query)
          .select('name email role status createdAt lastLogin')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(Number(limit)),
        User.countDocuments(query)
      ]);

      res.json({
        success: true,
        data: {
          users,
          pagination: {
            current: Number(page),
            total: Math.ceil(total / Number(limit)),
            count: users.length,
            totalItems: total
          }
        }
      });

      logger.info(`System users fetched: ${users.length} items`);
    } catch (error: any) {
      logger.error('Error fetching system users:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch system users',
        error: error.message
      });
    }
  }

  /**
   * Manage user permissions
   */
  static async updateUserPermissions(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { permissions, role } = req.body;

      if (req.user?.role !== 'system_admin') {
        res.status(403).json({
          success: false,
          message: 'Access denied. Super admin access required.'
        });
        return;
      }

      const user = await User.findById(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      // Update permissions
      if (permissions) {
        (user as any).permissions = permissions;
      }

      if (role) {
        user.role = role;
      }

      await user.save();

      res.json({
        success: true,
        message: 'User permissions updated successfully',
        data: user
      });

      logger.info(`User permissions updated: ${userId} by ${req.user?._id}`);
    } catch (error: any) {
      logger.error('Error updating user permissions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user permissions',
        error: error.message
      });
    }
  }

  /**
   * Get system configuration
   */
  static async getSystemConfig(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'system_admin') {
        res.status(403).json({
          success: false,
          message: 'Access denied. Super admin access required.'
        });
        return;
      }

      const config = {
        system: {
          version: process.env.npm_package_version || '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          database: {
            status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
            name: mongoose.connection.name
          }
        },
        features: {
          contentManagement: true,
          eventManagement: true,
          analytics: true,
          multiTenant: true,
          ai: true,
          realTime: true
        },
        limits: {
          maxNGOs: process.env.MAX_NGOS || 1000,
          maxUsersPerNGO: process.env.MAX_USERS_PER_NGO || 10000,
          maxFileSize: process.env.MAX_FILE_SIZE || '10MB'
        }
      };

      res.json({
        success: true,
        data: config
      });

      logger.info('System configuration fetched');
    } catch (error: any) {
      logger.error('Error fetching system config:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch system configuration',
        error: error.message
      });
    }
  }

  /**
   * Generate system reports
   */
  static async generateSystemReport(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'system_admin') {
        res.status(403).json({
          success: false,
          message: 'Access denied. Super admin access required.'
        });
        return;
      }

      const { type = 'summary', period = '30d' } = req.query;

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - (period === '7d' ? 7 : period === '90d' ? 90 : 30));

      let reportData;

      switch (type) {
        case 'summary':
          reportData = await this.generateSummaryReport(startDate, endDate);
          break;
        case 'ngos':
          reportData = await this.generateNGOReport(startDate, endDate);
          break;
        case 'users':
          reportData = await this.generateUserReport(startDate, endDate);
          break;
        case 'activity':
          reportData = await this.generateActivityReport(startDate, endDate);
          break;
        default:
          reportData = await this.generateSummaryReport(startDate, endDate);
      }

      res.json({
        success: true,
        data: {
          type,
          period,
          generatedAt: new Date(),
          ...reportData
        }
      });

      logger.info(`System report generated: type=${type}, period=${period}`);
    } catch (error: any) {
      logger.error('Error generating system report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate system report',
        error: error.message
      });
    }
  }

  // Helper methods for report generation
  private static async generateSummaryReport(startDate: Date, endDate: Date) {
    const [
      newNGOs,
      newUsers,
      newPrograms,
      newEvents
    ] = await Promise.all([
      NGO.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
      User.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
      Program.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
      Event.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } })
    ]);

    return {
      summary: {
        newNGOs,
        newUsers,
        newPrograms,
        newEvents
      }
    };
  }

  private static async generateNGOReport(startDate: Date, endDate: Date) {
    const ngoStats = await NGO.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    return {
      ngosByType: ngoStats,
      registrationTrend: [] // TODO: Implement trend calculation
    };
  }

  private static async generateUserReport(startDate: Date, endDate: Date) {
    const userStats = await User.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    return {
      usersByRole: userStats,
      registrationTrend: [] // TODO: Implement trend calculation
    };
  }

  private static async generateActivityReport(startDate: Date, endDate: Date) {
    // TODO: Implement activity tracking
    return {
      activities: [],
      trends: []
    };
  }
}

export default MultiTenantAdminController;
