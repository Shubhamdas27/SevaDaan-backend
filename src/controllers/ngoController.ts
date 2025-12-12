import { Request, Response, NextFunction } from 'express';
import _multer from 'multer';
import NGO from '../models/NGO';
import User from '../models/User';
import { CustomError, asyncHandler } from '../middleware/errorMiddleware';
import { AuthRequest } from '../middleware/authMiddleware';
import { uploadToStorage } from '../services/uploadService';
import logger from '../utils/logger';

// @desc    Get all NGOs
// @route   GET /api/v1/ngos
// @access  Public
export const getNGOs = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = (page - 1) * limit;

  // Build query
  const query: any = { status: 'verified' };

  // Search filters
  if (req.query.search) {
    query.$text = { $search: req.query.search as string };
  }

  if (req.query.city) {
    query.city = new RegExp(req.query.city as string, 'i');
  }

  if (req.query.state) {
    query.state = new RegExp(req.query.state as string, 'i');
  }

  if (req.query.type) {
    query.type = req.query.type;
  }

  // For admin routes, include all statuses
  if (req.query.includeAll === 'true') {
    delete query.status;
  }

  try {
    const total = await NGO.countDocuments(query);
    const ngos = await NGO.find(query)
      .select('-documents -bankDetails -representative')
      .skip(offset)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: ngos,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    logger.error('Error fetching NGOs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch NGOs',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @desc    Get single NGO
// @route   GET /api/v1/ngos/:id
// @access  Public
export const getNGO = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const ngo = await NGO.findById(req.params.id)
    .populate('adminId', 'name email')
    .select('-documents -bankDetails -representative');

  if (!ngo) {
    return next(new CustomError('NGO not found', 404));
  }

  // Only show verified NGOs to public, unless user is admin/owner
  if (ngo.status !== 'verified' && req.query.admin !== 'true') {
    return next(new CustomError('NGO not found', 404));
  }

  res.json({
    success: true,
    data: ngo
  });
});

