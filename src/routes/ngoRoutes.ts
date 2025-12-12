import express from 'express';
import {
  getNGOs,
  getNGO,
  getNGOBySlugPublic,
  createNGO,
  updateNGO,
  deleteNGO,
  verifyNGO,
  getNGOStatus,
  searchNGOs
} from '../controllers/ngoController';
import { authenticate, authorize, checkNGOOwnership } from '../middleware/authMiddleware';
import { upload } from '../services/uploadService';
import { body } from 'express-validator';
import { validateRequest } from '../middleware/validationMiddleware';

const router = express.Router();

// NGO registration validation
const ngoValidation = [
  body('name').trim().isLength({ min: 2, max: 200 }).withMessage('NGO name must be between 2 and 200 characters'),
  body('description').trim().isLength({ min: 10, max: 2000 }).withMessage('Description must be between 10 and 2000 characters'),
  body('mission').trim().isLength({ min: 10, max: 1000 }).withMessage('Mission must be between 10 and 1000 characters'),
  body('vision').trim().isLength({ min: 10, max: 1000 }).withMessage('Vision must be between 10 and 1000 characters'),
  body('contactEmail').isEmail().normalizeEmail().withMessage('Please provide a valid contact email'),
  body('contactPhone').isMobilePhone('en-IN').withMessage('Please provide a valid contact phone number'),
  body('registrationNumber').trim().notEmpty().withMessage('Registration number is required'),
  body('type').isIn(['trust', 'society', 'section8']).withMessage('Invalid NGO type'),
  body('pincode').isPostalCode('IN').withMessage('Please provide a valid pincode')
];

// File upload fields for NGO registration
const ngoUploadFields = upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 },
  { name: 'registrationCertificate', maxCount: 1 },
  { name: 'panCard', maxCount: 1 },
  { name: 'taxExemptionCert', maxCount: 1 },
  { name: 'fcraCertificate', maxCount: 1 },
  { name: 'annualReport', maxCount: 1 },
  { name: 'financialStatement', maxCount: 1 },
  { name: 'cancelledCheque', maxCount: 1 }
]);

// @route   GET /api/v1/ngos/public/:slug
// @desc    Get NGO by slug for public page
// @access  Public
router.get('/public/:slug', getNGOBySlugPublic);

// @route   GET /api/v1/ngos
// @desc    Get all verified NGOs
// @access  Public
router.get('/', getNGOs);

// @route   GET /api/v1/ngos/search
// @desc    Search NGOs
// @access  Public
router.get('/search', searchNGOs);

// @route   GET /api/v1/ngos/status/:id
// @desc    Get NGO verification status
// @access  Private (NGO Admin)
router.get('/status/:id', authenticate, checkNGOOwnership, getNGOStatus);

// @route   GET /api/v1/ngos/:id
// @desc    Get single NGO
// @access  Public
router.get('/:id', getNGO);

// @route   POST /api/v1/ngos
// @desc    Register new NGO
// @access  Private (NGO Admin)
router.post('/', 
  authenticate, 
  authorize('ngo_admin'), 
  ngoUploadFields,
  ngoValidation,
  validateRequest,
  createNGO
);

// @route   PUT /api/v1/ngos/:id
// @desc    Update NGO
// @access  Private (NGO Admin/Super Admin)
router.put('/:id', 
  authenticate, 
  checkNGOOwnership,
  upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 }
  ]),
  updateNGO
);

// @route   DELETE /api/v1/ngos/:id
// @desc    Delete NGO
// @access  Private (Super Admin only)
router.delete('/:id', authenticate, authorize('ngo'), deleteNGO);

// @route   PATCH /api/v1/ngos/:id/verify
// @desc    Verify/Reject NGO
// @access  Private (Super Admin only)
router.patch('/:id/verify', 
  authenticate, 
  authorize('ngo'),
  [
    body('status').isIn(['verified', 'rejected']).withMessage('Status must be verified or rejected'),
    body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters')
  ],
  validateRequest,
  verifyNGO
);

export default router;
