import mongoose, { Schema } from 'mongoose';

export interface IUserRole extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  permissions: Record<string, any>;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userRoleSchema = new Schema<IUserRole>({
  name: {
    type: String,
    required: [true, 'Role name is required'],
    unique: true,
    enum: ['NGO', 'NGO_ADMIN', 'NGO_MANAGER', 'CITIZEN', 'VOLUNTEER', 'DONOR'],
    trim: true
  },
  permissions: {
    type: Schema.Types.Mixed,
    required: [true, 'Permissions are required'],
    default: {}
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot be more than 500 characters']
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
userRoleSchema.index({ name: 1 });
userRoleSchema.index({ isActive: 1 });

// Pre-save middleware to validate permissions
userRoleSchema.pre('save', function(next) {
  if (this.isModified('permissions')) {
    // Validate permissions structure
    const validPermissions = [
      'view_all', 'manage_org', 'admin_access', 'manage_users',
      'manage_operations', 'view_analytics', 'apply_services', 
      'view_services', 'view_opportunities', 'track_hours',
      'view_impact', 'track_donations'
    ];
    
    const permissions = this.permissions as Record<string, any>;
    for (const key of Object.keys(permissions)) {
      if (!validPermissions.includes(key)) {
        return next(new Error(`Invalid permission: ${key}`));
      }
    }
  }
  next();
});

// Default role configurations
userRoleSchema.statics.getDefaultRoles = function() {
  return [
    {
      name: 'NGO',
      permissions: {
        view_all: true,
        manage_org: true,
        view_analytics: true,
        manage_operations: true
      },
      description: 'Basic NGO organization access'
    },
    {
      name: 'NGO_ADMIN',
      permissions: {
        admin_access: true,
        manage_users: true,
        view_all: true,
        manage_org: true,
        view_analytics: true,
        manage_operations: true
      },
      description: 'Full administrative access for NGO'
    },
    {
      name: 'NGO_MANAGER',
      permissions: {
        manage_operations: true,
        view_analytics: true,
        view_all: true
      },
      description: 'Operational management for NGO'
    },
    {
      name: 'CITIZEN',
      permissions: {
        apply_services: true,
        view_services: true
      },
      description: 'Basic citizen access to services'
    },
    {
      name: 'VOLUNTEER',
      permissions: {
        view_opportunities: true,
        track_hours: true,
        view_services: true
      },
      description: 'Volunteer access to opportunities and tracking'
    },
    {
      name: 'DONOR',
      permissions: {
        view_impact: true,
        track_donations: true,
        view_services: true
      },
      description: 'Donor access to impact tracking and donations'
    }
  ];
};

export default mongoose.model<IUserRole>('UserRole', userRoleSchema);
