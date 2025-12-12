import express from 'express';
import {
  uploadKYCDocuments,
  submitKYCDocuments,
  verifyKYCDocuments,
  getKYCStatus,
  getPendingKYCVerifications,
} from '../controllers/kycController';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { body } from 'express-validator';
import { validateRequest } from '../middleware/validationMiddleware';

const router = express.Router();

// Upload KYC documents (NGO admins only)
router.post(
  '/upload',
  authenticate,
  authorize('ngo_admin'),
  uploadKYCDocuments,
  submitKYCDocuments
);

// Get KYC status (NGO admins only)
router.get(
  '/status',
  authenticate,
  authorize('ngo_admin'),
  getKYCStatus
);

// Verify KYC documents (system admins only)
router.post(
  '/verify',
  authenticate,
  authorize('ngo'),
  [
    body('ngoId').isMongoId().withMessage('Invalid NGO ID'),
    body('status').isIn(['verified', 'rejected']).withMessage('Status must be verified or rejected'),
    body('comments').optional().isString().withMessage('Comments must be a string'),
  ],
  validateRequest,
  verifyKYCDocuments
);

// Get pending KYC verifications (system admins only)
router.get(
  '/pending',
  authenticate,
  authorize('ngo'),
  getPendingKYCVerifications
);

export default router;
