import express from 'express';
import { APIIntegrationController } from '../controllers/apiIntegrationController';
import { authenticate } from '../middleware/authMiddleware';
import { requirePermission } from '../middleware/roleMiddleware';

const router = express.Router();

// ==================== INTEGRATION MANAGEMENT ====================

/**
 * @route   GET /api/v1/integrations/available
 * @desc    Get available integrations
 * @access  Private (NGO Admin/Manager)
 */
router.get('/available', [
  authenticate,
  requirePermission('integrations_read')
], APIIntegrationController.getAvailableIntegrations);

/**
 * @route   POST /api/v1/integrations/configure
 * @desc    Configure integration for NGO
 * @access  Private (NGO Admin only)
 */
router.post('/configure', [
  authenticate,
  requirePermission('integrations_write')
], APIIntegrationController.configureIntegration);

/**
 * @route   GET /api/v1/integrations/ngo
 * @desc    Get NGO's configured integrations
 * @access  Private (NGO Admin/Manager)
 */
router.get('/ngo', [
  authenticate,
  requirePermission('integrations_read')
], APIIntegrationController.getNGOIntegrations);

/**
 * @route   POST /api/v1/integrations/:integrationId/test
 * @desc    Test integration connection
 * @access  Private (NGO Admin/Manager)
 */
router.post('/:integrationId/test', [
  authenticate,
  requirePermission('integrations_read')
], APIIntegrationController.testIntegration);

// ==================== DATA SYNCHRONIZATION ====================

/**
 * @route   POST /api/v1/integrations/sync
 * @desc    Sync data with external service
 * @access  Private (NGO Admin/Manager)
 */
router.post('/sync', [
  authenticate,
  requirePermission('integrations_write')
], APIIntegrationController.syncData);

// ==================== WEBHOOK HANDLING ====================

/**
 * @route   POST /api/v1/integrations/webhook/:integrationId
 * @desc    Handle webhook from external service
 * @access  Public (Webhook endpoint)
 */
router.post('/webhook/:integrationId', APIIntegrationController.handleWebhook);

// ==================== MONITORING & LOGS ====================

/**
 * @route   GET /api/v1/integrations/:integrationId/logs
 * @desc    Get integration logs
 * @access  Private (NGO Admin/Manager)
 */
router.get('/:integrationId/logs', [
  authenticate,
  requirePermission('integrations_read')
], APIIntegrationController.getIntegrationLogs);

export default router;
