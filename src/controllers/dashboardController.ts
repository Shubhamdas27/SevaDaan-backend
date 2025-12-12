import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import NGO from '../models/NGO';
import Program from '../models/Program';
import Donation from '../models/Donation';
import Volunteer from '../models/Volunteer';
import Grant from '../models/Grant';
import Testimonial from '../models/Testimonial';
import Notice from '../models/Notice';
import EmergencyHelp from '../models/EmergencyHelp';
import Contact from '../models/Contact';
import User from '../models/User';
import UserRole from '../models/UserRole';
import DashboardAnalytics from '../models/DashboardAnalytics';
import Event from '../models/Event';
import ServiceApplication from '../models/ServiceApplication';
import VolunteerTracking from '../models/VolunteerTracking';
import ProgramRegistration from '../models/ProgramRegistration';
import { socketService } from '../socket/socketService';
import logger from '../utils/logger';

// Enhanced Dashboard Controller Class
export class EnhancedDashboardController {
  // Get role-specific dashboard data
  public async getRoleSpecificDashboard(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const dashboardData = await this.generateDashboardByRole(user);
      
      // TODO: Implement real-time updates when socket service is properly configured
      
      res.status(200).json({
        success: true,
        data: dashboardData,
        userRole: user.role,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error getting role-specific dashboard:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to load dashboard'
      });
    }
  }

  // NGO Admin Dashboard with Advanced Analytics
  public async getAdvancedNGOAdminDashboard(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user || !['ngo_admin', 'ngo'].includes(user.role)) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const ngoId = user.ngoId;
      if (!ngoId) {
        res.status(400).json({ error: 'NGO ID not found' });
        return;
      }

      const dashboardData = {
        overview: await this.getAdminOverview(ngoId),
        userManagement: await this.getAdvancedUserManagement(ngoId),
        analytics: await this.getAdvancedAnalytics(ngoId),
        performance: await this.getPerformanceMetrics(ngoId),
        compliance: await this.getComplianceMetrics(ngoId),
        security: await this.getSecurityMetrics(ngoId),
        realTime: await this.getRealTimeMetrics(ngoId)
      };

      res.status(200).json({
        success: true,
        data: dashboardData,
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error getting advanced NGO admin dashboard:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to load advanced admin dashboard'
      });
    }
  }

  // Volunteer Dashboard with Skill Matching
  public async getAdvancedVolunteerDashboard(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user || user.role !== 'volunteer') {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const userId = user._id;
      const dashboardData = {
        profile: await this.getVolunteerProfile(userId),
        opportunities: await this.getMatchedOpportunities(userId),
        tracking: await this.getVolunteerTracking(userId),
        impact: await this.getVolunteerImpact(userId),
        community: await this.getVolunteerCommunity(userId),
        certifications: await this.getVolunteerCertifications(userId),
        achievements: await this.getVolunteerAchievements(userId)
      };

      res.status(200).json({
        success: true,
        data: dashboardData
      });
    } catch (error) {
      logger.error('Error getting advanced volunteer dashboard:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to load volunteer dashboard'
      });
    }
  }

  // Donor Dashboard with Impact Visualization
  public async getAdvancedDonorDashboard(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user || user.role !== 'donor') {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const userId = user._id;
      const dashboardData = {
        portfolio: await this.getDonorPortfolio(userId),
        impact: await this.getDonorImpactVisualization(userId),
        recommendations: await this.getDonorRecommendations(userId),
        history: await this.getDonorHistory(userId),
        tax: await this.getDonorTaxDocuments(userId),
        communications: await this.getDonorCommunications(userId)
      };

      res.status(200).json({
        success: true,
        data: dashboardData
      });
    } catch (error) {
      logger.error('Error getting advanced donor dashboard:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to load donor dashboard'
      });
    }
  }

  // Citizen Dashboard with Service Tracking
  public async getAdvancedCitizenDashboard(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user || user.role !== 'citizen') {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const userId = user._id;
      const dashboardData = {
        services: await this.getCitizenServices(userId),
        applications: await this.getCitizenApplications(userId),
        profile: await this.getCitizenProfile(userId),
        community: await this.getCitizenCommunity(userId),
        support: await this.getCitizenSupport(userId),
        recommendations: await this.getCitizenRecommendations(userId)
      };

      res.status(200).json({
        success: true,
        data: dashboardData
      });
    } catch (error) {
      logger.error('Error getting advanced citizen dashboard:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to load citizen dashboard'
      });
    }
  }

  // KPI Dashboard with Advanced Metrics
  public async getKPIDashboard(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const { startDate, endDate } = req.query;
      const dateRange = {
        startDate: startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: endDate ? new Date(endDate as string) : new Date()
      };

      const ngoId = user.ngoId || user._id;
      const kpiData = await this.generateKPIMetrics(ngoId, dateRange);

      res.status(200).json({
        success: true,
        data: kpiData,
        dateRange,
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error getting KPI dashboard:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to load KPI dashboard'
      });
    }
  }

  // Real-time Analytics Endpoint
  public async getRealTimeAnalytics(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const ngoId = user.ngoId || user._id;
      const realTimeData = {
        activeUsers: await this.getActiveUserCount(ngoId),
        ongoingEvents: await this.getOngoingEventsCount(ngoId),
        pendingApplications: await this.getPendingApplicationsCount(ngoId),
        todaysDonations: await this.getTodaysDonations(ngoId),
        volunteerHours: await this.getTodaysVolunteerHours(ngoId),
        systemHealth: await this.getSystemHealth(),
        lastUpdated: new Date().toISOString()
      };

      // Emit to real-time listeners
      // TODO: Implement socket service when properly configured

      res.status(200).json({
        success: true,
        data: realTimeData
      });
    } catch (error) {
      logger.error('Error getting real-time analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to load real-time analytics'
      });
    }
  }

  // Helper Methods
  private async generateDashboardByRole(user: any): Promise<any> {
    const baseData = {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      },
      notifications: await this.getRecentNotifications(user._id),
      quickActions: this.getQuickActionsByRole(user.role)
    };

    switch (user.role) {
      case 'ngo_admin':
      case 'ngo':
        return {
          ...baseData,
          admin: await this.getAdminDashboardData(user.ngoId || user._id)
        };
      case 'ngo_manager':
        return {
          ...baseData,
          manager: await this.getManagerDashboardData(user.ngoId)
        };
      case 'citizen':
        return {
          ...baseData,
          citizen: await this.getCitizenDashboardData(user._id)
        };
      case 'volunteer':
        return {
          ...baseData,
          volunteer: await this.getVolunteerDashboardData(user._id)
        };
      case 'donor':
        return {
          ...baseData,
          donor: await this.getDonorDashboardData(user._id)
        };
      default:
        throw new Error('Invalid user role');
    }
  }

  private async getAdminOverview(ngoId: any) {
    const [totalUsers, activeUsers, totalPrograms, totalDonations] = await Promise.all([
      User.countDocuments({ ngoId }),
      User.countDocuments({ ngoId, isActive: true }),
      Program.countDocuments({ ngoId }),
      Donation.aggregate([
        { $match: { ngoId } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    return {
      totalUsers,
      activeUsers,
      totalPrograms,
      totalDonations: totalDonations[0]?.total || 0,
      userGrowthRate: await this.calculateUserGrowthRate(ngoId),
      donationGrowthRate: await this.calculateDonationGrowthRate(ngoId)
    };
  }

  private async getAdvancedUserManagement(ngoId: any) {
    const userStats = await User.aggregate([
      { $match: { ngoId } },
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          active: { $sum: { $cond: ['$isActive', 1, 0] } },
          verified: { $sum: { $cond: ['$isEmailVerified', 1, 0] } }
        }
      }
    ]);

    const recentUsers = await User.find({ ngoId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email role createdAt isActive');

    return {
      userStats,
      recentUsers,
      roleDistribution: userStats.map(stat => ({
        role: stat._id,
        count: stat.count,
        percentage: (stat.count / userStats.reduce((acc, s) => acc + s.count, 0)) * 100
      }))
    };
  }

  private async getAdvancedAnalytics(ngoId: any) {
    const dateRange = {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date()
    };

    try {
      // Create a new analytics document
      const analytics = new DashboardAnalytics({
        ngoId,
        dateRange,
        kpis: {
          peopleServed: { monthly: 0, yearly: 0, total: 0 },
          serviceDeliveryRate: 0,
          volunteerEngagement: { activeVolunteers: 0, totalHours: 0, averageHoursPerVolunteer: 0 },
          fundingUtilization: { totalFunds: 0, utilizedFunds: 0, utilizationRate: 0 },
          programSuccessRate: 0,
          geographicCoverage: { citiesServed: 0, statesServed: 0, beneficiaryDistribution: {} }
        },
        chartData: { trends: [], comparisons: [], distributions: [] },
        realTimeMetrics: { activeUsers: 0, ongoingEvents: 0, pendingApplications: 0, lastUpdated: new Date() },
        generatedBy: ngoId
      });
      
      return analytics;
    } catch (error) {
      logger.error('Error generating analytics:', error);
      return null;
    }
  }

  private async generateKPIMetrics(ngoId: any, dateRange: any) {
    return {
      peopleServed: await this.calculatePeopleServed(ngoId, dateRange),
      serviceDeliveryRate: await this.calculateServiceDeliveryRate(ngoId, dateRange),
      volunteerEngagement: await this.calculateVolunteerEngagement(ngoId, dateRange),
      fundingUtilization: await this.calculateFundingUtilization(ngoId, dateRange),
      programSuccessRate: await this.calculateProgramSuccessRate(ngoId, dateRange),
      geographicCoverage: await this.calculateGeographicCoverage(ngoId, dateRange)
    };
  }

  // Placeholder implementations for additional methods
  private async getPerformanceMetrics(ngoId: any) { return {}; }
  private async getComplianceMetrics(ngoId: any) { return {}; }
  private async getSecurityMetrics(ngoId: any) { return {}; }
  private async getRealTimeMetrics(ngoId: any) { return {}; }
  private async getVolunteerProfile(userId: any) { return {}; }
  private async getMatchedOpportunities(userId: any) { return []; }
  private async getVolunteerTracking(userId: any) { return {}; }
  private async getVolunteerImpact(userId: any) { return {}; }
  private async getVolunteerCommunity(userId: any) { return []; }
  private async getVolunteerCertifications(userId: any) { return []; }
  private async getVolunteerAchievements(userId: any) { return []; }
  private async getDonorPortfolio(userId: any) { return {}; }
  private async getDonorImpactVisualization(userId: any) { return {}; }
  private async getDonorRecommendations(userId: any) { return []; }
  private async getDonorHistory(userId: any) { return []; }
  private async getDonorTaxDocuments(userId: any) { return []; }
  private async getDonorCommunications(userId: any) { return []; }
  private async getCitizenServices(userId: any) { return []; }
  private async getCitizenApplications(userId: any) { return []; }
  private async getCitizenProfile(userId: any) { return {}; }
  private async getCitizenCommunity(userId: any) { return []; }
  private async getCitizenSupport(userId: any) { return []; }
  private async getCitizenRecommendations(userId: any) { return []; }
  private async getRecentNotifications(userId: any) { return []; }
  private getQuickActionsByRole(role: string) { return []; }
  private async getAdminDashboardData(ngoId: any) { return {}; }
  private async getManagerDashboardData(ngoId: any) { return {}; }
  private async getCitizenDashboardData(userId: any) { return {}; }
  private async getVolunteerDashboardData(userId: any) { return {}; }
  private async getDonorDashboardData(userId: any) { return {}; }
  private async calculateUserGrowthRate(ngoId: any) { return 0; }
  private async calculateDonationGrowthRate(ngoId: any) { return 0; }
  private async getActiveUserCount(ngoId: any) { return 0; }
  private async getOngoingEventsCount(ngoId: any) { return 0; }
  private async getPendingApplicationsCount(ngoId: any) { return 0; }
  private async getTodaysDonations(ngoId: any) { return 0; }
  private async getTodaysVolunteerHours(ngoId: any) { return 0; }
  private async getSystemHealth() { return 'Good'; }
  private async calculatePeopleServed(ngoId: any, dateRange: any) { return {}; }
  private async calculateServiceDeliveryRate(ngoId: any, dateRange: any) { return 0; }
  private async calculateVolunteerEngagement(ngoId: any, dateRange: any) { return {}; }
  private async calculateFundingUtilization(ngoId: any, dateRange: any) { return {}; }
  private async calculateProgramSuccessRate(ngoId: any, dateRange: any) { return 0; }
  private async calculateGeographicCoverage(ngoId: any, dateRange: any) { return {}; }
}

export const enhancedDashboardController = new EnhancedDashboardController();

// Original dashboard functions for compatibility
export const getNGOAdminDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await enhancedDashboardController.getAdvancedNGOAdminDashboard(req, res);
  } catch (error) {
    logger.error('Error in getNGOAdminDashboard:', error);
    res.status(500).json({ success: false, error: 'Failed to load NGO admin dashboard' });
  }
};

export const getNGOManagerDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user || user.role !== 'ngo_manager') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const ngoId = user.ngoId;
    const dashboardData = {
      operations: await getOperationalOverview(ngoId),
      volunteers: await getVolunteerManagement(ngoId),
      services: await getServiceManagement(ngoId),
      events: await getEventManagement(ngoId)
    };

    res.status(200).json({ success: true, data: dashboardData });
  } catch (error) {
    logger.error('Error in getNGOManagerDashboard:', error);
    res.status(500).json({ success: false, error: 'Failed to load NGO manager dashboard' });
  }
};

