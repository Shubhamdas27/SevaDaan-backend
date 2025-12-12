import mongoose, { Document, Schema } from 'mongoose';

export interface IVolunteer extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  program: mongoose.Types.ObjectId;
  ngo: mongoose.Types.ObjectId;
  applicationDate: Date;
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn' | 'completed' | 'removed';
  skills: string[];
  experience: string;
  motivation: string;
  availability: {
    daysPerWeek: number;
    hoursPerDay: number;
    preferredTime: 'morning' | 'afternoon' | 'evening' | 'flexible';
    startDate: Date;
    endDate?: Date;
  };
  preferences: {
    workLocation: 'onsite' | 'remote' | 'hybrid';
    travelWillingness: boolean;
    languagesSpoken: string[];
    specialRequirements?: string;
  };
  background: {
    education: string;
    occupation: string;
    previousVolunteerExperience?: string;
    references?: {
      name: string;
      contact: string;
      relationship: string;
    }[];
  };
  documents: {
    resume?: string;
    identityProof?: string;
    addressProof?: string;
    backgroundCheck?: string;
    medicalCertificate?: string;
  };
  approval: {
    approvedBy?: mongoose.Types.ObjectId;
    approvedAt?: Date;
    rejectionReason?: string;
    notes?: string;
  };
  participation: {
    hoursContributed: number;
    tasksCompleted: number;
    rating?: number;
    feedback?: string;
    certificateGenerated: boolean;
    certificateUrl?: string;
  };
  communication: {
    lastContact?: Date;
    preferredMethod: 'email' | 'phone' | 'whatsapp' | 'telegram';
    notes?: string;
  };
  // Admin management fields
  adminNotes?: string;
  reviewedAt?: Date;
  reviewedBy?: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const VolunteerSchema: Schema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required']
  },
  program: {
    type: Schema.Types.ObjectId,
    ref: 'Program',
    required: [true, 'Program reference is required']
  },
  ngo: {
    type: Schema.Types.ObjectId,
    ref: 'NGO',
    required: [true, 'NGO reference is required']
  },
  applicationDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'withdrawn', 'completed', 'removed'],
    default: 'pending'
  },
  skills: [{
    type: String,
    required: true,
    trim: true,
    maxLength: [100, 'Skill cannot exceed 100 characters']
  }],
  experience: {
    type: String,
    required: [true, 'Experience description is required'],
    trim: true,
    maxLength: [2000, 'Experience cannot exceed 2000 characters']
  },
  motivation: {
    type: String,
    required: [true, 'Motivation is required'],
    trim: true,
    minLength: [10, 'Motivation must be at least 10 characters'],
    maxLength: [1000, 'Motivation cannot exceed 1000 characters']
  },
  availability: {
    daysPerWeek: {
      type: Number,
      required: [true, 'Days per week is required'],
      min: [1, 'Must be available at least 1 day per week'],
      max: [7, 'Cannot exceed 7 days per week']
    },
    hoursPerDay: {
      type: Number,
      required: [true, 'Hours per day is required'],
      min: [1, 'Must be available at least 1 hour per day'],
      max: [12, 'Cannot exceed 12 hours per day']
    },
    preferredTime: {
      type: String,
      enum: ['morning', 'afternoon', 'evening', 'flexible'],
      default: 'flexible'
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required']
    },
    endDate: {
      type: Date,
      validate: {
        validator: function(this: IVolunteer, value?: Date) {
          return !value || value > this.availability.startDate;
        },
        message: 'End date must be after start date'
      }
    }
  },
  preferences: {
    workLocation: {
      type: String,
      enum: ['onsite', 'remote', 'hybrid'],
      default: 'onsite'
    },
    travelWillingness: {
      type: Boolean,
      default: false
    },
    languagesSpoken: [{
      type: String,
      trim: true
    }],
    specialRequirements: {
      type: String,
      trim: true,
      maxLength: [500, 'Special requirements cannot exceed 500 characters']
    }
  },
  background: {
    education: {
      type: String,
      required: [true, 'Education background is required'],
      trim: true,
      maxLength: [200, 'Education cannot exceed 200 characters']
    },
    occupation: {
      type: String,
      required: [true, 'Occupation is required'],
      trim: true,
      maxLength: [100, 'Occupation cannot exceed 100 characters']
    },
    previousVolunteerExperience: {
      type: String,
      trim: true,
      maxLength: [1000, 'Previous experience cannot exceed 1000 characters']
    },
    references: [{
      name: {
        type: String,
        required: true,
        trim: true,
        maxLength: [100, 'Reference name cannot exceed 100 characters']
      },
      contact: {
        type: String,
        required: true,
        trim: true,
        maxLength: [100, 'Reference contact cannot exceed 100 characters']
      },
      relationship: {
        type: String,
        required: true,
        trim: true,
        maxLength: [100, 'Relationship cannot exceed 100 characters']
      }
    }]
  },
  documents: {
    resume: {
      type: String,
      validate: {
        validator: (v: string) => !v || /^https?:\/\/.+/.test(v) || /^\/uploads\/.+/.test(v),
        message: 'Please provide a valid resume URL'
      }
    },
    identityProof: {
      type: String,
      validate: {
        validator: (v: string) => !v || /^https?:\/\/.+/.test(v) || /^\/uploads\/.+/.test(v),
        message: 'Please provide a valid identity proof URL'
      }
    },
    addressProof: {
      type: String,
      validate: {
        validator: (v: string) => !v || /^https?:\/\/.+/.test(v) || /^\/uploads\/.+/.test(v),
        message: 'Please provide a valid address proof URL'
      }
    },
    backgroundCheck: {
      type: String,
      validate: {
        validator: (v: string) => !v || /^https?:\/\/.+/.test(v) || /^\/uploads\/.+/.test(v),
        message: 'Please provide a valid background check URL'
      }
    },
    medicalCertificate: {
      type: String,
      validate: {
        validator: (v: string) => !v || /^https?:\/\/.+/.test(v) || /^\/uploads\/.+/.test(v),
        message: 'Please provide a valid medical certificate URL'
      }
    }
  },
  approval: {
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: {
      type: Date
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxLength: [500, 'Rejection reason cannot exceed 500 characters']
    },
    notes: {
      type: String,
      trim: true,
      maxLength: [1000, 'Notes cannot exceed 1000 characters']
    }
  },
  participation: {
    hoursContributed: {
      type: Number,
      default: 0,
      min: [0, 'Hours contributed cannot be negative']
    },
    tasksCompleted: {
      type: Number,
      default: 0,
      min: [0, 'Tasks completed cannot be negative']
    },
    rating: {
      type: Number,
      min: [1, 'Rating must be between 1 and 5'],
      max: [5, 'Rating must be between 1 and 5']
    },
    feedback: {
      type: String,
      trim: true,
      maxLength: [2000, 'Feedback cannot exceed 2000 characters']
    },
    certificateGenerated: {
      type: Boolean,
      default: false
    },
    certificateUrl: {
      type: String,
      validate: {
        validator: (v: string) => !v || /^https?:\/\/.+/.test(v) || /^\/uploads\/.+/.test(v),
        message: 'Please provide a valid certificate URL'
      }
    }
  },
  communication: {
    lastContact: {
      type: Date
    },
    preferredMethod: {
      type: String,
      enum: ['email', 'phone', 'whatsapp', 'telegram'],
      default: 'email'
    },
    notes: {
      type: String,
      trim: true,
      maxLength: [1000, 'Communication notes cannot exceed 1000 characters']
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Admin management fields
  adminNotes: {
    type: String,
    trim: true,
    maxLength: [1000, 'Admin notes cannot exceed 1000 characters']
  },
  reviewedAt: {
    type: Date
  },
  reviewedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for performance
VolunteerSchema.index({ user: 1, program: 1 }, { unique: true });
VolunteerSchema.index({ program: 1, status: 1 });
VolunteerSchema.index({ ngo: 1, status: 1 });
VolunteerSchema.index({ user: 1, status: 1 });
VolunteerSchema.index({ applicationDate: -1 });
VolunteerSchema.index({ status: 1, createdAt: -1 });
VolunteerSchema.index({ skills: 1 });
VolunteerSchema.index({ 'availability.startDate': 1 });

// Virtual for total available hours per week
VolunteerSchema.virtual('totalWeeklyHours').get(function(this: IVolunteer) {
  return this.availability.daysPerWeek * this.availability.hoursPerDay;
});

// Virtual for application age in days
VolunteerSchema.virtual('applicationAge').get(function(this: IVolunteer) {
  const now = new Date();
  const timeDiff = now.getTime() - this.applicationDate.getTime();
  return Math.floor(timeDiff / (1000 * 3600 * 24));
});

// Virtual for is current volunteer
VolunteerSchema.virtual('isCurrent').get(function(this: IVolunteer) {
  const now = new Date();
  return this.status === 'approved' && 
         this.availability.startDate <= now && 
         (!this.availability.endDate || this.availability.endDate >= now) &&
         this.isActive;
});

// Method to check if application is still pending
VolunteerSchema.methods.isPending = function(this: IVolunteer): boolean {
  return this.status === 'pending';
};

// Method to approve application
VolunteerSchema.methods.approve = function(this: IVolunteer, approvedBy: mongoose.Types.ObjectId, notes?: string): void {
  this.status = 'approved';
  this.approval.approvedBy = approvedBy;
  this.approval.approvedAt = new Date();
  if (notes) this.approval.notes = notes;
};

// Method to reject application
VolunteerSchema.methods.reject = function(this: IVolunteer, reason: string, notes?: string): void {
  this.status = 'rejected';
  this.approval.rejectionReason = reason;
  if (notes) this.approval.notes = notes;
};

// Ensure virtuals are included in JSON
VolunteerSchema.set('toJSON', { virtuals: true });
VolunteerSchema.set('toObject', { virtuals: true });

export default mongoose.model<IVolunteer>('Volunteer', VolunteerSchema);
