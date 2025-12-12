import express from 'express';
import { MultiTenantAdminController } from '../controllers/multiTenantAdminController';
import { authenticate } from '../middleware/authMiddleware';
import { requirePermission } from '../middleware/roleMiddleware';

const router = express.Router();

// ==================== SYSTEM OVERVIEW ====================

/**
 * @route   GET /api/v1/admin/system/overview
 * @desc    Get system-wide overview (Super Admin only)
 * @access  Private (Super Admin)
 */
router.get('/system/overview', [
  authenticate,
  requirePermission('system_admin')
], MultiTenantAdminController.getSystemOverview);

/**
 * @route   GET /api/v1/admin/system/config
 * @desc    Get system configuration
 * @access  Private (Super Admin)
 */
router.get('/system/config', [
  authenticate,
  requirePermission('system_admin')
], MultiTenantAdminController.getSystemConfig);

// ==================== NGO MANAGEMENT ====================

/**
 * @route   GET /api/v1/admin/ngos
 * @desc    Get all NGOs with filtering and pagination
 * @access  Private (Super Admin)
 */
router.get('/ngos', [
  authenticate,
  requirePermission('system_admin')
], MultiTenantAdminController.getAllNGOs);

/**
 * @route   GET /api/v1/admin/ngos/:ngoId
 * @desc    Get NGO details by ID
 * @access  Private (Super Admin)
 */
router.get('/ngos/:ngoId', [
  authenticate,
  requirePermission('system_admin')
], MultiTenantAdminController.getNGODetails);

/**
 * @route   PUT /api/v1/admin/ngos/:ngoId/status
 * @desc    Update NGO status (approve/suspend/activate)
 * @access  Private (Super Admin)
 */
router.put('/ngos/:ngoId/status', [
  authenticate,
  requirePermission('system_admin')
], MultiTenantAdminController.updateNGOStatus);

// ==================== USER MANAGEMENT ====================

/**
 * @route   GET /api/v1/admin/users
 * @desc    Get system-wide user management
 * @access  Private (Super Admin)
 */
router.get('/users', [
  authenticate,
  requirePermission('system_admin')
], MultiTenantAdminController.getSystemUsers);

/**
 * @route   PUT /api/v1/admin/users/:userId/permissions
 * @desc    Update user permissions
 * @access  Private (Super Admin)
 */
router.put('/users/:userId/permissions', [
  authenticate,
  requirePermission('system_admin')
], MultiTenantAdminController.updateUserPermissions);

// ==================== REPORTING ====================

/**
 * @route   GET /api/v1/admin/reports
 * @desc    Generate system reports
 * @access  Private (Super Admin)
 */
router.get('/reports', [
  authenticate,
  requirePermission('system_admin')
], MultiTenantAdminController.generateSystemReport);

export default router;
