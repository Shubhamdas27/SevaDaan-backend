import mongoose, { Document, Schema } from 'mongoose';

export interface IPayment extends Document {
  _id: string;
  paymentId: string; // Unique payment identifier
  orderId: string; // Order/transaction identifier
  gatewayPaymentId?: string; // Gateway-specific payment ID
  gatewayOrderId?: string; // Gateway-specific order ID
  
  // Payment details
  amount: number;
  currency: string;
  description: string;
  
  // Gateway information
  gateway: 'razorpay' | 'stripe' | 'paypal';
  gatewayData: Record<string, any>;
  
  // Status tracking
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'partially_refunded' | 'cancelled';
  paymentMethod?: string; // card, upi, netbanking, wallet, etc.
  
  // User and organization
  userId: string;
  userEmail: string;
  ngoId?: string;
  
  // Payment context
  paymentType: 'donation' | 'program_fee' | 'volunteer_fee' | 'membership' | 'event_ticket' | 'service_fee';
  contextId?: string; // Related program, event, or service ID
  contextData?: Record<string, any>;
  
  // Timestamps
  initiatedAt: Date;
  completedAt?: Date;
  failedAt?: Date;
  
  // Refund information
  refundAmount?: number;
  refundReason?: string;
  refundStatus?: 'requested' | 'processing' | 'completed' | 'rejected';
  refundedAt?: Date;
  
  // Metadata
  metadata: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  
  // Audit trail
  statusHistory: Array<{
    status: string;
    timestamp: Date;
    reason?: string;
    updatedBy?: string;
  }>;
  
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>({
  paymentId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  orderId: {
    type: String,
    required: true,
    index: true
  },
  gatewayPaymentId: {
    type: String,
    index: true
  },
  gatewayOrderId: {
    type: String,
    index: true
  },
  
  // Payment details
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    required: true,
    default: 'INR',
    enum: ['INR', 'USD', 'EUR', 'GBP']
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  
  // Gateway information
  gateway: {
    type: String,
    required: true,
    enum: ['razorpay', 'stripe', 'paypal']
  },
  gatewayData: {
    type: Schema.Types.Mixed,
    default: {}
  },
  
  // Status tracking
  status: {
    type: String,
    required: true,
    default: 'pending',
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'partially_refunded', 'cancelled'],
    index: true
  },
  paymentMethod: {
    type: String,
    trim: true
  },
  
  // User and organization
  userId: {
    type: String,
    required: true,
    index: true
  },
  userEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  ngoId: {
    type: String,
    index: true
  },
  
  // Payment context
  paymentType: {
    type: String,
    required: true,
    enum: ['donation', 'program_fee', 'volunteer_fee', 'membership', 'event_ticket', 'service_fee'],
    index: true
  },
  contextId: {
    type: String,
    index: true
  },
  contextData: {
    type: Schema.Types.Mixed,
    default: {}
  },
  
  // Timestamps
  initiatedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  completedAt: {
    type: Date,
    index: true
  },
  failedAt: {
    type: Date
  },
  
  // Refund information
  refundAmount: {
    type: Number,
    min: 0
  },
  refundReason: {
    type: String,
    trim: true
  },
  refundStatus: {
    type: String,
    enum: ['requested', 'processing', 'completed', 'rejected']
  },
  refundedAt: {
    type: Date
  },
  
  // Metadata
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  ipAddress: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  },
  
  // Audit trail
  statusHistory: [{
    status: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    reason: String,
    updatedBy: String
  }]
}, {
  timestamps: true,
  collection: 'payments'
});

// Indexes for performance
PaymentSchema.index({ userId: 1, status: 1 });
PaymentSchema.index({ ngoId: 1, status: 1 });
PaymentSchema.index({ paymentType: 1, status: 1 });
PaymentSchema.index({ createdAt: -1 });
PaymentSchema.index({ gateway: 1, gatewayPaymentId: 1 });

// Pre-save middleware to update status history
PaymentSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date(),
      reason: 'Status updated'
    });
  }
  next();
});

// Instance methods
PaymentSchema.methods.updateStatus = function(status: string, reason?: string, updatedBy?: string) {
  this.status = status;
  this.statusHistory.push({
    status,
    timestamp: new Date(),
    reason,
    updatedBy
  });
  
  // Update specific timestamps
  if (status === 'completed') {
    this.completedAt = new Date();
  } else if (status === 'failed') {
    this.failedAt = new Date();
  } else if (status === 'refunded' || status === 'partially_refunded') {
    this.refundedAt = new Date();
  }
  
  return this.save();
};

PaymentSchema.methods.initiateRefund = function(amount: number, reason: string, requestedBy?: string) {
  this.refundAmount = amount;
  this.refundReason = reason;
  this.refundStatus = 'requested';
  this.statusHistory.push({
    status: 'refund_requested',
    timestamp: new Date(),
    reason: `Refund requested: ${reason}`,
    updatedBy: requestedBy
  });
  
  return this.save();
};

// Static methods
PaymentSchema.statics.findByGatewayPaymentId = function(gateway: string, gatewayPaymentId: string) {
  return this.findOne({ gateway, gatewayPaymentId });
};

PaymentSchema.statics.findByOrderId = function(orderId: string) {
  return this.findOne({ orderId });
};

PaymentSchema.statics.getPaymentStats = function(filters: any = {}) {
  return this.aggregate([
    { $match: filters },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    }
  ]);
};

PaymentSchema.statics.getUserPayments = function(userId: string, limit: number = 10, skip: number = 0) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('contextData');
};

export default mongoose.model<IPayment>('Payment', PaymentSchema);
