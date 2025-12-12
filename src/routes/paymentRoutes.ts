import express from 'express';
import {
  createPaymentOrder,
  verifyPayment,
  processRazorpayWebhook,
  processStripeWebhook,
  refundPayment,
  getPaymentStatus,
  getDonationReceipt,
  // Legacy endpoints for backward compatibility
  initiatePayment,
  paymentWebhook,
  generateReceipt
} from '../controllers/paymentController';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { body } from 'express-validator';
import { validateRequest } from '../middleware/validationMiddleware';

const router = express.Router();

// Create payment order
router.post(
  '/create-order',
  authenticate,
  [
    body('amount').isNumeric().withMessage('Amount must be a number'),
    body('currency').isIn(['INR', 'USD']).withMessage('Currency must be INR or USD'),
    body('gateway').isIn(['razorpay', 'stripe']).withMessage('Gateway must be razorpay or stripe'),
    body('ngoId').isMongoId().withMessage('Invalid NGO ID'),
    body('programId').optional().isMongoId().withMessage('Invalid Program ID'),
  ],
  validateRequest,
  createPaymentOrder
);

// Verify payment
router.post(
  '/verify',
  authenticate,
  [
    body('gateway').isIn(['razorpay', 'stripe']).withMessage('Gateway must be razorpay or stripe'),
    body('paymentData').isObject().withMessage('Payment data is required'),
  ],
  validateRequest,
  verifyPayment
);

// Webhook endpoints (no authentication required)
router.post('/webhook/razorpay', express.raw({ type: 'application/json' }), processRazorpayWebhook);
router.post('/webhook/stripe', express.raw({ type: 'application/json' }), processStripeWebhook);

// Refund payment (admin only)
router.post(
  '/refund/:donationId',
  authenticate,
  authorize('ngo_admin', 'super_admin'),
  [
    body('amount').optional().isNumeric().withMessage('Amount must be a number'),
    body('reason').optional().isString().withMessage('Reason must be a string'),
  ],
  validateRequest,
  refundPayment
);

// Get payment status
router.get(
  '/status/:donationId',
  authenticate,
  getPaymentStatus
);

// Get donation receipt
router.get(
  '/receipt/:donationId',
  authenticate,
  getDonationReceipt
);

// Legacy routes for backward compatibility
router.post('/webhook', paymentWebhook);
router.post('/initiate', authenticate, initiatePayment);
router.get('/:donationId/status', authenticate, getPaymentStatus);
router.get('/:donationId/receipt', authenticate, generateReceipt);

export default router;
