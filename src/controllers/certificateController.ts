import { Request, Response, NextFunction } from 'express';
import Certificate from '../models/Certificate';
import { AuthRequest } from '../middleware/authMiddleware';
import { CustomError } from '../middleware/errorMiddleware';
import mongoose from 'mongoose';

// Create new certificate
export const createCertificate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Only NGO admins/managers can create certificates
    if (!['ngo', 'ngo_admin', 'ngo_manager'].includes(req.user?.role || '')) {
      return next(new CustomError('Access denied. Only NGO staff can create certificates', 403));
    }

    const certificateData = {
      ...req.body,
      issuedBy: req.user?._id
    };

    const certificate = new Certificate(certificateData);
    await certificate.save();

    await certificate.populate([
      { path: 'recipient', select: 'name email phone' },
      { path: 'issuedBy', select: 'name email' },
      { path: 'relatedTo.reference' }
    ]);
    
    res.status(201).json({
      success: true,
      message: 'Certificate created successfully',
      data: certificate
    });
  } catch (error) {
    next(error);
  }
};

// Get certificates with filters and pagination
export const getCertificates = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter: any = {};
    
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    if (req.query.certificateType) {
      filter.certificateType = req.query.certificateType;
    }
    
    if (req.query.relatedType) {
      filter['relatedTo.type'] = req.query.relatedType;
    }

    // Role-based filtering
    if (req.user?.role === 'citizen' || req.user?.role === 'donor' || req.user?.role === 'volunteer') {
      filter.recipient = req.user._id;
    } else if (req.user?.role === 'ngo_admin' || req.user?.role === 'ngo_manager') {
      filter.issuedBy = req.user._id;
    }

    const certificates = await Certificate.find(filter)
      .populate('recipient', 'name email phone')
      .populate('issuedBy', 'name email')
      .populate('relatedTo.reference')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Certificate.countDocuments(filter);

    res.json({
      success: true,
      data: {
        certificates,
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

// Get certificate by ID
export const getCertificateById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new CustomError('Invalid certificate ID', 400));
    }

    const certificate = await Certificate.findById(id)
      .populate('recipient', 'name email phone')
      .populate('issuedBy', 'name email')
      .populate('relatedTo.reference');

    if (!certificate) {
      return next(new CustomError('Certificate not found', 404));
    }

    // Check access permissions
    const canAccess = req.user?.role === 'ngo' || 
                     certificate.recipient.toString() === req.user?._id.toString() ||
                     certificate.issuedBy.toString() === req.user?._id.toString();

    if (!canAccess) {
      return next(new CustomError('Access denied', 403));
    }

    res.json({
      success: true,
      data: certificate
    });
  } catch (error) {
    next(error);
  }
};

// Verify certificate by verification code
export const verifyCertificate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { verificationCode } = req.params;

    const certificate = await Certificate.findOne({ verificationCode })
      .populate('recipient', 'name email')
      .populate('issuedBy', 'name email')
      .populate('relatedTo.reference');

    if (!certificate) {
      return next(new CustomError('Certificate not found or invalid verification code', 404));
    }

    // Increment verification count
    await Certificate.findByIdAndUpdate(certificate._id, {
      $inc: { verifiedCount: 1 }
    });

    res.json({
      success: true,
      message: 'Certificate verified successfully',
      data: {
        isValid: certificate.status === 'active',
        certificate: {
          certificateId: certificate.certificateId,
          title: certificate.title,
          recipient: certificate.recipient,
          issuedBy: certificate.issuedBy,
          issueDate: certificate.createdAt,
          validUntil: certificate.validUntil,
          status: certificate.status
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update certificate status
export const updateCertificate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new CustomError('Invalid certificate ID', 400));
    }

    const certificate = await Certificate.findById(id);
    if (!certificate) {
      return next(new CustomError('Certificate not found', 404));
    }

    // Check permissions - only issuer or super admin can update
    const canUpdate = req.user?.role === 'ngo' || 
                     certificate.issuedBy.toString() === req.user?._id.toString();

    if (!canUpdate) {
      return next(new CustomError('Access denied. Only certificate issuer can update', 403));
    }

    // Only allow updating certain fields
    const allowedUpdates = ['status', 'validUntil', 'description'];
    const updates: any = {};
    
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const updatedCertificate = await Certificate.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    ).populate([
      { path: 'recipient', select: 'name email' },
      { path: 'issuedBy', select: 'name email' },
      { path: 'relatedTo.reference' }
    ]);

    res.json({
      success: true,
      message: 'Certificate updated successfully',
      data: updatedCertificate
    });
  } catch (error) {
    next(error);
  }
};

// Download certificate
export const downloadCertificate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new CustomError('Invalid certificate ID', 400));
    }

    const certificate = await Certificate.findById(id);
    if (!certificate) {
      return next(new CustomError('Certificate not found', 404));
    }

    // Check access permissions
    const canDownload = req.user?.role === 'ngo' || 
                       certificate.recipient.toString() === req.user?._id.toString() ||
                       certificate.issuedBy.toString() === req.user?._id.toString();

    if (!canDownload) {
      return next(new CustomError('Access denied', 403));
    }

    // Increment download count
    await Certificate.findByIdAndUpdate(id, {
      $inc: { downloadCount: 1 }
    });

    res.json({
      success: true,
      message: 'Certificate download initiated',
      data: {
        downloadUrl: certificate.certificateUrl,
        certificateId: certificate.certificateId
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get certificate statistics
export const getCertificateStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Only allow NGO staff and super admin to view stats
    if (!['ngo', 'ngo_admin', 'ngo_manager'].includes(req.user?.role || '')) {
      return next(new CustomError('Access denied', 403));
    }    const filter: any = {};
    if (req.user?.role !== 'ngo') {
      filter.issuedBy = req.user!._id;
    }

    const stats = await Certificate.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalCertificates: { $sum: 1 },
          activeCertificates: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          expiredCertificates: {
            $sum: { $cond: [{ $eq: ['$status', 'expired'] }, 1, 0] }
          },
          revokedCertificates: {
            $sum: { $cond: [{ $eq: ['$status', 'revoked'] }, 1, 0] }
          },
          totalDownloads: { $sum: '$downloadCount' },
          totalVerifications: { $sum: '$verifiedCount' }
        }
      }
    ]);

    const typeStats = await Certificate.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$certificateType',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        overview: stats[0] || {
          totalCertificates: 0,
          activeCertificates: 0,
          expiredCertificates: 0,
          revokedCertificates: 0,
          totalDownloads: 0,
          totalVerifications: 0
        },
        byType: typeStats
      }
    });
  } catch (error) {
    next(error);
  }
};
