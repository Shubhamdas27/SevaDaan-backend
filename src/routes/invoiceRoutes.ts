import express from 'express';
import { 
  createInvoice,
  getInvoices,
  getInvoiceById,
  getInvoiceByNumber,
  updateInvoice,
  markInvoicePaid,
  generateTaxCertificate,
  downloadInvoice,
  getInvoiceStats
} from '../controllers/invoiceController';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { validateObjectId } from '../middleware/validationMiddleware';

const router = express.Router();

// Public routes
router.get('/number/:invoiceNumber', getInvoiceByNumber);

// Protected routes
router.use(authenticate);

// Get all invoices (with filters and pagination)
router.get('/', getInvoices);

// Get invoice statistics
router.get('/stats', authorize('ngo', 'ngo_admin', 'ngo_manager'), getInvoiceStats);

// Get specific invoice
router.get('/:id', ...validateObjectId('id'), getInvoiceById);

// Create new invoice
router.post('/', authorize('ngo', 'ngo_admin', 'ngo_manager'), createInvoice);

// Update invoice
router.put('/:id', authorize('ngo', 'ngo_admin', 'ngo_manager'), ...validateObjectId('id'), updateInvoice);

// Mark invoice as paid
router.patch('/:id/mark-paid', authorize('ngo', 'ngo_admin', 'ngo_manager'), ...validateObjectId('id'), markInvoicePaid);

// Generate tax certificate
router.post('/:id/tax-certificate', ...validateObjectId('id'), generateTaxCertificate);

// Download invoice
router.get('/:id/download', ...validateObjectId('id'), downloadInvoice);

export default router;
