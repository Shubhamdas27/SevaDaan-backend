import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { requirePermission, requireMinLevel } from '../middleware/roleMiddleware';
import { validateRequest } from '../middleware/validationMiddleware';
import { body, param, query } from 'express-validator';

// Import controllers
import * as programController from '../controllers/programController';
import * as serviceApplicationController from '../controllers/serviceApplicationController';
import * as notificationController from '../controllers/notificationController';
import * as emergencyController from '../controllers/emergencyController';
import * as referralController from '../controllers/referralController';

const router = Router();

// Apply authentication to all citizen routes
router.use(authenticate);
router.use(requireMinLevel(1)); // Citizen level

// ==================== CITIZEN PROFILE ====================
router.get('/profile', requirePermission('citizen_read_own'), (req: Request, res: Response) => {
  // TODO: Implement getCitizenProfile
  res.json({ success: true, message: 'Citizen profile endpoint coming soon' });
});

router.put('/profile', [
  body('address').optional().trim(),
  body('city').optional().trim(),
  body('state').optional().trim(),
  body('pincode').optional().matches(/^\d{6}$/),
  body('occupation').optional().trim(),
  body('familySize').optional().isNumeric(),
  validateRequest,
  requirePermission('citizen_update_own')
], (req: Request, res: Response) => {
  // TODO: Implement updateCitizenProfile
  res.json({ success: true, message: 'Update citizen profile endpoint coming soon' });
});

// ==================== SERVICE APPLICATIONS ====================
router.post('/applications', [
  body('serviceType').trim().isLength({ min: 2 }),
  body('description').trim().isLength({ min: 10, max: 1000 }),
  body('urgency').isIn(['low', 'medium', 'high', 'critical']),
  body('ngoId').optional().isMongoId(),
  body('contactPreference').optional().isIn(['phone', 'email', 'sms']),
  validateRequest,
  requirePermission('applications_crud_own')
], serviceApplicationController.createApplication);

router.get('/applications', [
  query('status').optional().isIn(['pending', 'under_review', 'approved', 'rejected', 'completed']),
  query('serviceType').optional(),
  validateRequest,
  requirePermission('applications_crud_own')
], serviceApplicationController.getApplications);

router.get('/applications/:id', [
  param('id').isMongoId(),
  validateRequest,
  requirePermission('applications_crud_own')
], serviceApplicationController.getApplication);

router.put('/applications/:id', [
  param('id').isMongoId(),
  body('description').optional().trim().isLength({ min: 10, max: 1000 }),
  body('urgency').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('contactPreference').optional().isIn(['phone', 'email', 'sms']),
  validateRequest,
  requirePermission('applications_crud_own')
], serviceApplicationController.updateApplicationStatus);

// TODO: Implement deleteMyApplication function
// router.delete('/applications/:id', [
//   param('id').isMongoId(),
//   validateRequest,
//   requirePermission('applications_crud_own')
// ], serviceApplicationController.deleteMyApplication);

// ==================== AVAILABLE SERVICES ====================
router.get('/services', [
  query('category').optional(),
  query('location').optional(),
  query('ngoId').optional().isMongoId(),
  validateRequest,
  requirePermission('services_read')
], (req: Request, res: Response) => {
  // TODO: Implement getAvailableServices
  res.json({ success: true, message: 'Available services endpoint coming soon' });
});

router.get('/services/:id', [
  param('id').isMongoId(),
  validateRequest,
  requirePermission('services_read')
], (req: Request, res: Response) => {
  // TODO: Implement getServiceById
  res.json({ success: true, message: 'Service details endpoint coming soon' });
});

// ==================== PROGRAMS ====================
router.get('/programs', [
  query('category').optional(),
  query('location').optional(),
  query('eligibility').optional(),
  validateRequest,
  requirePermission('programs_read')
], programController.getPrograms);

router.get('/programs/:id', [
  param('id').isMongoId(),
  validateRequest,
  requirePermission('programs_read')
], programController.getProgramById);

