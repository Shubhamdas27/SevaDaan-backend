import mongoose from 'mongoose';
import Notification from '../models/Notification';
import { getSocketServer } from '../socket/socketServer';
import logger from '../utils/logger';

export interface NotificationData {
  userId: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: 'grant' | 'volunteer' | 'donation' | 'general';
  actionUrl?: string;
  metadata?: {
    grantId?: mongoose.Types.ObjectId;
    volunteerId?: mongoose.Types.ObjectId;
    donationId?: mongoose.Types.ObjectId;
    ngoId?: mongoose.Types.ObjectId;
  };
}

class NotificationService {
  /**
   * Create a new notification
   */
  async createNotification(data: NotificationData): Promise<void> {
    try {
      const notification = new Notification(data);
      await notification.save();

      // Emit real-time notification via Socket.IO
      const socketServer = getSocketServer();
      if (socketServer) {
        const io = socketServer.getIO();
        io.to(`user:${data.userId}`).emit('notification', {
          id: notification._id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          actionUrl: notification.actionUrl,
          createdAt: notification.createdAt
        });
      }

      logger.info(`Notification created for user ${data.userId}: ${data.title}`);
    } catch (error) {
      logger.error('Error creating notification:', error);
    }
  }

  /**
   * Create notification for multiple users
   */
  async createBulkNotifications(notifications: NotificationData[]): Promise<void> {
    try {
      const createdNotifications = await Notification.insertMany(notifications);
      
      const socketServer = getSocketServer();
      if (socketServer) {
        const io = socketServer.getIO();
        createdNotifications.forEach((notification) => {
          io.to(`user:${notification.userId}`).emit('notification', {
            id: notification._id,
            title: notification.title,
            message: notification.message,
            type: notification.type,
            actionUrl: notification.actionUrl,
            createdAt: notification.createdAt
          });
        });
      }

      logger.info(`${notifications.length} bulk notifications created`);
    } catch (error) {
      logger.error('Error creating bulk notifications:', error);
    }
  }

  /**
   * Notify when a grant is posted
   */
  async notifyGrantPosted(
    grantId: mongoose.Types.ObjectId,
    grantTitle: string,
    ngoId: mongoose.Types.ObjectId,
    ngoMembers: mongoose.Types.ObjectId[]
  ): Promise<void> {
    const notifications: NotificationData[] = ngoMembers.map(userId => ({
      userId,
      title: 'New Grant Posted',
      message: `Grant "${grantTitle}" has been successfully posted.`,
      type: 'grant' as const,
      actionUrl: `/grants/${grantId}`,
      metadata: { grantId, ngoId }
    }));

    await this.createBulkNotifications(notifications);
  }

  /**
   * Notify when someone applies to volunteer
   */
  async notifyVolunteerApplication(
    volunteerId: mongoose.Types.ObjectId,
    volunteerName: string,
    ngoId: mongoose.Types.ObjectId,
    ngoManagers: mongoose.Types.ObjectId[],
    grantId?: mongoose.Types.ObjectId
  ): Promise<void> {
    const notifications: NotificationData[] = ngoManagers.map(userId => ({
      userId,
      title: 'New Volunteer Application',
      message: `${volunteerName} has applied to volunteer with your organization.`,
      type: 'volunteer' as const,
      actionUrl: `/volunteer-applications/${volunteerId}`,
      metadata: { volunteerId, ngoId, grantId }
    }));

    await this.createBulkNotifications(notifications);
  }

  /**
   * Notify when a donation is made
   */
  async notifyDonationReceived(
    donationId: mongoose.Types.ObjectId,
    donorName: string,
    amount: number,
    currency: string,
    grantId: mongoose.Types.ObjectId,
    ngoId: mongoose.Types.ObjectId,
    ngoMembers: mongoose.Types.ObjectId[]
  ): Promise<void> {
    const notifications: NotificationData[] = ngoMembers.map(userId => ({
      userId,
      title: 'New Donation Received',
      message: `${donorName} donated ${currency} ${amount} to your grant.`,
      type: 'donation' as const,
      actionUrl: `/donations/${donationId}`,
      metadata: { donationId, grantId, ngoId }
    }));

    await this.createBulkNotifications(notifications);
  }

  /**
   * Notify when volunteer application status changes
   */
  async notifyVolunteerStatusUpdate(
    userId: mongoose.Types.ObjectId,
    status: 'accepted' | 'rejected',
    ngoName: string,
    volunteerId: mongoose.Types.ObjectId
  ): Promise<void> {
    const title = status === 'accepted' ? 'Volunteer Application Accepted' : 'Volunteer Application Update';
    const message = status === 'accepted' 
      ? `Congratulations! Your volunteer application with ${ngoName} has been accepted.`
      : `Your volunteer application with ${ngoName} has been reviewed.`;

    await this.createNotification({
      userId,
      title,
      message,
      type: 'volunteer',
      actionUrl: `/volunteer-activities`,
      metadata: { volunteerId }
    });
  }

  /**
   * Notify about grant status updates
   */
  async notifyGrantStatusUpdate(
    userId: mongoose.Types.ObjectId,
    grantTitle: string,
    status: string,
    grantId: mongoose.Types.ObjectId
  ): Promise<void> {
    const statusMessages: { [key: string]: string } = {
      'approved': 'Grant Approved',
      'rejected': 'Grant Application Update',
      'disbursed': 'Grant Funds Disbursed',
      'under_review': 'Grant Under Review'
    };

    const title = statusMessages[status] || 'Grant Status Update';
    const message = `Your grant "${grantTitle}" status has been updated to ${status}.`;

    await this.createNotification({
      userId,
      title,
      message,
      type: 'grant',
      actionUrl: `/grants/${grantId}`,
      metadata: { grantId }
    });
  }
}

// Export singleton instance
export default new NotificationService();
