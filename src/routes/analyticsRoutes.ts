import express from 'express';
import { AnalyticsController } from '../controllers/analyticsController';
import { authenticate } from '../middleware/authMiddleware';
import { requirePermission } from '../middleware/roleMiddleware';

const router = express.Router();

// ==================== DASHBOARD ANALYTICS ====================

/**
 * @route   GET /api/v1/analytics/dashboard
 * @desc    Get comprehensive dashboard analytics
 * @access  Private (NGO Admin/Manager)
 */
router.get('/dashboard', [
  authenticate,
  requirePermission('analytics_read')
], AnalyticsController.getDashboardAnalytics);

// ==================== EXPORT FUNCTIONALITY ====================

/**
 * @route   GET /api/v1/analytics/export
 * @desc    Export analytics data (JSON/CSV)
 * @access  Private (NGO Admin/Manager)
 */
router.get('/export', [
  authenticate,
  requirePermission('analytics_export')
], AnalyticsController.exportAnalytics);

export default router;