// @desc    Create NGO
// @route   POST /api/v1/ngos
// @access  Private (NGO Admin)
export const createNGO = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const userId = req.user?._id;

  if (!userId) {
    return next(new CustomError('User not authenticated', 401));
  }

  // Check if user already has an NGO
  const existingNGO = await NGO.findOne({ adminId: userId });
  if (existingNGO) {
    return next(new CustomError('User already has an NGO registered', 400));
  }

  // Extract NGO data from request body
  const {
    name,
    description,
    mission,
    vision,
    address,
    city,
    state,
    pincode,
    contactEmail,
    contactPhone,
    website,
    registrationNumber,
    registrationDate,
    type,
    legalStatus,
    operationalAreas,
    targetBeneficiaries,
    impactMetrics,
    socialLinks,
    mediaLinks,
    bankDetails,
    representative
  } = req.body;

  // Validate required fields
  const requiredFields = [
    'name', 'description', 'mission', 'vision', 'address', 'city', 'state', 
    'pincode', 'contactEmail', 'contactPhone', 'registrationNumber', 
    'registrationDate', 'type', 'legalStatus', 'targetBeneficiaries', 
    'impactMetrics', 'bankDetails', 'representative'
  ];

  for (const field of requiredFields) {
    if (!req.body[field]) {
      return next(new CustomError(`${field} is required`, 400));
    }
  }  // Handle file uploads
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  const documentUrls: any = {};

  try {
    // Upload required documents
    if (files.registrationCertificate) {
      documentUrls.registrationCertificateUrl = await uploadToStorage(
        files.registrationCertificate[0],
        'documents'
      );
    }

    if (files.panCard) {
      documentUrls.panCardUrl = await uploadToStorage(files.panCard[0], 'documents');
    }

    if (files.cancelledCheque) {
      bankDetails.cancelledChequeUrl = await uploadToStorage(
        files.cancelledCheque[0],
        'documents'
      );
    }

    // Upload optional documents
    if (files.taxExemptionCert) {
      documentUrls.taxExemptionCertUrl = await uploadToStorage(
        files.taxExemptionCert[0],
        'documents'
      );
    }

    if (files.fcraCertificate) {
      documentUrls.fcraCertificateUrl = await uploadToStorage(
        files.fcraCertificate[0],
        'documents'
      );
    }

    if (files.annualReport) {
      documentUrls.annualReportUrl = await uploadToStorage(
        files.annualReport[0],
        'documents'
      );
    }

    if (files.financialStatement) {
      documentUrls.financialStatementUrl = await uploadToStorage(
        files.financialStatement[0],
        'documents'
      );
    }

    // Upload logo if provided
    let logoUrl;
    if (files.logo) {
      logoUrl = await uploadToStorage(files.logo[0], 'images');
    }

    // Create NGO
    const ngo = await NGO.create({
      name,
      description,
      mission,
      vision,
      address,
      city,
      state,
      pincode,
      contactEmail,
      contactPhone,
      website,
      logo: logoUrl,
      registrationNumber,
      registrationDate: new Date(registrationDate),
      type,
      legalStatus,
      operationalAreas: Array.isArray(operationalAreas) ? operationalAreas : [operationalAreas],
      targetBeneficiaries,
      impactMetrics,
      socialLinks: socialLinks || {},
      mediaLinks: Array.isArray(mediaLinks) ? mediaLinks : [],
      bankDetails,
      representative,
      documents: documentUrls,
      status: 'pending',
      adminId: userId
    });

    // Update user's NGO ID and role
    await User.findByIdAndUpdate(userId, {
      ngoId: ngo._id,
      role: 'ngo_admin'
    });

    logger.info(`New NGO created: ${name} by user ${req.user?.email}`);

    res.status(201).json({
      success: true,
      data: {
        id: ngo._id,
        name: ngo.name,
        status: ngo.status,
        message: 'NGO registration submitted successfully. It will be reviewed by our team.'
      }
    });
  } catch (uploadError) {
    logger.error('Error uploading files during NGO creation:', uploadError);
    return next(new CustomError('Error uploading documents. Please try again.', 500));
  }
});

// @desc    Update NGO
// @route   PUT /api/v1/ngos/:id
// @access  Private (NGO Admin/Super Admin)
export const updateNGO = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const ngo = await NGO.findById(req.params.id);

  if (!ngo) {
    return next(new CustomError('NGO not found', 404));
  }

  // Check permissions
  if (req.user?.role !== 'ngo' && ngo.adminId.toString() !== req.user?._id.toString()) {
    return next(new CustomError('Access denied', 403));
  }
  // Handle file uploads if any
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  const updateData = { ...req.body };

  try {
    // Upload new logo if provided
    if (files.logo) {
      updateData.logo = await uploadToStorage(files.logo[0], 'images');
    }

    // Upload new cover image if provided
    if (files.coverImage) {
      updateData.coverImage = await uploadToStorage(files.coverImage[0], 'images');
    }

    const updatedNGO = await NGO.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    });

    logger.info(`NGO updated: ${updatedNGO?.name} by user ${req.user?.email}`);

    res.json({
      success: true,
      data: updatedNGO
    });
  } catch (uploadError) {
    logger.error('Error uploading files during NGO update:', uploadError);
    return next(new CustomError('Error uploading files. Please try again.', 500));
  }
});

// @desc    Delete NGO
// @route   DELETE /api/v1/ngos/:id
// @access  Private (Super Admin only)
export const deleteNGO = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const ngo = await NGO.findById(req.params.id);

  if (!ngo) {
    return next(new CustomError('NGO not found', 404));
  }

  await NGO.findByIdAndDelete(req.params.id);

  // Update associated user
  await User.findByIdAndUpdate(ngo.adminId, {
    ngoId: undefined,
    role: 'citizen'
  });

  logger.info(`NGO deleted: ${ngo.name} by user ${req.user?.email}`);

  res.json({
    success: true,
    message: 'NGO deleted successfully'
  });
});

