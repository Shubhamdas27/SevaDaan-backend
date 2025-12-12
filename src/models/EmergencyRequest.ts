import mongoose, { Schema, Document } from 'mongoose';

export interface IEmergencyRequest extends Document {
  citizenId: mongoose.Types.ObjectId;
  type: 'medical' | 'shelter' | 'food' | 'disaster' | 'safety' | 'other';
  description: string;
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
  urgency: 'medium' | 'high' | 'critical';
  contactNumber: string;
  alternateContact?: string;
  status: 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed';
  assignedNGO?: mongoose.Types.ObjectId;
  assignedVolunteers?: mongoose.Types.ObjectId[];
  responseTime?: Date;
  resolutionTime?: Date;
  notes?: string;
  updates?: {
    message: string;
    timestamp: Date;
    updatedBy: mongoose.Types.ObjectId;
  }[];
  mediaFiles?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const emergencyRequestSchema = new Schema<IEmergencyRequest>({
  citizenId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Citizen ID is required']
  },
  type: {
    type: String,
    required: [true, 'Emergency type is required'],
    enum: ['medical', 'shelter', 'food', 'disaster', 'safety', 'other']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    minlength: [10, 'Description must be at least 10 characters'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
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
      match: [/^\d{6}$/, 'Please enter a valid pincode']
    },
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  urgency: {
    type: String,
    enum: ['medium', 'high', 'critical'],
    default: 'high'
  },
  contactNumber: {
    type: String,
    required: [true, 'Contact number is required'],
    match: [/^[6-9]\d{9}$/, 'Please enter a valid contact number']
  },
  alternateContact: {
    type: String,
    match: [/^[6-9]\d{9}$/, 'Please enter a valid alternate contact number']
  },
  status: {
    type: String,
    enum: ['open', 'assigned', 'in_progress', 'resolved', 'closed'],
    default: 'open'
  },
  assignedNGO: {
    type: Schema.Types.ObjectId,
    ref: 'NGO'
  },
  assignedVolunteers: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  responseTime: Date,
  resolutionTime: Date,
  notes: {
    type: String,
    trim: true,
    maxlength: [2000, 'Notes cannot exceed 2000 characters']
  },
  updates: [{
    message: {
      type: String,
      required: true,
      trim: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  }],
  mediaFiles: [{
    type: String // File paths/URLs
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
emergencyRequestSchema.index({ citizenId: 1, status: 1 });
emergencyRequestSchema.index({ type: 1, urgency: 1 });
emergencyRequestSchema.index({ status: 1, createdAt: -1 });
emergencyRequestSchema.index({ 'location.city': 1, 'location.state': 1 });
emergencyRequestSchema.index({ assignedNGO: 1, status: 1 });

export default mongoose.model<IEmergencyRequest>('EmergencyRequest', emergencyRequestSchema);
