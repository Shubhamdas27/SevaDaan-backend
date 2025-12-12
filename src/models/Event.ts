import mongoose from 'mongoose';

export interface IEvent extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  ngo: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  eventType: 'fundraising' | 'awareness' | 'volunteer' | 'community' | 'workshop' | 'campaign';
  category: string;
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
  venue?: string;
  maxAttendees?: number;
  currentAttendees: number;
  registrationDeadline?: Date;
  registrationFee?: number;
  requirements?: string[];
  agenda?: Array<{
    time: string;
    activity: string;
    speaker?: string;
  }>;
  speakers?: Array<{
    name: string;
    bio: string;
    photo?: string;
  }>;
  images: string[];
  documents?: string[];
  status: 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled';
  featured: boolean;
  tags: string[];
  targetAudience: string[];
  objectives: string[];
  expectedOutcome?: string;
  budget?: {
    total: number;
    spent: number;
    breakdown: Array<{
      category: string;
      amount: number;
      description: string;
    }>;
  };
  promotion: {
    socialMedia: boolean;
    emailCampaign: boolean;
    pressRelease: boolean;
    partnerNotification: boolean;
  };
  feedback?: Array<{
    attendee: mongoose.Types.ObjectId;
    rating: number;
    comment: string;
    submittedAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  canUserRegister(): boolean;
  getAverageRating(): number;
}

const EventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  ngo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NGO',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  eventType: {
    type: String,
    enum: ['fundraising', 'awareness', 'volunteer', 'community', 'workshop', 'campaign'],
    required: true
  },
  category: {
    type: String,
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  location: {
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  venue: String,
  maxAttendees: Number,
  currentAttendees: {
    type: Number,
    default: 0
  },
  registrationDeadline: Date,
  registrationFee: {
    type: Number,
    default: 0
  },
  requirements: [String],
  agenda: [{
    time: { type: String, required: true },
    activity: { type: String, required: true },
    speaker: String
  }],
  speakers: [{
    name: { type: String, required: true },
    bio: { type: String, required: true },
    photo: String
  }],
  images: [String],
  documents: [String],
  status: {
    type: String,
    enum: ['draft', 'published', 'ongoing', 'completed', 'cancelled'],
    default: 'draft'
  },
  featured: {
    type: Boolean,
    default: false
  },
  tags: [String],
  targetAudience: [String],
  objectives: [String],
  expectedOutcome: String,
  budget: {
    total: Number,
    spent: { type: Number, default: 0 },
    breakdown: [{
      category: String,
      amount: Number,
      description: String
    }]
  },
  promotion: {
    socialMedia: { type: Boolean, default: false },
    emailCampaign: { type: Boolean, default: false },
    pressRelease: { type: Boolean, default: false },
    partnerNotification: { type: Boolean, default: false }
  },
  feedback: [{
    attendee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    },
    comment: String,
    submittedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
EventSchema.index({ ngo: 1, status: 1 });
EventSchema.index({ startDate: 1, endDate: 1 });
EventSchema.index({ location: 1 });
EventSchema.index({ eventType: 1, category: 1 });
EventSchema.index({ featured: 1, status: 1 });

// Virtual for available spots
EventSchema.virtual('availableSpots').get(function(this: IEvent) {
  if (!this.maxAttendees) return null;
  return this.maxAttendees - this.currentAttendees;
});

// Virtual for event duration
EventSchema.virtual('duration').get(function(this: IEvent) {
  const duration = this.endDate.getTime() - this.startDate.getTime();
  return Math.ceil(duration / (1000 * 60 * 60 * 24)); // Duration in days
});

// Virtual for registration status
EventSchema.virtual('registrationOpen').get(function(this: IEvent) {
  const now = new Date();
  const deadlinePassed = this.registrationDeadline && now > this.registrationDeadline;
  const eventStarted = now > this.startDate;
  const maxReached = this.maxAttendees && this.currentAttendees >= this.maxAttendees;
  
  return this.status === 'published' && !deadlinePassed && !eventStarted && !maxReached;
});

// Method to check if user can register
EventSchema.methods.canUserRegister = function(this: IEvent): boolean {
  const now = new Date();
  const deadlinePassed = this.registrationDeadline && now > this.registrationDeadline;
  const eventStarted = now > this.startDate;
  const maxReached = this.maxAttendees && this.currentAttendees >= this.maxAttendees;
  
  return this.status === 'published' && !deadlinePassed && !eventStarted && !maxReached;
};

// Method to calculate average rating
EventSchema.methods.getAverageRating = function(this: IEvent): number {
  if (!this.feedback || this.feedback.length === 0) return 0;
  const sum = this.feedback.reduce((acc, f) => acc + f.rating, 0);
  return Math.round((sum / this.feedback.length) * 10) / 10;
};

// Pre-save middleware to validate dates
EventSchema.pre('save', function(this: IEvent, next) {
  if (this.endDate <= this.startDate) {
    return next(new Error('End date must be after start date'));
  }
  
  if (this.registrationDeadline && this.registrationDeadline > this.startDate) {
    return next(new Error('Registration deadline must be before event start date'));
  }
  
  next();
});

export default mongoose.model<IEvent>('Event', EventSchema);
