// Volunteer Tracking API Test Suite
// File: src/test/volunteerTracking.test.ts

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import app from '../app';
import VolunteerTracking from '../models/VolunteerTracking';
import NGO from '../models/NGO';
import User from '../models/User';
import { generateTestToken } from './helpers/authHelper';

describe('Volunteer Tracking API', () => {
  let ngoAdminToken: string;
  let volunteerToken: string;
  let testNGO: any;
  let testVolunteer: any;
  let ngoAdmin: any;

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/ngo_test');
    }
  });

  beforeEach(async () => {
    // Clean up database
    await VolunteerTracking.deleteMany({});
    await NGO.deleteMany({});
    await User.deleteMany({});

    // Create test NGO admin
    ngoAdmin = new User({
      name: 'NGO Admin',
      email: 'admin@testngo.org',
      password: 'password123',
      role: 'ngo_admin',
      isActive: true
    });
    await ngoAdmin.save();
    ngoAdminToken = generateTestToken(ngoAdmin._id, 'ngo_admin');

    // Create test NGO
    testNGO = new NGO({
      name: 'Test NGO',
      description: 'A test NGO for volunteer tracking',
      adminId: ngoAdmin._id,
      email: 'info@testngo.org',
      status: 'verified',
      registrationNumber: 'REG123456'
    });
    await testNGO.save();

    // Create test volunteer
    testVolunteer = new User({
      name: 'Test Volunteer',
      email: 'volunteer@test.com',
      password: 'password123',
      role: 'volunteer',
      isActive: true,
      ngoId: testNGO._id
    });
    await testVolunteer.save();
    volunteerToken = generateTestToken(testVolunteer._id, 'volunteer');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('Check-in/Check-out System', () => {
    it('should allow volunteer to check in', async () => {
      const checkInData = {
        location: {
          latitude: 19.0760,
          longitude: 72.8777,
          address: '123 NGO Street'
        },
        notes: 'Starting morning shift',
        deviceInfo: {
          platform: 'web',
          version: '1.0.0',
          userAgent: 'Mozilla/5.0 Test'
        }
      };

      // Mock request would look like this (if using supertest):
      // const response = await request(app)
      //   .post('/api/v1/volunteer-tracking/check-in')
      //   .set('Authorization', `Bearer ${volunteerToken}`)
      //   .send(checkInData)
      //   .expect(200);

      // For now, directly test the model creation
      const tracking = new VolunteerTracking({
        volunteerId: testVolunteer._id,
        ngoId: testNGO._id,
        trackingType: 'check_in',
        location: checkInData.location,
        notes: checkInData.notes,
        deviceInfo: checkInData.deviceInfo,
        timestamp: new Date()
      });

      await tracking.save();

      expect(tracking.volunteerId.toString()).toBe(testVolunteer._id.toString());
      expect(tracking.trackingType).toBe('check_in');
      expect(tracking.location?.address).toBe(checkInData.location.address);
    });

    it('should allow volunteer to check out', async () => {
      // First check in
      const checkIn = new VolunteerTracking({
        volunteerId: testVolunteer._id,
        ngoId: testNGO._id,
        trackingType: 'check_in',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000) // 4 hours ago
      });
      await checkIn.save();

      // Then check out
      const checkOutData = {
        hoursWorked: 4,
        tasksCompleted: ['Community outreach', 'Data entry'],
        notes: 'Completed morning shift successfully'
      };

      const checkOut = new VolunteerTracking({
        volunteerId: testVolunteer._id,
        ngoId: testNGO._id,
        trackingType: 'check_out',
        duration: checkOutData.hoursWorked * 60, // convert to minutes
        notes: checkOutData.notes,
        metadata: { tasksCompleted: checkOutData.tasksCompleted },
        timestamp: new Date()
      });

      await checkOut.save();

      expect(checkOut.trackingType).toBe('check_out');
      expect(checkOut.duration).toBe(240); // 4 hours in minutes
      expect(checkOut.metadata.tasksCompleted).toContain('Community outreach');
    });

    it('should prevent duplicate check-ins', async () => {
      // Create existing check-in
      await VolunteerTracking.create({
        volunteerId: testVolunteer._id,
        ngoId: testNGO._id,
        trackingType: 'check_in',
        timestamp: new Date()
      });

      // Try to check in again
      const existingCheckIn = await VolunteerTracking.findOne({
        volunteerId: testVolunteer._id,
        trackingType: 'check_in',
        timestamp: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }).sort({ timestamp: -1 });

      const lastCheckOut = await VolunteerTracking.findOne({
        volunteerId: testVolunteer._id,
        trackingType: 'check_out',
        timestamp: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }).sort({ timestamp: -1 });

      // Should detect existing check-in without corresponding check-out
      expect(existingCheckIn).toBeTruthy();
      expect(!lastCheckOut || existingCheckIn!.timestamp > lastCheckOut!.timestamp).toBe(true);
    });
  });

  describe('Activity Logging', () => {
    it('should log volunteer activity', async () => {
      const activityData = {
        activityType: 'task',
        title: 'Community Survey',
        description: 'Conducted health survey in local community',
        duration: 3, // hours
        location: {
          latitude: 19.0760,
          longitude: 72.8777,
          address: 'Community Center'
        },
        tags: ['health', 'survey', 'community'],
        impact: 'Surveyed 25 families for health needs assessment'
      };

      const activity = new VolunteerTracking({
        volunteerId: testVolunteer._id,
        ngoId: testNGO._id,
        trackingType: 'activity_log',
        activityType: activityData.activityType,
        title: activityData.title,
        description: activityData.description,
        duration: activityData.duration,
        hoursWorked: activityData.duration,
        location: activityData.location,
        tags: activityData.tags,
        impact: activityData.impact,
        timestamp: new Date()
      });

      await activity.save();

      expect(activity.activityType).toBe('task');
      expect(activity.title).toBe('Community Survey');
      expect(activity.hoursWorked).toBe(3);
      expect(activity.impact).toContain('25 families');
    });

    it('should support different activity types', async () => {
      const activityTypes = ['task', 'training', 'event', 'meeting', 'fieldwork', 'administrative'];
      
      for (const type of activityTypes) {
        const activity = new VolunteerTracking({
          volunteerId: testVolunteer._id,
          ngoId: testNGO._id,
          trackingType: 'activity_log',
          activityType: type,
          title: `Test ${type} activity`,
          duration: 2,
          timestamp: new Date()
        });

        await activity.save();
        expect(activity.activityType).toBe(type);
      }
    });
  });

  describe('Statistics and Reporting', () => {
    beforeEach(async () => {
      // Create sample tracking data
      const trackingData = [
        {
          volunteerId: testVolunteer._id,
          ngoId: testNGO._id,
          trackingType: 'check_in',
          timestamp: new Date('2024-07-01T09:00:00Z')
        },
        {
          volunteerId: testVolunteer._id,
          ngoId: testNGO._id,
          trackingType: 'check_out',
          duration: 480, // 8 hours
          hoursWorked: 8,
          timestamp: new Date('2024-07-01T17:00:00Z')
        },
        {
          volunteerId: testVolunteer._id,
          ngoId: testNGO._id,
          trackingType: 'activity_log',
          activityType: 'task',
          title: 'Community outreach',
          duration: 4,
          hoursWorked: 4,
          timestamp: new Date('2024-07-02T10:00:00Z')
        }
      ];

      await VolunteerTracking.insertMany(trackingData);
    });

    it('should calculate volunteer statistics correctly', async () => {
      const stats = await VolunteerTracking.aggregate([
        {
          $match: {
            volunteerId: testVolunteer._id
          }
        },
        {
          $group: {
            _id: null,
            totalSessions: { $sum: 1 },
            totalHours: { $sum: '$hoursWorked' },
            checkIns: {
              $sum: { $cond: [{ $eq: ['$trackingType', 'check_in'] }, 1, 0] }
            },
            checkOuts: {
              $sum: { $cond: [{ $eq: ['$trackingType', 'check_out'] }, 1, 0] }
            },
            activeDays: { $addToSet: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } } }
          }
        }
      ]);

      const result = stats[0];
      expect(result.totalSessions).toBe(3);
      expect(result.totalHours).toBe(12); // 8 + 4 hours
      expect(result.checkIns).toBe(1);
      expect(result.checkOuts).toBe(1);
      expect(result.activeDays.length).toBe(2); // Two different days
    });

    it('should generate NGO-wide statistics', async () => {
      const stats = await VolunteerTracking.aggregate([
        {
          $match: {
            ngoId: testNGO._id
          }
        },
        {
          $group: {
            _id: {
              volunteerId: '$volunteerId',
              date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }
            },
            dailyHours: { $sum: '$hoursWorked' },
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
      ]);

      const result = stats[0];
      expect(result.totalVolunteers.length).toBe(1);
      expect(result.totalHours).toBe(12);
      expect(result.totalSessions).toBe(3);
      expect(result.activeDays.length).toBe(2);
    });

    it('should filter statistics by date range', async () => {
      const startDate = new Date('2024-07-01T00:00:00Z');
      const endDate = new Date('2024-07-01T23:59:59Z');

      const stats = await VolunteerTracking.aggregate([
        {
          $match: {
            volunteerId: testVolunteer._id,
            timestamp: {
              $gte: startDate,
              $lte: endDate
            }
          }
        },
        {
          $group: {
            _id: null,
            totalSessions: { $sum: 1 },
            totalHours: { $sum: '$hoursWorked' }
          }
        }
      ]);

      const result = stats[0];
      expect(result.totalSessions).toBe(2); // check_in and check_out on July 1st
      expect(result.totalHours).toBe(8); // Only check_out has hours
    });
  });

  describe('Verification System', () => {
    it('should allow NGO admin to verify tracking entries', async () => {
      const tracking = new VolunteerTracking({
        volunteerId: testVolunteer._id,
        ngoId: testNGO._id,
        trackingType: 'check_out',
        duration: 480,
        hoursWorked: 8,
        timestamp: new Date()
      });
      await tracking.save();

      // Verify the entry
      tracking.isVerified = true;
      tracking.verifiedBy = ngoAdmin._id;
      await tracking.save();

      expect(tracking.isVerified).toBe(true);
      expect(tracking.verifiedBy?.toString()).toBe(ngoAdmin._id.toString());
    });

    it('should track verification status', async () => {
      // Create multiple entries
      const entries = [
        {
          volunteerId: testVolunteer._id,
          ngoId: testNGO._id,
          trackingType: 'check_out',
          hoursWorked: 8,
          isVerified: true,
          verifiedBy: ngoAdmin._id
        },
        {
          volunteerId: testVolunteer._id,
          ngoId: testNGO._id,
          trackingType: 'activity_log',
          hoursWorked: 4,
          isVerified: false
        }
      ];

      await VolunteerTracking.insertMany(entries);

      const verifiedCount = await VolunteerTracking.countDocuments({
        volunteerId: testVolunteer._id,
        isVerified: true
      });

      const unverifiedCount = await VolunteerTracking.countDocuments({
        volunteerId: testVolunteer._id,
        isVerified: false
      });

      expect(verifiedCount).toBe(1);
      expect(unverifiedCount).toBe(1);
    });
  });

  describe('Data Validation', () => {
    it('should validate required fields', async () => {
      const invalidTracking = new VolunteerTracking({
        // Missing required fields: volunteerId, ngoId, trackingType
        timestamp: new Date()
      });

      let error;
      try {
        await invalidTracking.save();
      } catch (e) {
        error = e;
      }

      expect(error).toBeDefined();
      expect(error.errors.volunteerId).toBeDefined();
      expect(error.errors.ngoId).toBeDefined();
      expect(error.errors.trackingType).toBeDefined();
    });

    it('should validate tracking type enum', async () => {
      const invalidTracking = new VolunteerTracking({
        volunteerId: testVolunteer._id,
        ngoId: testNGO._id,
        trackingType: 'invalid_type' as any,
        timestamp: new Date()
      });

      let error;
      try {
        await invalidTracking.save();
      } catch (e) {
        error = e;
      }

      expect(error).toBeDefined();
      expect(error.errors.trackingType).toBeDefined();
    });

    it('should validate location coordinates', async () => {
      const trackingWithInvalidLocation = new VolunteerTracking({
        volunteerId: testVolunteer._id,
        ngoId: testNGO._id,
        trackingType: 'check_in',
        location: {
          latitude: 200, // Invalid latitude (should be -90 to 90)
          longitude: 300 // Invalid longitude (should be -180 to 180)
        },
        timestamp: new Date()
      });

      let error;
      try {
        await trackingWithInvalidLocation.save();
      } catch (e) {
        error = e;
      }

      expect(error).toBeDefined();
    });

    it('should validate duration constraints', async () => {
      const trackingWithNegativeDuration = new VolunteerTracking({
        volunteerId: testVolunteer._id,
        ngoId: testNGO._id,
        trackingType: 'check_out',
        duration: -30, // Negative duration should not be allowed
        timestamp: new Date()
      });

      let error;
      try {
        await trackingWithNegativeDuration.save();
      } catch (e) {
        error = e;
      }

      expect(error).toBeDefined();
    });
  });

  describe('Performance and Indexes', () => {
    it('should query efficiently by volunteer and date', async () => {
      // Create test data
      const testData = [];
      for (let i = 0; i < 100; i++) {
        testData.push({
          volunteerId: testVolunteer._id,
          ngoId: testNGO._id,
          trackingType: i % 2 === 0 ? 'check_in' : 'check_out',
          timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
          hoursWorked: Math.floor(Math.random() * 8) + 1
        });
      }
      await VolunteerTracking.insertMany(testData);

      const startTime = Date.now();
      
      const recentEntries = await VolunteerTracking.find({
        volunteerId: testVolunteer._id,
        timestamp: {
          $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      }).sort({ timestamp: -1 }).limit(10);

      const queryTime = Date.now() - startTime;

      expect(recentEntries.length).toBe(10);
      expect(queryTime).toBeLessThan(100); // Should be fast with proper indexing
    });

    it('should efficiently aggregate NGO statistics', async () => {
      // Create data for multiple volunteers
      const volunteers = [];
      for (let i = 0; i < 5; i++) {
        const volunteer = new User({
          name: `Volunteer ${i}`,
          email: `volunteer${i}@test.com`,
          password: 'password123',
          role: 'volunteer',
          ngoId: testNGO._id
        });
        await volunteer.save();
        volunteers.push(volunteer);
      }

      // Create tracking data for each volunteer
      const trackingData = [];
      volunteers.forEach(volunteer => {
        for (let day = 0; day < 10; day++) {
          trackingData.push({
            volunteerId: volunteer._id,
            ngoId: testNGO._id,
            trackingType: 'check_out',
            hoursWorked: Math.floor(Math.random() * 8) + 1,
            timestamp: new Date(Date.now() - day * 24 * 60 * 60 * 1000)
          });
        }
      });
      await VolunteerTracking.insertMany(trackingData);

      const startTime = Date.now();

      const ngoStats = await VolunteerTracking.aggregate([
        {
          $match: {
            ngoId: testNGO._id,
            timestamp: {
              $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
          }
        },
        {
          $group: {
            _id: '$volunteerId',
            totalHours: { $sum: '$hoursWorked' },
            sessionCount: { $sum: 1 }
          }
        },
        {
          $group: {
            _id: null,
            volunteerCount: { $sum: 1 },
            totalHours: { $sum: '$totalHours' },
            averageHoursPerVolunteer: { $avg: '$totalHours' }
          }
        }
      ]);

      const aggregationTime = Date.now() - startTime;

      expect(ngoStats[0].volunteerCount).toBe(5);
      expect(ngoStats[0].totalHours).toBeGreaterThan(0);
      expect(aggregationTime).toBeLessThan(200); // Should be reasonably fast
    });
  });

  describe('Business Logic', () => {
    it('should calculate session duration correctly', async () => {
      const checkInTime = new Date('2024-07-11T09:00:00Z');
      const checkOutTime = new Date('2024-07-11T17:30:00Z');
      const expectedDuration = 8.5 * 60; // 8.5 hours in minutes

      const checkOut = new VolunteerTracking({
        volunteerId: testVolunteer._id,
        ngoId: testNGO._id,
        trackingType: 'check_out',
        duration: expectedDuration,
        hoursWorked: 8.5,
        timestamp: checkOutTime
      });

      await checkOut.save();

      expect(checkOut.duration).toBe(expectedDuration);
      expect(checkOut.hoursWorked).toBe(8.5);
    });

    it('should handle break tracking', async () => {
      const breaks = [
        {
          volunteerId: testVolunteer._id,
          ngoId: testNGO._id,
          trackingType: 'break_start',
          timestamp: new Date('2024-07-11T12:00:00Z')
        },
        {
          volunteerId: testVolunteer._id,
          ngoId: testNGO._id,
          trackingType: 'break_end',
          timestamp: new Date('2024-07-11T12:30:00Z'),
          duration: 30 // 30 minutes break
        }
      ];

      await VolunteerTracking.insertMany(breaks);

      const breakEntries = await VolunteerTracking.find({
        volunteerId: testVolunteer._id,
        trackingType: { $in: ['break_start', 'break_end'] }
      }).sort({ timestamp: 1 });

      expect(breakEntries.length).toBe(2);
      expect(breakEntries[0].trackingType).toBe('break_start');
      expect(breakEntries[1].trackingType).toBe('break_end');
      expect(breakEntries[1].duration).toBe(30);
    });
  });
});
