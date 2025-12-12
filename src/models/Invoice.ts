import mongoose, { Document, Schema } from 'mongoose';

export interface IInvoice extends Document {
  _id: mongoose.Types.ObjectId;
  invoiceNumber: string;
  donation: mongoose.Types.ObjectId;
  donor: mongoose.Types.ObjectId;
  ngo: mongoose.Types.ObjectId;
  invoiceType: 'donation' | 'subscription' | 'event_ticket' | 'membership' | 'service';
  amount: number;
  currency: string;
  taxDetails: {
    taxRate: number;
    taxAmount: number;
    taxType: '80G' | 'GST' | 'FCRA' | 'CSR' | 'none';
    exemptionCertificate?: string;
  };
  lineItems: {
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    category: string;
  }[];
  paymentDetails: {
    method: 'credit_card' | 'debit_card' | 'net_banking' | 'upi' | 'wallet' | 'bank_transfer' | 'cash' | 'cheque';
    transactionId?: string;
    gateway?: string;
    paidAt: Date;
    status: 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled';
  };
  billingAddress: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  taxCertificate?: {
    certificateNumber: string;
    issueDate: Date;
    validUntil: Date;
    downloadUrl: string;
  };
  status: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled';
  dueDate?: Date;
  issuedDate: Date;
  notes?: string;
  remindersSent: number;
  lastReminderDate?: Date;
  downloadCount: number;
  viewCount: number;
  publicUrl: string;
  pdfUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema: Schema = new Schema({  invoiceNumber: {
    type: String,
    required: [true, 'Invoice number is required'],
    uppercase: true,
    match: [/^INV-\d{4}-\d{6}$/, 'Invalid invoice number format (INV-YYYY-XXXXXX)']
  },
  donation: {
    type: Schema.Types.ObjectId,
    ref: 'Donation',
    required: [true, 'Donation reference is required']
  },
  donor: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Donor reference is required']
  },
  ngo: {
    type: Schema.Types.ObjectId,
    ref: 'NGO',
    required: [true, 'NGO reference is required']
  },
  invoiceType: {
    type: String,
    required: [true, 'Invoice type is required'],
    enum: ['donation', 'subscription', 'event_ticket', 'membership', 'service'],
    default: 'donation'
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  currency: {
    type: String,
    required: [true, 'Currency is required'],
    enum: ['INR', 'USD', 'EUR', 'GBP'],
    default: 'INR'
  },
  taxDetails: {
    taxRate: {
      type: Number,
      default: 0,
      min: [0, 'Tax rate cannot be negative'],
      max: [100, 'Tax rate cannot exceed 100%']
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: [0, 'Tax amount cannot be negative']
    },
    taxType: {
      type: String,
      enum: ['80G', 'GST', 'FCRA', 'CSR', 'none'],
      default: 'none'
    },
    exemptionCertificate: {
      type: String,
      validate: {
        validator: function(v: string) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: 'Exemption certificate must be a valid URL'
      }
    }
  },
  lineItems: [{
    description: {
      type: String,
      required: [true, 'Line item description is required'],
      trim: true,
      maxLength: [200, 'Description cannot exceed 200 characters']
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1']
    },
    unitPrice: {
      type: Number,
      required: [true, 'Unit price is required'],
      min: [0, 'Unit price cannot be negative']
    },
    totalPrice: {
      type: Number,
      required: [true, 'Total price is required'],
      min: [0, 'Total price cannot be negative']
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: ['donation', 'program_fee', 'event_ticket', 'membership', 'service', 'other']
    }
  }],
  paymentDetails: {
    method: {
      type: String,
      required: [true, 'Payment method is required'],
      enum: ['credit_card', 'debit_card', 'net_banking', 'upi', 'wallet', 'bank_transfer', 'cash', 'cheque']
    },
    transactionId: {
      type: String,
      trim: true
    },
    gateway: {
      type: String,
      trim: true
    },
    paidAt: {
      type: Date,
      required: [true, 'Payment date is required']
    },
    status: {
      type: String,
      required: [true, 'Payment status is required'],
      enum: ['pending', 'paid', 'failed', 'refunded', 'cancelled'],
      default: 'pending'
    }
  },
  billingAddress: {
    name: {
      type: String,
      required: [true, 'Billing name is required'],
      trim: true,
      maxLength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Billing email is required'],
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number']
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
      maxLength: [300, 'Address cannot exceed 300 characters']
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      maxLength: [50, 'City cannot exceed 50 characters']
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
      maxLength: [50, 'State cannot exceed 50 characters']
    },
    pincode: {
      type: String,
      required: [true, 'Pincode is required'],
      match: [/^[0-9]{6}$/, 'Please provide a valid 6-digit pincode']
    },
    country: {
      type: String,
      required: [true, 'Country is required'],
      trim: true,
      default: 'India'
    }
  },
  taxCertificate: {
    certificateNumber: {
      type: String,
      uppercase: true
    },
    issueDate: {
      type: Date
    },
    validUntil: {
      type: Date
    },
    downloadUrl: {
      type: String,
      validate: {
        validator: function(v: string) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: 'Download URL must be a valid URL'
      }
    }
  },
  status: {
    type: String,
    required: [true, 'Status is required'],
    enum: ['draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled'],
    default: 'draft'
  },
  dueDate: {
    type: Date,
    validate: {
      validator: function(this: IInvoice, v: Date) {
        return !v || v >= this.issuedDate;
      },
      message: 'Due date cannot be before issued date'
    }
  },
  issuedDate: {
    type: Date,
    required: [true, 'Issued date is required'],
    default: Date.now
  },
  notes: {
    type: String,
    trim: true,
    maxLength: [1000, 'Notes cannot exceed 1000 characters']
  },
  remindersSent: {
    type: Number,
    default: 0,
    min: [0, 'Reminders sent cannot be negative']
  },
  lastReminderDate: {
    type: Date
  },
  downloadCount: {
    type: Number,
    default: 0,
    min: [0, 'Download count cannot be negative']
  },
  viewCount: {
    type: Number,
    default: 0,
    min: [0, 'View count cannot be negative']
  },  publicUrl: {
    type: String,
    required: [true, 'Public URL is required']
  },
  pdfUrl: {
    type: String,
    validate: {
      validator: function(v: string) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'PDF URL must be a valid URL'
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
InvoiceSchema.index({ invoiceNumber: 1 }, { unique: true });
InvoiceSchema.index({ donor: 1, status: 1 });
InvoiceSchema.index({ ngo: 1, issuedDate: -1 });
InvoiceSchema.index({ donation: 1 });
InvoiceSchema.index({ 'paymentDetails.status': 1, dueDate: 1 });
InvoiceSchema.index({ publicUrl: 1 }, { unique: true });

// Virtual for total amount including tax
InvoiceSchema.virtual('totalAmount').get(function(this: IInvoice) {
  return this.amount + this.taxDetails.taxAmount;
});

// Virtual for overdue status
InvoiceSchema.virtual('isOverdue').get(function(this: IInvoice) {
  return this.dueDate && this.dueDate < new Date() && this.paymentDetails.status !== 'paid';
});

// Virtual for days overdue
InvoiceSchema.virtual('daysOverdue').get(function(this: IInvoice) {
  if (!this.dueDate || this.paymentDetails.status === 'paid') return 0;
  const today = new Date();
  if (this.dueDate >= today) return 0;
  return Math.floor((today.getTime() - this.dueDate.getTime()) / (1000 * 60 * 60 * 24));
});

// Pre-save middleware
InvoiceSchema.pre('save', function(this: IInvoice, next) {
  if (this.isNew) {
    // Generate invoice number
    if (!this.invoiceNumber) {
      const year = new Date().getFullYear();
      const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
      this.invoiceNumber = `INV-${year}-${random}`;
    }
    
    // Generate public URL
    if (!this.publicUrl) {
      this.publicUrl = `invoice-${this._id || new mongoose.Types.ObjectId()}`;
    }
  }
  
  // Calculate tax amount
  if (this.taxDetails.taxRate > 0) {
    this.taxDetails.taxAmount = (this.amount * this.taxDetails.taxRate) / 100;
  }
  
  // Auto-update status based on payment
  if (this.paymentDetails.status === 'paid' && this.status !== 'paid') {
    this.status = 'paid';
  }
  
  next();
});

// Static methods
InvoiceSchema.statics.generateInvoiceNumber = function() {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return `INV-${year}-${random}`;
};

InvoiceSchema.statics.getMonthlyStats = function(ngoId?: mongoose.Types.ObjectId) {
  const match: any = {};
  if (ngoId) match.ngo = ngoId;
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          year: { $year: '$issuedDate' },
          month: { $month: '$issuedDate' }
        },
        totalAmount: { $sum: '$amount' },
        totalInvoices: { $sum: 1 },
        paidInvoices: {
          $sum: { $cond: [{ $eq: ['$paymentDetails.status', 'paid'] }, 1, 0] }
        }
      }
    },
    { $sort: { '_id.year': -1, '_id.month': -1 } }
  ]);
};

// Instance methods
InvoiceSchema.methods.markAsPaid = function(transactionId?: string) {
  this.paymentDetails.status = 'paid';
  this.paymentDetails.paidAt = new Date();
  if (transactionId) {
    this.paymentDetails.transactionId = transactionId;
  }
  this.status = 'paid';
  return this.save();
};

InvoiceSchema.methods.incrementView = function() {
  this.viewCount++;
  return this.save();
};

InvoiceSchema.methods.incrementDownload = function() {
  this.downloadCount++;
  return this.save();
};

export default mongoose.model<IInvoice>('Invoice', InvoiceSchema);
