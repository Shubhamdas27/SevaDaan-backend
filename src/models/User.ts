import mongoose, { Schema } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import config from '../config/config';
import { IUser } from '../types';

const userSchema = new Schema<IUser>({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },  role: {
    type: String,
    enum: ['citizen', 'ngo', 'ngo_admin', 'volunteer', 'donor', 'ngo_manager', 'system_admin'],
    default: 'citizen'
  },
  roleId: {
    type: Schema.Types.ObjectId,
    ref: 'UserRole'
  },
  profileData: {
    type: Schema.Types.Mixed,
    default: {}
  },
  phone: {
    type: String,
    match: [/^[6-9]\d{9}$/, 'Please enter a valid phone number']
  },
  avatar: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  phoneVerificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date,
  lastLogin: Date,
  refreshToken: String,
  ngoId: {
    type: Schema.Types.ObjectId,
    ref: 'NGO'
  },
  permissions: [{
    type: String
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ ngoId: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(config.bcryptSaltRounds);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Generate JWT token
userSchema.methods.generateAuthToken = function(): string {
  const payload = { 
    id: this._id.toString(), 
    email: this.email, 
    role: this.role,
    ngoId: this.ngoId?.toString() 
  };
  
  return jwt.sign(payload, config.jwtSecret, { 
    expiresIn: config.jwtExpiresIn 
  } as jwt.SignOptions);
};

// Generate refresh token
userSchema.methods.generateRefreshToken = function(): string {
  const payload = { id: this._id.toString() };
  
  return jwt.sign(payload, config.jwtRefreshSecret, { 
    expiresIn: config.jwtRefreshExpiresIn 
  } as jwt.SignOptions);
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.passwordResetToken;
  delete userObject.passwordResetExpires;
  delete userObject.emailVerificationToken;
  delete userObject.phoneVerificationToken;
  delete userObject.refreshToken;
  return userObject;
};

export default mongoose.model<IUser>('User', userSchema);
