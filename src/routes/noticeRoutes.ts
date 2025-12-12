import express from 'express';
import {
  createNotice,
  getNotices,
  getNotice,
  updateNotice,
  deleteNotice,
  toggleHighlight,
  getHighlightedNotices,
  getNoticeStats,
  cleanupExpired
} from '../controllers/noticeController';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { validateNotice, validateNoticeUpdate } from '../middleware/validationMiddleware';

const router = express.Router();

// Public routes
router.get('/highlighted', getHighlightedNotices);
router.get('/', getNotices);
router.get('/:id', getNotice);

// Protected routes
router.use(authenticate);

// Create notice (NGO admin only)
router.post('/', validateNotice, createNotice);

// Update/delete notice (NGO admin only)
router.put('/:id', validateNoticeUpdate, updateNotice);
router.delete('/:id', deleteNotice);

// Toggle highlight (NGO admin only)
router.post('/:id/toggle-highlight', toggleHighlight);

// Statistics (NGO admin or admin)
router.get('/stats/:ngoId', getNoticeStats);

// Admin only routes
router.post('/cleanup-expired', authorize('ngo', 'ngo_admin'), cleanupExpired);

export default router;
