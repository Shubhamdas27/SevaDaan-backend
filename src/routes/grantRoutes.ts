import express from 'express';
import {
  createGrantRequest,
  getGrants,
  getGrantById,
  getGrantBySlug,
  updateGrantStatus,
  getUserGrants,
  getGrantStats
} from '../controllers/grantController';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { validateGrantRequest } from '../middleware/validationMiddleware';

const router = express.Router();

// Public routes
router.get('/stats', getGrantStats);
router.get('/slug/:slug', getGrantBySlug); // SEO-friendly route
router.get('/:id', getGrantById);
router.get('/', getGrants); // Made public for demo purposes

// Protected routes
router.post('/', authenticate, authorize('ngo_admin', 'ngo_manager'), validateGrantRequest, createGrantRequest);
router.get('/user/me', authenticate, getUserGrants);
router.put('/:id/status', authenticate, authorize('ngo'), updateGrantStatus);

export default router;
