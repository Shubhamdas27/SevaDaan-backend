import mongoose, { Schema } from 'mongoose';
import { IContact } from '../types';

const contactSchema = new Schema<IContact>({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxLength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  phone: {
    type: String,
    trim: true,
    match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number']
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
    maxLength: [200, 'Subject cannot exceed 200 characters']
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    maxLength: [2000, 'Message cannot exceed 2000 characters']
  },
  type: {
    type: String,
    enum: ['general', 'support', 'partnership', 'feedback', 'complaint'],
    default: 'general'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['new', 'in_progress', 'resolved', 'closed'],
    default: 'new'
  },
  assignedTo: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedAt: {
    type: Date
  },
  resolvedAt: {
    type: Date
  },
  responseMessage: {
    type: String,
    trim: true,
    maxLength: [2000, 'Response message cannot exceed 2000 characters']
  },
  responseBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  responseAt: {
    type: Date
  },
  attachmentUrls: [{
    type: String,
    trim: true
  }],
  tags: [{
    type: String,
    trim: true,
    maxLength: [50, 'Tag cannot exceed 50 characters']
  }],
  isRead: {
    type: Boolean,
    default: false
  },
  readBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  readAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
contactSchema.index({ status: 1, priority: 1 });
contactSchema.index({ type: 1, status: 1 });
contactSchema.index({ assignedTo: 1, status: 1 });
contactSchema.index({ createdAt: -1 });
contactSchema.index({ email: 1 });

// Virtual for response time
contactSchema.virtual('responseTime').get(function(this: IContact) {
  if (this.responseAt && this.createdAt) {
    return Math.floor((this.responseAt.getTime() - this.createdAt.getTime()) / (1000 * 60 * 60)); // in hours
  }
  return null;
});

// Instance methods
contactSchema.methods.assignTo = function(userId: string) {
  this.assignedTo = userId;
  this.assignedAt = new Date();
  this.status = 'in_progress';
  return this.save();
};

contactSchema.methods.respond = function(responseMessage: string, userId: string) {
  this.responseMessage = responseMessage;
  this.responseBy = userId;
  this.responseAt = new Date();
  this.status = 'resolved';
  return this.save();
};

contactSchema.methods.markAsRead = function(userId: string) {
  this.isRead = true;
  this.readBy = userId;
  this.readAt = new Date();
  return this.save();
};

contactSchema.methods.close = function() {
  this.status = 'closed';
  return this.save();
};

// Static methods
contactSchema.statics.getUnread = function() {
  return this.find({ isRead: false })
    .sort({ priority: -1, createdAt: -1 });
};

contactSchema.statics.getByStatus = function(status: string) {
  return this.find({ status })
    .populate('assignedTo', 'name')
    .populate('responseBy', 'name')
    .sort({ createdAt: -1 });
};

contactSchema.statics.getStatistics = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalContacts: { $sum: 1 },
        newContacts: {
          $sum: { $cond: [{ $eq: ["$status", "new"] }, 1, 0] }
        },
        inProgressContacts: {
          $sum: { $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0] }
        },
        resolvedContacts: {
          $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] }
        },
        closedContacts: {
          $sum: { $cond: [{ $eq: ["$status", "closed"] }, 1, 0] }
        },
        unreadContacts: {
          $sum: { $cond: [{ $eq: ["$isRead", false] }, 1, 0] }
        },
        averageResponseTime: {
          $avg: {
            $cond: [
              { $ne: ["$responseAt", null] },
              {
                $divide: [
                  { $subtract: ["$responseAt", "$createdAt"] },
                  1000 * 60 * 60 // Convert to hours
                ]
              },
              null
            ]
          }
        },
        contactsByType: {
          $push: {
            type: "$type",
            count: 1
          }
        }
      }
    }
  ]);
};

export default mongoose.model<IContact>('Contact', contactSchema);
