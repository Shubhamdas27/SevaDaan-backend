import { Request, Response } from 'express';
import multer from 'multer';
import { cloudinaryService } from '../services/cloudinaryService';
import NGO from '../models/NGO';
import User from '../models/User';
import { socketService } from '../socket/socketService';
import logger from '../utils/logger';

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images and PDFs for KYC documents
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and PDF files are allowed.'));
    }
  },
});

export const uploadKYCDocuments = upload.fields([
  { name: 'panCard', maxCount: 1 },
  { name: 'registrationCertificate', maxCount: 1 },
  { name: '80gCertificate', maxCount: 1 },
  { name: 'fcraCertificate', maxCount: 1 },
  { name: 'bankStatement', maxCount: 1 },
  { name: 'boardResolution', maxCount: 1 },
  { name: 'trustDeed', maxCount: 1 },
  { name: 'auditedFinancials', maxCount: 1 },
  { name: 'ngoPhoto', maxCount: 5 }
]);

export const submitKYCDocuments = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id.toString();
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    const ngo = await NGO.findOne({ adminId: userId });
    if (!ngo) {
      res.status(404).json({
        success: false,
        message: 'NGO not found'
      });
      return;
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    if (!files || Object.keys(files).length === 0) {
      res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
      return;
    }

    const uploadedDocuments: Record<string, any> = {};

    // Upload each document type to Cloudinary
    for (const [documentType, fileArray] of Object.entries(files)) {
      const uploadedFiles = [];

      for (const file of fileArray) {
        try {
          const result = await cloudinaryService.uploadNGODocument(
            file.buffer,
            ngo._id.toString(),
            documentType as any,
            file.originalname
          );

          uploadedFiles.push({
            url: result.secure_url,
            public_id: result.public_id,
            originalName: file.originalname,
            format: result.format,
            bytes: result.bytes,
            uploadedAt: new Date()
          });

          logger.info(`KYC document uploaded: ${documentType} for NGO ${ngo._id}`);
        } catch (uploadError) {
          logger.error(`Failed to upload ${documentType}:`, uploadError);
          res.status(500).json({
            success: false,
            message: `Failed to upload ${documentType}`,
            error: uploadError instanceof Error ? uploadError.message : 'Upload error'
          });
          return;
        }
      }

      uploadedDocuments[documentType] = uploadedFiles;
    }

    // Update NGO with uploaded documents
    const updatedNGO = await NGO.findByIdAndUpdate(
      ngo._id,
      {
        $set: {
          'verification.documents': uploadedDocuments,
          'verification.submissionStatus': 'documents_submitted',
          'verification.submissionDate': new Date(),
          'verification.isDocumentsSubmitted': true
        }
      },
      { new: true }
    );

    // Emit real-time notification to admin users
    socketService.emitToRole('super_admin', 'kyc_documents_submitted', {
      ngoId: ngo._id,
      ngoName: ngo.name,
      adminName: req.user?.name,
      submissionDate: new Date(),
      documentTypes: Object.keys(uploadedDocuments)
    });

    // Notify NGO admin
    socketService.emitToUser(userId, 'kyc_submission_success', {
      status: 'documents_submitted',
      message: 'KYC documents submitted successfully. Verification is in progress.',
      submissionDate: new Date()
    });

    res.status(200).json({
      success: true,
      message: 'KYC documents uploaded successfully',
      data: {
        ngoId: ngo._id,
        submissionStatus: 'documents_submitted',
        documentsUploaded: Object.keys(uploadedDocuments),
        submissionDate: new Date()
      }
    });

  } catch (error) {
    logger.error('KYC document upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const verifyKYCDocuments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ngoId, status, comments, verifiedDocuments } = req.body;
    const adminId = req.user?._id.toString();

    if (!adminId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    // Only NGO admins can verify KYC (changed from super_admin)
    if (req.user?.role !== 'ngo') {
      res.status(403).json({
        success: false,
        message: 'Access denied. Only system admins can verify KYC documents.'
      });
      return;
    }

    const ngo = await NGO.findById(ngoId).populate('adminId', 'name email');
    if (!ngo) {
      res.status(404).json({
        success: false,
        message: 'NGO not found'
      });
      return;
    }

    // Update verification status
    const verificationUpdate: any = {
      'status': status,
      'verificationDate': new Date(),
      'verificationNotes': comments
    };

    if (status === 'verified') {
      verificationUpdate['isVerified'] = true;
      verificationUpdate['status'] = 'verified';
      
      // Generate NGO public slug for SEO page
      verificationUpdate['slug'] = `${ngo.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${ngo._id.toString().slice(-6)}`;
    } else if (status === 'rejected') {
      verificationUpdate['isVerified'] = false;
      verificationUpdate['status'] = 'rejected';
      verificationUpdate['rejectionReason'] = comments;
    }

    const updatedNGO = await NGO.findByIdAndUpdate(
      ngoId,
      { $set: verificationUpdate },
      { new: true }
    );

    // Send notifications
    const ngoAdmin = ngo.adminId as any;
    if (ngoAdmin) {
      socketService.emitToUser(ngoAdmin._id.toString(), 'kyc_verification_update', {
        status: status,
        ngoName: ngo.name,
        verificationDate: new Date(),
        comments: comments,
        isApproved: status === 'verified'
      });

      // If approved, create the public NGO page notification
      if (status === 'verified' && verificationUpdate['slug']) {
        socketService.emitToUser(ngoAdmin._id.toString(), 'ngo_page_created', {
          ngoName: ngo.name,
          publicUrl: `${process.env.FRONTEND_URL}/ngo/${verificationUpdate['slug']}`,
          message: 'Your NGO public page has been created and is now live!'
        });
      }
    }

    // Emit to dashboard for real-time updates
    socketService.emitDashboardRefresh('role', 'ngo', 'ngo_verification');

    res.status(200).json({
      success: true,
      message: `NGO ${status === 'verified' ? 'verified' : 'rejected'} successfully`,
      data: {
        ngoId: ngo._id,
        status: status,
        verificationDate: new Date(),
        publicUrl: status === 'verified' ? `${process.env.FRONTEND_URL}/ngo/${verificationUpdate['slug']}` : null
      }
    });

  } catch (error) {
    logger.error('KYC verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getKYCStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id.toString();
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    const ngo = await NGO.findOne({ adminId: userId }).select('status isVerified verificationDate verificationNotes rejectionReason');
    if (!ngo) {
      res.status(404).json({
        success: false,
        message: 'NGO not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        ngoId: ngo._id,
        verificationStatus: ngo.status,
        isVerified: ngo.isVerified || false,
        verificationDate: ngo.verificationDate,
        comments: ngo.verificationNotes,
        rejectionReason: ngo.rejectionReason,
        status: ngo.status,
        requiredDocuments: [
          'panCard',
          'registrationCertificate',
          '80gCertificate',
          'bankStatement',
          'boardResolution',
          'ngoPhoto'
        ],
        optionalDocuments: [
          'fcraCertificate',
          'trustDeed',
          'auditedFinancials'
        ]
      }
    });

  } catch (error) {
    logger.error('Get KYC status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getPendingKYCVerifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = req.user?._id.toString();
    if (!adminId || req.user?.role !== 'ngo') {
      res.status(403).json({
        success: false,
        message: 'Access denied. Only system admins can view pending verifications.'
      });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const pendingNGOs = await NGO.find({
      status: { $in: ['pending', 'under_review'] }
    })
    .populate('adminId', 'name email phone')
    .select('name description status isVerified verificationDate createdAt')
    .sort({ createdAt: 1 })
    .skip(skip)
    .limit(limit);

    const totalPending = await NGO.countDocuments({
      status: { $in: ['pending', 'under_review'] }
    });

    res.status(200).json({
      success: true,
      data: {
        ngos: pendingNGOs,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalPending / limit),
          totalItems: totalPending,
          hasNext: page < Math.ceil(totalPending / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    logger.error('Get pending KYC verifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
