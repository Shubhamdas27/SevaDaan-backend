import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import NGO from '../models/NGO';
import User from '../models/User';
import Program from '../models/Program';
import Donation from '../models/Donation';
import VolunteerActivity from '../models/VolunteerActivity';
import Event from '../models/Event';
import ServiceApplication from '../models/ServiceApplication';
import logger from '../utils/logger';
import mongoose from 'mongoose';

// Advanced Analytics Controller
export class AnalyticsController {

  /**
   * Get comprehensive dashboard analytics
   */
  static async getDashboardAnalytics(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?._id;
      const { period = '30d', ngoId } = req.query;

      // Find the NGO
      let ngo;
      if (ngoId && req.user?.role === 'ngo_admin') {
        ngo = await NGO.findById(ngoId);
      } else {
        ngo = await NGO.findOne({ adminId: userId });
      }

      if (!ngo) {
        res.status(404).json({
          success: false,
          message: 'NGO not found'
        });
        return;
      }

      // Calculate date range based on period
      const endDate = new Date();
      const startDate = new Date();
      
      switch (period) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        default:
          startDate.setDate(endDate.getDate() - 30);
      }

      // Parallel data fetching for better performance
      const [
        totalUsers,
        totalPrograms,
        totalDonations,
        totalVolunteerHours,
        totalEvents,
        totalApplications,
        recentDonations,
        recentApplications,
        volunteerStats,
        programPerformance
      ] = await Promise.all([
        User.countDocuments({ role: { $in: ['volunteer', 'citizen', 'donor'] } }),
        Program.countDocuments({ ngoId: ngo._id }),
        Donation.aggregate([
          { $match: { ngoId: ngo._id, createdAt: { $gte: startDate, $lte: endDate } } },
          { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
        ]),
        VolunteerActivity.aggregate([
          { $match: { ngoId: ngo._id, date: { $gte: startDate, $lte: endDate } } },
          { $group: { _id: null, totalHours: { $sum: '$hoursSpent' } } }
        ]),
        Event.countDocuments({ ngoId: ngo._id, startDate: { $gte: startDate } }),
        ServiceApplication.countDocuments({ ngoId: ngo._id, submittedAt: { $gte: startDate, $lte: endDate } }),
        Donation.find({ ngoId: ngo._id })
          .sort({ createdAt: -1 })
          .limit(5)
          .populate('donorId', 'name email'),
        ServiceApplication.find({ ngoId: ngo._id })
          .sort({ submittedAt: -1 })
          .limit(5)
          .populate('applicantId', 'name email'),
        User.aggregate([
          { $match: { role: 'volunteer' } },
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ]),
        Program.aggregate([
          { $match: { ngoId: ngo._id } },
          {
            $lookup: {
              from: 'serviceapplications',
              localField: '_id',
              foreignField: 'programId',
              as: 'applications'
            }
          },
          {
            $project: {
              title: 1,
              applicationCount: { $size: '$applications' },
              approvedCount: {
                $size: {
                  $filter: {
                    input: '$applications',
                    cond: { $eq: ['$$this.status', 'approved'] }
                  }
                }
              }
            }
          },
          { $sort: { applicationCount: -1 } },
          { $limit: 5 }
        ])
      ]);

      const analytics = {
        overview: {
          totalUsers,
          totalPrograms,
          totalDonationAmount: totalDonations[0]?.total || 0,
          totalDonations: totalDonations[0]?.count || 0,
          totalVolunteerHours: totalVolunteerHours[0]?.totalHours || 0,
          totalEvents,
          totalApplications
        },
        trends: {
          period,
          donationTrend: await this.getDonationTrend(ngo._id, startDate, endDate),
          applicationTrend: await this.getApplicationTrend(ngo._id, startDate, endDate),
          volunteerTrend: await this.getVolunteerTrend(ngo._id, startDate, endDate)
        },
        recent: {
          donations: recentDonations,
          applications: recentApplications
        },
        performance: {
          volunteers: volunteerStats,
          programs: programPerformance
        },
        geographic: await this.getGeographicInsights(ngo._id),
        impact: await this.getImpactMetrics(ngo._id, startDate, endDate)
      };

      res.json({
        success: true,
        data: analytics
      });

      logger.info(`Analytics fetched for NGO: ${ngo._id}, period: ${period}`);
    } catch (error: any) {
      logger.error('Error fetching dashboard analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch analytics',
        error: error.message
      });
    }
  }

  /**
   * Get donation trend data
   */
  private static async getDonationTrend(ngoId: mongoose.Types.ObjectId, startDate: Date, endDate: Date) {
    try {
      const trend = await Donation.aggregate([
        { $match: { ngoId, createdAt: { $gte: startDate, $lte: endDate } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            amount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ]);

      return trend.map(item => ({
        date: new Date(item._id.year, item._id.month - 1, item._id.day),
        amount: item.amount,
        count: item.count
      }));
    } catch (error) {
      logger.error('Error calculating donation trend:', error);
      return [];
    }
  }

  /**
   * Get application trend data
   */
  private static async getApplicationTrend(ngoId: mongoose.Types.ObjectId, startDate: Date, endDate: Date) {
    try {
      const trend = await ServiceApplication.aggregate([
        { $match: { ngoId, submittedAt: { $gte: startDate, $lte: endDate } } },
        {
          $group: {
            _id: {
              year: { $year: '$submittedAt' },
              month: { $month: '$submittedAt' },
              day: { $dayOfMonth: '$submittedAt' }
            },
            count: { $sum: 1 },
            approved: {
              $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
            }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ]);

      return trend.map(item => ({
        date: new Date(item._id.year, item._id.month - 1, item._id.day),
        applications: item.count,
        approved: item.approved
      }));
    } catch (error) {
      logger.error('Error calculating application trend:', error);
      return [];
    }
  }

  /**
   * Get volunteer trend data
   */
  private static async getVolunteerTrend(ngoId: mongoose.Types.ObjectId, startDate: Date, endDate: Date) {
    try {
      const trend = await VolunteerActivity.aggregate([
        { $match: { ngoId, date: { $gte: startDate, $lte: endDate } } },
        {
          $group: {
            _id: {
              year: { $year: '$date' },
              month: { $month: '$date' },
              day: { $dayOfMonth: '$date' }
            },
            hours: { $sum: '$hoursSpent' },
            volunteers: { $addToSet: '$volunteerId' }
          }
        },
        {
          $project: {
            _id: 1,
            hours: 1,
            volunteerCount: { $size: '$volunteers' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ]);

      return trend.map(item => ({
        date: new Date(item._id.year, item._id.month - 1, item._id.day),
        hours: item.hours,
        volunteers: item.volunteerCount
      }));
    } catch (error) {
      logger.error('Error calculating volunteer trend:', error);
      return [];
    }
  }

  /**
   * Get geographic insights
   */
  private static async getGeographicInsights(ngoId: mongoose.Types.ObjectId) {
    try {
      // Get donation distribution by city
      const donationByCity = await Donation.aggregate([
        { $match: { ngoId } },
        {
          $lookup: {
            from: 'users',
            localField: 'donorId',
            foreignField: '_id',
            as: 'donor'
          }
        },
        { $unwind: '$donor' },
        {
          $group: {
            _id: '$donor.city',
            amount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { amount: -1 } },
        { $limit: 10 }
      ]);

      // Get application distribution by city
      const applicationByCity = await ServiceApplication.aggregate([
        { $match: { ngoId } },
        {
          $lookup: {
            from: 'users',
            localField: 'applicantId',
            foreignField: '_id',
            as: 'applicant'
          }
        },
        { $unwind: '$applicant' },
        {
          $group: {
            _id: '$applicant.city',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);

      return {
        donations: donationByCity.map(item => ({
          city: item._id || 'Unknown',
          amount: item.amount,
          count: item.count
        })),
        applications: applicationByCity.map(item => ({
          city: item._id || 'Unknown',
          count: item.count
        }))
      };
    } catch (error) {
      logger.error('Error calculating geographic insights:', error);
      return { donations: [], applications: [] };
    }
  }

  /**
   * Get impact metrics
   */
  private static async getImpactMetrics(ngoId: mongoose.Types.ObjectId, startDate: Date, endDate: Date) {
    try {
      const [beneficiariesServed, programsCompleted, volunteerEngagement] = await Promise.all([
        ServiceApplication.countDocuments({
          ngoId,
          status: 'approved',
          submittedAt: { $gte: startDate, $lte: endDate }
        }),
        Program.countDocuments({
          ngoId,
          status: 'completed',
          endDate: { $gte: startDate, $lte: endDate }
        }),
        VolunteerActivity.aggregate([
          { $match: { ngoId, date: { $gte: startDate, $lte: endDate } } },
          {
            $group: {
              _id: null,
              uniqueVolunteers: { $addToSet: '$volunteerId' },
              totalHours: { $sum: '$hoursSpent' }
            }
          }
        ])
      ]);

      return {
        beneficiariesServed,
        programsCompleted,
        uniqueVolunteers: volunteerEngagement[0]?.uniqueVolunteers?.length || 0,
        totalVolunteerHours: volunteerEngagement[0]?.totalHours || 0
      };
    } catch (error) {
      logger.error('Error calculating impact metrics:', error);
      return {
        beneficiariesServed: 0,
        programsCompleted: 0,
        uniqueVolunteers: 0,
        totalVolunteerHours: 0
      };
    }
  }

  /**
   * Export analytics data
   */
  static async exportAnalytics(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?._id;
      const { format = 'json', period = '30d' } = req.query;

      const ngo = await NGO.findOne({ adminId: userId });
      if (!ngo) {
        res.status(404).json({
          success: false,
          message: 'NGO not found'
        });
        return;
      }

      // Get comprehensive analytics data
      const analytics = await this.getExportData(ngo._id, period as string);

      if (format === 'csv') {
        // Convert to CSV format
        const csv = this.convertToCSV(analytics);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="analytics-${period}.csv"`);
        res.send(csv);
      } else {
        // Return JSON format
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="analytics-${period}.json"`);
        res.json({
          success: true,
          data: analytics,
          exportedAt: new Date(),
          period
        });
      }

      logger.info(`Analytics exported for NGO: ${ngo._id}, format: ${format}`);
    } catch (error: any) {
      logger.error('Error exporting analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export analytics',
        error: error.message
      });
    }
  }

  /**
   * Get data for export
   */
  private static async getExportData(ngoId: mongoose.Types.ObjectId, period: string) {
    // This would contain comprehensive data suitable for export
    // For now, return a simplified structure
    return {
      summary: {
        period,
        ngoId,
        exportDate: new Date()
      },
      donations: await Donation.find({ ngoId }).lean(),
      applications: await ServiceApplication.find({ ngoId }).lean(),
      programs: await Program.find({ ngoId }).lean(),
      volunteers: await VolunteerActivity.find({ ngoId }).lean()
    };
  }

  /**
   * Convert data to CSV format
   */
  private static convertToCSV(data: any): string {
    // Simple CSV conversion - in production, use a proper CSV library
    const headers = ['Type', 'Date', 'Amount', 'Status', 'Description'];
    let csv = headers.join(',') + '\n';
    
    // Add donation data
    if (data.donations) {
      data.donations.forEach((donation: any) => {
        csv += `Donation,${donation.createdAt},${donation.amount},${donation.status},"${donation.purpose || ''}"\n`;
      });
    }

    return csv;
  }
}

export default AnalyticsController;
