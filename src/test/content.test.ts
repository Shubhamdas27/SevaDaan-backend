import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app';
import NGO from '../models/NGO';
import Announcement from '../models/Announcement';
import User from '../models/User';

describe('Content Management API', () => {
  let authToken: string;
  let ngoId: string;
  let userId: string;
  let announcementId: string;

  beforeAll(async () => {
    // Setup test database connection
    await mongoose.connect(process.env.TEST_DATABASE_URL || 'mongodb://localhost:27017/ngo-test');
    
    // Clear existing data
    await Promise.all([
      NGO.deleteMany({}),
      Announcement.deleteMany({}),
      User.deleteMany({})
    ]);

    // Create test user and NGO
    const user = await User.create({
      name: 'Test Admin',
      email: 'admin@testngo.com',
      password: 'password123',
      role: 'ngo_admin',
      isVerified: true
    });
    userId = user._id.toString();

    const ngo = await NGO.create({
      name: 'Test NGO',
      description: 'A test NGO for content management',
      adminId: userId,
      registrationNumber: 'TEST123',
      location: 'Test City',
      contactDetails: {
        email: 'contact@testngo.com',
        phone: '+1234567890'
      }
    });
    ngoId = ngo._id.toString();

    // Get auth token
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@testngo.com',
        password: 'password123'
      });
    
    authToken = loginResponse.body.data.token;
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('POST /api/v1/content/announcements', () => {
    it('should create a new announcement', async () => {
      const announcementData = {
        title: 'Test Announcement',
        content: 'This is a test announcement content',
        type: 'general',
        priority: 'medium',
        targetAudience: ['all'],
        tags: ['test', 'announcement']
      };

      const response = await request(app)
        .post('/api/v1/content/announcements')
        .set('Authorization', `Bearer ${authToken}`)
        .send(announcementData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(announcementData.title);
      expect(response.body.data.content).toBe(announcementData.content);
      announcementId = response.body.data._id;
    });

    it('should validate required fields', async () => {
      const invalidData = {
        content: 'Content without title'
      };

      const response = await request(app)
        .post('/api/v1/content/announcements')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate title length', async () => {
      const invalidData = {
        title: 'a'.repeat(201), // Too long
        content: 'Valid content'
      };

      const response = await request(app)
        .post('/api/v1/content/announcements')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/content/announcements', () => {
    it('should get announcements with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/content/announcements')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.announcements).toBeInstanceOf(Array);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should filter announcements by type', async () => {
      const response = await request(app)
        .get('/api/v1/content/announcements')
        .query({ type: 'general' })
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.announcements.forEach((announcement: any) => {
        expect(announcement.type).toBe('general');
      });
    });

    it('should filter announcements by NGO', async () => {
      const response = await request(app)
        .get('/api/v1/content/announcements')
        .query({ ngoId })
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.announcements.forEach((announcement: any) => {
        expect(announcement.ngoId._id || announcement.ngoId).toBe(ngoId);
      });
    });
  });

  describe('PUT /api/v1/content/announcements/:id', () => {
    it('should update an announcement', async () => {
      const updateData = {
        title: 'Updated Test Announcement',
        priority: 'high'
      };

      const response = await request(app)
        .put(`/api/v1/content/announcements/${announcementId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.data.priority).toBe(updateData.priority);
    });

    it('should not update non-existent announcement', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .put(`/api/v1/content/announcements/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Updated' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/content/announcements/:id', () => {
    it('should get a single announcement', async () => {
      const response = await request(app)
        .get(`/api/v1/content/announcements/${announcementId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(announcementId);
    });

    it('should increment view count', async () => {
      // Get initial view count
      const initialResponse = await request(app)
        .get(`/api/v1/content/announcements/${announcementId}`)
        .expect(200);
      
      const initialViewCount = initialResponse.body.data.viewCount;

      // Make another request
      const secondResponse = await request(app)
        .get(`/api/v1/content/announcements/${announcementId}`)
        .expect(200);

      expect(secondResponse.body.data.viewCount).toBe(initialViewCount + 1);
    });
  });

  describe('PUT /api/v1/content/announcements/:id/archive', () => {
    it('should archive an announcement', async () => {
      const response = await request(app)
        .put(`/api/v1/content/announcements/${announcementId}/archive`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isActive).toBe(false);
    });
  });

  describe('PUT /api/v1/content/announcements/:id/restore', () => {
    it('should restore an archived announcement', async () => {
      const response = await request(app)
        .put(`/api/v1/content/announcements/${announcementId}/restore`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isActive).toBe(true);
    });
  });

  describe('PUT /api/v1/content/announcements/batch', () => {
    it('should batch update announcements', async () => {
      // Create additional announcements for batch testing
      const announcement2 = await Announcement.create({
        ngoId,
        title: 'Batch Test 1',
        content: 'Content 1',
        createdBy: userId,
        type: 'general',
        priority: 'low'
      });

      const announcement3 = await Announcement.create({
        ngoId,
        title: 'Batch Test 2',
        content: 'Content 2',
        createdBy: userId,
        type: 'general',
        priority: 'low'
      });

      const batchData = {
        announcementIds: [announcement2._id.toString(), announcement3._id.toString()],
        updates: {
          priority: 'high',
          type: 'urgent'
        }
      };

      const response = await request(app)
        .put('/api/v1/content/announcements/batch')
        .set('Authorization', `Bearer ${authToken}`)
        .send(batchData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.modifiedCount).toBe(2);
    });
  });

  describe('POST /api/v1/content/announcements/schedule', () => {
    it('should schedule an announcement', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const scheduleData = {
        title: 'Scheduled Announcement',
        content: 'This will be published tomorrow',
        scheduledDate: futureDate.toISOString(),
        type: 'general',
        priority: 'medium'
      };

      const response = await request(app)
        .post('/api/v1/content/announcements/schedule')
        .set('Authorization', `Bearer ${authToken}`)
        .send(scheduleData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(new Date(response.body.data.publishedAt)).toEqual(futureDate);
    });

    it('should not schedule announcement in the past', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const scheduleData = {
        title: 'Past Announcement',
        content: 'This is in the past',
        scheduledDate: pastDate.toISOString()
      };

      const response = await request(app)
        .post('/api/v1/content/announcements/schedule')
        .set('Authorization', `Bearer ${authToken}`)
        .send(scheduleData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/content/templates', () => {
    it('should create a content template', async () => {
      const templateData = {
        name: 'Announcement Template',
        type: 'announcement',
        templateData: {
          title: 'Template Title {{variable}}',
          content: 'Template content with {{variable}} placeholder',
          priority: 'medium'
        }
      };

      const response = await request(app)
        .post('/api/v1/content/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send(templateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(templateData.name);
      expect(response.body.data.type).toBe(templateData.type);
    });
  });

  describe('GET /api/v1/content/templates', () => {
    it('should get content templates', async () => {
      const response = await request(app)
        .get('/api/v1/content/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should filter templates by type', async () => {
      const response = await request(app)
        .get('/api/v1/content/templates')
        .query({ type: 'announcement' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach((template: any) => {
        expect(template.type).toBe('announcement');
      });
    });
  });

  describe('PUT /api/v1/content/seo', () => {
    it('should update SEO metadata', async () => {
      const seoData = {
        metaTitle: 'Test NGO - Helping Communities',
        metaDescription: 'Test NGO is dedicated to helping communities through various programs',
        keywords: ['ngo', 'charity', 'community', 'help'],
        ogTitle: 'Test NGO',
        ogDescription: 'Making a difference in communities'
      };

      const response = await request(app)
        .put('/api/v1/content/seo')
        .set('Authorization', `Bearer ${authToken}`)
        .send(seoData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.metaTitle).toBe(seoData.metaTitle);
      expect(response.body.data.keywords).toEqual(seoData.keywords);
    });
  });

  describe('GET /api/v1/content/analytics', () => {
    it('should get content analytics', async () => {
      const response = await request(app)
        .get('/api/v1/content/analytics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBeDefined();
      expect(response.body.data.engagement).toBeDefined();
      expect(response.body.data.topPerforming).toBeDefined();
    });
  });

  describe('GET /api/v1/content/stats', () => {
    it('should get content statistics', async () => {
      const response = await request(app)
        .get('/api/v1/content/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('active');
      expect(response.body.data).toHaveProperty('archived');
      expect(response.body.data).toHaveProperty('urgent');
      expect(response.body.data).toHaveProperty('scheduled');
      expect(response.body.data).toHaveProperty('total');
    });
  });

  describe('GET /api/v1/content/export', () => {
    it('should export content data as JSON', async () => {
      const response = await request(app)
        .get('/api/v1/content/export')
        .query({ format: 'json' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('application/json');
      expect(response.body.ngo).toBeDefined();
      expect(response.body.announcements).toBeInstanceOf(Array);
    });

    it('should export content data as CSV', async () => {
      const response = await request(app)
        .get('/api/v1/content/export')
        .query({ format: 'csv' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.text).toContain('ID,Title,Content,Type,Priority');
    });
  });

  describe('Authorization', () => {
    it('should require authentication for protected routes', async () => {
      const response = await request(app)
        .post('/api/v1/content/announcements')
        .send({
          title: 'Test',
          content: 'Test content'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should require proper permissions', async () => {
      // This would require setting up a user with insufficient permissions
      // Implementation depends on your permission system
    });
  });
});

export {};
