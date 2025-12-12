import mongoose, { Document, Schema } from 'mongoose';

export interface IDonation extends Document {
  _id: mongoose.Types.ObjectId;
  donor: mongoose.Types.ObjectId;
  program: mongoose.Types.ObjectId;
  ngo: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId; // Adding user field
  amount: number;
  currency: string;
  donorName: string;
  donorEmail: string;
  donorPhone?: string;
  isAnonymous: boolean;
  message?: string;
  paymentMethod: 'razorpay' | 'stripe' | 'paypal' | 'bank_transfer' | 'cash' | 'other';
  paymentStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled'; // Adding status field
  paymentId?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  transactionId?: string;
  receiptNumber: string;
  receiptUrl?: string;
  certificateUrl?: string;
  taxBenefit: {
    eligible: boolean;
    section: '80G' | 'CSR' | 'other';
    percentage: number;
    certificateGenerated: boolean;
  };
  refund?: {
    amount: number;
    reason: string;
    status: 'pending' | 'processed' | 'failed';
    processedAt?: Date;
    refundId?: string;
  };
  refundDetails?: { // Adding refundDetails field
    amount: number;
    reason: string;
    status: 'pending' | 'processed' | 'failed';
    processedAt?: Date;
    refundId?: string;
  };
  metadata: {
    ipAddress?: string;
    userAgent?: string;
    source: 'web' | 'mobile' | 'api' | 'admin';
    campaign?: string;
    referrer?: string;
  };
  notes?: string;
  internalNotes?: string;
  createdAt: Date;
  updatedAt: Date;
  isNew: boolean;
  isRefundable(): boolean;
  calculatePlatformFee(): number;
}

