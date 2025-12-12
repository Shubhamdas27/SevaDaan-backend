import mongoose, { Document, Schema } from 'mongoose';

export interface IGrant extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  slug: string;
  ngo: mongoose.Types.ObjectId;
  requestedBy: mongoose.Types.ObjectId;
  category: string;
  requestedAmount: number;
  approvedAmount?: number;
  currency: string;
  duration: number; // in months
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'disbursed' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  // Enhanced grant creation questions
  grantGoal: string;
  purpose: string;
  fundUsage: string;
  // Three additional custom questions
  impactMeasurement: string; // How will you measure the impact of this grant?
  sustainabilityPlan: string; // How will you ensure the project's sustainability?
  communityEngagement: string; // How will you engage the local community?
  objectives: string[];
  expectedOutcomes: string[];
  beneficiaries: {
    directCount: number;
    indirectCount: number;
    demographics: string;
  };
  budget: {
    breakdown: {
      category: string;
      amount: number;
      description: string;
    }[];
    justification: string;
  };
  timeline: {
    milestones: {
      title: string;
      description: string;
      targetDate: Date;
      budget: number;
      completed: boolean;
      completedDate?: Date;
    }[];
  };
  documents: {
    proposal?: string;
    budget?: string;
    impactAssessment?: string;
    complianceCertificates?: string[];
    progressReports?: string[];
  };
  review: {
    reviewedBy?: mongoose.Types.ObjectId;
    reviewedAt?: Date;
    reviewComments?: string;
    score?: number;
    recommendations?: string;
  };
  disbursement: {
    scheduledDate?: Date;
    disbursedDate?: Date;
    disbursedAmount?: number;
    transactionId?: string;
    disbursedBy?: mongoose.Types.ObjectId;
  };
  reporting: {
    reportingFrequency: 'monthly' | 'quarterly' | 'biannual' | 'annual';
    nextReportDue?: Date;
    submittedReports: {
      reportDate: Date;
      reportUrl: string;
      submittedAt: Date;
    }[];
  };
  compliance: {
    taxExemptionRequired: boolean;
    auditRequired: boolean;
    lastAuditDate?: Date;
    complianceNotes?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const GrantSchema: Schema = new Schema({
  title: {
    type: String,
    required: [true, 'Grant title is required'],
    trim: true,
    maxLength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Grant description is required'],
    trim: true,
    maxLength: [5000, 'Description cannot exceed 5000 characters']
  },
  slug: {
    type: String,
    unique: true,
    sparse: true
  },
  // Enhanced grant creation questions
  grantGoal: {
    type: String,
    required: [true, 'Grant goal is required'],
    trim: true,
    maxLength: [1000, 'Grant goal cannot exceed 1000 characters']
  },
  purpose: {
    type: String,
    required: [true, 'Grant purpose is required'],
    trim: true,
    maxLength: [2000, 'Purpose cannot exceed 2000 characters']
  },
  fundUsage: {
    type: String,
    required: [true, 'Fund usage description is required'],
    trim: true,
    maxLength: [2000, 'Fund usage cannot exceed 2000 characters']
  },
  // Three additional custom questions
  impactMeasurement: {
    type: String,
    required: [true, 'Impact measurement description is required'],
    trim: true,
    maxLength: [2000, 'Impact measurement cannot exceed 2000 characters']
  },
  sustainabilityPlan: {
    type: String,
    required: [true, 'Sustainability plan is required'],
    trim: true,
    maxLength: [2000, 'Sustainability plan cannot exceed 2000 characters']
  },
  communityEngagement: {
    type: String,
    required: [true, 'Community engagement description is required'],
    trim: true,
    maxLength: [2000, 'Community engagement cannot exceed 2000 characters']
  },
  ngo: {
    type: Schema.Types.ObjectId,
    ref: 'NGO',
    required: [true, 'NGO reference is required']
  },
  requestedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Requester reference is required']
  },
  category: {
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
      'infrastructure',
      'capacity-building',
      'research',
      'technology',
      'other'
    ]
  },
  requestedAmount: {
    type: Number,
    required: [true, 'Requested amount is required'],
    min: [1000, 'Minimum grant amount is 1000'],
    max: [50000000, 'Maximum grant amount is 5 crores']
  },
  approvedAmount: {
    type: Number,
    min: [0, 'Approved amount cannot be negative']
  },
  currency: {
    type: String,
    required: [true, 'Currency is required'],
    enum: ['INR', 'USD', 'EUR'],
    default: 'INR'
  },
  duration: {
    type: Number,
    required: [true, 'Duration is required'],
    min: [1, 'Minimum duration is 1 month'],
    max: [60, 'Maximum duration is 60 months']
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'disbursed', 'completed', 'cancelled'],
    default: 'draft'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  objectives: [{
    type: String,
    required: true,
    trim: true,
    maxLength: [500, 'Objective cannot exceed 500 characters']
  }],
  expectedOutcomes: [{
    type: String,
    required: true,
    trim: true,
    maxLength: [500, 'Expected outcome cannot exceed 500 characters']
  }],
  beneficiaries: {
    directCount: {
      type: Number,
      required: [true, 'Direct beneficiaries count is required'],
      min: [1, 'Must have at least 1 direct beneficiary']
    },
    indirectCount: {
      type: Number,
      required: [true, 'Indirect beneficiaries count is required'],
      min: [0, 'Indirect beneficiaries count cannot be negative']
    },
    demographics: {
      type: String,
      required: [true, 'Beneficiaries demographics is required'],
      trim: true,
      maxLength: [1000, 'Demographics cannot exceed 1000 characters']
    }
  },
  budget: {
    breakdown: [{
      category: {
        type: String,
        required: true,
        trim: true
      },
      amount: {
        type: Number,
        required: true,
        min: [0, 'Budget amount cannot be negative']
      },
      description: {
        type: String,
        required: true,
        trim: true,
        maxLength: [500, 'Budget description cannot exceed 500 characters']
      }
    }],
    justification: {
      type: String,
      required: [true, 'Budget justification is required'],
      trim: true,
      maxLength: [2000, 'Budget justification cannot exceed 2000 characters']
    }
  },
  timeline: {
    milestones: [{
      title: {
        type: String,
        required: true,
        trim: true,
        maxLength: [200, 'Milestone title cannot exceed 200 characters']
      },
      description: {
        type: String,
        required: true,
        trim: true,
        maxLength: [1000, 'Milestone description cannot exceed 1000 characters']
      },
      targetDate: {
        type: Date,
        required: true
      },
      budget: {
        type: Number,
        required: true,
        min: [0, 'Milestone budget cannot be negative']
      },
      completed: {
        type: Boolean,
        default: false
      },
      completedDate: {
        type: Date
      }
    }]
  },
  documents: {
    proposal: {
      type: String,
      validate: {
        validator: (v: string) => !v || /^https?:\/\/.+/.test(v) || /^\/uploads\/.+/.test(v),
        message: 'Please provide a valid proposal URL'
      }
    },
    budget: {
      type: String,
      validate: {
        validator: (v: string) => !v || /^https?:\/\/.+/.test(v) || /^\/uploads\/.+/.test(v),
        message: 'Please provide a valid budget URL'
      }
    },
    impactAssessment: {
      type: String,
      validate: {
        validator: (v: string) => !v || /^https?:\/\/.+/.test(v) || /^\/uploads\/.+/.test(v),
        message: 'Please provide a valid impact assessment URL'
      }
    },
    complianceCertificates: [{
      type: String,
      validate: {
        validator: (v: string) => /^https?:\/\/.+/.test(v) || /^\/uploads\/.+/.test(v),
        message: 'Please provide valid compliance certificate URLs'
      }
    }],
    progressReports: [{
      type: String,
      validate: {
        validator: (v: string) => /^https?:\/\/.+/.test(v) || /^\/uploads\/.+/.test(v),
        message: 'Please provide valid progress report URLs'
      }
    }]
  },
  review: {
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: {
      type: Date
    },
    reviewComments: {
      type: String,
      trim: true,
      maxLength: [2000, 'Review comments cannot exceed 2000 characters']
    },
    score: {
      type: Number,
      min: [1, 'Review score must be between 1 and 10'],
      max: [10, 'Review score must be between 1 and 10']
    },
    recommendations: {
      type: String,
      trim: true,
      maxLength: [2000, 'Recommendations cannot exceed 2000 characters']
    }
  },
  disbursement: {
    scheduledDate: {
      type: Date
    },
    disbursedDate: {
      type: Date
    },
    disbursedAmount: {
      type: Number,
      min: [0, 'Disbursed amount cannot be negative']
    },
    transactionId: {
      type: String,
      trim: true
    },
    disbursedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  reporting: {
    reportingFrequency: {
      type: String,
      enum: ['monthly', 'quarterly', 'biannual', 'annual'],
      default: 'quarterly'
    },
    nextReportDue: {
      type: Date
    },
    submittedReports: [{
      reportDate: {
        type: Date,
        required: true
      },
      reportUrl: {
        type: String,
        required: true,
        validate: {
          validator: (v: string) => /^https?:\/\/.+/.test(v) || /^\/uploads\/.+/.test(v),
          message: 'Please provide a valid report URL'
        }
      },
      submittedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  compliance: {
    taxExemptionRequired: {
      type: Boolean,
      default: true
    },
    auditRequired: {
      type: Boolean,
      default: false
    },
    lastAuditDate: {
      type: Date
    },
    complianceNotes: {
      type: String,
      trim: true,
      maxLength: [1000, 'Compliance notes cannot exceed 1000 characters']
    }
  }
}, {
  timestamps: true
});

// Generate slug before saving
GrantSchema.pre('save', async function(this: IGrant, next) {
  if (this.isModified('title') || !this.slug) {
    const baseSlug = this.title
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
    
    let slug = baseSlug;
    let counter = 1;
    
    // Ensure slug is unique
    while (await mongoose.model('Grant').findOne({ slug, _id: { $ne: this._id } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    this.slug = slug;
  }
  next();
});

// Indexes for performance
GrantSchema.index({ ngo: 1, status: 1 });
GrantSchema.index({ requestedBy: 1, status: 1 });
GrantSchema.index({ category: 1, status: 1 });
GrantSchema.index({ status: 1, createdAt: -1 });
GrantSchema.index({ priority: 1, status: 1 });
GrantSchema.index({ requestedAmount: 1 });
GrantSchema.index({ 'disbursement.scheduledDate': 1 });
GrantSchema.index({ 'reporting.nextReportDue': 1 });

// Text index for search
GrantSchema.index({
  title: 'text',
  description: 'text',
  grantGoal: 'text',
  purpose: 'text',
  fundUsage: 'text',
  impactMeasurement: 'text',
  sustainabilityPlan: 'text',
  communityEngagement: 'text',
  objectives: 'text'
});

// Virtual for total budget amount
GrantSchema.virtual('totalBudgetAmount').get(function(this: IGrant) {
  return this.budget.breakdown.reduce((total, item) => total + item.amount, 0);
});

// Virtual for completion percentage
GrantSchema.virtual('completionPercentage').get(function(this: IGrant) {
  if (this.timeline.milestones.length === 0) return 0;
  const completedMilestones = this.timeline.milestones.filter(m => m.completed).length;
  return Math.round((completedMilestones / this.timeline.milestones.length) * 100);
});

// Virtual for days until next report
GrantSchema.virtual('daysUntilNextReport').get(function(this: IGrant) {
  if (!this.reporting.nextReportDue) return null;
  const now = new Date();
  const timeDiff = this.reporting.nextReportDue.getTime() - now.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
});

// Method to calculate utilization percentage
GrantSchema.methods.getUtilizationPercentage = function(this: IGrant): number {
  if (!this.approvedAmount || this.approvedAmount === 0) return 0;
  const utilizedAmount = this.timeline.milestones
    .filter(m => m.completed)
    .reduce((total, m) => total + m.budget, 0);
  return Math.round((utilizedAmount / this.approvedAmount) * 100);
};

// Method to check if grant is overdue for reporting
GrantSchema.methods.isReportingOverdue = function(this: IGrant): boolean {
  if (!this.reporting.nextReportDue) return false;
  return new Date() > this.reporting.nextReportDue;
};

// Ensure virtuals are included in JSON
GrantSchema.set('toJSON', { virtuals: true });
GrantSchema.set('toObject', { virtuals: true });

export default mongoose.model<IGrant>('Grant', GrantSchema);
