import express from 'express';
import { 
  createProgramRegistration,
  getProgramRegistrations,
  getProgramRegistrationById,
  updateProgramRegistration,
  cancelProgramRegistration,
  addFeedback,
  getProgramRegistrationStats
} from '../controllers/programRegistrationController';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { validateProgramRegistration, validateObjectId } from '../middleware/validationMiddleware';

const router = express.Router();

// Protected routes
router.use(authenticate);

// Get all registrations (with filters and pagination)
router.get('/', getProgramRegistrations);

// Get registration statistics
router.get('/stats', authorize('ngo', 'ngo_admin', 'ngo_manager'), getProgramRegistrationStats);

// Get specific registration
router.get('/:id', ...validateObjectId('id'), getProgramRegistrationById);

// Create new registration for a program
router.post('/program/:programId', validateProgramRegistration, createProgramRegistration);

// Update registration
router.put('/:id', ...validateObjectId('id'), updateProgramRegistration);

// Add feedback
router.post('/:id/feedback', ...validateObjectId('id'), addFeedback);

// Cancel registration
router.patch('/:id/cancel', ...validateObjectId('id'), cancelProgramRegistration);

export default router;
