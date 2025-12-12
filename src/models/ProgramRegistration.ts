import mongoose, { Document, Schema } from 'mongoose';

export interface IProgramRegistration extends Document {
  _id: mongoose.Types.ObjectId;
  program: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  registrationType: 'volunteer' | 'beneficiary' | 'participant';
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  applicationData: {
    motivation?: string;
    skills?: string[];
    availability?: {
      days: string[];
      timeSlots: string[];
    };
    experience?: string;
    specialRequirements?: string;
  };
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  completedAt?: Date;
  feedback?: {
    rating: number;
    comment: string;
    submittedAt: Date;
  };
  attendanceRecord?: {
    sessionsAttended: number;
    totalSessions: number;
    lastAttendance: Date;
  };
  certificateIssued?: boolean;
  certificateUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProgramRegistrationSchema: Schema = new Schema({
  program: {
    type: Schema.Types.ObjectId,
    ref: 'Program',
    required: [true, 'Program reference is required']
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required']
  },
  registrationType: {
    type: String,
    required: [true, 'Registration type is required'],
    enum: ['volunteer', 'beneficiary', 'participant']
  },
  status: {
    type: String,
    required: [true, 'Status is required'],
    enum: ['pending', 'approved', 'rejected', 'completed', 'cancelled'],
    default: 'pending'
  },
  applicationData: {
    motivation: {
      type: String,
      trim: true,
      maxLength: [1000, 'Motivation cannot exceed 1000 characters']
    },
    skills: [{
      type: String,
      trim: true
    }],
    availability: {
      days: [{
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      }],
      timeSlots: [{
        type: String,
        enum: ['morning', 'afternoon', 'evening', 'flexible']
      }]
    },
    experience: {
      type: String,
      trim: true,
      maxLength: [1000, 'Experience cannot exceed 1000 characters']
    },
    specialRequirements: {
      type: String,
      trim: true,
      maxLength: [500, 'Special requirements cannot exceed 500 characters']
    }
  },
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  feedback: {
    rating: {
      type: Number,
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5']
    },
    comment: {
      type: String,
      trim: true,
      maxLength: [1000, 'Comment cannot exceed 1000 characters']
    },
    submittedAt: {
      type: Date,
      default: Date.now
    }
  },
  attendanceRecord: {
    sessionsAttended: {
      type: Number,
      default: 0,
      min: [0, 'Sessions attended cannot be negative']
    },
    totalSessions: {
      type: Number,
      default: 0,
      min: [0, 'Total sessions cannot be negative']
    },
    lastAttendance: {
      type: Date
    }
  },
  certificateIssued: {
    type: Boolean,
    default: false
  },
  certificateUrl: {
    type: String,
    validate: {
      validator: function(v: string) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'Certificate URL must be a valid URL'
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for better query performance
ProgramRegistrationSchema.index({ program: 1, user: 1 }, { unique: true });
ProgramRegistrationSchema.index({ program: 1, status: 1 });
ProgramRegistrationSchema.index({ user: 1, registrationType: 1 });
ProgramRegistrationSchema.index({ status: 1, createdAt: -1 });

// Virtual for completion percentage
ProgramRegistrationSchema.virtual('completionPercentage').get(function(this: IProgramRegistration) {
  if (!this.attendanceRecord || this.attendanceRecord.totalSessions === 0) {
    return 0;
  }
  return Math.round((this.attendanceRecord.sessionsAttended / this.attendanceRecord.totalSessions) * 100);
});

// Virtual for registration duration
ProgramRegistrationSchema.virtual('durationInDays').get(function(this: IProgramRegistration) {
  const endDate = this.completedAt || new Date();
  return Math.floor((endDate.getTime() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24));
});

// Pre-save middleware
ProgramRegistrationSchema.pre('save', function(this: IProgramRegistration, next) {
  if (this.isModified('status')) {
    if (this.status === 'approved' && !this.approvedAt) {
      this.approvedAt = new Date();
    }
    if (this.status === 'completed' && !this.completedAt) {
      this.completedAt = new Date();
    }
  }
  next();
});

// Static methods
ProgramRegistrationSchema.statics.getRegistrationStats = function(programId: mongoose.Types.ObjectId) {
  return this.aggregate([
    { $match: { program: programId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

ProgramRegistrationSchema.statics.getUserRegistrations = function(userId: mongoose.Types.ObjectId) {
  return this.find({ user: userId })
    .populate('program', 'title category programType startDate endDate')
    .sort({ createdAt: -1 });
};

export default mongoose.model<IProgramRegistration>('ProgramRegistration', ProgramRegistrationSchema);
