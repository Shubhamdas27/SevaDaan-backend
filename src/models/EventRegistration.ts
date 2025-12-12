import mongoose from 'mongoose';

export interface IEventRegistration extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  event: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  attendees: number;
  specialRequirements?: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'attended' | 'no-show';
  registeredAt: Date;
  attendance?: {
    attended: boolean;
    markedBy: mongoose.Types.ObjectId;
    markedAt: Date;
    notes?: string;
  };
  cancellationReason?: string;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const EventRegistrationSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  attendees: {
    type: Number,
    default: 1,
    min: 1
  },
  specialRequirements: {
    type: String,
    maxlength: 500
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'attended', 'no-show'],
    default: 'pending'
  },
  registeredAt: {
    type: Date,
    default: Date.now
  },
  attendance: {
    attended: { type: Boolean, required: true },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    markedAt: {
      type: Date,
      required: true
    },
    notes: String
  },
  cancellationReason: String,
  cancelledAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound index to prevent duplicate registrations
EventRegistrationSchema.index({ event: 1, user: 1 }, { unique: true });

// Other indexes
EventRegistrationSchema.index({ event: 1, status: 1 });
EventRegistrationSchema.index({ user: 1, status: 1 });

// Pre-save middleware
EventRegistrationSchema.pre('save', function(this: IEventRegistration, next) {
  if (this.isModified('status') && this.status === 'cancelled' && !this.cancelledAt) {
    this.cancelledAt = new Date();
  }
  next();
});

export default mongoose.model<IEventRegistration>('EventRegistration', EventRegistrationSchema);
