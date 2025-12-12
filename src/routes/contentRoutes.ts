import express from 'express';
import { ContentController } from '../controllers/contentController';
import { authenticate } from '../middleware/authMiddleware';
import { requirePermission } from '../middleware/roleMiddleware';
import { uploadSingleFile } from '../utils/fileUpload';
import {
  validateCreateAnnouncement,
  validateUpdateAnnouncement,
  validateCreateContentTemplate,
  validateUpdateNGOContent,
  validateBatchUpdateAnnouncements,
  validateScheduleAnnouncement,
  validateSEOMetadata,
  validateHomepageContent,
  validateApprovalAction,
  validateFileUpload,
  validateExportParams,
  validateObjectId
} from '../middleware/validationMiddleware';

const router = express.Router();

// ==================== LOGO & BANNER MANAGEMENT ====================

/**
 * @route   POST /api/v1/content/logo
 * @desc    Upload NGO logo
 * @access  Private (NGO Admin only)
 */
router.post('/logo', [
  authenticate,
  requirePermission('content_write'),
  uploadSingleFile('logo'),
  validateFileUpload
], ContentController.uploadLogo);

/**
 * @route   POST /api/v1/content/banner
 * @desc    Upload NGO banner image
 * @access  Private (NGO Admin only)
 */
router.post('/banner', [
  authenticate,
  requirePermission('content_write'),
  uploadSingleFile('banner'),
  validateFileUpload
], ContentController.uploadBanner);

// ==================== NGO CONTENT MANAGEMENT ====================

/**
 * @route   PUT /api/v1/content/ngo
 * @desc    Update NGO content (description, contact info, etc.)
 * @access  Private (NGO Admin only)
 */
router.put('/ngo', [
  authenticate,
  requirePermission('content_write'),
  ...validateUpdateNGOContent
], ContentController.updateContent);

/**
 * @route   GET /api/v1/content/ngo/:ngoId?
 * @desc    Get NGO content (public access for viewing)
 * @access  Public
 */
router.get('/ngo/:ngoId?', ContentController.getContent);

// ==================== ANNOUNCEMENTS ====================

/**
 * @route   POST /api/v1/content/announcements
 * @desc    Create new announcement
 * @access  Private (NGO Admin/Manager)
 */
router.post('/announcements', [
  authenticate,
  requirePermission('content_write'),
  ...validateCreateAnnouncement
], ContentController.createAnnouncement);

/**
 * @route   GET /api/v1/content/announcements
 * @desc    Get announcements (with pagination and filtering)
 * @access  Public
 */
router.get('/announcements', ContentController.getAnnouncements);

/**
 * @route   PUT /api/v1/content/announcements/:id
 * @desc    Update announcement
 * @access  Private (NGO Admin/Manager)
 */
router.put('/announcements/:id', [
  authenticate,
  requirePermission('content_write'),
  ...validateUpdateAnnouncement
], ContentController.updateAnnouncement);

/**
 * @route   DELETE /api/v1/content/announcements/:id
 * @desc    Delete announcement
 * @access  Private (NGO Admin/Manager)
 */
router.delete('/announcements/:id', [
  authenticate,
  requirePermission('content_write'),
  ...validateObjectId('id')
], ContentController.deleteAnnouncement);

/**
 * @route   GET /api/v1/content/announcements/:id
 * @desc    Get single announcement
 * @access  Public
 */
router.get('/announcements/:id', ContentController.getAnnouncementById);

/**
 * @route   GET /api/v1/content/announcements/urgent/:ngoId
 * @desc    Get urgent announcements for NGO
 * @access  Public
 */
router.get('/announcements/urgent/:ngoId', ContentController.getUrgentAnnouncements);

// ==================== BATCH OPERATIONS ====================

/**
 * @route   PUT /api/v1/content/announcements/batch
 * @desc    Batch update announcements
 * @access  Private (NGO Admin/Manager)
 */
router.put('/announcements/batch', [
  authenticate,
  requirePermission('content_write'),
  ...validateBatchUpdateAnnouncements
], ContentController.batchUpdateAnnouncements);

// ==================== ARCHIVE MANAGEMENT ====================

/**
 * @route   PUT /api/v1/content/announcements/:id/archive
 * @desc    Archive announcement
 * @access  Private (NGO Admin/Manager)
 */
