import express from 'express';
import {
  createProgram,
  getPrograms,
  getProgramById,
  updateProgram,
  deleteProgram,
  addProgramUpdate,
  getFeaturedPrograms,
  getProgramsByNGO,
  getProgramStats
} from '../controllers/programController';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { validateCreateProgram, validateUpdateProgram, validateProgramUpdate } from '../middleware/validationMiddleware';

const router = express.Router();

// Public routes
router.get('/', getPrograms);
router.get('/featured', getFeaturedPrograms);
router.get('/stats', getProgramStats);
router.get('/:id', getProgramById);
router.get('/ngo/:ngoId', getProgramsByNGO);

// Protected routes
router.post('/', authenticate, authorize('ngo', 'admin'), validateCreateProgram, createProgram);
router.put('/:id', authenticate, authorize('ngo', 'admin'), validateUpdateProgram, updateProgram);
router.delete('/:id', authenticate, authorize('ngo', 'admin'), deleteProgram);
router.post('/:id/updates', authenticate, authorize('ngo', 'admin'), validateProgramUpdate, addProgramUpdate);

export default router;
