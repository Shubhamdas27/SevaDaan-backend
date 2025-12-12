import { Request, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';
import { CustomError } from './errorMiddleware';

export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg);
    return next(new CustomError(errorMessages.join(', '), 400));
  }
  
  next();
};

// Program validation rules
export const validateCreateProgram = [
  body('title')
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('description')
    .isLength({ min: 1, max: 5000 })
    .withMessage('Description must be between 1 and 5000 characters'),
  body('shortDescription')
    .isLength({ min: 1, max: 500 })
    .withMessage('Short description must be between 1 and 500 characters'),
  body('category')
    .isIn([
      'education', 'healthcare', 'environment', 'poverty-alleviation',
      'women-empowerment', 'child-welfare', 'elderly-care', 'disaster-relief',
      'animal-welfare', 'rural-development', 'skill-development', 'water-sanitation', 'other'
    ])
    .withMessage('Invalid category'),
  body('targetAmount')
    .isFloat({ min: 0 })
    .withMessage('Target amount must be a positive number'),
  body('startDate')
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  body('endDate')
    .isISO8601()
    .withMessage('End date must be a valid date')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  body('location.address')
    .isLength({ min: 1 })
    .withMessage('Address is required'),
  body('location.city')
    .isLength({ min: 1 })
    .withMessage('City is required'),
  body('location.state')
    .isLength({ min: 1 })
    .withMessage('State is required'),
  body('location.pincode')
    .matches(/^\d{6}$/)
    .withMessage('Pincode must be a 6-digit number'),
  body('beneficiariesCount')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Beneficiaries count must be a non-negative integer'),
  body('volunteersNeeded')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Volunteers needed must be a non-negative integer'),
  validateRequest
];

export const validateUpdateProgram = [
  body('title')
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('description')
    .optional()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Description must be between 1 and 5000 characters'),
  body('shortDescription')
    .optional()
    .isLength({ min: 1, max: 500 })
    .withMessage('Short description must be between 1 and 500 characters'),
  body('category')
    .optional()
    .isIn([
      'education', 'healthcare', 'environment', 'poverty-alleviation',
      'women-empowerment', 'child-welfare', 'elderly-care', 'disaster-relief',
      'animal-welfare', 'rural-development', 'skill-development', 'water-sanitation', 'other'
    ])
    .withMessage('Invalid category'),
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date'),
  body('status')
    .optional()
    .isIn(['draft', 'active', 'completed', 'suspended', 'cancelled'])
    .withMessage('Invalid status'),
  validateRequest
];

export const validateProgramUpdate = [
  body('title')
    .isLength({ min: 1, max: 200 })
    .withMessage('Update title must be between 1 and 200 characters'),
  body('description')
    .isLength({ min: 1, max: 2000 })
    .withMessage('Update description must be between 1 and 2000 characters'),
  validateRequest
];

// Donation validation rules
export const validateCreateDonation = [
  body('amount')
    .isFloat({ min: 1 })
    .withMessage('Donation amount must be greater than 0'),
  body('currency')
    .optional()
    .isIn(['INR', 'USD'])
    .withMessage('Currency must be INR or USD'),
  body('donorName')
    .isLength({ min: 1, max: 100 })
    .withMessage('Donor name must be between 1 and 100 characters'),
  body('donorEmail')
    .isEmail()
    .withMessage('Valid email is required'),
  body('donorPhone')
    .optional()
    .matches(/^[+]?[\d\s-()]+$/)
    .withMessage('Invalid phone number format'),
  body('isAnonymous')
    .optional()
    .isBoolean()
    .withMessage('isAnonymous must be a boolean'),
  body('message')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Message cannot exceed 500 characters'),
  validateRequest
];

// Volunteer validation rules
export const validateVolunteerRegistration = [
  body('programId')
    .isMongoId()
    .withMessage('Invalid program ID'),
  body('skills')
    .isArray({ min: 1 })
    .withMessage('At least one skill is required'),
  body('availability')
    .isObject()
    .withMessage('Availability information is required'),
  body('motivation')
    .isLength({ min: 10, max: 1000 })
    .withMessage('Motivation must be between 10 and 1000 characters'),
  validateRequest
];

