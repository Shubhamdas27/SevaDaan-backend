import express from 'express';
import {
  createVolunteerActivity,
  getVolunteerActivities,
  verifyVolunteerActivity,
  getVolunteerStats,
  updateVolunteerActivity,
  deleteVolunteerActivity
} from '../controllers/volunteerActivityController';
import { authenticate } from '../middleware/authMiddleware';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Create new volunteer activity
router.post('/', createVolunteerActivity);

// Get volunteer activities (role-based filtering)
router.get('/', getVolunteerActivities);

// Get volunteer statistics
router.get('/stats', getVolunteerStats);

// Update volunteer activity
router.patch('/:id', updateVolunteerActivity);

// Delete volunteer activity
router.delete('/:id', deleteVolunteerActivity);

// Verify volunteer activity (NGO Manager)
router.patch('/:id/verify', verifyVolunteerActivity);

export default router;
