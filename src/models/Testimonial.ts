import mongoose, { Schema } from 'mongoose';
import { ITestimonial } from '../types';

const testimonialSchema = new Schema<ITestimonial>({
  ngo: {
    type: Schema.Types.ObjectId,
    ref: 'NGO',
    required: [true, 'NGO reference is required']
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxLength: [100, 'Name cannot exceed 100 characters']
  },
  designation: {
    type: String,
    trim: true,
    maxLength: [100, 'Designation cannot exceed 100 characters']
  },
  company: {
    type: String,
    trim: true,
    maxLength: [100, 'Company cannot exceed 100 characters']
  },
  message: {
    type: String,
    required: [true, 'Testimonial message is required'],
    trim: true,
    maxLength: [1000, 'Message cannot exceed 1000 characters']
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  image: {
    type: String,
    trim: true
  },
  isApproved: {
    type: Boolean,
    default: false
  },
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
  isVisible: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  program: {
    type: Schema.Types.ObjectId,
    ref: 'Program'
  },
  donationId: {
    type: Schema.Types.ObjectId,
    ref: 'Donation'
  },
  volunteerExperience: {
    type: Schema.Types.ObjectId,
    ref: 'Volunteer'
  },
  contactEmail: {
    type: String,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  location: {
    type: String,
    trim: true,
    maxLength: [100, 'Location cannot exceed 100 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
testimonialSchema.index({ ngo: 1, isApproved: 1, isVisible: 1 });
testimonialSchema.index({ rating: -1 });
testimonialSchema.index({ isFeatured: 1, isApproved: 1 });
testimonialSchema.index({ createdAt: -1 });

// Instance methods
testimonialSchema.methods.approve = function(userId: string, _notes?: string) {
  this.isApproved = true;
  this.approvedBy = userId;
  this.approvedAt = new Date();
  this.rejectionReason = undefined;
  return this.save();
};

testimonialSchema.methods.reject = function(reason: string, userId?: string) {
  this.isApproved = false;
  this.rejectionReason = reason;
  this.approvedBy = userId;
  this.approvedAt = undefined;
  return this.save();
};

testimonialSchema.methods.toggleFeatured = function() {
  this.isFeatured = !this.isFeatured;
  return this.save();
};

testimonialSchema.methods.toggleVisibility = function() {
  this.isVisible = !this.isVisible;
  return this.save();
};

// Static methods
testimonialSchema.statics.getApproved = function(ngoId?: string) {
  const query: any = { isApproved: true, isVisible: true };
  if (ngoId) query.ngo = ngoId;
  
  return this.find(query)
    .populate('ngo', 'name logo')
    .populate('program', 'title')
    .sort({ isFeatured: -1, createdAt: -1 });
};

testimonialSchema.statics.getFeatured = function(limit: number = 6) {
  return this.find({ 
    isApproved: true, 
    isVisible: true, 
    isFeatured: true 
  })
    .populate('ngo', 'name logo')
    .populate('program', 'title')
    .sort({ createdAt: -1 })
    .limit(limit);
};

testimonialSchema.statics.getStatsByNGO = function(ngoId: string) {
  return this.aggregate([
    { $match: { ngo: new mongoose.Types.ObjectId(ngoId) } },
    {
      $group: {
        _id: null,
        totalTestimonials: { $sum: 1 },
        approvedTestimonials: {
          $sum: { $cond: [{ $eq: ["$isApproved", true] }, 1, 0] }
        },
        pendingTestimonials: {
          $sum: { $cond: [{ $eq: ["$isApproved", false] }, 1, 0] }
        },
        averageRating: { $avg: "$rating" },
        featuredCount: {
          $sum: { $cond: [{ $eq: ["$isFeatured", true] }, 1, 0] }
        }
      }
    }
  ]);
};

export default mongoose.model<ITestimonial>('Testimonial', testimonialSchema);
