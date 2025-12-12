import express from 'express';
import {
  createContact,
  getContacts,
  getContact,
  assignContact,
  respondToContact,
  closeContact,
  getUnreadContacts,
  getContactStats
} from '../controllers/contactController';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { validateContact } from '../middleware/validationMiddleware';

const router = express.Router();

// Public routes
router.post('/', validateContact, createContact);

// Admin only routes
router.use(authenticate);
router.use(authorize('admin', 'ngo'));

router.get('/', getContacts);
router.get('/unread', getUnreadContacts);
router.get('/stats', getContactStats);
router.get('/:id', getContact);
router.post('/:id/assign', assignContact);
router.post('/:id/respond', respondToContact);
router.post('/:id/close', closeContact);

export default router;
