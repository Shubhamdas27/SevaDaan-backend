import { Document, Types, Model as _Model } from 'mongoose';

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: 'citizen' | 'ngo' | 'ngo_admin' | 'volunteer' | 'donor' | 'ngo_manager' | 'system_admin';
  roleId?: Types.ObjectId;
  phone?: string;
  avatar?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  emailVerificationToken?: string;
  phoneVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  lastLogin?: Date;
  refreshToken?: string;
  ngoId?: Types.ObjectId;
  permissions?: string[];
  profileData?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateAuthToken(): string;
  generateRefreshToken(): string;
}

export interface INGO extends Document {
  _id: Types.ObjectId;
  name: string;
  description: string;
  mission: string;
  vision: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  contactEmail: string;
  contactPhone: string;
  website?: string;
  logo?: string;
  coverImage?: string;
  registrationNumber: string;
  registrationDate: Date;
  type: 'trust' | 'society' | 'section8';
  legalStatus: string;
  operationalAreas: string[];
  targetBeneficiaries: string;
  impactMetrics: string;
  
  // Social Media Links
  socialLinks: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };
  mediaLinks: string[];
  
  // Bank Details
  bankDetails: {
    accountName: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    cancelledChequeUrl?: string;
  };
  
  // Representative Details
  representative: {
    name: string;
    designation: string;
    phone: string;
    email: string;
    idType: 'aadhaar' | 'pan' | 'passport';
    idNumber: string;
  };
  
  // Documents
  documents: {
    registrationCertificateUrl: string;
    panCardUrl: string;
    taxExemptionCertUrl?: string;
    fcraCertificateUrl?: string;
    annualReportUrl?: string;
    financialStatementUrl?: string;
  };
  
  // Status and Verification
  status: 'draft' | 'pending' | 'under_review' | 'verified' | 'rejected';
  isVerified: boolean;
  verificationDate?: Date;
  verificationNotes?: string;
  rejectionReason?: string;
  statusHistory?: Array<{
    status: string;
    timestamp: Date;
    changedBy: Types.ObjectId;
    notes?: string;
  }>;
  
  // Metrics
  totalDonations: number;
  donorCount: number;
  volunteerCount: number;
  programCount: number;
  beneficiariesServed: number;
  
  // Created by admin user
  adminId: Types.ObjectId;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface IProgram extends Document {
  _id: Types.ObjectId;
  title: string;
  description: string;
  ngoId: Types.ObjectId;
  category: string;
  startDate: Date;
  endDate?: Date;
  location: string;
  targetBeneficiaries: number;
  currentBeneficiaries: number;
  goalAmount?: number;
  collectedAmount: number;
  status: 'draft' | 'active' | 'completed' | 'paused' | 'cancelled';
  eligibilityCriteria?: string;
  requirements?: string[];
  imageUrl?: string;
  mediaUrls: string[];
  volunteers: Types.ObjectId[];
  isActive: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDonation extends Document {
  _id: Types.ObjectId;
  ngoId: Types.ObjectId;
  programId?: Types.ObjectId;
  userId?: Types.ObjectId;
  amount: number;
  currency: string;
  isAnonymous: boolean;
  message?: string;
  paymentMethod: string;
  paymentId?: string;
  orderId?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  receiptUrl?: string;
  taxReceiptUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IVolunteerOpportunity extends Document {
  _id: Types.ObjectId;
  title: string;
  description: string;
  ngoId: Types.ObjectId;
  programId?: Types.ObjectId;
  location: string;
  requiredSkills: string[];
  timeCommitment: string;
  startDate: Date;
  endDate?: Date;
  capacity: number;
  currentApplications: number;
  status: 'active' | 'filled' | 'closed';
  isRemote: boolean;
  compensationType: 'voluntary' | 'stipend' | 'certificate';
  compensationAmount?: number;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IVolunteerApplication extends Document {
  _id: Types.ObjectId;
  opportunityId: Types.ObjectId;
  userId: Types.ObjectId;
  ngoId: Types.ObjectId;
  message?: string;
  availableHours: number;
  experience?: string;
  skills: string[];
  resumeUrl?: string;
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  appliedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: Types.ObjectId;
  reviewNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IGrant extends Document {
  _id: Types.ObjectId;
  title: string;
  description: string;
  provider: string;
  amount: number;
  deadline: Date;
  eligibilityCriteria: string;
  applicationProcess: string;
  documentsRequired: string[];
  category: string;
  location?: string;
  status: 'active' | 'closed' | 'upcoming';
  appliedNGOs: Types.ObjectId[];
  isActive: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IGrantApplication extends Document {
  _id: Types.ObjectId;
  grantId: Types.ObjectId;
  ngoId: Types.ObjectId;
  title: string;
  description: string;
  requestedAmount: number;
  usagePlan: string;
  documentUrls: string[];
  status: 'submitted' | 'under_review' | 'approved' | 'rejected';
  submittedAt: Date;
  reviewedAt?: Date;
  reviewNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITestimonial extends Document {
  _id: Types.ObjectId;
  ngo: Types.ObjectId;
  name: string;
  designation?: string;
  company?: string;
  message: string;
  rating: number;
  image?: string;
  isApproved: boolean;
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  rejectionReason?: string;
  isVisible: boolean;
  isFeatured: boolean;
  program?: Types.ObjectId;
  donationId?: Types.ObjectId;
  volunteerExperience?: Types.ObjectId;
  contactEmail?: string;
  location?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  approve(userId: string, notes?: string): Promise<ITestimonial>;
  reject(reason: string, userId?: string): Promise<ITestimonial>;
  toggleFeatured(): Promise<ITestimonial>;  toggleVisibility(): Promise<ITestimonial>;
}

export interface INotice extends Document {
  _id: Types.ObjectId;
  ngoId: Types.ObjectId;
  title: string;
  content: string;
  type: 'announcement' | 'event' | 'urgent' | 'general';
  isHighlighted: boolean;
  expiryDate?: Date;
  attachmentUrls: string[];
  isActive: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IEmergencyHelp extends Document {
  _id: Types.ObjectId;
  userId?: Types.ObjectId;
  name: string;
  phone: string;
  email?: string;
  emergencyType: 'medical' | 'disaster' | 'food' | 'shelter' | 'education' | 'other';
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
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
  helpNeeded: string[];
  estimatedCost?: number;
  attachmentUrls: string[];
  status: 'pending' | 'in_progress' | 'resolved' | 'closed';
  assignedToNGO?: Types.ObjectId;
  assignedBy?: Types.ObjectId;
  assignedAt?: Date;
  resolvedAt?: Date;
  resolution?: {
    description?: string;
    helpProvided?: string[];
    costIncurred?: number;
    volunteersInvolved?: number;
    feedback?: string;
  };
  priority: number;
  isActive: boolean;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  verifiedBy?: Types.ObjectId;
  verifiedAt?: Date;
  verificationNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IContact extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  type: 'general' | 'support' | 'partnership' | 'feedback' | 'complaint';
  priority: 'low' | 'medium' | 'high';
  status: 'new' | 'in_progress' | 'resolved' | 'closed';
  assignedTo?: Types.ObjectId;
  assignedAt?: Date;
  resolvedAt?: Date;
  responseMessage?: string;
  responseBy?: Types.ObjectId;
  responseAt?: Date;
  attachmentUrls: string[];
  tags: string[];
  isRead: boolean;
  readBy?: Types.ObjectId;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMedia extends Document {
  _id: Types.ObjectId;
  ngoId: Types.ObjectId;
  type: 'image' | 'video' | 'document';
  title: string;
  description?: string;
  url: string;
  thumbnailUrl?: string;
  fileSize: number;
  mimeType: string;
  tags: string[];
  isPublic: boolean;
  uploadedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Request/Response interfaces
export interface AuthRequest {
  email: string;
  password: string;
}

// Application System Interfaces (No Case Manager)
export interface IServiceApplication extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  ngoId: Types.ObjectId;
  programId?: Types.ObjectId;
  applicationType: 'program' | 'service' | 'assistance';
  serviceType: 'education' | 'health' | 'food' | 'shelter' | 'employment' | 'legal' | 'other';
  title: string;
  description: string;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  status: 'submitted' | 'under_review' | 'approved' | 'in_progress' | 'completed' | 'rejected' | 'cancelled';
  assignedManager?: Types.ObjectId; // NGO Manager
  assignedVolunteer?: Types.ObjectId; // Volunteer
  assignedAt?: Date;
  documents: {
    url: string;
    type: string;
    name: string;
  }[];
  caseNotes: ICaseNote[];
  reviewNotes?: string;
  completionNotes?: string;
  rejectionReason?: string;
  estimatedCompletionDate?: Date;
  actualCompletionDate?: Date;
  beneficiariesCount: number;
  totalCost?: number;
  priority: number;
  tags: string[];
  location: {
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
  followUpRequired: boolean;
  followUpDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICaseNote extends Document {
  _id: Types.ObjectId;
  applicationId: Types.ObjectId;
  authorId: Types.ObjectId; // NGO Manager or Volunteer
  authorRole: 'ngo_manager' | 'volunteer';
  noteType: 'update' | 'milestone' | 'concern' | 'completion' | 'follow_up';
  title: string;
  content: string;
  attachments: string[];
  isPrivate: boolean;
  hoursLogged?: number; // For volunteer time tracking
  activitiesCompleted?: string[];
  nextSteps?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IVolunteerActivity extends Document {
  _id: Types.ObjectId;
  volunteerId: Types.ObjectId;
  applicationId?: Types.ObjectId;
  programId?: Types.ObjectId;
  ngoId: Types.ObjectId;
  activityType: 'field_work' | 'training' | 'event' | 'administration' | 'outreach' | 'other';
  title: string;
  description: string;
  hoursLogged: number;
  location?: string;
  date: Date;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  attachments: string[];
  verifiedBy?: Types.ObjectId; // NGO Manager
  verifiedAt?: Date;
  skillsUsed: string[];
  impactDescription?: string;
  beneficiariesServed?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IReferral extends Document {
  _id: Types.ObjectId;
  fromNGO: Types.ObjectId;
  toNGO: Types.ObjectId;
  citizenId: Types.ObjectId;
  referredBy: Types.ObjectId; // NGO Manager
  serviceType: string;
  reason: string;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'sent' | 'accepted' | 'rejected' | 'in_progress' | 'completed' | 'expired';
  referralNotes: string;
  documents: string[];
  assignedTo?: Types.ObjectId;
  assignedAt?: Date;
  acceptedBy?: Types.ObjectId;
  acceptedAt?: Date;
  completedAt?: Date;
  completionNotes?: string;
  rejectionReason?: string;
  followUpRequired: boolean;
  followUpDate?: Date;
  followUpNotes: {
    note: string;
    addedBy: Types.ObjectId;
    addedAt: Date;
  }[];
  resolution?: {
    outcome: string;
    notes: string;
    resolvedBy: Types.ObjectId;
    resolvedAt: Date;
  };
  expiryDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICertificate extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  ngoId: Types.ObjectId;
  type: 'volunteer' | 'donor' | 'completion' | 'appreciation' | 'training';
  title: string;
  description: string;
  issuedFor: string; // What was the certificate issued for
  programId?: Types.ObjectId;
  donationId?: Types.ObjectId;
  volunteerActivityId?: Types.ObjectId;
  hoursCompleted?: number;
  amountDonated?: number;
  certificateUrl: string;
  qrCode?: string;
  serialNumber: string;
  issuedBy: Types.ObjectId;
  issuedAt: Date;
  validUntil?: Date;
  isRevoked: boolean;
  revokedAt?: Date;
  revokedBy?: Types.ObjectId;
  revokedReason?: string;
  verificationCode: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IInvoice extends Document {
  _id: Types.ObjectId;
  donationId: Types.ObjectId;
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate?: Date;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  items: {
    description: string;
    amount: number;
    taxRate?: number;
    taxAmount?: number;
  }[];
  subtotal: number;
  taxTotal: number;
  total: number;
  currency: string;
  notes?: string;
  terms?: string;
  invoiceUrl?: string;
  paidAt?: Date;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICity extends Document {
  _id: Types.ObjectId;
  name: string;
  state: string;
  country: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// File upload types
export interface FileUpload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer?: Buffer;
}

// Custom request interfaces
export interface AuthenticatedRequest extends Request {
  user?: IUser;
  file?: FileUpload;
  files?: FileUpload[] | { [fieldname: string]: FileUpload[] };
}

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}