// @desc    Verify NGO
// @route   PATCH /api/v1/ngos/:id/verify
// @access  Private (Super Admin only)
export const verifyNGO = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { status, notes } = req.body;

  if (!['verified', 'rejected'].includes(status)) {
    return next(new CustomError('Status must be either verified or rejected', 400));
  }

  const ngo = await NGO.findById(req.params.id);

  if (!ngo) {
    return next(new CustomError('NGO not found', 404));
  }

  const updateData: any = {
    status,
    verificationNotes: notes
  };

  if (status === 'verified') {
    updateData.isVerified = true;
    updateData.verificationDate = new Date();
  } else {
    updateData.rejectionReason = notes;
  }

  const updatedNGO = await NGO.findByIdAndUpdate(req.params.id, updateData, {
    new: true
  });

  logger.info(`NGO ${status}: ${ngo.name} by admin ${req.user?.email}`);

  res.json({
    success: true,
    data: updatedNGO,
    message: `NGO ${status} successfully`
  });
});

// @desc    Get NGO status
// @route   GET /api/v1/ngos/status/:id
// @access  Private (NGO Admin)
export const getNGOStatus = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const ngo = await NGO.findById(req.params.id).select(
    'name status isVerified verificationDate verificationNotes rejectionReason createdAt'
  );

  if (!ngo) {
    return next(new CustomError('NGO not found', 404));
  }

  // Check permissions
  if (req.user?.role !== 'ngo' && ngo.adminId.toString() !== req.user?._id.toString()) {
    return next(new CustomError('Access denied', 403));
  }

  res.json({
    success: true,
    data: ngo
  });
});

// @desc    Search NGOs
// @route   GET /api/v1/ngos/search
// @access  Public
export const searchNGOs = asyncHandler(async (req: Request, res: Response) => {
  const { q, city, state, type, limit = 10 } = req.query;

  const query: any = { status: 'verified' };

  if (q) {
    query.$or = [
      { name: { $regex: q as string, $options: 'i' } },
      { description: { $regex: q as string, $options: 'i' } },
      { operationalAreas: { $in: [new RegExp(q as string, 'i')] } }
    ];
  }

  if (city) {
    query.city = new RegExp(city as string, 'i');
  }

  if (state) {
    query.state = new RegExp(state as string, 'i');
  }

  if (type) {
    query.type = type;
  }

  const ngos = await NGO.find(query)
    .select('name description city state logo totalDonations donorCount')
    .limit(parseInt(limit as string))
    .sort({ totalDonations: -1 });

  res.json({
    success: true,
    data: ngos
  });
});

// @desc    Get NGO by slug for public page
// @route   GET /api/v1/ngos/public/:slug
// @access  Public
export const getNGOBySlugPublic = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;

  try {
    // Find NGO by name (slug) - case insensitive search
    const ngo = await NGO.findOne({ 
      name: new RegExp(slug.replace(/-/g, ' '), 'i'),
      status: 'verified',
      isVerified: true
    }).select('-documents.panCardUrl -documents.registrationCertificateUrl -bankDetails.accountNumber -bankDetails.ifscCode -representative.idNumber');

    if (!ngo) {
      throw new CustomError('NGO not found', 404);
    }

    // Get active programs for this NGO
    const Program = require('../models/Program').default;
    const activePrograms = await Program.find({ 
      ngo: ngo._id, 
      status: 'active' 
    }).select('title description shortDescription targetAmount raisedAmount volunteersNeeded volunteersRegistered startDate endDate category status featured images');

    res.status(200).json({
      success: true,
      data: {
        ngo,
        activePrograms
      }
    });
  } catch (error) {
    logger.error('Error fetching NGO by slug:', error);
    throw error;
  }
});