const DonationSchema: Schema = new Schema({
  donor: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: function(this: IDonation) {
      return !this.isAnonymous;
    }
  },
  program: {
    type: Schema.Types.ObjectId,
    ref: 'Program',
    required: [true, 'Program reference is required']
  },
  ngo: {
    type: Schema.Types.ObjectId,
    ref: 'NGO',
    required: [true, 'NGO reference is required']
  },
  amount: {
    type: Number,
    required: [true, 'Donation amount is required'],
    min: [1, 'Donation amount must be at least 1'],
    max: [10000000, 'Donation amount cannot exceed 1 crore']
  },
  currency: {
    type: String,
    required: [true, 'Currency is required'],
    enum: ['INR', 'USD', 'EUR'],
    default: 'INR'
  },
  donorName: {
    type: String,
    required: [true, 'Donor name is required'],
    trim: true,
    maxLength: [100, 'Donor name cannot exceed 100 characters']
  },
  donorEmail: {
    type: String,
    required: [true, 'Donor email is required'],
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  donorPhone: {
    type: String,
    trim: true,
    match: [/^[+]?[\d\s-()]+$/, 'Please provide a valid phone number']
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  message: {
    type: String,
    trim: true,
    maxLength: [500, 'Message cannot exceed 500 characters']
  },
  paymentMethod: {
    type: String,
    required: [true, 'Payment method is required'],
    enum: ['razorpay', 'stripe', 'paypal', 'bank_transfer', 'cash', 'other'],
    default: 'razorpay'
  },
  paymentStatus: {
    type: String,
    required: [true, 'Payment status is required'],
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'pending'
  },
  paymentId: {
    type: String,
    sparse: true // Allows multiple null/undefined values
  },  razorpayOrderId: {
    type: String
  },
  razorpayPaymentId: {
    type: String
  },
  razorpaySignature: {
    type: String
  },
  transactionId: {
    type: String
  },  receiptNumber: {
    type: String,
    required: [true, 'Receipt number is required']
  },
  receiptUrl: {
    type: String,
    validate: {
      validator: (v: string) => !v || /^https?:\/\/.+/.test(v) || /^\/uploads\/.+/.test(v),
      message: 'Please provide a valid receipt URL'
    }
  },
  certificateUrl: {
    type: String,
    validate: {
      validator: (v: string) => !v || /^https?:\/\/.+/.test(v) || /^\/uploads\/.+/.test(v),
      message: 'Please provide a valid certificate URL'
    }
  },
  taxBenefit: {
    eligible: {
      type: Boolean,
      default: true
    },
    section: {
      type: String,
      enum: ['80G', 'CSR', 'other'],
      default: '80G'
    },
    percentage: {
      type: Number,
      min: [0, 'Tax benefit percentage cannot be negative'],
      max: [100, 'Tax benefit percentage cannot exceed 100'],
      default: 50
    },
    certificateGenerated: {
      type: Boolean,
      default: false
    }
  },
  refund: {
    amount: {
      type: Number,
      min: [0, 'Refund amount cannot be negative']
    },
    reason: {
      type: String,
      trim: true,
      maxLength: [500, 'Refund reason cannot exceed 500 characters']
    },
    status: {
      type: String,
      enum: ['pending', 'processed', 'failed']
    },
    processedAt: {
      type: Date
    },
    refundId: {
      type: String
    }
  },
  metadata: {
    ipAddress: {
      type: String,
      validate: {
        validator: (v: string) => !v || /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/.test(v),
        message: 'Please provide a valid IP address'
      }
    },
    userAgent: {
      type: String,
      maxLength: [500, 'User agent cannot exceed 500 characters']
    },
    source: {
      type: String,
      enum: ['web', 'mobile', 'api', 'admin'],
      default: 'web'
    },
    campaign: {
      type: String,
      trim: true,
      maxLength: [100, 'Campaign name cannot exceed 100 characters']
    },
    referrer: {
      type: String,
      trim: true,
      maxLength: [200, 'Referrer cannot exceed 200 characters']
    }
  },
  notes: {
    type: String,
    trim: true,
    maxLength: [1000, 'Notes cannot exceed 1000 characters']
  },
  internalNotes: {
    type: String,
    trim: true,
    maxLength: [1000, 'Internal notes cannot exceed 1000 characters']
  }
}, {
  timestamps: true
});

// Indexes for performance
DonationSchema.index({ donor: 1, createdAt: -1 });
DonationSchema.index({ program: 1, paymentStatus: 1 });
DonationSchema.index({ ngo: 1, createdAt: -1 });
DonationSchema.index({ paymentStatus: 1 });
DonationSchema.index({ receiptNumber: 1 }, { unique: true });
DonationSchema.index({ razorpayOrderId: 1 }, { unique: true, sparse: true });
DonationSchema.index({ razorpayPaymentId: 1 }, { unique: true, sparse: true });
DonationSchema.index({ transactionId: 1 }, { unique: true, sparse: true });
DonationSchema.index({ donorEmail: 1 });
DonationSchema.index({ createdAt: -1 });
DonationSchema.index({ 'metadata.source': 1 });

// Compound indexes
DonationSchema.index({ program: 1, paymentStatus: 1, createdAt: -1 });
DonationSchema.index({ ngo: 1, paymentStatus: 1, createdAt: -1 });
DonationSchema.index({ donor: 1, paymentStatus: 1, createdAt: -1 });

// Pre-save middleware to generate receipt number
DonationSchema.pre('save', async function(this: IDonation) {
  if (this.isNew && !this.receiptNumber) {
    const count = await mongoose.model('Donation').countDocuments();
    const year = new Date().getFullYear();
    this.receiptNumber = `RCP-${year}-${String(count + 1).padStart(6, '0')}`;
  }
});

// Virtual for formatted amount
DonationSchema.virtual('formattedAmount').get(function(this: IDonation) {
  return `${this.currency} ${this.amount.toLocaleString()}`;
});

// Virtual for tax benefit amount
DonationSchema.virtual('taxBenefitAmount').get(function(this: IDonation) {
  if (!this.taxBenefit.eligible) return 0;
  return (this.amount * this.taxBenefit.percentage) / 100;
});

// Virtual for net amount after refund
DonationSchema.virtual('netAmount').get(function(this: IDonation) {
  if (this.refund && this.refund.status === 'processed') {
    return this.amount - this.refund.amount;
  }
  return this.amount;
});

// Method to check if donation is refundable
DonationSchema.methods.isRefundable = function(this: IDonation): boolean {
  const isCompleted = this.paymentStatus === 'completed';
  const notAlreadyRefunded = !this.refund || this.refund.status !== 'processed';
  const withinRefundPeriod = new Date().getTime() - this.createdAt.getTime() < (30 * 24 * 60 * 60 * 1000); // 30 days
  
  return isCompleted && notAlreadyRefunded && withinRefundPeriod;
};

// Method to calculate platform fee (if applicable)
DonationSchema.methods.calculatePlatformFee = function(this: IDonation): number {
  // Platform fee calculation logic (e.g., 2% + fixed fee)
  const percentageFee = this.amount * 0.02; // 2%
  const fixedFee = 2; // Fixed fee
  return Math.round((percentageFee + fixedFee) * 100) / 100; // Round to 2 decimal places
};

// Ensure virtuals are included in JSON
DonationSchema.set('toJSON', { virtuals: true });
DonationSchema.set('toObject', { virtuals: true });

export default mongoose.model<IDonation>('Donation', DonationSchema);
