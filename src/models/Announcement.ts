import mongoose, { Document, Schema } from 'mongoose';

export interface IAnnouncement extends Document {
  ngoId: mongoose.Types.ObjectId;
  title: string;
  content: string;
  type: 'general' | 'urgent' | 'event' | 'service';
  priority: 'low' | 'medium' | 'high';
  targetAudience: string[]; // Array of user roles or 'all'
  isActive: boolean;
  expiryDate?: Date;
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  viewCount: number;
  tags: string[];
  attachments: {
    name: string;
    url: string;
    type: string;
  }[];
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const announcementSchema = new Schema<IAnnouncement>({
  ngoId: {
    type: Schema.Types.ObjectId,
    ref: 'NGO',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    maxlength: 5000
  },
  type: {
    type: String,
    enum: ['general', 'urgent', 'event', 'service'],
    default: 'general'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  targetAudience: [{
    type: String,
    enum: ['all', 'volunteer', 'donor', 'citizen', 'staff', 'beneficiary']
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  expiryDate: {
    type: Date,
    validate: {
      validator: function(v: Date) {
        // Expiry date should be in the future
        return !v || v > new Date();
      },
      message: 'Expiry date must be in the future'
    }
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  viewCount: {
    type: Number,
    default: 0
  },
  tags: [{
    type: String,
    trim: true
  }],
  attachments: [{
    name: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    type: {
      type: String,
      required: true
    }
  }],
  publishedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for better query performance
announcementSchema.index({ ngoId: 1, isActive: 1 });
announcementSchema.index({ type: 1, priority: 1 });
announcementSchema.index({ expiryDate: 1 });
announcementSchema.index({ publishedAt: -1 });
announcementSchema.index({ tags: 1 });

// Virtual for checking if announcement is expired
announcementSchema.virtual('isExpired').get(function() {
  return this.expiryDate && this.expiryDate < new Date();
});

// Virtual for checking if announcement should be visible
announcementSchema.virtual('isVisible').get(function() {
  const isExpired = this.expiryDate && this.expiryDate < new Date();
  return this.isActive && !isExpired && this.publishedAt && this.publishedAt <= new Date();
});

// Middleware to auto-publish if publishedAt is not set
announcementSchema.pre('save', function(next) {
  if (this.isNew && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

// Method to increment view count
announcementSchema.methods.incrementViewCount = function() {
  this.viewCount += 1;
  return this.save();
};

// Static method to get active announcements for an NGO
announcementSchema.statics.getActiveAnnouncements = function(ngoId: string, targetRole?: string) {
  const query: any = {
    ngoId,
    isActive: true,
    $or: [
      { expiryDate: { $exists: false } },
      { expiryDate: { $gte: new Date() } }
    ],
    publishedAt: { $lte: new Date() }
  };

  if (targetRole && targetRole !== 'all') {
    query.targetAudience = { $in: [targetRole, 'all'] };
  }

  return this.find(query).sort({ priority: -1, publishedAt: -1 });
};

// Static method to get urgent announcements
announcementSchema.statics.getUrgentAnnouncements = function(ngoId: string) {
  return this.find({
    ngoId,
    priority: 'high',
    type: 'urgent',
    isActive: true,
    $or: [
      { expiryDate: { $exists: false } },
      { expiryDate: { $gte: new Date() } }
    ],
    publishedAt: { $lte: new Date() }
  }).sort({ publishedAt: -1 });
};

const Announcement = mongoose.model<IAnnouncement>('Announcement', announcementSchema);

export default Announcement;
