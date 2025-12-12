import mongoose, { Document, Schema } from 'mongoose';

export interface ICertificate extends Document {
  _id: mongoose.Types.ObjectId;
  certificateId: string;
  recipient: mongoose.Types.ObjectId;
  issuedBy: mongoose.Types.ObjectId; // NGO
  certificateType: 'volunteer' | 'donor' | 'participant' | 'completion' | 'appreciation' | 'achievement';
  title: string;
  description: string;
  relatedTo: {
    type: 'program' | 'donation' | 'volunteer_work' | 'grant' | 'general';
    reference: mongoose.Types.ObjectId;
  };
  achievements?: {
    hoursCompleted?: number;
    sessionsAttended?: number;
    amountDonated?: number;
    impactMetrics?: {
      name: string;
      value: number;
      unit: string;
    }[];
  };
  validFrom: Date;
  validUntil?: Date;
  status: 'active' | 'expired' | 'revoked';
  templateUsed?: string;
  certificateUrl?: string;
  qrCodeUrl?: string;
  verificationCode: string;
  metadata: {
    digitalSignature?: string;
    issuerDetails: {
      name: string;
      position: string;
      organization: string;
    };
    recipientDetails: {
      name: string;
      email: string;
      phone?: string;
    };
  };
  downloadCount: number;
  sharedCount: number;
  verifiedCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const CertificateSchema: Schema = new Schema({  certificateId: {
    type: String,
    required: [true, 'Certificate ID is required'],
    uppercase: true,
    match: [/^CERT-[A-Z0-9]{8}$/, 'Invalid certificate ID format']
  },
  recipient: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Recipient is required']
  },
  issuedBy: {
    type: Schema.Types.ObjectId,
    ref: 'NGO',
    required: [true, 'Issuer NGO is required']
  },
  certificateType: {
    type: String,
    required: [true, 'Certificate type is required'],
    enum: ['volunteer', 'donor', 'participant', 'completion', 'appreciation', 'achievement']
  },
  title: {
    type: String,
    required: [true, 'Certificate title is required'],
    trim: true,
    maxLength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Certificate description is required'],
    trim: true,
    maxLength: [1000, 'Description cannot exceed 1000 characters']
  },
  relatedTo: {
    type: {
      type: String,
      required: [true, 'Related type is required'],
      enum: ['program', 'donation', 'volunteer_work', 'grant', 'general']
    },
    reference: {
      type: Schema.Types.ObjectId,
      required: [true, 'Related reference is required']
    }
  },
  achievements: {
    hoursCompleted: {
      type: Number,
      min: [0, 'Hours completed cannot be negative']
    },
    sessionsAttended: {
      type: Number,
      min: [0, 'Sessions attended cannot be negative']
    },
    amountDonated: {
      type: Number,
      min: [0, 'Amount donated cannot be negative']
    },
    impactMetrics: [{
      name: {
        type: String,
        required: [true, 'Metric name is required'],
        trim: true
      },
      value: {
        type: Number,
        required: [true, 'Metric value is required']
      },
      unit: {
        type: String,
        required: [true, 'Metric unit is required'],
        trim: true
      }
    }]
  },
  validFrom: {
    type: Date,
    required: [true, 'Valid from date is required'],
    default: Date.now
  },
  validUntil: {
    type: Date,
    validate: {
      validator: function(this: ICertificate, v: Date) {
        return !v || v > this.validFrom;
      },
      message: 'Valid until date must be after valid from date'
    }
  },
  status: {
    type: String,
    required: [true, 'Status is required'],
    enum: ['active', 'expired', 'revoked'],
    default: 'active'
  },
  templateUsed: {
    type: String,
    trim: true
  },
  certificateUrl: {
    type: String,
    validate: {
      validator: function(v: string) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'Certificate URL must be a valid URL'
    }
  },
  qrCodeUrl: {
    type: String,
    validate: {
      validator: function(v: string) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'QR code URL must be a valid URL'
    }
  },  verificationCode: {
    type: String,
    required: [true, 'Verification code is required'],
    uppercase: true,
    match: [/^[A-Z0-9]{12}$/, 'Invalid verification code format']
  },
  metadata: {
    digitalSignature: {
      type: String
    },
    issuerDetails: {
      name: {
        type: String,
        required: [true, 'Issuer name is required'],
        trim: true
      },
      position: {
        type: String,
        required: [true, 'Issuer position is required'],
        trim: true
      },
      organization: {
        type: String,
        required: [true, 'Organization name is required'],
        trim: true
      }
    },
    recipientDetails: {
      name: {
        type: String,
        required: [true, 'Recipient name is required'],
        trim: true
      },
      email: {
        type: String,
        required: [true, 'Recipient email is required'],
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
      },
      phone: {
        type: String,
        match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number']
      }
    }
  },
  downloadCount: {
    type: Number,
    default: 0,
    min: [0, 'Download count cannot be negative']
  },
  sharedCount: {
    type: Number,
    default: 0,
    min: [0, 'Shared count cannot be negative']
  },
  verifiedCount: {
    type: Number,
    default: 0,
    min: [0, 'Verified count cannot be negative']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
CertificateSchema.index({ certificateId: 1 }, { unique: true });
CertificateSchema.index({ verificationCode: 1 }, { unique: true });
CertificateSchema.index({ recipient: 1, certificateType: 1 });
CertificateSchema.index({ issuedBy: 1, status: 1 });
CertificateSchema.index({ 'relatedTo.type': 1, 'relatedTo.reference': 1 });
CertificateSchema.index({ validUntil: 1, status: 1 });

// Virtual for certificate age
CertificateSchema.virtual('ageInDays').get(function(this: ICertificate) {
  return Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24));
});

// Virtual for validity status
CertificateSchema.virtual('isValid').get(function(this: ICertificate) {
  if (this.status !== 'active') return false;
  if (this.validUntil && this.validUntil < new Date()) return false;
  return true;
});

// Pre-save middleware to generate IDs and codes
CertificateSchema.pre('save', function(this: ICertificate, next) {
  if (this.isNew) {
    // Generate certificate ID
    if (!this.certificateId) {
      this.certificateId = `CERT-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    }
    
    // Generate verification code
    if (!this.verificationCode) {
      this.verificationCode = Math.random().toString(36).substring(2, 14).toUpperCase();
    }
  }
  
  // Auto-expire check
  if (this.validUntil && this.validUntil < new Date() && this.status === 'active') {
    this.status = 'expired';
  }
  
  next();
});

// Static methods
CertificateSchema.statics.findByCertificateId = function(certificateId: string) {
  return this.findOne({ certificateId: certificateId.toUpperCase() })
    .populate('recipient', 'name email')
    .populate('issuedBy', 'name')
    .exec();
};

CertificateSchema.statics.verifyByCodes = function(certificateId: string, verificationCode: string) {
  return this.findOne({
    certificateId: certificateId.toUpperCase(),
    verificationCode: verificationCode.toUpperCase(),
    status: 'active'
  });
};

CertificateSchema.statics.getStatsByType = function(ngoId?: mongoose.Types.ObjectId) {
  const match: any = {};
  if (ngoId) match.issuedBy = ngoId;
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$certificateType',
        count: { $sum: 1 },
        totalDownloads: { $sum: '$downloadCount' },
        totalShares: { $sum: '$sharedCount' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

// Instance methods
CertificateSchema.methods.incrementDownload = function() {
  this.downloadCount++;
  return this.save();
};

CertificateSchema.methods.incrementShare = function() {
  this.sharedCount++;
  return this.save();
};

CertificateSchema.methods.incrementVerification = function() {
  this.verifiedCount++;
  return this.save();
};

export default mongoose.model<ICertificate>('Certificate', CertificateSchema);
