import { getSocketServer } from './socketServer';
import { 
  DonationSocketData, 
  VolunteerSocketData, 
  ApplicationSocketData, 
  ReferralSocketData, 
  GrantSocketData, 
  ProgramSocketData, 
  NotificationSocketData,
  SOCKET_EVENTS 
} from './socketTypes';
import logger from '../utils/logger';

export class SocketService {
  private static getInstance() {
    const socketServer = getSocketServer();
    if (!socketServer) {
      logger.warn('Socket server not initialized. Events will not be emitted.');
      return null;
    }
    return socketServer;
  }

  // Donation events
  static emitNewDonation(data: DonationSocketData) {
    const socketServer = this.getInstance();
    if (!socketServer) return;

    // Emit to NGO
    socketServer.emitToNGO(data.ngoId, SOCKET_EVENTS.DONATION_NEW, data);
    
    // Emit to NGO managers
    socketServer.emitToRole('NGO_Manager', SOCKET_EVENTS.DONATION_NEW, data);
    
    // Emit to admins
    socketServer.emitToRole('Admin', SOCKET_EVENTS.DONATION_NEW, data);

    logger.info(`Donation event emitted: ${data.donationId}`);
  }

  // Volunteer events
  static emitVolunteerUpdate(data: VolunteerSocketData) {
    const socketServer = this.getInstance();
    if (!socketServer) return;

    // Emit to volunteer
    socketServer.emitToUser(data.volunteerId, SOCKET_EVENTS.VOLUNTEER_UPDATE, data);
    
    // Emit to NGO if applicable
    if (data.ngoId) {
      socketServer.emitToNGO(data.ngoId, SOCKET_EVENTS.VOLUNTEER_UPDATE, data);
    }

    logger.info(`Volunteer update emitted: ${data.volunteerId}`);
  }

  // Application events
  static emitApplicationStatusChange(data: ApplicationSocketData) {
    const socketServer = this.getInstance();
    if (!socketServer) return;

    // Emit to applicant
    socketServer.emitToUser(data.applicantId, SOCKET_EVENTS.APPLICATION_STATUS_CHANGED, data);
    
    // Emit to NGO
    socketServer.emitToNGO(data.ngoId, SOCKET_EVENTS.APPLICATION_STATUS_CHANGED, data);
    
    // Emit to NGO managers
    socketServer.emitToRole('NGO_Manager', SOCKET_EVENTS.APPLICATION_STATUS_CHANGED, data);

    logger.info(`Application status change emitted: ${data.applicationId}`);
  }

  static emitNewApplication(data: ApplicationSocketData) {
    const socketServer = this.getInstance();
    if (!socketServer) return;

    // Emit to NGO
    socketServer.emitToNGO(data.ngoId, SOCKET_EVENTS.APPLICATION_NEW, data);
    
    // Emit to NGO managers
    socketServer.emitToRole('NGO_Manager', SOCKET_EVENTS.APPLICATION_NEW, data);

    logger.info(`New application emitted: ${data.applicationId}`);
  }

  // Referral events
  static emitReferralUpdate(data: ReferralSocketData) {
    const socketServer = this.getInstance();
    if (!socketServer) return;

    // Emit to both NGOs
    socketServer.emitToNGO(data.fromNgoId, SOCKET_EVENTS.REFERRAL_UPDATE, data);
    socketServer.emitToNGO(data.toNgoId, SOCKET_EVENTS.REFERRAL_UPDATE, data);
    
    // Emit to citizen
    socketServer.emitToUser(data.citizenId, SOCKET_EVENTS.REFERRAL_UPDATE, data);
    
    // Emit to NGO managers
    socketServer.emitToRole('NGO_Manager', SOCKET_EVENTS.REFERRAL_UPDATE, data);

    logger.info(`Referral update emitted: ${data.referralId}`);
  }

  // Grant events
  static emitGrantUpdate(data: GrantSocketData) {
    const socketServer = this.getInstance();
    if (!socketServer) return;

    // Emit to NGO
    socketServer.emitToNGO(data.ngoId, SOCKET_EVENTS.GRANT_UPDATE, data);
    
    // Emit to admins
    socketServer.emitToRole('Admin', SOCKET_EVENTS.GRANT_UPDATE, data);

    logger.info(`Grant update emitted: ${data.grantId}`);
  }

