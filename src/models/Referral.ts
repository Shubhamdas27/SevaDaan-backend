import mongoose, { Schema } from 'mongoose';
import { IReferral } from '../types';

const referralSchema = new Schema<IReferral>({
  fromNGO: {
    type: Schema.Types.ObjectId,
    ref: 'NGO',
    required: [true, 'From NGO is required']
  },
  toNGO: {
    type: Schema.Types.ObjectId,
    ref: 'NGO',
    required: [true, 'To NGO is required']
  },
  citizenId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Citizen is required']
  },
  referredBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Referred by (NGO Manager) is required']
  },
  serviceType: {
    type: String,
    required: [true, 'Service type is required'],
    trim: true
  },
  reason: {
    type: String,
    required: [true, 'Reason for referral is required']
  },  urgencyLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'accepted', 'rejected', 'in_progress', 'completed', 'expired'],
    default: 'pending'
  },
  referralNotes: {
    type: String,
    required: [true, 'Referral notes are required']
  },
  documents: [{
    type: String
  }],
  assignedTo: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedAt: Date,
  acceptedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  acceptedAt: Date,
  completedAt: Date,
  completionNotes: String,
  rejectionReason: String,
  followUpRequired: {
    type: Boolean,
    default: false
  },
  followUpDate: Date,
  followUpNotes: [{
    note: String,
    addedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  resolution: {    outcome: String,
    notes: String,
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    resolvedAt: Date
  },
  expiryDate: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
referralSchema.index({ fromNGO: 1 });
referralSchema.index({ toNGO: 1 });
referralSchema.index({ citizenId: 1 });
referralSchema.index({ referredBy: 1 });
referralSchema.index({ status: 1 });
referralSchema.index({ urgencyLevel: 1 });
referralSchema.index({ expiryDate: 1 });
referralSchema.index({ createdAt: -1 });

// Virtual for from NGO info
referralSchema.virtual('fromNGOInfo', {
  ref: 'NGO',
  localField: 'fromNGO',
  foreignField: '_id',
  justOne: true
});

// Virtual for to NGO info
referralSchema.virtual('toNGOInfo', {
  ref: 'NGO',
  localField: 'toNGO',
  foreignField: '_id',
  justOne: true
});

// Virtual for citizen info
referralSchema.virtual('citizen', {
  ref: 'User',
  localField: 'citizenId',
  foreignField: '_id',
  justOne: true
});

// Virtual for referrer info
referralSchema.virtual('referrer', {
  ref: 'User',
  localField: 'referredBy',
  foreignField: '_id',
  justOne: true
});

// Pre-save middleware to check expiry
referralSchema.pre('save', function(next) {
  if (this.status === 'sent' && this.expiryDate < new Date()) {
    this.status = 'expired';
  }
  next();
});

export default mongoose.model<IReferral>('Referral', referralSchema);
