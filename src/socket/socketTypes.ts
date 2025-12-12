// Socket event types for type safety

export interface DonationSocketData {
  donationId: string;
  amount: number;
  donorName: string;
  ngoId: string;
  programId?: string;
  timestamp: string;
}

export interface VolunteerSocketData {
  volunteerId: string;
  volunteerName: string;
  activity: string;
  programId?: string;
  ngoId?: string;
  hours?: number;
  status: 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  timestamp: string;
}

export interface ApplicationSocketData {
  applicationId: string;
  applicantId: string;
  applicantName: string;
  serviceType: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'completed';
  ngoId: string;
  timestamp: string;
}

export interface ReferralSocketData {
  referralId: string;
  fromNgoId: string;
  toNgoId: string;
  citizenId: string;
  serviceType: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  timestamp: string;
}

export interface GrantSocketData {
  grantId: string;
  ngoId: string;
  ngoName: string;
  amount: number;
  purpose: string;
  status: 'submitted' | 'under_review' | 'approved' | 'rejected' | 'disbursed';
  timestamp: string;
}

export interface ProgramSocketData {
  programId: string;
  programName: string;
  ngoId: string;
  ngoName: string;
  type: 'education' | 'healthcare' | 'environment' | 'disaster_relief' | 'other';
  startDate: string;
  location: string;
  timestamp: string;
}

export interface NotificationSocketData {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  priority: 'low' | 'medium' | 'high';
  userId?: string;
  role?: string;
  ngoId?: string;
  actionUrl?: string;
  timestamp: string;
  read: boolean;
}

export interface ChatMessageData {
  id: string;
  message: string;
  sender: {
    id: string;
    email: string;
    role: string;
    name?: string;
  };
  programId?: string;
  recipientId?: string;
  timestamp: string;
}

export interface TypingIndicatorData {
  userId: string;
  email: string;
  isTyping: boolean;
  timestamp: string;
}

// Event name constants
export const SOCKET_EVENTS = {
  // Donation events
  DONATION_NEW: 'donation:new',
  DONATION_UPDATE: 'donation:update',
  
  // Volunteer events
  VOLUNTEER_UPDATE: 'volunteer:update',
  VOLUNTEER_ASSIGNED: 'volunteer:assigned',
  VOLUNTEER_COMPLETED: 'volunteer:completed',
  
  // Application events
  APPLICATION_STATUS_CHANGED: 'application:statusChanged',
  APPLICATION_NEW: 'application:new',
  
  // Referral events
  REFERRAL_UPDATE: 'referral:update',
  REFERRAL_NEW: 'referral:new',
  
  // Grant events
  GRANT_UPDATE: 'grant:update',
  GRANT_NEW: 'grant:new',
  
  // Program events
  PROGRAM_NEW: 'program:new',
  PROGRAM_UPDATE: 'program:update',
  
  // Manager events
  MANAGER_ADDED: 'manager:added',
  MANAGER_UPDATED: 'manager:updated',
  MANAGER_DELETED: 'manager:deleted',
  
  // Notification events
  NOTIFICATION_NEW: 'notification:new',
  NOTIFICATION_READ: 'notification:read',
  NOTIFICATION_CLEAR: 'notification:clear',
  
  // Chat events
  CHAT_MESSAGE: 'chat:message',
  CHAT_TYPING: 'chat:typing',
  CHAT_SEND: 'chat:send',
  
  // Room events
  JOIN_PROGRAM: 'join:program',
  LEAVE_PROGRAM: 'leave:program',
  
  // Dashboard events
  DASHBOARD_UPDATE: 'dashboard:update',
  STATS_UPDATE: 'stats:update'
} as const;

export type SocketEventName = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS];
