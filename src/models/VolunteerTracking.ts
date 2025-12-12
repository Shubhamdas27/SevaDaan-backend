import mongoose, { Document, Schema } from 'mongoose';

export interface IVolunteerTracking extends Document {
  volunteerId: mongoose.Types.ObjectId;
  ngoId: mongoose.Types.ObjectId;
  activityId?: mongoose.Types.ObjectId;
  trackingType: 'check_in' | 'check_out' | 'break_start' | 'break_end' | 'task_complete';
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  timestamp: Date;
  duration?: number; // in minutes
  notes?: string;
  photos?: string[];
  verifiedBy?: mongoose.Types.ObjectId;
  isVerified: boolean;
  deviceInfo?: {
    platform: string;
    version: string;
    userAgent: string;
  };
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
  verify(verifierId: mongoose.Types.ObjectId): Promise<IVolunteerTracking>;
}

const volunteerTrackingSchema = new Schema<IVolunteerTracking>({
  volunteerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ngoId: {
    type: Schema.Types.ObjectId,
    ref: 'NGO',
    required: true
  },
  activityId: {
    type: Schema.Types.ObjectId,
    ref: 'VolunteerActivity'
  },
  trackingType: {
    type: String,
    enum: ['check_in', 'check_out', 'break_start', 'break_end', 'task_complete'],
    required: true
  },
  location: {
    latitude: {
      type: Number,
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      min: -180,
      max: 180
    },
    address: String
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  duration: {
    type: Number,
    min: 0
  },
  notes: {
    type: String,
    maxlength: 1000
  },
  photos: [{
    type: String
  }],
  verifiedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  deviceInfo: {
    platform: String,
    version: String,
    userAgent: String
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes for better query performance
volunteerTrackingSchema.index({ volunteerId: 1, timestamp: -1 });
volunteerTrackingSchema.index({ ngoId: 1, timestamp: -1 });
volunteerTrackingSchema.index({ activityId: 1 });
volunteerTrackingSchema.index({ trackingType: 1 });
volunteerTrackingSchema.index({ 'location.latitude': 1, 'location.longitude': 1 });

// Virtual for calculating work session duration
volunteerTrackingSchema.virtual('sessionDuration').get(function() {
  if (this.trackingType === 'check_out' && this.duration) {
    return this.duration;
  }
  return null;
});

// Static method to get volunteer hours for a period
volunteerTrackingSchema.statics.getVolunteerHours = function(volunteerId: string, startDate: Date, endDate: Date) {
  return this.aggregate([
    {
      $match: {
        volunteerId: new mongoose.Types.ObjectId(volunteerId),
        trackingType: 'check_out',
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalMinutes: { $sum: '$duration' },
        totalSessions: { $sum: 1 }
      }
    },
    {
      $project: {
        totalHours: { $divide: ['$totalMinutes', 60] },
        totalSessions: 1
      }
    }
  ]);
};

// Static method to get NGO volunteer statistics
volunteerTrackingSchema.statics.getNGOVolunteerStats = function(ngoId: string, startDate: Date, endDate: Date) {
  return this.aggregate([
    {
      $match: {
        ngoId: new mongoose.Types.ObjectId(ngoId),
        trackingType: 'check_out',
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$volunteerId',
        totalMinutes: { $sum: '$duration' },
        totalSessions: { $sum: 1 },
        firstSession: { $min: '$timestamp' },
        lastSession: { $max: '$timestamp' }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'volunteer'
      }
    },
    {
      $unwind: '$volunteer'
    },
    {
      $project: {
        volunteerId: '$_id',
        volunteerName: '$volunteer.name',
        volunteerEmail: '$volunteer.email',
        totalHours: { $divide: ['$totalMinutes', 60] },
        totalSessions: 1,
        firstSession: 1,
        lastSession: 1
      }
    },
    {
      $sort: { totalHours: -1 }
    }
  ]);
};

// Method to verify tracking entry
volunteerTrackingSchema.methods.verify = function(verifierId: mongoose.Types.ObjectId) {
  this.isVerified = true;
  this.verifiedBy = verifierId;
  return this.save();
};

const VolunteerTracking = mongoose.model<IVolunteerTracking>('VolunteerTracking', volunteerTrackingSchema);

export default VolunteerTracking;