export const getCitizenDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await enhancedDashboardController.getAdvancedCitizenDashboard(req, res);
  } catch (error) {
    logger.error('Error in getCitizenDashboard:', error);
    res.status(500).json({ success: false, error: 'Failed to load citizen dashboard' });
  }
};

export const getVolunteerDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await enhancedDashboardController.getAdvancedVolunteerDashboard(req, res);
  } catch (error) {
    logger.error('Error in getVolunteerDashboard:', error);
    res.status(500).json({ success: false, error: 'Failed to load volunteer dashboard' });
  }
};

export const getDonorDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await enhancedDashboardController.getAdvancedDonorDashboard(req, res);
  } catch (error) {
    logger.error('Error in getDonorDashboard:', error);
    res.status(500).json({ success: false, error: 'Failed to load donor dashboard' });
  }
};

export const getSuperAdminDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user || user.role !== 'ngo_admin') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const dashboardData = {
      systemOverview: await getSystemOverview(),
      userStats: await getUserStatistics(),
      ngoStats: await getNGOStatistics(),
      platformHealth: await getPlatformHealth()
    };

    res.status(200).json({ success: true, data: dashboardData });
  } catch (error) {
    logger.error('Error in getSuperAdminDashboard:', error);
    res.status(500).json({ success: false, error: 'Failed to load super admin dashboard' });
  }
};

