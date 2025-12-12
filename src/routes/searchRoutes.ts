import express from 'express';
import {
  globalSearch,
  searchNGOs,
  searchPrograms,
  getSearchSuggestions
} from '../controllers/searchController';
import { query } from 'express-validator';
import { validateRequest } from '../middleware/validationMiddleware';

const router = express.Router();

// Search validation
const searchValidation = [
  query('q')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Search query must be between 2 and 100 characters'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  validateRequest
];

// Global search across all entities
router.get('/', searchValidation, globalSearch);

// Search specific entities
router.get('/ngos', searchValidation, searchNGOs);
router.get('/programs', searchValidation, searchPrograms);

// Get search suggestions for autocomplete
router.get('/suggestions', 
  query('q')
    .isLength({ min: 2, max: 50 })
    .withMessage('Query must be between 2 and 50 characters'),
  validateRequest,
  getSearchSuggestions
);

export default router;