// Grant validation rules
export const validateGrantRequest = [
  body('title')
    .isLength({ min: 1, max: 200 })
    .withMessage('Grant title must be between 1 and 200 characters'),
  body('description')
    .isLength({ min: 1, max: 5000 })
    .withMessage('Grant description must be between 1 and 5000 characters'),
  body('requestedAmount')
    .isFloat({ min: 1 })
    .withMessage('Requested amount must be greater than 0'),
  body('category')
    .isLength({ min: 1 })
    .withMessage('Category is required'),
  body('duration')
    .isInt({ min: 1, max: 60 })
    .withMessage('Duration must be between 1 and 60 months'),
  validateRequest
];

// Contact validation rules
export const validateContactMessage = [
  body('name')
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
  body('email')
    .isEmail()
    .withMessage('Valid email is required'),
  body('subject')
    .isLength({ min: 1, max: 200 })
    .withMessage('Subject must be between 1 and 200 characters'),
  body('message')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Message must be between 10 and 2000 characters'),
  validateRequest
];

// Contact validation rules
export const validateContact = [
  body('name')
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
  body('email')
    .isEmail()
    .withMessage('Email must be valid'),
  body('phone')
    .optional()
    .matches(/^[0-9]{10}$/)
    .withMessage('Phone must be a valid 10-digit number'),
  body('subject')
    .isLength({ min: 5, max: 200 })
    .withMessage('Subject must be between 5 and 200 characters'),
  body('message')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Message must be between 10 and 2000 characters'),
  body('type')
    .optional()
    .isIn(['general', 'support', 'partnership', 'feedback', 'complaint'])
    .withMessage('Type must be one of: general, support, partnership, feedback, complaint'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be one of: low, medium, high'),
  body('attachmentUrls')
    .optional()
    .isArray()
    .withMessage('Attachment URLs must be an array'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  validateRequest
];

// Testimonial validation rules
export const validateTestimonial = [
  body('ngo')
    .isMongoId()
    .withMessage('Valid NGO ID is required'),
  body('name')
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
  body('designation')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Designation cannot exceed 100 characters'),
  body('company')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Company cannot exceed 100 characters'),
  body('message')
    .isLength({ min: 10, max: 1000 })
    .withMessage('Message must be between 10 and 1000 characters'),
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('image')
    .optional()
    .isURL()
    .withMessage('Image must be a valid URL'),
  body('program')
    .optional()
    .isMongoId()
    .withMessage('Program must be a valid ID'),
  body('contactEmail')
    .optional()
    .isEmail()
    .withMessage('Contact email must be valid'),
  body('location')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Location cannot exceed 100 characters'),
  validateRequest
];

export const validateTestimonialUpdate = [
  body('name')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
  body('designation')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Designation cannot exceed 100 characters'),
  body('company')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Company cannot exceed 100 characters'),
  body('message')
    .optional()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Message must be between 10 and 1000 characters'),
  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('image')
    .optional()
    .isURL()
    .withMessage('Image must be a valid URL'),
  body('contactEmail')
    .optional()
    .isEmail()
    .withMessage('Contact email must be valid'),
  body('location')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Location cannot exceed 100 characters'),
  validateRequest
];

// Emergency help validation rules
export const validateEmergencyRequest = [
  body('name')
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
  body('phone')
    .matches(/^[0-9]{10}$/)
    .withMessage('Phone must be a valid 10-digit number'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Email must be valid'),
  body('emergencyType')
    .isIn(['medical', 'disaster', 'food', 'shelter', 'education', 'other'])
    .withMessage('Emergency type must be one of: medical, disaster, food, shelter, education, other'),
  body('urgencyLevel')
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Urgency level must be one of: low, medium, high, critical'),
  body('description')
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  body('location.address')
    .isLength({ min: 5, max: 200 })
    .withMessage('Address must be between 5 and 200 characters'),
  body('location.city')
    .isLength({ min: 2, max: 50 })
    .withMessage('City must be between 2 and 50 characters'),
  body('location.state')
    .isLength({ min: 2, max: 50 })
    .withMessage('State must be between 2 and 50 characters'),
  body('location.pincode')
    .matches(/^[0-9]{6}$/)
    .withMessage('Pincode must be a valid 6-digit number'),
  body('helpNeeded')
    .optional()
    .isArray()
    .withMessage('Help needed must be an array'),
  body('estimatedCost')
    .optional()
    .isNumeric()
    .withMessage('Estimated cost must be a number'),
  body('attachmentUrls')
    .optional()
    .isArray()
    .withMessage('Attachment URLs must be an array'),
  validateRequest
];

export const validateEmergencyUpdate = [
  body('resolution.description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Resolution description cannot exceed 500 characters'),
  body('resolution.helpProvided')
    .optional()
    .isArray()
    .withMessage('Help provided must be an array'),
  body('resolution.costIncurred')
    .optional()
    .isNumeric()
    .withMessage('Cost incurred must be a number'),
  body('resolution.volunteersInvolved')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Volunteers involved must be a non-negative integer'),
  body('resolution.feedback')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Feedback cannot exceed 1000 characters'),
  validateRequest
];

// User profile validation rules
export const validateUserProfile = [
  body('fullName')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Full name must be between 1 and 100 characters'),
  body('phone')
    .optional()
    .matches(/^[+]?[\d\s-()]+$/)
    .withMessage('Invalid phone number format'),
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Date of birth must be a valid date'),
  body('address.street')
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage('Street address cannot exceed 200 characters'),
  body('address.city')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('City cannot exceed 100 characters'),
  body('address.state')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('State cannot exceed 100 characters'),
  body('address.pincode')
    .optional()
    .matches(/^\d{6}$/)
    .withMessage('Pincode must be a 6-digit number'),
  validateRequest
];

// Notice validation rules
export const validateNotice = [
  body('ngoId')
    .isMongoId()
    .withMessage('Valid NGO ID is required'),
  body('title')
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('content')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Content must be between 10 and 2000 characters'),
  body('type')
    .optional()
    .isIn(['announcement', 'event', 'urgent', 'general'])
    .withMessage('Type must be one of: announcement, event, urgent, general'),
  body('isHighlighted')
    .optional()
    .isBoolean()
    .withMessage('Highlighted status must be a boolean'),
  body('expiryDate')
    .optional()
    .isISO8601()
    .withMessage('Expiry date must be a valid date'),
  body('attachmentUrls')
    .optional()
    .isArray()
    .withMessage('Attachment URLs must be an array'),
  body('attachmentUrls.*')
    .optional()
    .isURL()
    .withMessage('Each attachment URL must be valid'),
  validateRequest
];

export const validateNoticeUpdate = [
  body('title')
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('content')
    .optional()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Content must be between 10 and 2000 characters'),
  body('type')
    .optional()
    .isIn(['announcement', 'event', 'urgent', 'general'])
    .withMessage('Type must be one of: announcement, event, urgent, general'),
  body('isHighlighted')
    .optional()
    .isBoolean()
    .withMessage('Highlighted status must be a boolean'),
  body('expiryDate')
    .optional()
    .isISO8601()
    .withMessage('Expiry date must be a valid date'),
  body('attachmentUrls')
    .optional()
    .isArray()
    .withMessage('Attachment URLs must be an array'),
  body('attachmentUrls.*')
    .optional()
    .isURL()
    .withMessage('Each attachment URL must be valid'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('Active status must be a boolean'),
  validateRequest
];

// Referral validation rules
export const validateReferral = [
  body('referralType')
    .isIn(['ngo', 'program', 'volunteer_opportunity', 'grant'])
    .withMessage('Referral type must be one of: ngo, program, volunteer_opportunity, grant'),
  body('referredTo')
    .isMongoId()
    .withMessage('Referred to must be a valid ID'),
  body('beneficiary.name')
    .isLength({ min: 1, max: 100 })
    .withMessage('Beneficiary name must be between 1 and 100 characters'),
  body('beneficiary.phone')
    .matches(/^[0-9]{10}$/)
    .withMessage('Phone number must be 10 digits'),
  body('beneficiary.email')
    .optional()
    .isEmail()
    .withMessage('Email must be valid'),
  body('beneficiary.address')
    .isLength({ min: 1, max: 500 })
    .withMessage('Address must be between 1 and 500 characters'),
  body('beneficiary.needDescription')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Need description must be between 1 and 1000 characters'),
  body('beneficiary.urgencyLevel')
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Urgency level must be one of: low, medium, high, critical'),
  body('category')
    .isIn(['education', 'healthcare', 'emergency', 'food', 'shelter', 'employment', 'legal-aid', 'counseling', 'financial-assistance', 'skill-development', 'other'])
    .withMessage('Invalid category'),
  body('description')
    .isLength({ min: 1, max: 2000 })
    .withMessage('Description must be between 1 and 2000 characters'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Priority must be one of: low, medium, high, urgent'),
  validateRequest
];

export const validateFollowUp = [
  body('note')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Note must be between 1 and 1000 characters'),
  validateRequest
];

export const validateAssignment = [
  body('assignedTo')
    .isMongoId()
    .withMessage('Assigned to must be a valid user ID'),
  validateRequest
];

// Certificate validation rules
export const validateCertificate = [
  body('recipient')
    .isMongoId()
    .withMessage('Recipient must be a valid user ID'),
  body('certificateType')
    .isIn(['volunteer', 'donor', 'participant', 'completion', 'appreciation', 'achievement'])
    .withMessage('Certificate type must be valid'),
  body('title')
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('description')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Description must be between 1 and 1000 characters'),
  body('relatedTo.type')
    .isIn(['program', 'donation', 'volunteer_work', 'grant', 'general'])
    .withMessage('Related type must be valid'),
  body('relatedTo.reference')
    .isMongoId()
    .withMessage('Related reference must be a valid ID'),
  validateRequest
];

// Program registration validation rules
export const validateProgramRegistration = [
  body('program')
    .isMongoId()
    .withMessage('Program must be a valid ID'),
  body('registrationType')
    .isIn(['volunteer', 'beneficiary', 'participant'])
    .withMessage('Registration type must be one of: volunteer, beneficiary, participant'),
  body('applicationData.motivation')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Motivation cannot exceed 1000 characters'),
  body('applicationData.experience')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Experience cannot exceed 1000 characters'),
  body('applicationData.specialRequirements')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Special requirements cannot exceed 500 characters'),
  validateRequest
];

// ==================== CONTENT MANAGEMENT VALIDATION ====================

// Announcement validation rules
export const validateCreateAnnouncement = [
  body('title')
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters')
    .trim(),
  body('content')
    .isLength({ min: 1, max: 5000 })
    .withMessage('Content must be between 1 and 5000 characters')
    .trim(),
  body('type')
    .optional()
    .isIn(['general', 'urgent', 'event', 'service'])
    .withMessage('Type must be one of: general, urgent, event, service'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be one of: low, medium, high'),
  body('targetAudience')
    .optional()
    .isArray()
    .withMessage('Target audience must be an array')
    .custom((value) => {
      const validAudiences = ['all', 'volunteer', 'donor', 'citizen', 'staff', 'beneficiary'];
      const invalidAudiences = value.filter((audience: string) => !validAudiences.includes(audience));
      if (invalidAudiences.length > 0) {
        throw new Error(`Invalid target audience: ${invalidAudiences.join(', ')}`);
      }
      return true;
    }),
  body('expiryDate')
    .optional()
    .isISO8601()
    .withMessage('Expiry date must be a valid date')
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error('Expiry date must be in the future');
      }
      return true;
    }),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
    .custom((value) => {
      if (value.length > 10) {
        throw new Error('Maximum 10 tags allowed');
      }
      return true;
    }),
  validateRequest
];

export const validateUpdateAnnouncement = [
  param('id')
    .isMongoId()
    .withMessage('Invalid announcement ID'),
  body('title')
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters')
    .trim(),
  body('content')
    .optional()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Content must be between 1 and 5000 characters')
    .trim(),
  body('type')
    .optional()
    .isIn(['general', 'urgent', 'event', 'service'])
    .withMessage('Type must be one of: general, urgent, event, service'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be one of: low, medium, high'),
  body('targetAudience')
    .optional()
    .isArray()
    .withMessage('Target audience must be an array'),
  body('expiryDate')
    .optional()
    .isISO8601()
    .withMessage('Expiry date must be a valid date')
    .custom((value) => {
      if (value && new Date(value) <= new Date()) {
        throw new Error('Expiry date must be in the future');
      }
      return true;
    }),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  validateRequest
];

// Content template validation
export const validateCreateContentTemplate = [
  body('name')
    .isLength({ min: 1, max: 100 })
    .withMessage('Template name must be between 1 and 100 characters')
    .trim(),
  body('type')
    .isIn(['announcement', 'email', 'page', 'notification'])
    .withMessage('Type must be one of: announcement, email, page, notification'),
  body('templateData')
    .isObject()
    .withMessage('Template data must be an object')
    .custom((value) => {
      if (!value.title && !value.content) {
        throw new Error('Template data must contain at least title or content');
      }
      return true;
    }),
  validateRequest
];

// NGO content validation
export const validateUpdateNGOContent = [
  body('description')
    .optional()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Description must be between 1 and 2000 characters')
    .trim(),
  body('mission')
    .optional()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Mission must be between 1 and 1000 characters')
    .trim(),
  body('vision')
    .optional()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Vision must be between 1 and 1000 characters')
    .trim(),
  body('website')
    .optional()
    .isURL()
    .withMessage('Website must be a valid URL'),
  body('operationalAreas')
    .optional()
    .isArray()
    .withMessage('Operational areas must be an array'),
  body('targetBeneficiaries')
    .optional()
    .isArray()
    .withMessage('Target beneficiaries must be an array'),
  validateRequest
];

// Batch operations validation
export const validateBatchUpdateAnnouncements = [
  body('announcementIds')
    .isArray({ min: 1 })
    .withMessage('Announcement IDs must be a non-empty array')
    .custom((value) => {
      const invalidIds = value.filter((id: string) => !/^[0-9a-fA-F]{24}$/.test(id));
      if (invalidIds.length > 0) {
        throw new Error('All announcement IDs must be valid MongoDB ObjectIds');
      }
      return true;
    }),
  body('updates')
    .isObject()
    .withMessage('Updates must be an object')
    .custom((value) => {
      const allowedFields = ['priority', 'type', 'targetAudience', 'tags', 'isActive'];
      const invalidFields = Object.keys(value).filter(field => !allowedFields.includes(field));
      if (invalidFields.length > 0) {
        throw new Error(`Invalid update fields: ${invalidFields.join(', ')}`);
      }
      return true;
    }),
  validateRequest
];

// Schedule announcement validation
export const validateScheduleAnnouncement = [
  body('title')
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters')
    .trim(),
  body('content')
    .isLength({ min: 1, max: 5000 })
    .withMessage('Content must be between 1 and 5000 characters')
    .trim(),
  body('scheduledDate')
    .isISO8601()
    .withMessage('Scheduled date must be a valid date')
    .custom((value) => {
      const scheduledDate = new Date(value);
      const now = new Date();
      const minFutureTime = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now
      
      if (scheduledDate <= minFutureTime) {
        throw new Error('Scheduled date must be at least 5 minutes in the future');
      }
      return true;
    }),
  body('type')
    .optional()
    .isIn(['general', 'urgent', 'event', 'service'])
    .withMessage('Type must be one of: general, urgent, event, service'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be one of: low, medium, high'),
  body('expiryDate')
    .optional()
    .isISO8601()
    .withMessage('Expiry date must be a valid date')
    .custom((value, { req }) => {
      if (value && new Date(value) <= new Date(req.body.scheduledDate)) {
        throw new Error('Expiry date must be after scheduled date');
      }
      return true;
    }),
  validateRequest
];

// SEO metadata validation
export const validateSEOMetadata = [
  body('metaTitle')
    .optional()
    .isLength({ min: 1, max: 70 })
    .withMessage('Meta title must be between 1 and 70 characters')
    .trim(),
  body('metaDescription')
    .optional()
    .isLength({ min: 1, max: 160 })
    .withMessage('Meta description must be between 1 and 160 characters')
    .trim(),
  body('keywords')
    .optional()
    .isArray()
    .withMessage('Keywords must be an array')
    .custom((value) => {
      if (value.length > 10) {
        throw new Error('Maximum 10 keywords allowed');
      }
      return true;
    }),
  body('ogTitle')
    .optional()
    .isLength({ min: 1, max: 70 })
    .withMessage('OpenGraph title must be between 1 and 70 characters')
    .trim(),
  body('ogDescription')
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage('OpenGraph description must be between 1 and 200 characters')
    .trim(),
  body('ogImage')
    .optional()
    .isURL()
    .withMessage('OpenGraph image must be a valid URL'),
  body('schema')
    .optional()
    .isObject()
    .withMessage('Schema must be an object'),
  validateRequest
];

// Homepage content validation
export const validateHomepageContent = [
  body('featuredPrograms')
    .optional()
    .isArray()
    .withMessage('Featured programs must be an array')
    .custom((value) => {
      if (value.length > 6) {
        throw new Error('Maximum 6 featured programs allowed');
      }
      return true;
    }),
  body('heroSection')
    .optional()
    .isObject()
    .withMessage('Hero section must be an object'),
  body('heroSection.title')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Hero title must be between 1 and 100 characters')
    .trim(),
  body('heroSection.subtitle')
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage('Hero subtitle must be between 1 and 200 characters')
    .trim(),
  body('aboutSection')
    .optional()
    .isObject()
    .withMessage('About section must be an object'),
  body('testimonialIds')
    .optional()
    .isArray()
    .withMessage('Testimonial IDs must be an array'),
  validateRequest
];

// Approval workflow validation
export const validateApprovalAction = [
  param('id')
    .isMongoId()
    .withMessage('Invalid announcement ID'),
  body('action')
    .isIn(['approve', 'reject'])
    .withMessage('Action must be either approve or reject'),
  body('comments')
    .optional()
    .isLength({ min: 1, max: 500 })
    .withMessage('Comments must be between 1 and 500 characters')
    .trim(),
  validateRequest
];

// File upload validation
export const validateFileUpload = (req: Request, res: Response, next: NextFunction) => {
  if (!req.file) {
    return next(new CustomError('No file uploaded', 400));
  }

  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(req.file.mimetype)) {
    return next(new CustomError('Invalid file type. Only images are allowed.', 400));
  }

  const maxSize = 5 * 1024 * 1024; // 5MB
  if (req.file.size > maxSize) {
    return next(new CustomError('File size too large. Maximum 5MB allowed.', 400));
  }

  next();
};

// Export data validation
export const validateExportParams = [
  body('format')
    .optional()
    .isIn(['json', 'csv'])
    .withMessage('Format must be either json or csv'),
  body('includeArchived')
    .optional()
    .isBoolean()
    .withMessage('includeArchived must be a boolean'),
  validateRequest
];

// Pagination validation
export const validatePagination = [
  body('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  body('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  validateRequest
];

// Generic ID validation
export const validateObjectId = (paramName: string = 'id') => [
  param(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName}`),
  validateRequest
];