// Additional dashboard functions
export const getAnalyticsDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await enhancedDashboardController.getKPIDashboard(req, res);
  } catch (error) {
    logger.error('Error in getAnalyticsDashboard:', error);
    res.status(500).json({ success: false, error: 'Failed to load analytics dashboard' });
  }
};

export const getDashboardMetrics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await enhancedDashboardController.getRealTimeAnalytics(req, res);
  } catch (error) {
    logger.error('Error in getDashboardMetrics:', error);
    res.status(500).json({ success: false, error: 'Failed to load dashboard metrics' });
  }
};

export const getDashboardNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const notifications = await getRecentNotifications(user._id);
    res.status(200).json({ success: true, data: notifications });
  } catch (error) {
    logger.error('Error in getDashboardNotifications:', error);
    res.status(500).json({ success: false, error: 'Failed to load notifications' });
  }
};

export const updateDashboardPreferences = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { preferences } = req.body;
    await User.findByIdAndUpdate(user._id, { 
      'profileData.dashboardPreferences': preferences 
    });

    res.status(200).json({ success: true, message: 'Preferences updated successfully' });
  } catch (error) {
    logger.error('Error in updateDashboardPreferences:', error);
    res.status(500).json({ success: false, error: 'Failed to update preferences' });
  }
};

