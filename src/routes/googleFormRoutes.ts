import express from 'express';
import {
  recordVolunteerInterest,
  getVolunteerFormUrl,
  getVolunteerInterests
} from '../controllers/googleFormController';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { body, param } from 'express-validator';
import { validateRequest } from '../middleware/validationMiddleware';

const router = express.Router();

// ==================== GOOGLE FORM INTEGRATION ====================

/**
 * @route   POST /api/v1/google-forms/volunteer-interest
 * @desc    Record volunteer interest from Google Form submission
 * @access  Public (webhook from Google Forms)
 */
router.post('/volunteer-interest', [
  body('volunteerName').trim().isLength({ min: 2, max: 100 }).withMessage('Volunteer name must be between 2 and 100 characters'),
  body('volunteerEmail').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('volunteerPhone').optional().trim(),
  body('programId').isMongoId().withMessage('Invalid program ID'),
  body('ngoId').isMongoId().withMessage('Invalid NGO ID'),
  body('motivation').trim().isLength({ min: 10, max: 1000 }).withMessage('Motivation must be between 10 and 1000 characters'),
  body('experience').optional().trim().isLength({ max: 1000 }),
  body('availability').trim().isLength({ min: 3, max: 200 }).withMessage('Availability must be specified'),
  body('skills').optional(),
  body('formResponseId').optional().trim(),
  validateRequest
], recordVolunteerInterest);

/**
 * @route   GET /api/v1/google-forms/volunteer-form/:programId
 * @desc    Get Google Form URL for volunteer application
 * @access  Public
 */
router.get('/volunteer-form/:programId', [
  param('programId').isMongoId().withMessage('Invalid program ID'),
  validateRequest
], getVolunteerFormUrl);

/**
 * @route   GET /api/v1/google-forms/volunteer-interests
 * @desc    Get all volunteer interests for NGO
 * @access  Private (NGO Admin/Manager)
 */
router.get('/volunteer-interests', [
  authenticate,
  authorize('ngo_admin', 'ngo_manager')
], getVolunteerInterests);

export default router;