  // Program events
  static emitNewProgram(data: ProgramSocketData) {
    const socketServer = this.getInstance();
    if (!socketServer) return;

    // Emit to all volunteers
    socketServer.emitToRole('Volunteer', SOCKET_EVENTS.PROGRAM_NEW, data);
    
    // Emit to all citizens
    socketServer.emitToRole('Citizen', SOCKET_EVENTS.PROGRAM_NEW, data);
    
    // Emit to NGO managers
    socketServer.emitToRole('NGO_Manager', SOCKET_EVENTS.PROGRAM_NEW, data);

    logger.info(`New program emitted: ${data.programId}`);
  }

  static emitProgramUpdate(data: ProgramSocketData) {
    const socketServer = this.getInstance();
    if (!socketServer) return;

    // Emit to NGO
    socketServer.emitToNGO(data.ngoId, SOCKET_EVENTS.PROGRAM_UPDATE, data);

    logger.info(`Program update emitted: ${data.programId}`);
  }

  // Notification events
  static emitNotificationToUser(userId: string, data: NotificationSocketData) {
    const socketServer = this.getInstance();
    if (!socketServer) return;

    socketServer.emitToUser(userId, SOCKET_EVENTS.NOTIFICATION_NEW, data);
    logger.info(`Notification emitted to user: ${userId}`);
  }

  static emitNotificationToRole(role: string, data: NotificationSocketData) {
    const socketServer = this.getInstance();
    if (!socketServer) return;

    socketServer.emitToRole(role, SOCKET_EVENTS.NOTIFICATION_NEW, data);
    logger.info(`Notification emitted to role: ${role}`);
  }

  static emitNotificationToNGO(ngoId: string, data: NotificationSocketData) {
    const socketServer = this.getInstance();
    if (!socketServer) return;

    socketServer.emitToNGO(ngoId, SOCKET_EVENTS.NOTIFICATION_NEW, data);
    logger.info(`Notification emitted to NGO: ${ngoId}`);
  }

  // Dashboard/Stats updates
  static emitDashboardUpdate(role: string, data: any) {
    const socketServer = this.getInstance();
    if (!socketServer) return;

    socketServer.emitToRole(role, SOCKET_EVENTS.DASHBOARD_UPDATE, data);
    logger.info(`Dashboard update emitted to role: ${role}`);
  }

  static emitStatsUpdate(ngoId: string, data: any) {
    const socketServer = this.getInstance();
    if (!socketServer) return;

    socketServer.emitToNGO(ngoId, SOCKET_EVENTS.STATS_UPDATE, data);
    logger.info(`Stats update emitted to NGO: ${ngoId}`);
  }

  // Enhanced payment and dashboard methods
  static emitToUser(userId: string, event: string, data: any) {
    const socketServer = this.getInstance();
    if (!socketServer) return;

    socketServer.emitToUser(userId, event, data);
    logger.info(`Event ${event} emitted to user: ${userId}`);
  }

  static emitToNGO(ngoId: string, event: string, data: any) {
    const socketServer = this.getInstance();
    if (!socketServer) return;

    socketServer.emitToNGO(ngoId, event, data);
    logger.info(`Event ${event} emitted to NGO: ${ngoId}`);
  }

  static emitToRole(role: string, event: string, data: any) {
    const socketServer = this.getInstance();
    if (!socketServer) return;

    socketServer.emitToRole(role, event, data);
    logger.info(`Event ${event} emitted to role: ${role}`);
  }