router.post('/programs/:id/apply', [
  param('id').isMongoId(),
  body('reason').trim().isLength({ min: 10, max: 500 }),
  body('eligibilityProof').optional().isArray(),
  validateRequest,
  requirePermission('programs_read')
], (req: Request, res: Response) => {
  // TODO: Implement applyToProgram
  res.json({ success: true, message: 'Program application endpoint coming soon' });
});

// ==================== EMERGENCY HELP ====================
router.post('/emergency', [
  body('type').isIn(['medical', 'shelter', 'food', 'disaster', 'other']),
  body('description').trim().isLength({ min: 10, max: 1000 }),
  body('location').trim().isLength({ min: 5 }),
  body('urgency').isIn(['medium', 'high', 'critical']),
  body('contactNumber').matches(/^[6-9]\d{9}$/),
  validateRequest,
  requirePermission('emergency_create')
], emergencyController.createEmergencyRequest);

router.get('/emergency/my', requirePermission('emergency_create'), emergencyController.getEmergencyRequests);

router.get('/emergency/:id', [
  param('id').isMongoId(),
  validateRequest,
  requirePermission('emergency_create')
], emergencyController.getEmergencyRequest);

// ==================== REFERRALS ====================
router.post('/referrals', [
  body('referredName').trim().isLength({ min: 2 }),
  body('referredContact').matches(/^[6-9]\d{9}$/),
  body('serviceNeeded').trim().isLength({ min: 5 }),
  body('description').trim().isLength({ min: 10, max: 500 }),
  body('urgency').isIn(['low', 'medium', 'high']),
  validateRequest,
  requirePermission('referrals_create')
], referralController.createReferral);

router.get('/referrals', requirePermission('referrals_create'), referralController.getUserReferrals);

router.get('/referrals/:id', [
  param('id').isMongoId(),
  validateRequest,
  requirePermission('referrals_create')
], referralController.getReferralById);

// ==================== COMMUNITY EVENTS ====================
router.get('/events', [
  query('category').optional(),
  query('location').optional(),
  query('date').optional().isISO8601(),
  validateRequest,
  requirePermission('events_read')
], (req: Request, res: Response) => {
  // TODO: Implement getCommunityEvents
  res.json({ success: true, message: 'Community events endpoint coming soon' });
});

router.post('/events/:id/register', [
  param('id').isMongoId(),
  body('attendees').optional().isNumeric(),
  body('specialRequirements').optional().trim(),
  validateRequest,
  requirePermission('events_read')
], (req: Request, res: Response) => {
  // TODO: Implement registerForEvent
  res.json({ success: true, message: 'Event registration endpoint coming soon' });
});

// ==================== NOTIFICATIONS ====================
router.get('/notifications', requirePermission('citizen_read_own'), notificationController.getUserNotifications);
router.put('/notifications/:id/read', [
  param('id').isMongoId(),
  validateRequest,
  requirePermission('citizen_read_own')
], notificationController.markNotificationAsRead);

router.put('/notifications/read-all', requirePermission('citizen_read_own'), notificationController.markAllNotificationsAsRead);

// ==================== FEEDBACK & RATINGS ====================
router.post('/feedback', [
  body('serviceId').isMongoId(),
  body('rating').isInt({ min: 1, max: 5 }),
  body('feedback').trim().isLength({ min: 10, max: 1000 }),
  body('type').isIn(['service', 'ngo', 'program']),
  validateRequest,
  requirePermission('citizen_update_own')
], (req: Request, res: Response) => {
  // TODO: Implement submitFeedback
  res.json({ success: true, message: 'Feedback submission endpoint coming soon' });
});

router.get('/feedback/my', requirePermission('citizen_read_own'), (req: Request, res: Response) => {
  // TODO: Implement getMyFeedback
  res.json({ success: true, message: 'My feedback endpoint coming soon' });
});

// ==================== CITIZEN DASHBOARD DATA ====================
router.get('/dashboard/summary', requirePermission('citizen_read_own'), (req: Request, res: Response) => {
  // TODO: Implement getCitizenDashboardSummary
  res.json({ 
    success: true, 
    data: {
      activeApplications: 0,
      completedServices: 0,
      upcomingEvents: 0,
      recentNotifications: 0
    }
  });
});

export default router;
