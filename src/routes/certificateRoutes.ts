import express from 'express';
import { 
  createCertificate,
  getCertificates,
  getCertificateById,
  updateCertificate,
  downloadCertificate,
  verifyCertificate,
  getCertificateStats
} from '../controllers/certificateController';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { validateCertificate, validateObjectId } from '../middleware/validationMiddleware';

const router = express.Router();

// Public routes
router.get('/verify/:verificationCode', verifyCertificate);

// Protected routes
router.use(authenticate);

// Get all certificates (with filters and pagination)
router.get('/', getCertificates);

// Get certificate statistics
router.get('/stats', authorize('ngo', 'ngo_admin', 'ngo_manager'), getCertificateStats);

// Get specific certificate
router.get('/:id', ...validateObjectId('id'), getCertificateById);

// Create new certificate
router.post('/', authorize('ngo', 'ngo_admin', 'ngo_manager'), validateCertificate, createCertificate);

// Update certificate
router.put('/:id', authorize('ngo', 'ngo_admin', 'ngo_manager'), ...validateObjectId('id'), updateCertificate);

// Download certificate
router.get('/:id/download', ...validateObjectId('id'), downloadCertificate);

export default router;