  // Real-time dashboard updates
  static emitDashboardRefresh(targetType: 'user' | 'ngo' | 'role', targetId: string, dashboardType?: string) {
    const socketServer = this.getInstance();
    if (!socketServer) return;

    const event = 'dashboard_refresh';
    const data = { 
      timestamp: new Date().toISOString(),
      dashboardType: dashboardType || 'all'
    };

    switch (targetType) {
      case 'user':
        socketServer.emitToUser(targetId, event, data);
        break;
      case 'ngo':
        socketServer.emitToNGO(targetId, event, data);
        break;
      case 'role':
        socketServer.emitToRole(targetId, event, data);
        break;
    }

    logger.info(`Dashboard refresh emitted to ${targetType}: ${targetId}`);
  }

  // Real-time counter updates
  static emitCounterUpdate(targetType: 'user' | 'ngo' | 'role', targetId: string, counters: Record<string, number>) {
    const socketServer = this.getInstance();
    if (!socketServer) return;

    const event = 'counter_update';
    const data = { 
      timestamp: new Date().toISOString(),
      counters
    };

    switch (targetType) {
      case 'user':
        socketServer.emitToUser(targetId, event, data);
        break;
      case 'ngo':
        socketServer.emitToNGO(targetId, event, data);
        break;
      case 'role':
        socketServer.emitToRole(targetId, event, data);
        break;
    }

    logger.info(`Counter update emitted to ${targetType}: ${targetId}`);
  }

  // Activity feed updates
  static emitActivityUpdate(targetType: 'user' | 'ngo' | 'role', targetId: string, activity: any) {
    const socketServer = this.getInstance();
    if (!socketServer) return;

    const event = 'activity_update';
    const data = { 
      timestamp: new Date().toISOString(),
      activity
    };

    switch (targetType) {
      case 'user':
        socketServer.emitToUser(targetId, event, data);
        break;
      case 'ngo':
        socketServer.emitToNGO(targetId, event, data);
        break;
      case 'role':
        socketServer.emitToRole(targetId, event, data);
        break;
    }

    logger.info(`Activity update emitted to ${targetType}: ${targetId}`);
  }

  // Manager events
  static emitManagerAdded(ngoId: string, manager: any) {
    const socketServer = this.getInstance();
    if (!socketServer) return;

    // Emit to NGO
    socketServer.emitToNGO(ngoId, SOCKET_EVENTS.MANAGER_ADDED, manager);
    
    // Emit to NGO managers
    socketServer.emitToRole('NGO_Manager', SOCKET_EVENTS.MANAGER_ADDED, manager);
    
    // Emit to admins
    socketServer.emitToRole('Admin', SOCKET_EVENTS.MANAGER_ADDED, manager);

    logger.info(`Manager added event emitted: ${manager._id}`);
  }

  static emitManagerUpdated(ngoId: string, manager: any) {
    const socketServer = this.getInstance();
    if (!socketServer) return;

    // Emit to NGO
    socketServer.emitToNGO(ngoId, SOCKET_EVENTS.MANAGER_UPDATED, manager);
    
    // Emit to NGO managers
    socketServer.emitToRole('NGO_Manager', SOCKET_EVENTS.MANAGER_UPDATED, manager);
    
    // Emit to the specific manager
    if (manager.userId?._id) {
      socketServer.emitToUser(manager.userId._id, SOCKET_EVENTS.MANAGER_UPDATED, manager);
    }

    logger.info(`Manager updated event emitted: ${manager._id}`);
  }

  static emitManagerDeleted(ngoId: string, data: { managerId: string; email: string }) {
    const socketServer = this.getInstance();
    if (!socketServer) return;

    // Emit to NGO
    socketServer.emitToNGO(ngoId, SOCKET_EVENTS.MANAGER_DELETED, data);
    
    // Emit to NGO managers
    socketServer.emitToRole('NGO_Manager', SOCKET_EVENTS.MANAGER_DELETED, data);
    
    // Emit to admins
    socketServer.emitToRole('Admin', SOCKET_EVENTS.MANAGER_DELETED, data);

    logger.info(`Manager deleted event emitted: ${data.managerId}`);
  }

  // Utility methods
  static emitToAll(event: string, data: any) {
    const socketServer = this.getInstance();
    if (!socketServer) return;

    socketServer.emitToAll(event, data);
    logger.info(`Event emitted to all: ${event}`);
  }
}

export const socketService = SocketService;
export default SocketService;
