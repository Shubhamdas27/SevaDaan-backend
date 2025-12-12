import express from 'express';
import {
  createTestimonial,
  getTestimonials,
  getTestimonial,
  updateTestimonial,
  deleteTestimonial,
  approveTestimonial,
  rejectTestimonial,
  toggleFeatured,
  getFeaturedTestimonials,
  getTestimonialStats
} from '../controllers/testimonialController';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { validateTestimonial, validateTestimonialUpdate } from '../middleware/validationMiddleware';

const router = express.Router();

// Public routes
router.get('/featured', getFeaturedTestimonials);
router.get('/', getTestimonials);
router.get('/:id', getTestimonial);

// Protected routes
router.use(authenticate);

// Create testimonial (anyone can submit)
router.post('/', validateTestimonial, createTestimonial);

// Update/delete testimonial (NGO admin or super admin)
router.put('/:id', validateTestimonialUpdate, updateTestimonial);
router.delete('/:id', deleteTestimonial);

// Admin only routes
router.post('/:id/approve', authorize('ngo', 'ngo_admin'), approveTestimonial);
router.post('/:id/reject', authorize('ngo', 'ngo_admin'), rejectTestimonial);
router.post('/:id/toggle-featured', authorize('ngo', 'ngo_admin'), toggleFeatured);

// Statistics (NGO admin or admin)
router.get('/stats/:ngoId', getTestimonialStats);

export default router;
