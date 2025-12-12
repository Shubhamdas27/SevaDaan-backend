import express from 'express';
import {
  createEmergencyRequest,
  getEmergencyRequests,
  getEmergencyRequest,
  assignToNGO,
  markResolved,
  verifyRequest,
  rejectRequest,
  getEmergencyStats
} from '../controllers/emergencyController';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { validateEmergencyRequest, validateEmergencyUpdate } from '../middleware/validationMiddleware';

const router = express.Router();

// Public routes
router.get('/', getEmergencyRequests);
router.get('/:id', getEmergencyRequest);

// Protected routes
router.use(authenticate);

// Create emergency request (anyone can submit)
router.post('/', validateEmergencyRequest, createEmergencyRequest);

// Admin only routes
router.post('/:id/assign', authorize('admin', 'ngo'), assignToNGO);
router.post('/:id/verify', authorize('admin', 'ngo'), verifyRequest);
router.post('/:id/reject', authorize('admin', 'ngo'), rejectRequest);

// NGO admin routes
router.post('/:id/resolve', validateEmergencyUpdate, markResolved);

// Statistics (NGO admin or admin)
router.get('/stats/:ngoId', getEmergencyStats);

export default router;
