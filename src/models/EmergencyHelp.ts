import mongoose, { Schema } from 'mongoose';
import { IEmergencyHelp } from '../types';

const emergencyHelpSchema = new Schema<IEmergencyHelp>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxLength: [100, 'Name cannot exceed 100 characters']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number']
  },
  email: {
    type: String,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  emergencyType: {
    type: String,
    required: [true, 'Emergency type is required'],
    enum: ['medical', 'disaster', 'food', 'shelter', 'education', 'other'],
    default: 'other'
  },
  urgencyLevel: {
    type: String,
    required: [true, 'Urgency level is required'],
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxLength: [1000, 'Description cannot exceed 1000 characters']
  },
  location: {
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
      maxLength: [200, 'Address cannot exceed 200 characters']
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
      trim: true,
      match: [/^[0-9]{6}$/, 'Please provide a valid 6-digit pincode']
    },
    coordinates: {
      latitude: {
        type: Number,
        min: [-90, 'Latitude must be between -90 and 90'],
        max: [90, 'Latitude must be between -90 and 90']
      },
      longitude: {
        type: Number,
        min: [-180, 'Longitude must be between -180 and 180'],
        max: [180, 'Longitude must be between -180 and 180']
      }
    }
  },
  helpNeeded: [{
    type: String,
    trim: true,
    maxLength: [100, 'Help item cannot exceed 100 characters']
  }],
  estimatedCost: {
    type: Number,
    min: [0, 'Estimated cost cannot be negative']
  },
  attachmentUrls: [{
    type: String,
    trim: true
  }],
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'resolved', 'closed'],
    default: 'pending'
  },
  assignedToNGO: {
    type: Schema.Types.ObjectId,
    ref: 'NGO'
  },
  assignedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedAt: {
    type: Date
  },
  resolvedAt: {
    type: Date
  },
  resolution: {
    description: {
      type: String,
      trim: true,
      maxLength: [500, 'Resolution description cannot exceed 500 characters']
    },
    helpProvided: [{
      type: String,
      trim: true,
      maxLength: [100, 'Help provided item cannot exceed 100 characters']
    }],
    costIncurred: {
      type: Number,
      min: [0, 'Cost incurred cannot be negative']
    },
    volunteersInvolved: {
      type: Number,
      min: [0, 'Number of volunteers cannot be negative']
    },
    feedback: {
      type: String,
      trim: true,
      maxLength: [1000, 'Feedback cannot exceed 1000 characters']
    }
  },
  priority: {
    type: Number,
    default: 0,
    min: [0, 'Priority cannot be negative'],
    max: [100, 'Priority cannot exceed 100']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  verifiedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedAt: {
    type: Date
  },
  verificationNotes: {
    type: String,
    trim: true,
    maxLength: [500, 'Verification notes cannot exceed 500 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
emergencyHelpSchema.index({ status: 1, urgencyLevel: 1 });
emergencyHelpSchema.index({ emergencyType: 1, 'location.state': 1, 'location.city': 1 });
emergencyHelpSchema.index({ assignedToNGO: 1, status: 1 });
emergencyHelpSchema.index({ createdAt: -1 });
emergencyHelpSchema.index({ verificationStatus: 1, isActive: 1 });
emergencyHelpSchema.index({ 'location.coordinates.latitude': 1, 'location.coordinates.longitude': 1 });

// Virtual for determining if emergency is urgent
emergencyHelpSchema.virtual('isUrgent').get(function() {
  return ['high', 'critical'].includes(this.urgencyLevel);
});

// Virtual for age of the request
emergencyHelpSchema.virtual('ageInHours').get(function() {
  return Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60));
});

// Instance methods
emergencyHelpSchema.methods.assignToNGO = function(ngoId: string, assignedBy: string) {
  this.assignedToNGO = ngoId;
  this.assignedBy = assignedBy;
  this.assignedAt = new Date();
  this.status = 'in_progress';
  return this.save();
};

emergencyHelpSchema.methods.markResolved = function(resolution: any) {
  this.status = 'resolved';
  this.resolvedAt = new Date();
  this.resolution = resolution;
  return this.save();
};

emergencyHelpSchema.methods.verify = function(userId: string, notes?: string) {
  this.verificationStatus = 'verified';
  this.verifiedBy = userId;
  this.verifiedAt = new Date();
  this.verificationNotes = notes;
  return this.save();
};

emergencyHelpSchema.methods.reject = function(userId: string, notes: string) {
  this.verificationStatus = 'rejected';
  this.verifiedBy = userId;
  this.verifiedAt = new Date();
  this.verificationNotes = notes;
  this.isActive = false;
  return this.save();
};

// Static methods
emergencyHelpSchema.statics.getActiveByLocation = function(state: string, city?: string) {
  const query: any = {
    isActive: true,
    verificationStatus: 'verified',
    status: { $in: ['pending', 'in_progress'] },
    'location.state': new RegExp(state, 'i')
  };
  
  if (city) {
    query['location.city'] = new RegExp(city, 'i');
  }
  
  return this.find(query)
    .populate('assignedToNGO', 'name logo contactPhone')
    .sort({ urgencyLevel: -1, priority: -1, createdAt: 1 });
};

emergencyHelpSchema.statics.getByUrgency = function(urgencyLevel: string) {
  return this.find({
    urgencyLevel,
    isActive: true,
    verificationStatus: 'verified',
    status: { $in: ['pending', 'in_progress'] }
  })
    .populate('assignedToNGO', 'name logo')
    .sort({ priority: -1, createdAt: 1 });
};

emergencyHelpSchema.statics.getStatsByNGO = function(ngoId: string) {
  return this.aggregate([
    { $match: { assignedToNGO: new mongoose.Types.ObjectId(ngoId) } },
    {
      $group: {
        _id: null,
        totalAssigned: { $sum: 1 },
        resolved: {
          $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] }
        },
        inProgress: {
          $sum: { $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0] }
        },
        pending: {
          $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] }
        },
        totalCostIncurred: {
          $sum: { $ifNull: ["$resolution.costIncurred", 0] }
        },
        averageResolutionTime: {
          $avg: {
            $cond: [
              { $eq: ["$status", "resolved"] },
              {
                $divide: [
                  { $subtract: ["$resolvedAt", "$createdAt"] },
                  1000 * 60 * 60 // Convert to hours
                ]
              },
              null
            ]
          }
        }
      }
    }
  ]);
};

emergencyHelpSchema.statics.cleanupOldRequests = function(daysOld: number = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  return this.updateMany(
    {
      status: 'resolved',
      resolvedAt: { $lt: cutoffDate }
    },
    { isActive: false }
  );
};

export default mongoose.model<IEmergencyHelp>('EmergencyHelp', emergencyHelpSchema);
