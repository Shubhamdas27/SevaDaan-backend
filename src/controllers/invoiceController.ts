import { Request, Response, NextFunction } from 'express';
import Invoice from '../models/Invoice';
import Donation from '../models/Donation';
import { AuthRequest } from '../middleware/authMiddleware';
import { CustomError } from '../middleware/errorMiddleware';
import mongoose from 'mongoose';

// Create new invoice
export const createInvoice = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Only NGO staff can create invoices
    if (!['ngo', 'ngo_admin', 'ngo_manager'].includes(req.user?.role || '')) {
      return next(new CustomError('Access denied. Only NGO staff can create invoices', 403));
    }

    const invoiceData = {
      ...req.body,
      ngo: req.user!._id
    };

    // If related to a donation, verify it exists
    if (req.body.donation) {
      const donation = await Donation.findById(req.body.donation);
      if (!donation) {
        return next(new CustomError('Related donation not found', 404));
      }
      invoiceData.donor = donation.donor;
    }

    const invoice = new Invoice(invoiceData);
    await invoice.save();

    await invoice.populate([
      { path: 'donor', select: 'name email phone' },
      { path: 'ngo', select: 'name email' },
      { path: 'donation', select: 'amount purpose' }
    ]);
    
    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      data: invoice
    });
  } catch (error) {
    next(error);
  }
};

// Get invoices with filters and pagination
export const getInvoices = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter: any = {};
    
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    if (req.query.invoiceType) {
      filter.invoiceType = req.query.invoiceType;
    }
    
    if (req.query.paymentStatus) {
      filter['paymentDetails.status'] = req.query.paymentStatus;
    }

    // Date range filtering
    if (req.query.startDate || req.query.endDate) {
      filter.issuedDate = {};
      if (req.query.startDate) {
        filter.issuedDate.$gte = new Date(req.query.startDate as string);
      }
      if (req.query.endDate) {
        filter.issuedDate.$lte = new Date(req.query.endDate as string);
      }
    }

    // Role-based filtering
    if (req.user?.role === 'citizen' || req.user?.role === 'donor') {
      filter.donor = req.user._id;
    } else if (req.user?.role === 'ngo_admin' || req.user?.role === 'ngo_manager') {
      filter.ngo = req.user._id;
    }

    const invoices = await Invoice.find(filter)
      .populate('donor', 'name email phone')
      .populate('ngo', 'name email')
      .populate('donation', 'amount purpose')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Invoice.countDocuments(filter);

    res.json({
      success: true,
      data: {
        invoices,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get invoice by ID
export const getInvoiceById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new CustomError('Invalid invoice ID', 400));
    }

    const invoice = await Invoice.findById(id)
      .populate('donor', 'name email phone')
      .populate('ngo', 'name email phone address')
      .populate('donation', 'amount purpose transactionId');

    if (!invoice) {
      return next(new CustomError('Invoice not found', 404));
    }

    // Check access permissions
    const canAccess = req.user?.role === 'ngo' || 
                     invoice.donor.toString() === req.user?._id.toString() ||
                     invoice.ngo.toString() === req.user?._id.toString();

    if (!canAccess) {
      return next(new CustomError('Access denied', 403));
    }

    res.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    next(error);
  }
};

// Get invoice by invoice number (for public access)
export const getInvoiceByNumber = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { invoiceNumber } = req.params;

    const invoice = await Invoice.findOne({ invoiceNumber })
      .populate('donor', 'name email')
      .populate('ngo', 'name email address')
      .populate('donation', 'amount purpose');

    if (!invoice) {
      return next(new CustomError('Invoice not found', 404));
    }

    // Increment view count
    await Invoice.findByIdAndUpdate(invoice._id, {
      $inc: { viewCount: 1 }
    });

    res.json({
      success: true,
      data: {
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.amount,
        currency: invoice.currency,
        status: invoice.status,
        issuedDate: invoice.issuedDate,
        donor: invoice.donor,
        ngo: invoice.ngo,
        lineItems: invoice.lineItems,
        taxDetails: invoice.taxDetails
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update invoice
export const updateInvoice = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new CustomError('Invalid invoice ID', 400));
    }

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return next(new CustomError('Invoice not found', 404));
    }

    // Check permissions - only NGO staff who created the invoice can update
    const canUpdate = req.user?.role === 'ngo' || 
                     invoice.ngo.toString() === req.user?._id.toString();

    if (!canUpdate) {
      return next(new CustomError('Access denied', 403));
    }

    // Prevent updating paid invoices except for status and notes
    if (invoice.paymentDetails.status === 'paid') {
      const allowedFields = ['status', 'notes', 'taxCertificate'];
      const updates = Object.keys(req.body);
      const isValidUpdate = updates.every(update => allowedFields.includes(update));
      
      if (!isValidUpdate) {
        return next(new CustomError('Cannot modify paid invoice details', 400));
      }
    }

    const updatedInvoice = await Invoice.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    ).populate([
      { path: 'donor', select: 'name email phone' },
      { path: 'ngo', select: 'name email' },
      { path: 'donation', select: 'amount purpose' }
    ]);

    res.json({
      success: true,
      message: 'Invoice updated successfully',
      data: updatedInvoice
    });
  } catch (error) {
    next(error);
  }
};