router.put('/announcements/:id/archive', [
  authenticate,
  requirePermission('content_write'),
  ...validateObjectId('id')
], ContentController.archiveAnnouncement);

/**
 * @route   PUT /api/v1/content/announcements/:id/restore
 * @desc    Restore archived announcement
 * @access  Private (NGO Admin/Manager)
 */
router.put('/announcements/:id/restore', [
  authenticate,
  requirePermission('content_write'),
  ...validateObjectId('id')
], ContentController.restoreAnnouncement);

/**
 * @route   GET /api/v1/content/announcements/archived
 * @desc    Get archived announcements
 * @access  Private (NGO Admin/Manager)
 */
router.get('/announcements/archived', [
  authenticate,
  requirePermission('content_read')
], ContentController.getArchivedAnnouncements);

// ==================== CONTENT TEMPLATES ====================

/**
 * @route   POST /api/v1/content/templates
 * @desc    Create content template
 * @access  Private (NGO Admin/Manager)
 */
router.post('/templates', [
  authenticate,
  requirePermission('content_write'),
  ...validateCreateContentTemplate
], ContentController.createContentTemplate);

/**
 * @route   GET /api/v1/content/templates
 * @desc    Get content templates
 * @access  Private (NGO Admin/Manager)
 */
router.get('/templates', [
  authenticate,
  requirePermission('content_read')
], ContentController.getContentTemplates);

// ==================== SCHEDULING ====================

/**
 * @route   POST /api/v1/content/announcements/schedule
 * @desc    Schedule announcement for future publication
 * @access  Private (NGO Admin/Manager)
 */
router.post('/announcements/schedule', [
  authenticate,
  requirePermission('content_write'),
  ...validateScheduleAnnouncement
], ContentController.scheduleAnnouncement);

/**
 * @route   GET /api/v1/content/announcements/scheduled
 * @desc    Get scheduled announcements
 * @access  Private (NGO Admin/Manager)
 */
router.get('/announcements/scheduled', [
  authenticate,
  requirePermission('content_read')
], ContentController.getScheduledAnnouncements);

// ==================== SEO MANAGEMENT ====================

/**
 * @route   PUT /api/v1/content/seo
 * @desc    Update SEO metadata
 * @access  Private (NGO Admin only)
 */
router.put('/seo', [
  authenticate,
  requirePermission('content_write'),
  ...validateSEOMetadata
], ContentController.updateSEOMetadata);

/**
 * @route   GET /api/v1/content/seo/:ngoId?
 * @desc    Get SEO metadata
 * @access  Public
 */
router.get('/seo/:ngoId?', ContentController.getSEOMetadata);

// ==================== DATA EXPORT ====================

/**
 * @route   GET /api/v1/content/export
 * @desc    Export content data (JSON/CSV)
 * @access  Private (NGO Admin/Manager)
 */
router.get('/export', [
  authenticate,
  requirePermission('content_read')
], ContentController.exportContentData);

/**
 * @route   GET /api/v1/content/stats
 * @desc    Get content statistics for dashboard
 * @access  Private (NGO Admin/Manager)
 */
router.get('/stats', [
  authenticate,
  requirePermission('content_read')
], ContentController.getContentStats);

// ==================== APPROVAL WORKFLOW ====================

/**
 * @route   PUT /api/v1/content/announcements/:id/submit-approval
 * @desc    Submit announcement for approval
 * @access  Private (Content Creator)
 */
router.put('/announcements/:id/submit-approval', [
  authenticate,
  requirePermission('content_write'),
  ...validateObjectId('id')
], ContentController.submitForApproval);

/**
 * @route   PUT /api/v1/content/announcements/:id/approve
 * @desc    Approve or reject announcement
 * @access  Private (NGO Admin/Manager)
 */
router.put('/announcements/:id/approve', [
  authenticate,
  requirePermission('content_approve'),
  ...validateApprovalAction
], ContentController.approveAnnouncement);

/**
 * @route   GET /api/v1/content/announcements/pending-approvals
 * @desc    Get announcements pending approval
 * @access  Private (NGO Admin/Manager)
 */
router.get('/announcements/pending-approvals', [
  authenticate,
  requirePermission('content_approve')
], ContentController.getPendingApprovals);

export default router;
