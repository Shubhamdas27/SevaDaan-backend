import mongoose, { Schema } from 'mongoose';
import { IServiceApplication } from '../types';

const CaseNoteSchema = new Schema({
  applicationId: {
    type: Schema.Types.ObjectId,
    ref: 'ServiceApplication',
    required: true
  },
  authorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  authorRole: {
    type: String,
    enum: ['ngo_manager', 'volunteer'],
    required: true
  },
  noteType: {
    type: String,
    enum: ['update', 'milestone', 'concern', 'completion', 'follow_up'],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  attachments: [{
    type: String
  }],
  isPrivate: {
    type: Boolean,
    default: false
  },
  hoursLogged: {
    type: Number,
    min: 0
  },
  activitiesCompleted: [{
    type: String
  }],
  nextSteps: [{
    type: String
  }]
}, {
  timestamps: true
});

const serviceApplicationSchema = new Schema<IServiceApplication>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  ngoId: {
    type: Schema.Types.ObjectId,
    ref: 'NGO',
    required: [true, 'NGO is required']
  },
  programId: {
    type: Schema.Types.ObjectId,
    ref: 'Program'
  },
  applicationType: {
    type: String,
    enum: ['program', 'service', 'assistance'],
    required: true
  },
  serviceType: {
    type: String,
    enum: ['education', 'health', 'food', 'shelter', 'employment', 'legal', 'other'],
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
  urgencyLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['submitted', 'under_review', 'approved', 'in_progress', 'completed', 'rejected', 'cancelled'],
    default: 'submitted'
  },
  assignedManager: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedVolunteer: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedAt: Date,
  documents: [{
    url: {
      type: String,
      required: true
    },
    type: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    }
  }],
  caseNotes: [CaseNoteSchema],
  reviewNotes: String,
  completionNotes: String,
  rejectionReason: String,
  estimatedCompletionDate: Date,
  actualCompletionDate: Date,
  beneficiariesCount: {
    type: Number,
    default: 1,
    min: 1
  },
  totalCost: {
    type: Number,
    min: 0
  },
  priority: {
    type: Number,
    default: 5,
    min: 1,
    max: 10
  },
  tags: [{
    type: String
  }],
  location: {
    address: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    pincode: {
      type: String,
      required: true
    }
  },
  followUpRequired: {
    type: Boolean,
    default: false
  },
  followUpDate: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
serviceApplicationSchema.index({ userId: 1 });
serviceApplicationSchema.index({ ngoId: 1 });
serviceApplicationSchema.index({ status: 1 });
serviceApplicationSchema.index({ urgencyLevel: 1 });
serviceApplicationSchema.index({ serviceType: 1 });
serviceApplicationSchema.index({ assignedManager: 1 });
serviceApplicationSchema.index({ assignedVolunteer: 1 });
serviceApplicationSchema.index({ createdAt: -1 });

// Virtual for applicant info
serviceApplicationSchema.virtual('applicant', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

// Virtual for NGO info
serviceApplicationSchema.virtual('ngo', {
  ref: 'NGO',
  localField: 'ngoId',
  foreignField: '_id',
  justOne: true
});

// Virtual for program info
serviceApplicationSchema.virtual('program', {
  ref: 'Program',
  localField: 'programId',
  foreignField: '_id',
  justOne: true
});

// Virtual for assigned manager info
serviceApplicationSchema.virtual('manager', {
  ref: 'User',
  localField: 'assignedManager',
  foreignField: '_id',
  justOne: true
});

// Virtual for assigned volunteer info
serviceApplicationSchema.virtual('volunteer', {
  ref: 'User',
  localField: 'assignedVolunteer',
  foreignField: '_id',
  justOne: true
});

export default mongoose.model<IServiceApplication>('ServiceApplication', serviceApplicationSchema);
