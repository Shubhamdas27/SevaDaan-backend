import express, { Request, Response } from 'express';
import {
  applyVolunteer,
  getVolunteers,
  getVolunteerOpportunities,
  getVolunteerOpportunityById,
  getVolunteerById,
  updateVolunteerStatus,
  getUserVolunteerApplications,
  getProgramVolunteers,
  updateVolunteerParticipation,
  withdrawVolunteerApplication,
  getVolunteerStats,
  getNGOVolunteers,
  deleteVolunteer,
  addVolunteer
} from '../controllers/volunteerController';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { requirePermission, requireMinLevel } from '../middleware/roleMiddleware';
import { validateVolunteerRegistration, validateRequest } from '../middleware/validationMiddleware';
import { body, param, query } from 'express-validator';

const router = express.Router();

// Public routes - specific routes BEFORE parameterized routes
router.get('/', getVolunteerOpportunities); // List all volunteer opportunities - root path
router.get('/opportunities', getVolunteerOpportunities); // List all volunteer opportunities
router.get('/stats', getVolunteerStats);
router.get('/program/:programId', getProgramVolunteers);
router.get('/opportunity/:id', getVolunteerOpportunityById); // Get single opportunity detail
router.get('/application/:id', getVolunteerById); // Get single volunteer application
router.get('/:id', getVolunteerOpportunityById); // Default: get opportunity by ID

// ==================== VOLUNTEER-SPECIFIC ROUTES ====================
// Apply authentication and role check for volunteer-specific routes
router.use('/profile', authenticate, requireMinLevel(3));
router.use('/my', authenticate, requireMinLevel(3));
router.use('/activities', authenticate, requireMinLevel(3));

// Volunteer Profile Management
router.get('/profile', requirePermission('volunteer_read_own'), getUserVolunteerApplications);
router.put('/profile', [
  body('skills').optional().isArray(),
  body('availability').optional().isArray(),
  body('bio').optional().trim().isLength({ max: 500 }),
  validateRequest,
  requirePermission('volunteer_update_own')
], (req: Request, res: Response) => {
  // TODO: Implement updateVolunteerProfile
  res.json({ success: true, message: 'Profile update endpoint coming soon' });
});

// My Applications and Assignments
router.get('/my/applications', requirePermission('volunteer_read_own'), getUserVolunteerApplications);
router.get('/my/assignments', requirePermission('volunteer_read_own'), (req: Request, res: Response) => {
  // TODO: Implement getMyAssignments
  res.json({ success: true, message: 'Assignments endpoint coming soon' });
});

// Activity Logging
router.post('/activities', [
  body('type').isIn(['task', 'event', 'training', 'other']),
  body('description').trim().isLength({ min: 5, max: 500 }),
  body('hours').isNumeric().isFloat({ min: 0.5, max: 24 }),
  body('date').isISO8601(),
  validateRequest,
  requirePermission('volunteer_read_own')
], (req: Request, res: Response) => {
  // TODO: Implement activity logging
  res.json({ success: true, message: 'Activity logging endpoint coming soon' });
});

router.get('/activities', [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  validateRequest,
  requirePermission('volunteer_read_own')
], (req: Request, res: Response) => {
  // TODO: Implement get activities
  res.json({ success: true, message: 'Get activities endpoint coming soon' });
});

// ==================== EXISTING PROTECTED ROUTES ====================
// Protected routes for volunteer applications
router.post('/apply/:programId', authenticate, validateVolunteerRegistration, applyVolunteer);
router.post('/add', authenticate, authorize('ngo_admin', 'ngo_manager'), addVolunteer);
router.get('/applications', authenticate, authorize('ngo', 'ngo_admin', 'ngo_manager'), getVolunteers);
router.get('/ngo', authenticate, authorize('ngo_admin', 'ngo_manager'), getNGOVolunteers);
router.put('/:id/status', authenticate, authorize('ngo_admin', 'ngo_manager', 'ngo'), updateVolunteerStatus);
router.put('/:id/participation', authenticate, authorize('ngo_admin', 'ngo_manager', 'ngo'), updateVolunteerParticipation);
router.delete('/:id/withdraw', authenticate, withdrawVolunteerApplication);
router.delete('/:id', authenticate, authorize('ngo_admin', 'ngo_manager'), deleteVolunteer);

export default router;
