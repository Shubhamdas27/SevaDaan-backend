import express from 'express';
import { VolunteerTrackingController } from '../controllers/volunteerTrackingController';
import { authenticate } from '../middleware/authMiddleware';
import { requirePermission } from '../middleware/roleMiddleware';
import { body, param, query } from 'express-validator';
import { validateRequest } from '../middleware/validationMiddleware';

const router = express.Router();

// ==================== VOLUNTEER CHECK-IN/OUT ====================

/**
 * @route   POST /api/v1/volunteer-tracking/check-in
 * @desc    Record volunteer check-in
 * @access  Private (Volunteer)
 */
router.post('/check-in', [
  authenticate,
  requirePermission('volunteer_tracking'),
  body('activityId').optional().isMongoId().withMessage('Invalid activity ID'),
  body('location').optional().isObject().withMessage('Location must be an object'),
  body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters'),
  body('deviceInfo').optional().isObject(),
  validateRequest
], VolunteerTrackingController.checkIn);

/**
 * @route   POST /api/v1/volunteer-tracking/check-out
 * @desc    Record volunteer check-out
 * @access  Private (Volunteer)
 */
router.post('/check-out', [
  authenticate,
  requirePermission('volunteer_tracking'),
  body('activityId').optional().isMongoId().withMessage('Invalid activity ID'),
  body('location').optional().isObject().withMessage('Location must be an object'),
  body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters'),
  body('hoursWorked').optional().isNumeric().withMessage('Hours worked must be a number'),
  body('tasksCompleted').optional().isArray(),
  body('deviceInfo').optional().isObject(),
  validateRequest
], VolunteerTrackingController.checkOut);

// ==================== TRACKING RECORDS ====================

/**
 * @route   GET /api/v1/volunteer-tracking/sessions
 * @desc    Get volunteer tracking sessions
 * @access  Private (Volunteer - own data, NGO Admin/Manager - all data)
 */