export const exportDashboardData = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { format = 'json' } = req.query;
    const dashboardData = await enhancedDashboardController.getRoleSpecificDashboard(req, res);
    
    if (format === 'csv') {
      // Convert to CSV format
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=dashboard-data.csv');
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=dashboard-data.json');
    }
    
    res.status(200).send(dashboardData);
  } catch (error) {
    logger.error('Error in exportDashboardData:', error);
    res.status(500).json({ success: false, error: 'Failed to export dashboard data' });
  }
};

// Helper functions
async function getOperationalOverview(ngoId: any) {
  const [events, applications, volunteers] = await Promise.all([
    Event.countDocuments({ ngoId }),
    ServiceApplication.countDocuments({ ngoId }),
    User.countDocuments({ ngoId, role: 'volunteer' })
  ]);

  return { events, applications, volunteers };
}

async function getVolunteerManagement(ngoId: any) {
  return await User.find({ ngoId, role: 'volunteer' }).limit(10);
}

async function getServiceManagement(ngoId: any) {
  return await ServiceApplication.find({ ngoId }).limit(10);
}

async function getEventManagement(ngoId: any) {
  return await Event.find({ ngoId }).sort({ startDate: -1 }).limit(10);
}

async function getSystemOverview() {
  const [totalUsers, totalNGOs, totalDonations] = await Promise.all([
    User.countDocuments(),
    NGO.countDocuments(),
    Donation.countDocuments()
  ]);

  return { totalUsers, totalNGOs, totalDonations };
}

async function getUserStatistics() {
  return await User.aggregate([
    { $group: { _id: '$role', count: { $sum: 1 } } }
  ]);
}

async function getNGOStatistics() {
  return await NGO.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);
}

async function getPlatformHealth() {
  return {
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    status: 'healthy'
  };
}

async function getRecentNotifications(userId: any) {
  // Implementation for getting recent notifications
  return [];
}
