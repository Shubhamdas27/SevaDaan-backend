import mongoose, { Schema } from 'mongoose';

export interface IDashboardAnalytics extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  ngoId: mongoose.Types.ObjectId;
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  kpis: {
    peopleServed: {
      monthly: number;
      yearly: number;
      total: number;
    };
    serviceDeliveryRate: number;
    volunteerEngagement: {
      activeVolunteers: number;
      totalHours: number;
      averageHoursPerVolunteer: number;
    };
    fundingUtilization: {
      totalFunds: number;
      utilizedFunds: number;
      utilizationRate: number;
    };
    programSuccessRate: number;
    geographicCoverage: {
      citiesServed: number;
      statesServed: number;
      beneficiaryDistribution: Record<string, number>;
    };
  };
  chartData: {
    trends: Array<{
      date: Date;
      value: number;
      metric: string;
    }>;
    comparisons: Array<{
      category: string;
      value: number;
      percentage: number;
    }>;
    distributions: Array<{
      label: string;
      value: number;
      color: string;
    }>;
  };
  realTimeMetrics: {
    activeUsers: number;
    ongoingEvents: number;
    pendingApplications: number;
    lastUpdated: Date;
  };
  generatedAt: Date;
  generatedBy: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const dashboardAnalyticsSchema = new Schema<IDashboardAnalytics>({
  ngoId: {
    type: Schema.Types.ObjectId,
    ref: 'NGO',
    required: [true, 'NGO ID is required']
  },
  dateRange: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    }
  },
  kpis: {
    peopleServed: {
      monthly: { type: Number, default: 0 },
      yearly: { type: Number, default: 0 },
      total: { type: Number, default: 0 }
    },
    serviceDeliveryRate: { type: Number, default: 0 },
    volunteerEngagement: {
      activeVolunteers: { type: Number, default: 0 },
      totalHours: { type: Number, default: 0 },
      averageHoursPerVolunteer: { type: Number, default: 0 }
    },
    fundingUtilization: {
      totalFunds: { type: Number, default: 0 },
      utilizedFunds: { type: Number, default: 0 },
      utilizationRate: { type: Number, default: 0 }
    },
    programSuccessRate: { type: Number, default: 0 },
    geographicCoverage: {
      citiesServed: { type: Number, default: 0 },
      statesServed: { type: Number, default: 0 },
      beneficiaryDistribution: { type: Schema.Types.Mixed, default: {} }
    }
  },
  chartData: {
    trends: [{
      date: Date,
      value: Number,
      metric: String
    }],
    comparisons: [{
      category: String,
      value: Number,
      percentage: Number
    }],
    distributions: [{
      label: String,
      value: Number,
      color: String
    }]
  },
  realTimeMetrics: {
    activeUsers: { type: Number, default: 0 },
    ongoingEvents: { type: Number, default: 0 },
    pendingApplications: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
  },
  generatedAt: {
    type: Date,
    default: Date.now
  },
  generatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
dashboardAnalyticsSchema.index({ ngoId: 1, generatedAt: -1 });
dashboardAnalyticsSchema.index({ 'dateRange.startDate': 1, 'dateRange.endDate': 1 });
dashboardAnalyticsSchema.index({ isActive: 1 });

// Virtual for date range label
dashboardAnalyticsSchema.virtual('dateRangeLabel').get(function() {
  const start = this.dateRange.startDate.toLocaleDateString();
  const end = this.dateRange.endDate.toLocaleDateString();
  return `${start} - ${end}`;
});

// Static method to generate analytics
dashboardAnalyticsSchema.statics.generateAnalytics = async function(ngoId: string, dateRange: { startDate: Date; endDate: Date }, userId: string) {
  const NGO = mongoose.model('NGO');
  const User = mongoose.model('User');
  const Event = mongoose.model('Event');
  const ServiceApplication = mongoose.model('ServiceApplication');
  const Donation = mongoose.model('Donation');
  const VolunteerTracking = mongoose.model('VolunteerTracking');

  // Generate KPIs
  const kpis = {
    peopleServed: {
      monthly: await ServiceApplication.countDocuments({
        ngoId,
        status: 'approved',
        createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
      }),
      yearly: await ServiceApplication.countDocuments({
        ngoId,
        status: 'approved',
        createdAt: { $gte: new Date(new Date().getFullYear(), 0, 1) }
      }),
      total: await ServiceApplication.countDocuments({
        ngoId,
        status: 'approved'
      })
    },
    serviceDeliveryRate: 0, // Calculate based on applications vs completions
    volunteerEngagement: {
      activeVolunteers: await User.countDocuments({
        ngoId,
        role: 'volunteer',
        isActive: true
      }),
      totalHours: 0, // Sum from volunteer tracking
      averageHoursPerVolunteer: 0
    },
    fundingUtilization: {
      totalFunds: 0, // Sum from donations
      utilizedFunds: 0, // Calculate from expenses
      utilizationRate: 0
    },
    programSuccessRate: 0, // Calculate based on program completion rates
    geographicCoverage: {
      citiesServed: 0,
      statesServed: 0,
      beneficiaryDistribution: {}
    }
  };

  // Generate chart data
  const chartData = {
    trends: [],
    comparisons: [],
    distributions: []
  };

  // Real-time metrics
  const realTimeMetrics = {
    activeUsers: await User.countDocuments({
      ngoId,
      isActive: true,
      lastLogin: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }),
    ongoingEvents: await Event.countDocuments({
      ngoId,
      status: 'ongoing'
    }),
    pendingApplications: await ServiceApplication.countDocuments({
      ngoId,
      status: 'pending'
    }),
    lastUpdated: new Date()
  };

  return new this({
    ngoId,
    dateRange,
    kpis,
    chartData,
    realTimeMetrics,
    generatedBy: userId
  });
};

export default mongoose.model<IDashboardAnalytics>('DashboardAnalytics', dashboardAnalyticsSchema);