router.get('/sessions', [
  authenticate,
  requirePermission('volunteer_tracking_read'),
  query('volunteerId').optional().isMongoId().withMessage('Invalid volunteer ID'),
  query('startDate').optional().isISO8601().withMessage('Invalid start date'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date'),
  query('activityId').optional().isMongoId().withMessage('Invalid activity ID'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  validateRequest
], VolunteerTrackingController.getTrackingSessions);

/**
 * @route   GET /api/v1/volunteer-tracking/sessions/:id
 * @desc    Get specific tracking session
 * @access  Private (Volunteer - own data, NGO Admin/Manager - all data)
 */
router.get('/sessions/:id', [
  authenticate,
  requirePermission('volunteer_tracking_read'),
  param('id').isMongoId().withMessage('Invalid session ID'),
  validateRequest
], VolunteerTrackingController.getTrackingSession);

// ==================== VOLUNTEER STATISTICS ====================

/**
 * @route   GET /api/v1/volunteer-tracking/stats/volunteer/:volunteerId?
 * @desc    Get volunteer statistics (hours, activities, etc.)
 * @access  Private (Volunteer - own data, NGO Admin/Manager - all data)
 */
router.get('/stats/volunteer/:volunteerId?', [
  authenticate,
  requirePermission('volunteer_tracking_read'),
  param('volunteerId').optional().isMongoId().withMessage('Invalid volunteer ID'),
  query('period').optional().isIn(['week', 'month', 'quarter', 'year', 'all']).withMessage('Invalid period'),
  query('startDate').optional().isISO8601().withMessage('Invalid start date'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date'),
  validateRequest
], VolunteerTrackingController.getVolunteerStats);

/**
 * @route   GET /api/v1/volunteer-tracking/stats/ngo
 * @desc    Get NGO volunteer statistics (all volunteers)
 * @access  Private (NGO Admin/Manager)
 */
router.get('/stats/ngo', [
  authenticate,
  requirePermission('volunteer_tracking_manage'),
  query('period').optional().isIn(['week', 'month', 'quarter', 'year', 'all']).withMessage('Invalid period'),
  query('startDate').optional().isISO8601().withMessage('Invalid start date'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date'),
  validateRequest
], VolunteerTrackingController.getNGOStats);

// ==================== ACTIVITY TRACKING ====================

/**
 * @route   POST /api/v1/volunteer-tracking/activity
 * @desc    Log volunteer activity/task completion
 * @access  Private (Volunteer)
 */
router.post('/activity', [
  authenticate,
  requirePermission('volunteer_tracking'),
  body('activityType').isIn(['task', 'training', 'event', 'meeting', 'fieldwork', 'administrative', 'other']).withMessage('Invalid activity type'),
  body('title').trim().isLength({ min: 2, max: 200 }).withMessage('Title must be between 2 and 200 characters'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters'),
  body('duration').isNumeric().withMessage('Duration must be a number'),
  body('location').optional().isObject(),
  body('tags').optional().isArray(),
  body('impact').optional().trim().isLength({ max: 500 }).withMessage('Impact description cannot exceed 500 characters'),
  validateRequest
], VolunteerTrackingController.logActivity);

/**
 * @route   GET /api/v1/volunteer-tracking/activities
 * @desc    Get volunteer activities
 * @access  Private (Volunteer - own data, NGO Admin/Manager - all data)
 */
router.get('/activities', [
  authenticate,
  requirePermission('volunteer_tracking_read'),
  query('volunteerId').optional().isMongoId().withMessage('Invalid volunteer ID'),
  query('activityType').optional().isIn(['task', 'training', 'event', 'meeting', 'fieldwork', 'administrative', 'other']),
  query('startDate').optional().isISO8601().withMessage('Invalid start date'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  validateRequest
], VolunteerTrackingController.getActivities);

// ==================== REPORTS AND ANALYTICS ====================

/**
 * @route   GET /api/v1/volunteer-tracking/reports/attendance
 * @desc    Generate attendance report
 * @access  Private (NGO Admin/Manager)
 */
router.get('/reports/attendance', [
  authenticate,
  requirePermission('volunteer_tracking_manage'),
  query('startDate').isISO8601().withMessage('Start date is required and must be valid'),
  query('endDate').isISO8601().withMessage('End date is required and must be valid'),
  query('volunteerId').optional().isMongoId().withMessage('Invalid volunteer ID'),
  query('format').optional().isIn(['json', 'csv', 'pdf']).withMessage('Invalid format'),
  validateRequest
], VolunteerTrackingController.generateAttendanceReport);

/**
 * @route   GET /api/v1/volunteer-tracking/reports/productivity
 * @desc    Generate productivity report
 * @access  Private (NGO Admin/Manager)
 */
router.get('/reports/productivity', [
  authenticate,
  requirePermission('volunteer_tracking_manage'),
  query('period').optional().isIn(['week', 'month', 'quarter', 'year']).withMessage('Invalid period'),
  query('volunteerId').optional().isMongoId().withMessage('Invalid volunteer ID'),
  query('activityType').optional().isIn(['task', 'training', 'event', 'meeting', 'fieldwork', 'administrative', 'other']),
  validateRequest
], VolunteerTrackingController.generateProductivityReport);

// ==================== VERIFICATION AND APPROVAL ====================

/**
 * @route   PUT /api/v1/volunteer-tracking/sessions/:id/verify
 * @desc    Verify/approve volunteer session
 * @access  Private (NGO Admin/Manager)
 */
router.put('/sessions/:id/verify', [
  authenticate,
  requirePermission('volunteer_tracking_manage'),
  param('id').isMongoId().withMessage('Invalid session ID'),
  body('approved').isBoolean().withMessage('Approved status is required'),
  body('verificationNotes').optional().trim().isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters'),
  validateRequest
], VolunteerTrackingController.verifySession);

/**
 * @route   PUT /api/v1/volunteer-tracking/activities/:id/verify
 * @desc    Verify/approve volunteer activity
 * @access  Private (NGO Admin/Manager)
 */
router.put('/activities/:id/verify', [
  authenticate,
  requirePermission('volunteer_tracking_manage'),
  param('id').isMongoId().withMessage('Invalid activity ID'),
  body('approved').isBoolean().withMessage('Approved status is required'),
  body('verificationNotes').optional().trim().isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters'),
  validateRequest
], VolunteerTrackingController.verifyActivity);

// ==================== BULK OPERATIONS ====================

/**
 * @route   POST /api/v1/volunteer-tracking/bulk/verify
 * @desc    Bulk verify volunteer sessions/activities
 * @access  Private (NGO Admin/Manager)
 */
router.post('/bulk/verify', [
  authenticate,
  requirePermission('volunteer_tracking_manage'),
  body('sessionIds').optional().isArray().withMessage('Session IDs must be an array'),
  body('activityIds').optional().isArray().withMessage('Activity IDs must be an array'),
  body('approved').isBoolean().withMessage('Approved status is required'),
  body('verificationNotes').optional().trim().isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters'),
  validateRequest
], VolunteerTrackingController.bulkVerify);

export default router;
