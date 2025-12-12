import express from 'express';
import {
  createApplication,
  getApplications,
  getApplication,
  updateApplicationStatus,
  addCaseNote,
  getApplicationStats
} from '../controllers/serviceApplicationController';
import { authenticate } from '../middleware/authMiddleware';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Create new service application (Citizens)
router.post('/', createApplication);

// Get applications (role-based filtering)
router.get('/', getApplications);

// Get application statistics (NGO Dashboard)
router.get('/stats', getApplicationStats);

// Get single application by ID
router.get('/:id', getApplication);

// Update application status (NGO Manager/Admin)
router.patch('/:id/status', updateApplicationStatus);

// Add case note to application (NGO Manager/Volunteer)
router.post('/:id/notes', addCaseNote);

export default router;
