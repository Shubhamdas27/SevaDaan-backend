import mongoose, { Schema } from 'mongoose';
import { IVolunteerActivity } from '../types';

const volunteerActivitySchema = new Schema<IVolunteerActivity>({
  volunteerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Volunteer is required']
  },
  applicationId: {
    type: Schema.Types.ObjectId,
    ref: 'ServiceApplication'
  },
  programId: {
    type: Schema.Types.ObjectId,
    ref: 'Program'
  },
  ngoId: {
    type: Schema.Types.ObjectId,
    ref: 'NGO',
    required: [true, 'NGO is required']
  },
  activityType: {
    type: String,
    enum: ['field_work', 'training', 'event', 'administration', 'outreach', 'other'],
    required: true
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  hoursLogged: {
    type: Number,
    required: [true, 'Hours logged is required'],
    min: [0.5, 'Minimum hours must be 0.5'],
    max: [24, 'Maximum hours per day cannot exceed 24']
  },
  location: {
    type: String,
    trim: true
  },
  date: {
    type: Date,
    required: [true, 'Date is required']
  },
  status: {
    type: String,
    enum: ['planned', 'in_progress', 'completed', 'cancelled'],
    default: 'planned'
  },
  notes: {
    type: String
  },
  attachments: [{
    type: String
  }],
  verifiedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedAt: Date,
  skillsUsed: [{
    type: String
  }],
  impactDescription: {
    type: String
  },
  beneficiariesServed: {
    type: Number,
    min: 0,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
volunteerActivitySchema.index({ volunteerId: 1 });
volunteerActivitySchema.index({ ngoId: 1 });
volunteerActivitySchema.index({ applicationId: 1 });
volunteerActivitySchema.index({ programId: 1 });
volunteerActivitySchema.index({ status: 1 });
volunteerActivitySchema.index({ date: -1 });
volunteerActivitySchema.index({ activityType: 1 });
volunteerActivitySchema.index({ verifiedBy: 1 });

// Virtual for volunteer info
volunteerActivitySchema.virtual('volunteer', {
  ref: 'User',
  localField: 'volunteerId',
  foreignField: '_id',
  justOne: true
});

// Virtual for NGO info
volunteerActivitySchema.virtual('ngo', {
  ref: 'NGO',
  localField: 'ngoId',
  foreignField: '_id',
  justOne: true
});

// Virtual for application info
volunteerActivitySchema.virtual('application', {
  ref: 'ServiceApplication',
  localField: 'applicationId',
  foreignField: '_id',
  justOne: true
});

// Virtual for program info
volunteerActivitySchema.virtual('program', {
  ref: 'Program',
  localField: 'programId',
  foreignField: '_id',
  justOne: true
});

// Virtual for verifier info
volunteerActivitySchema.virtual('verifier', {
  ref: 'User',
  localField: 'verifiedBy',
  foreignField: '_id',
  justOne: true
});

// Pre-save middleware to validate date
volunteerActivitySchema.pre('save', function(next) {
  if (this.date > new Date()) {
    // Future dates are allowed for planned activities
    if (this.status === 'completed' || this.status === 'in_progress') {
      return next(new Error('Cannot mark future activities as completed or in progress'));
    }
  }
  next();
});

export default mongoose.model<IVolunteerActivity>('VolunteerActivity', volunteerActivitySchema);