// Mark invoice as paid
export const markInvoicePaid = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { transactionId, gateway, paidAt } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new CustomError('Invalid invoice ID', 400));
    }

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return next(new CustomError('Invoice not found', 404));
    }

    // Check permissions
    const canUpdate = req.user?.role === 'ngo' || 
                     invoice.ngo.toString() === req.user?._id.toString();

    if (!canUpdate) {
      return next(new CustomError('Access denied', 403));
    }

    if (invoice.paymentDetails.status === 'paid') {
      return next(new CustomError('Invoice is already marked as paid', 400));
    }

    // Update payment details
    invoice.paymentDetails.status = 'paid';
    invoice.paymentDetails.transactionId = transactionId;
    invoice.paymentDetails.gateway = gateway;
    invoice.paymentDetails.paidAt = paidAt || new Date();
    invoice.status = 'paid';

    await invoice.save();

    res.json({
      success: true,
      message: 'Invoice marked as paid successfully',
      data: invoice
    });
  } catch (error) {
    next(error);
  }
};

// Generate tax certificate
export const generateTaxCertificate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new CustomError('Invalid invoice ID', 400));
    }

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return next(new CustomError('Invoice not found', 404));
    }

    // Check permissions
    const canGenerate = req.user?.role === 'ngo' || 
                       invoice.donor.toString() === req.user?._id.toString() ||
                       invoice.ngo.toString() === req.user?._id.toString();

    if (!canGenerate) {
      return next(new CustomError('Access denied', 403));
    }

    if (invoice.paymentDetails.status !== 'paid') {
      return next(new CustomError('Can only generate tax certificate for paid invoices', 400));
    }

    if (!invoice.taxDetails || invoice.taxDetails.taxType === 'none') {
      return next(new CustomError('This invoice is not eligible for tax certificate', 400));
    }

    // Generate certificate details
    const certificateNumber = `TAX-${invoice.invoiceNumber}-${Date.now()}`;
    const issueDate = new Date();
    const validUntil = new Date(issueDate.getFullYear() + 3, issueDate.getMonth(), issueDate.getDate()); // 3 years validity

    invoice.taxCertificate = {
      certificateNumber,
      issueDate,
      validUntil,
      downloadUrl: `/api/invoices/${id}/tax-certificate/download`
    };

    await invoice.save();

    res.json({
      success: true,
      message: 'Tax certificate generated successfully',
      data: {
        certificateNumber,
        downloadUrl: invoice.taxCertificate.downloadUrl
      }
    });
  } catch (error) {
    next(error);
  }
};

// Download invoice PDF
export const downloadInvoice = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new CustomError('Invalid invoice ID', 400));
    }

    const invoice = await Invoice.findById(id)
      .populate('donor', 'name email phone')
      .populate('ngo', 'name email address');

    if (!invoice) {
      return next(new CustomError('Invoice not found', 404));
    }

    // Check permissions
    const canDownload = req.user?.role === 'ngo' || 
                       invoice.donor.toString() === req.user?._id.toString() ||
                       invoice.ngo.toString() === req.user?._id.toString();

    if (!canDownload) {
      return next(new CustomError('Access denied', 403));
    }

    // Increment download count
    await Invoice.findByIdAndUpdate(id, {
      $inc: { downloadCount: 1 }
    });

    res.json({
      success: true,
      message: 'Invoice download initiated',
      data: {
        downloadUrl: `/api/invoices/${id}/pdf`,
        invoiceNumber: invoice.invoiceNumber
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get invoice statistics
export const getInvoiceStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Only allow NGO staff and super admin to view stats
    if (!['ngo', 'ngo_admin', 'ngo_manager'].includes(req.user?.role || '')) {
      return next(new CustomError('Access denied', 403));
    }

    const filter: any = {};
    if (req.user?.role !== 'ngo') {
      filter.ngo = req.user!._id;
    }

    const stats = await Invoice.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalInvoices: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          paidInvoices: {
            $sum: { $cond: [{ $eq: ['$paymentDetails.status', 'paid'] }, 1, 0] }
          },
          paidAmount: {
            $sum: { $cond: [{ $eq: ['$paymentDetails.status', 'paid'] }, '$amount', 0] }
          },
          pendingInvoices: {
            $sum: { $cond: [{ $eq: ['$paymentDetails.status', 'pending'] }, 1, 0] }
          },
          overdueInvoices: {
            $sum: { 
              $cond: [
                { 
                  $and: [
                    { $eq: ['$paymentDetails.status', 'pending'] },
                    { $lt: ['$dueDate', new Date()] }
                  ]
                }, 
                1, 
                0
              ] 
            }
          }
        }
      }
    ]);

    const monthlyStats = await Invoice.aggregate([
      { $match: { ...filter, issuedDate: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) } } },
      {
        $group: {
          _id: {
            year: { $year: '$issuedDate' },
            month: { $month: '$issuedDate' }
          },
          count: { $sum: 1 },
          amount: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json({
      success: true,
      data: {
        overview: stats[0] || {
          totalInvoices: 0,
          totalAmount: 0,
          paidInvoices: 0,
          paidAmount: 0,
          pendingInvoices: 0,
          overdueInvoices: 0
        },
        monthly: monthlyStats
      }
    });
  } catch (error) {
    next(error);
  }
};
