import express from 'express';
import {
  getManagers,
  addManager,
  updateManagerPermissions,
  deleteManager
} from '../controllers/managerController';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { body } from 'express-validator';
import { validateRequest } from '../middleware/validationMiddleware';

const router = express.Router();

// Manager validation rules
const managerValidation = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('permissions').optional().isArray().withMessage('Permissions must be an array')
];

const updateManagerValidation = [
  body('permissions').optional().isArray().withMessage('Permissions must be an array'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
];

// @route   GET /api/v1/ngo/managers
// @desc    Get all managers for NGO
// @access  Private (NGO Admin/Manager with permissions)
router.get('/', authenticate, authorize('ngo_admin', 'ngo_manager'), getManagers);

// @route   POST /api/v1/ngo/managers
// @desc    Add new manager to NGO
// @access  Private (NGO Admin only)
router.post('/', authenticate, authorize('ngo_admin'), managerValidation, validateRequest, addManager);

// @route   PUT /api/v1/ngo/managers/:managerId
// @desc    Update manager permissions
// @access  Private (NGO Admin only)
router.put('/:managerId', authenticate, authorize('ngo_admin'), updateManagerValidation, validateRequest, updateManagerPermissions);

// @route   DELETE /api/v1/ngo/managers/:managerId
// @desc    Remove/Deactivate manager
// @access  Private (NGO Admin only)
router.delete('/:managerId', authenticate, authorize('ngo_admin'), deleteManager);

export default router;
