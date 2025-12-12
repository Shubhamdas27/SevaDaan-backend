import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: 'grant' | 'volunteer' | 'donation' | 'general';
  read: boolean;
  actionUrl?: string;
  metadata?: {
    grantId?: mongoose.Types.ObjectId;
    volunteerId?: mongoose.Types.ObjectId;
    donationId?: mongoose.Types.ObjectId;
    ngoId?: mongoose.Types.ObjectId;
  };
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema: Schema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    trim: true,
    maxLength: [200, 'Title cannot exceed 200 characters']
  },
  message: {
    type: String,
    required: [true, 'Notification message is required'],
    trim: true,
    maxLength: [1000, 'Message cannot exceed 1000 characters']
  },
  type: {
    type: String,
    required: [true, 'Notification type is required'],
    enum: ['grant', 'volunteer', 'donation', 'general'],
    index: true
  },
  read: {
    type: Boolean,
    default: false,
    index: true
  },
  actionUrl: {
    type: String,
    trim: true
  },
  metadata: {
    grantId: {
      type: Schema.Types.ObjectId,
      ref: 'Grant'
    },
    volunteerId: {
      type: Schema.Types.ObjectId,
      ref: 'Volunteer'
    },
    donationId: {
      type: Schema.Types.ObjectId,
      ref: 'Donation'
    },
    ngoId: {
      type: Schema.Types.ObjectId,
      ref: 'NGO'
    }
  }
}, {
  timestamps: true
});

// Indexes for performance
NotificationSchema.index({ userId: 1, read: 1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ type: 1, createdAt: -1 });

// Method to mark notification as read
NotificationSchema.methods.markAsRead = function(this: INotification) {
  this.read = true;
  return this.save();
};

// Static method to create notification
NotificationSchema.statics.createNotification = async function(
  userId: mongoose.Types.ObjectId,
  title: string,
  message: string,
  type: string,
  actionUrl?: string,
  metadata?: any
) {
  const notification = new this({
    userId,
    title,
    message,
    type,
    actionUrl,
    metadata
  });
  return await notification.save();
};

// Static method to get unread count
NotificationSchema.statics.getUnreadCount = async function(userId: mongoose.Types.ObjectId) {
  return await this.countDocuments({ userId, read: false });
};

export default mongoose.model<INotification>('Notification', NotificationSchema);
