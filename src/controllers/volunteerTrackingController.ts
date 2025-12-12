import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import VolunteerTracking from '../models/VolunteerTracking';
import VolunteerActivity from '../models/VolunteerActivity';
import NGO from '../models/NGO';
import User from '../models/User';
import logger from '../utils/logger';
import mongoose from 'mongoose';

// Enhanced Volunteer Tracking Controller
export class VolunteerTrackingController {

  /**
   * Record volunteer check-in
   */
  static async checkIn(req: AuthRequest, res: Response): Promise<void> {
    try {
      const volunteerId = req.user?._id;
      const { activityId, location, notes, deviceInfo } = req.body;

      // Verify volunteer exists and get their NGO
      const volunteer = await User.findById(volunteerId);
      if (!volunteer || volunteer.role !== 'volunteer') {
        res.status(403).json({
          success: false,
          message: 'Invalid volunteer access'
        });
        return;
      }

      // Get NGO ID (assuming volunteer has ngoId field or through activity)
      let ngoId;
      if (activityId) {
        const activity = await VolunteerActivity.findById(activityId);
        ngoId = activity?.ngoId;
      } else {
        // Get from volunteer's profile or default NGO
        ngoId = (volunteer as any).ngoId;
      }

      if (!ngoId) {
        res.status(400).json({
          success: false,
          message: 'Cannot determine NGO for check-in'
        });
        return;
      }

      // Check if volunteer is already checked in
      const existingCheckIn = await VolunteerTracking.findOne({
        volunteerId,
        trackingType: 'check_in',
        timestamp: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }).sort({ timestamp: -1 });

      const lastCheckOut = await VolunteerTracking.findOne({
        volunteerId,
        trackingType: 'check_out',
        timestamp: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }).sort({ timestamp: -1 });

      if (existingCheckIn && (!lastCheckOut || existingCheckIn.timestamp > lastCheckOut.timestamp)) {
        res.status(400).json({
          success: false,
          message: 'Volunteer is already checked in'
        });
        return;
      }

      // Create check-in record
      const tracking = new VolunteerTracking({
        volunteerId,
        ngoId,
        activityId,
        trackingType: 'check_in',
        location,
        notes,
        deviceInfo,
        timestamp: new Date()
      });

      await tracking.save();

      res.json({
        success: true,
        message: 'Check-in recorded successfully',
        data: tracking
      });

      logger.info(`Volunteer check-in recorded: ${volunteerId} at ${new Date()}`);
    } catch (error: any) {
      logger.error('Error recording check-in:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to record check-in',
        error: error.message
      });
    }
  }

  /**
   * Record volunteer check-out
   */
  static async checkOut(req: AuthRequest, res: Response): Promise<void> {
    try {
      const volunteerId = req.user?._id;
      const { location, notes, photos } = req.body;

      // Find the last check-in
      const lastCheckIn = await VolunteerTracking.findOne({
        volunteerId,
        trackingType: 'check_in'
      }).sort({ timestamp: -1 });

      if (!lastCheckIn) {
        res.status(400).json({
          success: false,
          message: 'No check-in found. Please check in first.'
        });
        return;
      }

      // Check if already checked out
      const lastCheckOut = await VolunteerTracking.findOne({
        volunteerId,
        trackingType: 'check_out'
      }).sort({ timestamp: -1 });

      if (lastCheckOut && lastCheckOut.timestamp > lastCheckIn.timestamp) {
        res.status(400).json({
          success: false,
          message: 'Already checked out'
        });
        return;
      }

      // Calculate duration
      const checkOutTime = new Date();
      const duration = Math.round((checkOutTime.getTime() - lastCheckIn.timestamp.getTime()) / (1000 * 60)); // in minutes

      // Create check-out record
      const tracking = new VolunteerTracking({
        volunteerId,
        ngoId: lastCheckIn.ngoId,
        activityId: lastCheckIn.activityId,
        trackingType: 'check_out',
        location,
        notes,
        photos,
        duration,
        timestamp: checkOutTime
      });

      await tracking.save();

      // Update VolunteerActivity if activityId exists
      if (lastCheckIn.activityId) {
        await VolunteerActivity.findByIdAndUpdate(lastCheckIn.activityId, {
          $inc: { hoursSpent: duration / 60 }
        });
      }

      res.json({
        success: true,
        message: 'Check-out recorded successfully',
        data: {
          ...tracking.toObject(),
          sessionDuration: duration
        }
      });

      logger.info(`Volunteer check-out recorded: ${volunteerId}, duration: ${duration} minutes`);
    } catch (error: any) {
      logger.error('Error recording check-out:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to record check-out',
        error: error.message
      });
    }
  }

  /**
   * Get volunteer's tracking history
   */
  static async getVolunteerHistory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const volunteerId = req.user?._id;
      const { page = 1, limit = 20, startDate, endDate } = req.query;

      const query: any = { volunteerId };

      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate as string);
        if (endDate) query.timestamp.$lte = new Date(endDate as string);
      }

      const skip = (Number(page) - 1) * Number(limit);

      const [history, total] = await Promise.all([
        VolunteerTracking.find(query)
          .populate('activityId', 'title description')
          .populate('ngoId', 'name')
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(Number(limit)),
        VolunteerTracking.countDocuments(query)
      ]);

      // Calculate summary statistics
      const stats = await (VolunteerTracking as any).getVolunteerHours(
        volunteerId,
        startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), 0, 1),
        endDate ? new Date(endDate as string) : new Date()
      );

      res.json({
        success: true,
        data: {
          history,
          pagination: {
            current: Number(page),
            total: Math.ceil(total / Number(limit)),
            count: history.length,
            totalItems: total
          },
          summary: stats[0] || { totalHours: 0, totalSessions: 0 }
        }
      });
    } catch (error: any) {
      logger.error('Error fetching volunteer history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch volunteer history',
        error: error.message
      });
    }
  }

  /**
   * Get NGO volunteer tracking overview
   */
  static async getNGOVolunteerOverview(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?._id;
      const { startDate, endDate, page = 1, limit = 20 } = req.query;

      const ngo = await NGO.findOne({ adminId: userId });
      if (!ngo) {
        res.status(404).json({
          success: false,
          message: 'NGO not found'
        });
        return;
      }

      const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), 0, 1);
      const end = endDate ? new Date(endDate as string) : new Date();

      // Get volunteer statistics
      const stats = await (VolunteerTracking as any).getNGOVolunteerStats(ngo._id, start, end);

      // Get recent tracking activities
      const recentActivities = await VolunteerTracking.find({
        ngoId: ngo._id,
        timestamp: { $gte: start, $lte: end }
      })
      .populate('volunteerId', 'name email')
      .populate('activityId', 'title')
      .sort({ timestamp: -1 })
      .limit(50);

      // Calculate overall metrics
      const metrics = await VolunteerTracking.aggregate([
        {
          $match: {
            ngoId: ngo._id,
            trackingType: 'check_out',
            timestamp: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: null,
            totalVolunteers: { $addToSet: '$volunteerId' },
            totalHours: { $sum: { $divide: ['$duration', 60] } },
            totalSessions: { $sum: 1 },
            avgSessionDuration: { $avg: '$duration' }
          }
        },
        {
          $project: {
            uniqueVolunteers: { $size: '$totalVolunteers' },
            totalHours: { $round: ['$totalHours', 2] },
            totalSessions: 1,
            avgSessionHours: { $round: [{ $divide: ['$avgSessionDuration', 60] }, 2] }
          }
        }
      ]);

      res.json({
        success: true,
        data: {
          metrics: metrics[0] || {
            uniqueVolunteers: 0,
            totalHours: 0,
            totalSessions: 0,
            avgSessionHours: 0
          },
          volunteerStats: stats.slice((Number(page) - 1) * Number(limit), Number(page) * Number(limit)),
          recentActivities: recentActivities.slice(0, 10),
          pagination: {
            current: Number(page),
            total: Math.ceil(stats.length / Number(limit)),
            count: Math.min(Number(limit), stats.length),
            totalItems: stats.length
          }
        }
      });
    } catch (error: any) {
      logger.error('Error fetching NGO volunteer overview:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch volunteer overview',
        error: error.message
      });
    }
  }

  /**
   * Verify volunteer tracking entry
   */
  static async verifyTracking(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { trackingId } = req.params;
      const userId = req.user?._id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
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

      const tracking = await VolunteerTracking.findOne({
        _id: trackingId,
        ngoId: ngo._id
      });

      if (!tracking) {
        res.status(404).json({
          success: false,
          message: 'Tracking entry not found'
        });
        return;
      }

      await tracking.verify(userId);

      res.json({
        success: true,
        message: 'Tracking entry verified successfully',
        data: tracking
      });

      logger.info(`Tracking entry verified: ${trackingId} by ${userId}`);
      return;
    } catch (error: any) {
      logger.error('Error verifying tracking:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify tracking entry',
        error: error.message
      });
    }
  }

  /**
   * Get volunteer's current status
   */
  static async getCurrentStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const volunteerId = req.user?._id;

      // Get last check-in and check-out
      const [lastCheckIn, lastCheckOut] = await Promise.all([
        VolunteerTracking.findOne({
          volunteerId,
          trackingType: 'check_in'
        }).sort({ timestamp: -1 }),
        VolunteerTracking.findOne({
          volunteerId,
          trackingType: 'check_out'
        }).sort({ timestamp: -1 })
      ]);

      let status = 'checked_out';
      let currentSession = null;

      if (lastCheckIn && (!lastCheckOut || lastCheckIn.timestamp > lastCheckOut.timestamp)) {
        status = 'checked_in';
        const currentTime = new Date();
        const sessionDuration = Math.round((currentTime.getTime() - lastCheckIn.timestamp.getTime()) / (1000 * 60));
        
        currentSession = {
          checkInTime: lastCheckIn.timestamp,
          duration: sessionDuration,
          activityId: lastCheckIn.activityId,
          location: lastCheckIn.location
        };
      }

      res.json({
        success: true,
        data: {
          status,
          currentSession,
          lastCheckIn: lastCheckIn?.timestamp,
          lastCheckOut: lastCheckOut?.timestamp
        }
      });
    } catch (error: any) {
      logger.error('Error fetching current status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch current status',
        error: error.message
      });
    }
  }

  /**
   * Generate volunteer attendance report
   */
  static async generateAttendanceReport(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?._id;
      const { startDate, endDate, format = 'json' } = req.query;

      const ngo = await NGO.findOne({ adminId: userId });
      if (!ngo) {
        res.status(404).json({
          success: false,
          message: 'NGO not found'
        });
        return;
      }

      const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), 0, 1);
      const end = endDate ? new Date(endDate as string) : new Date();

      const report = await VolunteerTracking.aggregate([
        {
          $match: {
            ngoId: ngo._id,
            trackingType: 'check_out',
            timestamp: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: {
              volunteerId: '$volunteerId',
              date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }
            },
            totalMinutes: { $sum: '$duration' },
            sessions: { $sum: 1 }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id.volunteerId',
            foreignField: '_id',
            as: 'volunteer'
          }
        },
        {
          $unwind: '$volunteer'
        },
        {
          $project: {
            date: '$_id.date',
            volunteerId: '$_id.volunteerId',
            volunteerName: '$volunteer.name',
            volunteerEmail: '$volunteer.email',
            totalHours: { $round: [{ $divide: ['$totalMinutes', 60] }, 2] },
            sessions: 1
          }
        },
        {
          $sort: { date: -1, volunteerName: 1 }
        }
      ]);

      if (format === 'csv') {
        // Convert to CSV format
        const csv = this.convertReportToCSV(report);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="volunteer-attendance-report.csv"');
        res.send(csv);
      } else {
        res.json({
          success: true,
          data: {
            report,
            period: { startDate: start, endDate: end },
            generatedAt: new Date(),
            totalRecords: report.length
          }
        });
      }

      logger.info(`Attendance report generated for NGO: ${ngo._id}`);
    } catch (error: any) {
      logger.error('Error generating attendance report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate attendance report',
        error: error.message
      });
    }
  }

  // Helper method to convert report to CSV
  private static convertReportToCSV(report: any[]): string {
    const headers = ['Date', 'Volunteer Name', 'Email', 'Total Hours', 'Sessions'];
    let csv = headers.join(',') + '\n';
    
    report.forEach(record => {
      const row = [
        record.date,
        `"${record.volunteerName}"`,
        record.volunteerEmail,
        record.totalHours,
        record.sessions
      ];
      csv += row.join(',') + '\n';
    });

    return csv;
  }

  /**
   * Get tracking sessions
   */
  static async getTrackingSessions(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?._id;
      const userRole = req.user?.role;
      const { 
        volunteerId, 
        startDate, 
        endDate, 
        activityId, 
        page = 1, 
        limit = 20 
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Build filter
      const filter: any = {};

      // Role-based access control
      if (userRole === 'volunteer') {
        filter.volunteerId = userId;
      } else if (volunteerId && ['ngo_admin', 'ngo_manager'].includes(userRole || '')) {
        filter.volunteerId = volunteerId;
      } else if (['ngo_admin', 'ngo_manager'].includes(userRole || '')) {
        // Get NGO's volunteers only
        const ngo = await NGO.findOne({ adminId: userId });
        if (ngo) {
          filter.ngoId = ngo._id;
        }
      }

      if (startDate && endDate) {
        filter.timestamp = {
          $gte: new Date(startDate as string),
          $lte: new Date(endDate as string)
        };
      }

      if (activityId) {
        filter.activityId = activityId;
      }

      const [sessions, total] = await Promise.all([
        VolunteerTracking.find(filter)
          .populate('volunteerId', 'name email')
          .populate('activityId', 'title')
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(limitNum),
        VolunteerTracking.countDocuments(filter)
      ]);

      res.json({
        success: true,
        data: {
          sessions,
          pagination: {
            currentPage: pageNum,
            totalPages: Math.ceil(total / limitNum),
            totalItems: total,
            itemsPerPage: limitNum
          }
        }
      });
    } catch (error: any) {
      logger.error('Error fetching tracking sessions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch tracking sessions',
        error: error.message
      });
    }
  }

  /**
   * Get tracking session by ID
   */
  static async getTrackingSession(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?._id;
      const userRole = req.user?.role;

      const session = await VolunteerTracking.findById(id)
        .populate('volunteerId', 'name email')
        .populate('activityId', 'title description');

      if (!session) {
        res.status(404).json({
          success: false,
          message: 'Session not found'
        });
        return;
      }

      // Access control
      if (userRole === 'volunteer' && session.volunteerId.toString() !== userId?.toString()) {
        res.status(403).json({
          success: false,
          message: 'Access denied'
        });
        return;
      }

      res.json({
        success: true,
        data: session
      });
    } catch (error: any) {
      logger.error('Error fetching tracking session:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch tracking session',
        error: error.message
      });
    }
  }

  /**
   * Get volunteer statistics
   */
  static async getVolunteerStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?._id;
      const userRole = req.user?.role;
      const { volunteerId, period = 'month', startDate, endDate } = req.query;

      let targetVolunteerId = volunteerId;
      if (userRole === 'volunteer') {
        targetVolunteerId = userId?.toString();
      }

      if (!targetVolunteerId) {
        res.status(400).json({
          success: false,
          message: 'Volunteer ID is required'
        });
        return;
      }

      // Calculate date range
      let dateFilter: any = {};
      if (startDate && endDate) {
        dateFilter = {
          timestamp: {
            $gte: new Date(startDate as string),
            $lte: new Date(endDate as string)
          }
        };
      } else if (period) {
        const now = new Date();
        let startDateCalc: Date;
        
        switch (period) {
          case 'week':
            startDateCalc = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            startDateCalc = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case 'quarter':
            const quarter = Math.floor(now.getMonth() / 3);
            startDateCalc = new Date(now.getFullYear(), quarter * 3, 1);
            break;
          case 'year':
            startDateCalc = new Date(now.getFullYear(), 0, 1);
            break;
          default:
            startDateCalc = new Date(0);
        }
        
        if (period !== 'all') {
          dateFilter = { timestamp: { $gte: startDateCalc } };
        }
      }

      const pipeline = [
        {
          $match: {
            volunteerId: new mongoose.Types.ObjectId(targetVolunteerId as string),
            ...dateFilter
          }
        },
        {
          $group: {
            _id: null,
            totalSessions: { $sum: 1 },
            totalHours: { $sum: { $divide: ['$duration', 60] } },
            checkIns: {
              $sum: { $cond: [{ $eq: ['$trackingType', 'check_in'] }, 1, 0] }
            },
            checkOuts: {
              $sum: { $cond: [{ $eq: ['$trackingType', 'check_out'] }, 1, 0] }
            },
            activeDays: { $addToSet: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } } }
          }
        }
      ];

      const [stats] = await VolunteerTracking.aggregate(pipeline);

      const volunteerInfo = await User.findById(targetVolunteerId).select('name email');

      res.json({
        success: true,
        data: {
          volunteer: volunteerInfo,
          period,
          statistics: {
            totalSessions: stats?.totalSessions || 0,
            totalHours: stats?.totalHours || 0,
            checkIns: stats?.checkIns || 0,
            checkOuts: stats?.checkOuts || 0,
            activeDays: stats?.activeDays?.length || 0,
            averageHoursPerDay: stats?.activeDays?.length ? 
              (stats.totalHours / stats.activeDays.length).toFixed(2) : '0'
          }
        }
      });
    } catch (error: any) {
      logger.error('Error fetching volunteer stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch volunteer statistics',
        error: error.message
      });
    }
  }

  /**
   * Get NGO statistics
   */
  static async getNGOStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?._id;
      const { period = 'month', startDate, endDate } = req.query;

      // Get NGO
      const ngo = await NGO.findOne({ adminId: userId });
      if (!ngo) {
        res.status(404).json({
          success: false,
          message: 'NGO not found'
        });
        return;
      }

      // Calculate date range
      let dateFilter: any = {};
      if (startDate && endDate) {
        dateFilter = {
          timestamp: {
            $gte: new Date(startDate as string),
            $lte: new Date(endDate as string)
          }
        };
      } else if (period !== 'all') {
        const now = new Date();
        let startDateCalc: Date;
        
        switch (period) {
          case 'week':
            startDateCalc = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            startDateCalc = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case 'quarter':
            const quarter = Math.floor(now.getMonth() / 3);
            startDateCalc = new Date(now.getFullYear(), quarter * 3, 1);
            break;
          case 'year':
            startDateCalc = new Date(now.getFullYear(), 0, 1);
            break;
          default:
            startDateCalc = new Date(0);
        }
        
        dateFilter = { timestamp: { $gte: startDateCalc } };
      }

      const pipeline = [
        {
          $match: {
            ngoId: ngo._id,
            ...dateFilter
          }
        },
        {
          $group: {
            _id: {
              volunteerId: '$volunteerId',
              date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }
            },
            dailyHours: { $sum: { $divide: ['$duration', 60] } },
            sessions: { $sum: 1 }
          }
        },
        {
          $group: {
            _id: null,
            totalVolunteers: { $addToSet: '$_id.volunteerId' },
            totalHours: { $sum: '$dailyHours' },
            totalSessions: { $sum: '$sessions' },
            activeDays: { $addToSet: '$_id.date' }
          }
        }
      ];

      const [stats] = await VolunteerTracking.aggregate(pipeline);

      res.json({
        success: true,
        data: {
          ngo: { id: ngo._id, name: ngo.name },
          period,
          statistics: {
            activeVolunteers: stats?.totalVolunteers?.length || 0,
            totalHours: stats?.totalHours || 0,
            totalSessions: stats?.totalSessions || 0,
            activeDays: stats?.activeDays?.length || 0,
            averageHoursPerVolunteer: stats?.totalVolunteers?.length ? 
              (stats.totalHours / stats.totalVolunteers.length).toFixed(2) : '0',
            averageSessionsPerDay: stats?.activeDays?.length ? 
              (stats.totalSessions / stats.activeDays.length).toFixed(2) : '0'
          }
        }
      });
    } catch (error: any) {
      logger.error('Error fetching NGO stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch NGO statistics',
        error: error.message
      });
    }
  }

  /**
   * Log activity
   */
  static async logActivity(req: AuthRequest, res: Response): Promise<void> {
    try {
      const volunteerId = req.user?._id;
      const { 
        activityType, 
        title, 
        description, 
        duration, 
        location, 
        tags, 
        impact 
      } = req.body;

      // Get volunteer's NGO
      const volunteer = await User.findById(volunteerId);
      const ngoId = (volunteer as any)?.ngoId;

      if (!ngoId) {
        res.status(400).json({
          success: false,
          message: 'Cannot determine NGO for activity logging'
        });
        return;
      }

      const activity = new VolunteerTracking({
        volunteerId,
        ngoId,
        trackingType: 'task_complete',
        notes: `${activityType}: ${title} - ${description}`,
        duration,
        timestamp: new Date(),
        metadata: {
          activityType,
          title,
          description,
          location,
          tags,
          impact
        }
      });

      await activity.save();

      res.status(201).json({
        success: true,
        message: 'Activity logged successfully',
        data: activity
      });

      logger.info(`Activity logged by volunteer ${volunteerId}: ${title}`);
    } catch (error: any) {
      logger.error('Error logging activity:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to log activity',
        error: error.message
      });
    }
  }

  /**
   * Get activities
   */
  static async getActivities(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?._id;
      const userRole = req.user?.role;
      const { 
        volunteerId, 
        activityType, 
        startDate, 
        endDate, 
        page = 1, 
        limit = 20 
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Build filter
      const filter: any = { trackingType: { $in: ['task_complete', 'check_out'] } };

      // Role-based access control
      if (userRole === 'volunteer') {
        filter.volunteerId = userId;
      } else if (volunteerId && ['ngo_admin', 'ngo_manager'].includes(userRole || '')) {
        filter.volunteerId = volunteerId;
      } else if (['ngo_admin', 'ngo_manager'].includes(userRole || '')) {
        // Get NGO's activities only
        const ngo = await NGO.findOne({ adminId: userId });
        if (ngo) {
          filter.ngoId = ngo._id;
        }
      }

      if (activityType) {
        filter.activityType = activityType;
      }

      if (startDate && endDate) {
        filter.timestamp = {
          $gte: new Date(startDate as string),
          $lte: new Date(endDate as string)
        };
      }

      const [activities, total] = await Promise.all([
        VolunteerTracking.find(filter)
          .populate('volunteerId', 'name email')
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(limitNum),
        VolunteerTracking.countDocuments(filter)
      ]);

      res.json({
        success: true,
        data: {
          activities,
          pagination: {
            currentPage: pageNum,
            totalPages: Math.ceil(total / limitNum),
            totalItems: total,
            itemsPerPage: limitNum
          }
        }
      });
    } catch (error: any) {
      logger.error('Error fetching activities:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch activities',
        error: error.message
      });
    }
  }

  /**
   * Generate productivity report
   */
  static async generateProductivityReport(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?._id;
      const { period = 'month', volunteerId, activityType } = req.query;

      // Get NGO
      const ngo = await NGO.findOne({ adminId: userId });
      if (!ngo) {
        res.status(404).json({
          success: false,
          message: 'NGO not found'
        });
        return;
      }

      // Calculate date range
      let dateFilter: any = {};
      const now = new Date();
      
      switch (period) {
        case 'week':
          dateFilter = { 
            timestamp: { 
              $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) 
            } 
          };
          break;
        case 'month':
          dateFilter = { 
            timestamp: { 
              $gte: new Date(now.getFullYear(), now.getMonth(), 1) 
            } 
          };
          break;
        case 'quarter':
          const quarter = Math.floor(now.getMonth() / 3);
          dateFilter = { 
            timestamp: { 
              $gte: new Date(now.getFullYear(), quarter * 3, 1) 
            } 
          };
          break;
        case 'year':
          dateFilter = { 
            timestamp: { 
              $gte: new Date(now.getFullYear(), 0, 1) 
            } 
          };
          break;
      }

      const matchStage: any = {
        ngoId: ngo._id,
        trackingType: { $in: ['task_complete', 'check_out'] },
        ...dateFilter
      };

      if (volunteerId) {
        matchStage.volunteerId = new mongoose.Types.ObjectId(volunteerId as string);
      }

      if (activityType) {
        matchStage.activityType = activityType;
      }

      const pipeline = [
        { $match: matchStage },
        {
          $group: {
            _id: {
              volunteerId: '$volunteerId',
              activityType: '$activityType'
            },
            totalHours: { $sum: '$duration' },
            activityCount: { $sum: 1 },
            averageDuration: { $avg: '$duration' }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id.volunteerId',
            foreignField: '_id',
            as: 'volunteer'
          }
        },
        {
          $unwind: '$volunteer'
        },
        {
          $group: {
            _id: '$_id.volunteerId',
            volunteerName: { $first: '$volunteer.name' },
            volunteerEmail: { $first: '$volunteer.email' },
            activities: {
              $push: {
                type: '$_id.activityType',
                totalHours: '$totalHours',
                count: '$activityCount',
                averageDuration: '$averageDuration'
              }
            },
            totalHours: { $sum: '$totalHours' },
            totalActivities: { $sum: '$activityCount' }
          }
        },
        {
          $sort: { totalHours: -1 }
        }
      ];

      const report = await VolunteerTracking.aggregate(pipeline as any[]);

      res.json({
        success: true,
        data: {
          period,
          ngo: { id: ngo._id, name: ngo.name },
          report,
          summary: {
            totalVolunteers: report.length,
            totalHours: report.reduce((sum, r) => sum + r.totalHours, 0),
            totalActivities: report.reduce((sum, r) => sum + r.totalActivities, 0)
          }
        }
      });
    } catch (error: any) {
      logger.error('Error generating productivity report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate productivity report',
        error: error.message
      });
    }
  }

  /**
   * Verify session
   */
  static async verifySession(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { approved, verificationNotes } = req.body;
      const userId = req.user?._id;

      const session = await VolunteerTracking.findById(id);
      if (!session) {
        res.status(404).json({
          success: false,
          message: 'Session not found'
        });
        return;
      }

      // Check permissions
      const ngo = await NGO.findOne({ adminId: userId });
      if (!ngo || session.ngoId.toString() !== ngo._id.toString()) {
        res.status(403).json({
          success: false,
          message: 'Access denied'
        });
        return;
      }

      session.isVerified = approved;
      session.verifiedBy = userId;
      if (verificationNotes) {
        session.notes = verificationNotes;
      }

      await session.save();

      res.json({
        success: true,
        message: `Session ${approved ? 'approved' : 'rejected'} successfully`,
        data: session
      });

      logger.info(`Session ${id} ${approved ? 'approved' : 'rejected'} by user ${userId}`);
    } catch (error: any) {
      logger.error('Error verifying session:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify session',
        error: error.message
      });
    }
  }

  /**
   * Verify activity
   */
  static async verifyActivity(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { approved, verificationNotes } = req.body;
      const userId = req.user?._id;

      const activity = await VolunteerTracking.findById(id);
      if (!activity) {
        res.status(404).json({
          success: false,
          message: 'Activity not found'
        });
        return;
      }

      // Check permissions
      const ngo = await NGO.findOne({ adminId: userId });
      if (!ngo || activity.ngoId.toString() !== ngo._id.toString()) {
        res.status(403).json({
          success: false,
          message: 'Access denied'
        });
        return;
      }

      activity.isVerified = approved;
      activity.verifiedBy = userId;
      if (verificationNotes) {
        activity.notes = verificationNotes;
      }

      await activity.save();

      res.json({
        success: true,
        message: `Activity ${approved ? 'approved' : 'rejected'} successfully`,
        data: activity
      });

      logger.info(`Activity ${id} ${approved ? 'approved' : 'rejected'} by user ${userId}`);
    } catch (error: any) {
      logger.error('Error verifying activity:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify activity',
        error: error.message
      });
    }
  }

  /**
   * Bulk verify sessions/activities
   */
  static async bulkVerify(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { sessionIds = [], activityIds = [], approved, verificationNotes } = req.body;
      const userId = req.user?._id;

      // Get NGO
      const ngo = await NGO.findOne({ adminId: userId });
      if (!ngo) {
        res.status(404).json({
          success: false,
          message: 'NGO not found'
        });
        return;
      }

      const allIds = [...sessionIds, ...activityIds];
      if (allIds.length === 0) {
        res.status(400).json({
          success: false,
          message: 'No items selected for verification'
        });
        return;
      }

      // Update all selected items
      const updateResult = await VolunteerTracking.updateMany(
        { 
          _id: { $in: allIds },
          ngoId: ngo._id 
        },
        {
          $set: {
            isVerified: approved,
            verifiedBy: userId,
            notes: verificationNotes
          }
        }
      );

      res.json({
        success: true,
        message: `${updateResult.modifiedCount} items ${approved ? 'approved' : 'rejected'} successfully`,
        data: {
          modifiedCount: updateResult.modifiedCount,
          matchedCount: updateResult.matchedCount
        }
      });

      logger.info(`Bulk verification: ${updateResult.modifiedCount} items ${approved ? 'approved' : 'rejected'} by user ${userId}`);
    } catch (error: any) {
      logger.error('Error in bulk verification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to perform bulk verification',
        error: error.message
      });
    }
  }
}

export default VolunteerTrackingController;
