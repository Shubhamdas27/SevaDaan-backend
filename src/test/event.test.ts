// Event Management API Test Suite
// File: src/test/event.test.ts

import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import app from '../app';
import Event from '../models/Event';
import EventRegistration from '../models/EventRegistration';
import NGO from '../models/NGO';
import User from '../models/User';
import { generateTestToken } from './helpers/authHelper';

describe('Event Management API', () => {
  let ngoAdminToken: string;
  let volunteerToken: string;
  let donorToken: string;
  let testNGO: any;
  let testEvent: any;
  let testVolunteer: any;

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/ngo_test');
    }
  });

  beforeEach(async () => {
    // Clean up database
    await Event.deleteMany({});
    await EventRegistration.deleteMany({});
    await NGO.deleteMany({});
    await User.deleteMany({});

    // Create test NGO admin
    const ngoAdmin = new User({
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
      description: 'A test NGO for event management',
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

    // Create test donor
    const donor = new User({
      name: 'Test Donor',
      email: 'donor@test.com',
      password: 'password123',
      role: 'donor',
      isActive: true
    });
    await donor.save();
    donorToken = generateTestToken(donor._id, 'donor');

    // Create test event
    testEvent = new Event({
      title: 'Test Community Event',
      description: 'A test event for the community',
      ngo: testNGO._id,
      createdBy: ngoAdmin._id,
      eventType: 'community',
      category: 'education',
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      endDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000), // 8 days from now
      location: {
        address: '123 Test Street',
        city: 'Test City',
        state: 'Test State',
        pincode: '123456'
      },
      maxAttendees: 100,
      currentAttendees: 0,
      status: 'published',
      featured: false,
      tags: ['education', 'community'],
      targetAudience: ['students', 'families']
    });
    await testEvent.save();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('POST /api/v1/events', () => {
    it('should create a new event with valid data', async () => {
      const eventData = {
        title: 'New Test Event',
        description: 'Description for new test event',
        eventType: 'fundraising',
        category: 'healthcare',
        startDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000),
        location: {
          address: '456 New Street',
          city: 'New City',
          state: 'New State',
          pincode: '654321'
        },
        maxAttendees: 50,
        registrationDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        tags: ['healthcare', 'fundraising']
      };

      const response = await request(app)
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${ngoAdminToken}`)
        .send(eventData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(eventData.title);
      expect(response.body.data.ngo).toBe(testNGO._id.toString());
    });

    it('should not create event without authentication', async () => {
      const eventData = {
        title: 'Unauthorized Event',
        description: 'This should not be created'
      };

      await request(app)
        .post('/api/v1/events')
        .send(eventData)
        .expect(401);
    });

    it('should not create event with invalid data', async () => {
      const invalidEventData = {
        title: '', // Empty title
        description: 'Valid description'
      };

      const response = await request(app)
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${ngoAdminToken}`)
        .send(invalidEventData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/events', () => {
    it('should fetch all events with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/events?page=1&limit=10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.events).toBeInstanceOf(Array);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.events.length).toBeGreaterThan(0);
    });

    it('should filter events by status', async () => {
      const response = await request(app)
        .get('/api/v1/events?status=published')
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.events.forEach((event: any) => {
        expect(event.status).toBe('published');
      });
    });

    it('should filter events by NGO', async () => {
      const response = await request(app)
        .get(`/api/v1/events?ngoId=${testNGO._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.events.forEach((event: any) => {
        expect(event.ngo._id || event.ngo).toBe(testNGO._id.toString());
      });
    });

    it('should search events by title', async () => {
      const response = await request(app)
        .get('/api/v1/events?search=Community')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.events.length).toBeGreaterThan(0);
    });

    it('should fetch upcoming events only', async () => {
      const response = await request(app)
        .get('/api/v1/events?upcoming=true')
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.events.forEach((event: any) => {
        expect(new Date(event.startDate).getTime()).toBeGreaterThan(Date.now());
      });
    });
  });

  describe('GET /api/v1/events/:id', () => {
    it('should fetch a specific event by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/events/${testEvent._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(testEvent._id.toString());
      expect(response.body.data.title).toBe(testEvent.title);
      expect(response.body.data.ngo).toBeDefined();
    });

    it('should return 404 for non-existent event', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await request(app)
        .get(`/api/v1/events/${fakeId}`)
        .expect(404);
    });
  });

  describe('PUT /api/v1/events/:id', () => {
    it('should update event with valid data', async () => {
      const updateData = {
        title: 'Updated Event Title',
        description: 'Updated description'
      };

      const response = await request(app)
        .put(`/api/v1/events/${testEvent._id}`)
        .set('Authorization', `Bearer ${ngoAdminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.data.description).toBe(updateData.description);
    });

    it('should not update event without authentication', async () => {
      const updateData = { title: 'Unauthorized Update' };

      await request(app)
        .put(`/api/v1/events/${testEvent._id}`)
        .send(updateData)
        .expect(401);
    });

    it('should not allow non-owner to update event', async () => {
      const updateData = { title: 'Unauthorized Update' };

      await request(app)
        .put(`/api/v1/events/${testEvent._id}`)
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send(updateData)
        .expect(403);
    });
  });

  describe('DELETE /api/v1/events/:id', () => {
    it('should delete event without registrations', async () => {
      const response = await request(app)
        .delete(`/api/v1/events/${testEvent._id}`)
        .set('Authorization', `Bearer ${ngoAdminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');

      // Verify event is deleted
      const deletedEvent = await Event.findById(testEvent._id);
      expect(deletedEvent).toBeNull();
    });

    it('should not delete event with existing registrations', async () => {
      // Create a registration first
      const registration = new EventRegistration({
        event: testEvent._id,
        user: testVolunteer._id,
        attendees: 1,
        status: 'confirmed'
      });
      await registration.save();

      await request(app)
        .delete(`/api/v1/events/${testEvent._id}`)
        .set('Authorization', `Bearer ${ngoAdminToken}`)
        .expect(400);
    });
  });

  describe('POST /api/v1/events/:id/register', () => {
    it('should register user for event', async () => {
      const registrationData = {
        attendees: 2,
        specialRequirements: 'Wheelchair access needed'
      };

      const response = await request(app)
        .post(`/api/v1/events/${testEvent._id}/register`)
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send(registrationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.attendees).toBe(registrationData.attendees);
      expect(response.body.data.specialRequirements).toBe(registrationData.specialRequirements);

      // Verify event attendee count updated
      const updatedEvent = await Event.findById(testEvent._id);
      expect(updatedEvent?.currentAttendees).toBe(registrationData.attendees);
    });

    it('should not allow duplicate registration', async () => {
      // Register once
      await request(app)
        .post(`/api/v1/events/${testEvent._id}/register`)
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({ attendees: 1 })
        .expect(201);

      // Try to register again
      await request(app)
        .post(`/api/v1/events/${testEvent._id}/register`)
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({ attendees: 1 })
        .expect(400);
    });

    it('should not allow registration when event is full', async () => {
      // Update event to have limited spots
      await Event.findByIdAndUpdate(testEvent._id, { maxAttendees: 1, currentAttendees: 1 });

      await request(app)
        .post(`/api/v1/events/${testEvent._id}/register`)
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({ attendees: 1 })
        .expect(400);
    });
  });

  describe('GET /api/v1/events/:id/registrations', () => {
    beforeEach(async () => {
      // Create some registrations
      const registration1 = new EventRegistration({
        event: testEvent._id,
        user: testVolunteer._id,
        attendees: 1,
        status: 'confirmed'
      });
      await registration1.save();
    });

    it('should fetch event registrations for NGO admin', async () => {
      const response = await request(app)
        .get(`/api/v1/events/${testEvent._id}/registrations`)
        .set('Authorization', `Bearer ${ngoAdminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should not allow non-NGO admin to view registrations', async () => {
      await request(app)
        .get(`/api/v1/events/${testEvent._id}/registrations`)
        .set('Authorization', `Bearer ${volunteerToken}`)
        .expect(403);
    });
  });

  describe('POST /api/v1/events/:id/feedback', () => {
    beforeEach(async () => {
      // Create registration and mark attendance
      const registration = new EventRegistration({
        event: testEvent._id,
        user: testVolunteer._id,
        attendees: 1,
        status: 'confirmed',
        attendance: {
          attended: true,
          markedBy: testNGO.adminId,
          markedAt: new Date()
        }
      });
      await registration.save();
    });

    it('should allow attended user to submit feedback', async () => {
      const feedbackData = {
        rating: 5,
        comment: 'Excellent event, very well organized!'
      };

      const response = await request(app)
        .post(`/api/v1/events/${testEvent._id}/feedback`)
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send(feedbackData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.rating).toBe(feedbackData.rating);
      expect(response.body.data.comment).toBe(feedbackData.comment);
    });

    it('should not allow non-attendee to submit feedback', async () => {
      const feedbackData = {
        rating: 3,
        comment: 'Cannot submit this feedback'
      };

      await request(app)
        .post(`/api/v1/events/${testEvent._id}/feedback`)
        .set('Authorization', `Bearer ${donorToken}`)
        .send(feedbackData)
        .expect(400);
    });
  });

  describe('Event Business Logic', () => {
    it('should calculate available spots correctly', async () => {
      const event = await Event.findById(testEvent._id);
      expect(event?.maxAttendees).toBe(100);
      expect(event?.currentAttendees).toBe(0);
      
      // Available spots = maxAttendees - currentAttendees
      const availableSpots = (event?.maxAttendees || 0) - (event?.currentAttendees || 0);
      expect(availableSpots).toBe(100);
    });

    it('should properly handle registration deadline', async () => {
      // Set registration deadline to past
      const pastDeadline = new Date(Date.now() - 24 * 60 * 60 * 1000);
      await Event.findByIdAndUpdate(testEvent._id, { registrationDeadline: pastDeadline });

      await request(app)
        .post(`/api/v1/events/${testEvent._id}/register`)
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({ attendees: 1 })
        .expect(400);
    });

    it('should validate event date constraints', async () => {
      const invalidEventData = {
        title: 'Invalid Date Event',
        description: 'Event with invalid dates',
        eventType: 'community',
        startDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // End before start
        location: {
          address: '123 Test Street',
          city: 'Test City',
          state: 'Test State',
          pincode: '123456'
        }
      };

      const response = await request(app)
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${ngoAdminToken}`)
        .send(invalidEventData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Event Search and Filtering', () => {
    beforeEach(async () => {
      // Create additional events for filtering tests
      const events = [
        {
          title: 'Healthcare Workshop',
          description: 'Medical awareness program',
          ngo: testNGO._id,
          createdBy: testNGO.adminId,
          eventType: 'workshop',
          category: 'healthcare',
          startDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
          location: { address: '456 Health St', city: 'Health City', state: 'HC', pincode: '789012' },
          status: 'published',
          featured: true,
          tags: ['healthcare', 'workshop']
        },
        {
          title: 'Environmental Cleanup',
          description: 'Community environmental initiative',
          ngo: testNGO._id,
          createdBy: testNGO.adminId,
          eventType: 'volunteer',
          category: 'environment',
          startDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
          location: { address: '789 Green Ave', city: 'Eco City', state: 'EC', pincode: '345678' },
          status: 'published',
          featured: false,
          tags: ['environment', 'cleanup']
        }
      ];

      await Event.insertMany(events);
    });

    it('should filter events by category', async () => {
      const response = await request(app)
        .get('/api/v1/events?category=healthcare')
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.events.forEach((event: any) => {
        expect(event.category).toBe('healthcare');
      });
    });

    it('should filter events by event type', async () => {
      const response = await request(app)
        .get('/api/v1/events?eventType=workshop')
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.events.forEach((event: any) => {
        expect(event.eventType).toBe('workshop');
      });
    });

    it('should filter featured events', async () => {
      const response = await request(app)
        .get('/api/v1/events?featured=true')
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.events.forEach((event: any) => {
        expect(event.featured).toBe(true);
      });
    });

    it('should search events by tags', async () => {
      const response = await request(app)
        .get('/api/v1/events?search=healthcare')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.events.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock a database error by using invalid ObjectId
      const response = await request(app)
        .get('/api/v1/events/invalid-id')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBeDefined();
    });

    it('should validate required fields', async () => {
      const incompleteEventData = {
        description: 'Missing title and other required fields'
      };

      const response = await request(app)
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${ngoAdminToken}`)
        .send(incompleteEventData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
