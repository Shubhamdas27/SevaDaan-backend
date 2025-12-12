import mongoose, { Schema } from 'mongoose';
import { INGO } from '../types';

const ngoSchema = new Schema<INGO>({
  name: {
    type: String,
    required: [true, 'NGO name is required'],
    trim: true,
    maxlength: [200, 'NGO name cannot be more than 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [2000, 'Description cannot be more than 2000 characters']
  },
  mission: {
    type: String,
    required: [true, 'Mission statement is required'],
    trim: true,
    maxlength: [1000, 'Mission cannot be more than 1000 characters']
  },
  vision: {
    type: String,
    required: [true, 'Vision statement is required'],
    trim: true,
    maxlength: [1000, 'Vision cannot be more than 1000 characters']
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true
  },
  state: {
    type: String,
    required: [true, 'State is required'],
    trim: true
  },
  pincode: {
    type: String,
    required: [true, 'Pincode is required'],
    match: [/^\d{6}$/, 'Please enter a valid pincode']
  },
  contactEmail: {
    type: String,
    required: [true, 'Contact email is required'],
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email'
    ]
  },
  contactPhone: {
    type: String,
    required: [true, 'Contact phone is required'],
    match: [/^[6-9]\d{9}$/, 'Please enter a valid phone number']
  },
  website: {
    type: String,
    match: [/^https?:\/\/.+/, 'Please enter a valid website URL']
  },
  logo: String,
  coverImage: String,  registrationNumber: {
    type: String,
    required: [true, 'Registration number is required'],
    trim: true
  },
  registrationDate: {
    type: Date,
    required: [true, 'Registration date is required']
  },
  type: {
    type: String,
    enum: ['trust', 'society', 'section8'],
    required: [true, 'NGO type is required']
  },
  legalStatus: {
    type: String,
    required: [true, 'Legal status is required'],
    trim: true
  },
  operationalAreas: [{
    type: String,
    trim: true
  }],
  targetBeneficiaries: {
    type: String,
    required: [true, 'Target beneficiaries description is required'],
    trim: true
  },
  impactMetrics: {
    type: String,
    required: [true, 'Impact metrics description is required'],
    trim: true
  },
  
  // Social Media Links
  socialLinks: {
    facebook: {
      type: String,
      match: [/^https?:\/\/(www\.)?facebook\.com\/.+/, 'Please enter a valid Facebook URL']
    },
    twitter: {
      type: String,
      match: [/^https?:\/\/(www\.)?twitter\.com\/.+/, 'Please enter a valid Twitter URL']
    },
    instagram: {
      type: String,
      match: [/^https?:\/\/(www\.)?instagram\.com\/.+/, 'Please enter a valid Instagram URL']
    },
    linkedin: {
      type: String,
      match: [/^https?:\/\/(www\.)?linkedin\.com\/.+/, 'Please enter a valid LinkedIn URL']
    }
  },
  mediaLinks: [{
    type: String,
    match: [/^https?:\/\/.+/, 'Please enter a valid URL']
  }],
  
  // Bank Details
  bankDetails: {
    accountName: {
      type: String,
      required: [true, 'Bank account name is required'],
      trim: true
    },
    bankName: {
      type: String,
      required: [true, 'Bank name is required'],
      trim: true
    },
    accountNumber: {
      type: String,
      required: [true, 'Account number is required'],
      trim: true
    },
    ifscCode: {
      type: String,
      required: [true, 'IFSC code is required'],
      match: [/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Please enter a valid IFSC code']
    },
    cancelledChequeUrl: String
  },
  
  // Representative Details
  representative: {
    name: {
      type: String,
      required: [true, 'Representative name is required'],
      trim: true
    },
    designation: {
      type: String,
      required: [true, 'Representative designation is required'],
      trim: true
    },
    phone: {
      type: String,
      required: [true, 'Representative phone is required'],
      match: [/^[6-9]\d{9}$/, 'Please enter a valid phone number']
    },
    email: {
      type: String,
      required: [true, 'Representative email is required'],
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please enter a valid email'
      ]
    },
    idType: {
      type: String,
      enum: ['aadhaar', 'pan', 'passport'],
      required: [true, 'ID type is required']
    },
    idNumber: {
      type: String,
      required: [true, 'ID number is required'],
      trim: true
    }
  },
  
  // Documents
  documents: {
    registrationCertificateUrl: {
      type: String,
      required: [true, 'Registration certificate is required']
    },
    panCardUrl: {
      type: String,
      required: [true, 'PAN card is required']
    },
    taxExemptionCertUrl: String,
    fcraCertificateUrl: String,
    annualReportUrl: String,
    financialStatementUrl: String
  },
  
  // Status and Verification
  status: {
    type: String,
    enum: ['draft', 'pending', 'under_review', 'verified', 'rejected'],
    default: 'draft'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationDate: Date,
  verificationNotes: String,
  rejectionReason: String,
  
  // Metrics
  totalDonations: {
    type: Number,
    default: 0,
    min: 0
  },
  donorCount: {
    type: Number,
    default: 0,
    min: 0
  },
  volunteerCount: {
    type: Number,
    default: 0,
    min: 0
  },
  programCount: {
    type: Number,
    default: 0,
    min: 0
  },
  beneficiariesServed: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Created by admin user
  adminId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Admin ID is required']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
ngoSchema.index({ name: 'text', description: 'text' });
ngoSchema.index({ city: 1, state: 1 });
ngoSchema.index({ status: 1 });
ngoSchema.index({ isVerified: 1 });
ngoSchema.index({ registrationNumber: 1 }, { unique: true });
ngoSchema.index({ adminId: 1 });
ngoSchema.index({ 'representative.email': 1 });

// Virtual for programs
ngoSchema.virtual('programs', {
  ref: 'Program',
  localField: '_id',
  foreignField: 'ngoId'
});

// Virtual for donations
ngoSchema.virtual('donations', {
  ref: 'Donation',
  localField: '_id',
  foreignField: 'ngoId'
});

// Virtual for volunteers
ngoSchema.virtual('volunteers', {
  ref: 'VolunteerApplication',
  localField: '_id',
  foreignField: 'ngoId'
});

export default mongoose.model<INGO>('NGO', ngoSchema);
