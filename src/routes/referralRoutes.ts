import express from 'express';
import { 
  createReferral,
  getReferrals,
  getReferralById,
  updateReferral,
  deleteReferral,
  assignReferral,
  addFollowUpNote,
  resolveReferral,
  getReferralStats,
  getUserReferrals,
  getNGOReferrals,
  updateReferralStatus
} from '../controllers/referralController';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { validateReferral, validateFollowUp, validateAssignment } from '../middleware/validationMiddleware';

const router = express.Router();

// Public routes (for creating referrals)
router.post('/', validateReferral, createReferral);

// Protected routes
router.use(authenticate);

// Get referrals with filters and pagination
router.get('/', getReferrals);

// Get referral statistics
router.get('/stats', authorize('ngo', 'ngo_admin', 'ngo_manager'), getReferralStats);

// Get user's referrals
router.get('/my-referrals', getUserReferrals);

// Get NGO's referrals
router.get('/ngo/:ngoId', authorize('ngo', 'ngo_admin', 'ngo_manager', 'volunteer'), getNGOReferrals);

// Get specific referral
router.get('/:id', getReferralById);

// Update referral
router.put('/:id', authorize('ngo', 'ngo_admin', 'ngo_manager', 'volunteer'), updateReferral);

// Update referral status
router.patch('/:id/status', authorize('ngo', 'ngo_admin', 'ngo_manager', 'volunteer'), updateReferralStatus);

// Assign referral to user
router.patch('/:id/assign', authorize('ngo', 'ngo_admin', 'ngo_manager'), validateAssignment, assignReferral);

// Add follow-up note
router.post('/:id/follow-up', authorize('ngo', 'ngo_admin', 'ngo_manager', 'volunteer'), validateFollowUp, addFollowUpNote);

// Resolve referral
router.patch('/:id/resolve', authorize('ngo', 'ngo_admin', 'ngo_manager', 'volunteer'), resolveReferral);

// Delete referral (NGO only)
router.delete('/:id', authorize('ngo'), deleteReferral);

export default router;
