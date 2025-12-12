import express from 'express';
import {
  createDonation,
  updateDonationStatus,
  getDonationById,
  getDonations,
  getUserDonations,
  getProgramDonations,
  requestRefund,
  getDonationStats
} from '../controllers/donationController';
import { authenticate, authorize, optionalAuthenticate } from '../middleware/authMiddleware';
import { validateCreateDonation } from '../middleware/validationMiddleware';

const router = express.Router();

// Public routes
router.get('/stats', getDonationStats);
router.get('/program/:programId', getProgramDonations);
router.get('/:id', getDonationById);

// Semi-protected routes (optional authentication)
router.post('/', optionalAuthenticate, validateCreateDonation, createDonation);

// Protected routes
router.get('/', authenticate, authorize('admin', 'ngo'), getDonations);
router.get('/user/me', authenticate, getUserDonations);
router.put('/:id/status', authenticate, authorize('admin', 'ngo'), updateDonationStatus);
router.post('/:id/refund', authenticate, requestRefund);

export default router;
