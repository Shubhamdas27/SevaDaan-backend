import mongoose, { Schema } from 'mongoose';
import { INotice } from '../types';

const noticeSchema = new Schema<INotice>({
  ngoId: {
    type: Schema.Types.ObjectId,
    ref: 'NGO',
    required: [true, 'NGO reference is required']
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxLength: [200, 'Title cannot exceed 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Content is required'],
    trim: true,
    maxLength: [2000, 'Content cannot exceed 2000 characters']
  },
  type: {
    type: String,
    enum: ['announcement', 'event', 'urgent', 'general'],
    default: 'general'
  },
  isHighlighted: {
    type: Boolean,
    default: false
  },
  expiryDate: {
    type: Date
  },
  attachmentUrls: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator reference is required']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
noticeSchema.index({ ngoId: 1, isActive: 1, type: 1 });
noticeSchema.index({ expiryDate: 1 });
noticeSchema.index({ createdAt: -1 });
noticeSchema.index({ isHighlighted: 1, isActive: 1 });

// Virtual for checking if notice is expired
noticeSchema.virtual('isExpired').get(function() {
  return this.expiryDate && this.expiryDate < new Date();
});

// Instance methods
noticeSchema.methods.activate = function() {
  this.isActive = true;
  return this.save();
};

noticeSchema.methods.deactivate = function() {
  this.isActive = false;
  return this.save();
};

noticeSchema.methods.toggleHighlight = function() {
  this.isHighlighted = !this.isHighlighted;
  return this.save();
};

noticeSchema.methods.extend = function(newExpiryDate: Date) {
  this.expiryDate = newExpiryDate;
  return this.save();
};

// Static methods
noticeSchema.statics.getActiveByNGO = function(ngoId: string, type?: string) {
  const query: any = { 
    ngoId: ngoId,
    isActive: true,
    $or: [
      { expiryDate: { $exists: false } },
      { expiryDate: null },
      { expiryDate: { $gt: new Date() } }
    ]
  };
  
  if (type) query.type = type;
  
  return this.find(query)
    .populate('createdBy', 'name')
    .sort({ isHighlighted: -1, createdAt: -1 });
};

noticeSchema.statics.getHighlighted = function(ngoId?: string) {
  const query: any = { 
    isHighlighted: true,
    isActive: true,
    $or: [
      { expiryDate: { $exists: false } },
      { expiryDate: null },
      { expiryDate: { $gt: new Date() } }
    ]
  };
  
  if (ngoId) query.ngoId = ngoId;
  
  return this.find(query)
    .populate('ngoId', 'name logo')
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 });
};

noticeSchema.statics.cleanupExpired = function() {
  return this.updateMany(
    { 
      expiryDate: { $lt: new Date() },
      isActive: true 
    },
    { isActive: false }
  );
};

noticeSchema.statics.getStatsByNGO = function(ngoId: string) {
  return this.aggregate([
    { $match: { ngoId: new mongoose.Types.ObjectId(ngoId) } },
    {
      $group: {
        _id: null,
        totalNotices: { $sum: 1 },
        activeNotices: {
          $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] }
        },
        highlightedNotices: {
          $sum: { $cond: [{ $eq: ["$isHighlighted", true] }, 1, 0] }
        },
        expiredNotices: {
          $sum: { 
            $cond: [
              { 
                $and: [
                  { $lt: ["$expiryDate", new Date()] },
                  { $ne: ["$expiryDate", null] }
                ]
              }, 
              1, 
              0
            ] 
          }
        },
        noticesByType: {
          $push: {
            type: "$type",
            count: 1
          }
        }
      }
    }
  ]);
};

export default mongoose.model<INotice>('Notice', noticeSchema);
