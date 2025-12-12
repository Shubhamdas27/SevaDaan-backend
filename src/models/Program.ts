import mongoose, { Document, Schema } from 'mongoose';

export interface IProgram extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  shortDescription: string;
  ngo: mongoose.Types.ObjectId;
  category: string;
  programType: 'regular' | 'event' | 'training' | 'workshop' | 'awareness';
  targetAmount: number;
  raisedAmount: number;
  startDate: Date;
  endDate: Date;
  location: {
    address: string;
    city: string;
    state: string;
    pincode: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  images: string[];
  documents: string[];
  status: 'draft' | 'active' | 'completed' | 'suspended' | 'cancelled';
  featured: boolean;
  beneficiariesCount: number;
  volunteersNeeded: number;
  volunteersRegistered: number;
  participantsRegistered: number;
  maxParticipants?: number;
  registrationDeadline?: Date;
  sdgGoals: number[];
  tags: string[];
  requirements: string[];
  impact: {
    description: string;
    metrics: {
      name: string;
      value: number;
      unit: string;
    }[];
  };
  updates: {
    title: string;
    description: string;
    date: Date;
    images?: string[];
  }[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ProgramSchema: Schema = new Schema({
  title: {
    type: String,
    required: [true, 'Program title is required'],
    trim: true,
    maxLength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Program description is required'],
    trim: true,
    maxLength: [5000, 'Description cannot exceed 5000 characters']
  },
  shortDescription: {
    type: String,
    required: [true, 'Short description is required'],
    trim: true,
    maxLength: [500, 'Short description cannot exceed 500 characters']
  },
  ngo: {
    type: Schema.Types.ObjectId,
    ref: 'NGO',
    required: [true, 'NGO reference is required']
  },  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'education',
      'healthcare',
      'environment',
      'poverty-alleviation',
      'women-empowerment',
      'child-welfare',
      'elderly-care',
      'disaster-relief',
      'animal-welfare',
      'rural-development',
      'skill-development',
      'water-sanitation',
      'other'
    ]
  },
  programType: {
    type: String,
    required: [true, 'Program type is required'],
    enum: ['regular', 'event', 'training', 'workshop', 'awareness'],
    default: 'regular'
  },
  targetAmount: {
    type: Number,
    required: [true, 'Target amount is required'],
    min: [0, 'Target amount cannot be negative']
  },
  raisedAmount: {
    type: Number,
    default: 0,
    min: [0, 'Raised amount cannot be negative']
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required'],
    validate: {
      validator: function(this: IProgram, value: Date) {
        return value > this.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  location: {
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true
    },
    pincode: {
      type: String,
      required: [true, 'Pincode is required'],
      trim: true,
      match: [/^\d{6}$/, 'Please provide a valid 6-digit pincode']
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
  images: [{
    type: String,
    validate: {
      validator: (v: string) => /^https?:\/\/.+/.test(v) || /^\/uploads\/.+/.test(v),
      message: 'Please provide valid image URLs'
    }
  }],
  documents: [{
    type: String,
    validate: {
      validator: (v: string) => /^https?:\/\/.+/.test(v) || /^\/uploads\/.+/.test(v),
      message: 'Please provide valid document URLs'
    }
  }],
  status: {
    type: String,
    enum: ['draft', 'active', 'completed', 'suspended', 'cancelled'],
    default: 'draft'
  },
  featured: {
    type: Boolean,
    default: false
  },
  beneficiariesCount: {
    type: Number,
    default: 0,
    min: [0, 'Beneficiaries count cannot be negative']
  },
  volunteersNeeded: {
    type: Number,
    default: 0,
    min: [0, 'Volunteers needed cannot be negative']
  },  volunteersRegistered: {
    type: Number,
    default: 0,
    min: [0, 'Volunteers registered cannot be negative']
  },
  participantsRegistered: {
    type: Number,
    default: 0,
    min: [0, 'Participants registered cannot be negative']
  },
  maxParticipants: {
    type: Number,
    min: [1, 'Maximum participants must be at least 1']
  },
  registrationDeadline: {
    type: Date,
    validate: {
      validator: function(this: IProgram, value: Date) {
        return !value || value <= this.startDate;
      },
      message: 'Registration deadline must be before program start date'
    }
  },
  sdgGoals: [{
    type: Number,
    min: [1, 'SDG Goal must be between 1 and 17'],
    max: [17, 'SDG Goal must be between 1 and 17']
  }],
  tags: [{
    type: String,
    trim: true,
    maxLength: [50, 'Tag cannot exceed 50 characters']
  }],
  requirements: [{
    type: String,
    trim: true,
    maxLength: [200, 'Requirement cannot exceed 200 characters']
  }],
  impact: {
    description: {
      type: String,
      trim: true,
      maxLength: [1000, 'Impact description cannot exceed 1000 characters']
    },
    metrics: [{
      name: {
        type: String,
        required: true,
        trim: true
      },
      value: {
        type: Number,
        required: true,
        min: [0, 'Metric value cannot be negative']
      },
      unit: {
        type: String,
        required: true,
        trim: true
      }
    }]
  },
  updates: [{
    title: {
      type: String,
      required: true,
      trim: true,
      maxLength: [200, 'Update title cannot exceed 200 characters']
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxLength: [2000, 'Update description cannot exceed 2000 characters']
    },
    date: {
      type: Date,
      required: true,
      default: Date.now
    },
    images: [{
      type: String,
      validate: {
        validator: (v: string) => /^https?:\/\/.+/.test(v) || /^\/uploads\/.+/.test(v),
        message: 'Please provide valid image URLs'
      }
    }]
  }],
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by user reference is required']
  }
}, {
  timestamps: true
});

// Indexes for performance
ProgramSchema.index({ ngo: 1, status: 1 });
ProgramSchema.index({ category: 1, status: 1 });
ProgramSchema.index({ featured: 1, status: 1 });
ProgramSchema.index({ 'location.city': 1, 'location.state': 1 });
ProgramSchema.index({ startDate: 1, endDate: 1 });
ProgramSchema.index({ tags: 1 });
ProgramSchema.index({ createdAt: -1 });

// Text index for search
ProgramSchema.index({
  title: 'text',
  description: 'text',
  shortDescription: 'text',
  tags: 'text'
});

// Virtual for progress percentage
ProgramSchema.virtual('progressPercentage').get(function(this: IProgram) {
  if (this.targetAmount === 0) return 0;
  return Math.min((this.raisedAmount / this.targetAmount) * 100, 100);
});

// Virtual for days remaining
ProgramSchema.virtual('daysRemaining').get(function(this: IProgram) {
  const now = new Date();
  const timeDiff = this.endDate.getTime() - now.getTime();
  return Math.max(0, Math.ceil(timeDiff / (1000 * 3600 * 24)));
});

// Virtual for is active
ProgramSchema.virtual('isActive').get(function(this: IProgram) {
  const now = new Date();
  return this.status === 'active' && 
         this.startDate <= now && 
         this.endDate >= now;
});

// Ensure virtuals are included in JSON
ProgramSchema.set('toJSON', { virtuals: true });
ProgramSchema.set('toObject', { virtuals: true });

export default mongoose.model<IProgram>('Program', ProgramSchema);
