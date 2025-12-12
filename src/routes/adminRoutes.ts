import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { requirePermission, requireMinLevel } from '../middleware/roleMiddleware';
import { validateRequest } from '../middleware/validationMiddleware';
import { body, param } from 'express-validator';

// Import controllers
import * as ngoController from '../controllers/ngoController';
import * as userController from '../controllers/userAccountController';
import * as programController from '../controllers/programController';
import * as volunteerController from '../controllers/volunteerController';
import * as donationController from '../controllers/donationController';
import * as grantController from '../controllers/grantController';
import * as dashboardController from '../controllers/dashboardController';
import * as certificateController from '../controllers/certificateController';
import * as managerController from '../controllers/managerController';

const router = Router();

// Apply authentication to all admin routes
router.use(authenticate);
router.use(requireMinLevel(10)); // NGO Admin level

// ==================== NGO MANAGEMENT ====================
router.get('/profile', ngoController.getNGO);
router.put('/profile', [
  body('name').optional().trim().isLength({ min: 2, max: 200 }),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('mission').optional().trim().isLength({ max: 1000 }),
  body('vision').optional().trim().isLength({ max: 1000 }),
  validateRequest
], ngoController.updateNGO);

// ==================== USER MANAGEMENT ====================
router.get('/users', requirePermission('users_read'), userController.getCurrentUser);

// ==================== MANAGER MANAGEMENT ====================
router.get('/managers', requirePermission('managers_read'), managerController.getManagers);
router.put('/managers/:id/permissions', [
  param('id').isMongoId(),
  body('permissions').isArray(),
  validateRequest,
  requirePermission('managers_update')
], managerController.updateManagerPermissions);

// ==================== PROGRAM MANAGEMENT ====================
router.get('/programs', requirePermission('programs_read'), programController.getPrograms);
router.post('/programs', [
  body('title').trim().isLength({ min: 2, max: 200 }),
  body('description').trim().isLength({ min: 10 }),
  body('category').isIn(['education', 'healthcare', 'environment', 'poverty', 'disaster', 'other']),
  body('targetAmount').optional().isNumeric(),
  validateRequest,
  requirePermission('programs_create')
], programController.createProgram);

router.put('/programs/:id', [
  param('id').isMongoId(),
  validateRequest,
  requirePermission('programs_update')
], programController.updateProgram);

router.delete('/programs/:id', [
  param('id').isMongoId(),
  validateRequest,
  requirePermission('programs_delete')
], programController.deleteProgram);

// ==================== VOLUNTEER MANAGEMENT ====================
router.get('/volunteers', requirePermission('volunteers_read'), volunteerController.getVolunteers);
router.get('/volunteers/:id', [
  param('id').isMongoId(),
  validateRequest,
  requirePermission('volunteers_read')
], volunteerController.getVolunteerById);

// ==================== DONATION MANAGEMENT ====================
router.get('/donations', requirePermission('donations_read'), donationController.getDonations);
router.get('/donations/:id', [
  param('id').isMongoId(),
  validateRequest,
  requirePermission('donations_read')
], donationController.getDonationById);

// ==================== GRANT MANAGEMENT ====================
router.get('/grants', requirePermission('grants_read'), grantController.getGrants);
router.get('/grants/:id', [
  param('id').isMongoId(),
  validateRequest,
  requirePermission('grants_read')
], grantController.getGrantById);

// ==================== ANALYTICS & REPORTS ====================
router.get('/analytics/overview', requirePermission('reports_read'), dashboardController.getSuperAdminDashboard);
router.get('/analytics/donations', requirePermission('reports_read'), donationController.getDonationStats);
router.get('/analytics/programs', requirePermission('reports_read'), programController.getProgramStats);
router.get('/analytics/grants', requirePermission('reports_read'), grantController.getGrantStats);

// ==================== CERTIFICATES ====================
router.get('/certificates', requirePermission('certificates_read'), certificateController.getCertificates);

export default router;
