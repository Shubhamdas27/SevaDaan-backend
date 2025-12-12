import { Request, Response } from 'express';
import Contact from '../models/Contact';
import logger from '../utils/logger';

// Create contact message
export const createContact = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      email,
      phone,
      subject,
      message,
      type,
      priority,
      attachmentUrls,
      tags
    } = req.body;

    const contact = new Contact({
      name,
      email,
      phone,
      subject,
      message,
      type,
      priority,
      attachmentUrls: attachmentUrls || [],
      tags: tags || []
    });

    await contact.save();

    res.status(201).json({
      success: true,
      message: 'Contact message submitted successfully',
      data: contact
    });

    logger.info(`Contact message created: ${contact._id} from ${email}`);
  } catch (error: any) {
    logger.error('Error creating contact message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit contact message',
      error: error.message
    });
  }
};

// Get contact messages with filters (Admin only)
export const getContacts = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      status,
      type,
      priority,
      assigned,
      read,
      page = '1',
      limit = '10',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Check admin permissions
    if (!['admin', 'ngo'].includes(req.user?.role || '')) {
      res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
      return;
    }

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    // Build query
    const query: any = {};

    if (status) query.status = status;
    if (type) query.type = type;
    if (priority) query.priority = priority;
    if (assigned === 'true') query.assignedTo = { $exists: true };
    if (assigned === 'false') query.assignedTo = { $exists: false };
    if (read === 'true') query.isRead = true;
    if (read === 'false') query.isRead = false;

    // Build sort object
    const sortObj: any = {};
    sortObj[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

    const [contacts, total] = await Promise.all([
      Contact.find(query)
        .populate('assignedTo', 'name email')
        .populate('responseBy', 'name')
        .populate('readBy', 'name')
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Contact.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: contacts,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalItems: total,
        itemsPerPage: limitNum,
        hasNextPage: pageNum < Math.ceil(total / limitNum),
        hasPrevPage: pageNum > 1
      }
    });
  } catch (error: any) {
    logger.error('Error fetching contact messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contact messages',
      error: error.message
    });
  }
};

// Get single contact message (Admin only)
export const getContact = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check admin permissions
    if (!['admin', 'ngo'].includes(req.user?.role || '')) {
      res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
      return;
    }

    const contact = await Contact.findById(id)
      .populate('assignedTo', 'name email')
      .populate('responseBy', 'name')
      .populate('readBy', 'name');

    if (!contact) {
      res.status(404).json({
        success: false,
        message: 'Contact message not found'
      });
      return;
    }

    // Mark as read if not already read
    if (!contact.isRead) {
      await (contact as any).markAsRead(req.user?._id);
    }

    res.json({
      success: true,
      data: contact
    });
  } catch (error: any) {
    logger.error('Error fetching contact message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contact message',
      error: error.message
    });
  }
};

// Assign contact to admin (Admin only)
export const assignContact = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { assignToUserId } = req.body;
    const userId = req.user?._id?.toString();

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    // Check admin permissions
    if (!['admin', 'ngo'].includes(req.user?.role || '')) {
      res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
      return;
    }

    const contact = await Contact.findById(id);
    if (!contact) {
      res.status(404).json({
        success: false,
        message: 'Contact message not found'
      });
      return;
    }

    await (contact as any).assignTo(assignToUserId || userId);

    const updatedContact = await Contact.findById(id)
      .populate('assignedTo', 'name email');

    res.json({
      success: true,
      message: 'Contact message assigned successfully',
      data: updatedContact
    });

    logger.info(`Contact ${id} assigned to user ${assignToUserId || userId} by admin ${userId}`);
  } catch (error: any) {
    logger.error('Error assigning contact message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign contact message',
      error: error.message
    });
  }
};

// Respond to contact message (Admin only)
export const respondToContact = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { responseMessage } = req.body;
    const userId = req.user?._id?.toString();

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    // Check admin permissions
    if (!['admin', 'ngo'].includes(req.user?.role || '')) {
      res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
      return;
    }

    if (!responseMessage) {
      res.status(400).json({
        success: false,
        message: 'Response message is required'
      });
      return;
    }

    const contact = await Contact.findById(id);
    if (!contact) {
      res.status(404).json({
        success: false,
        message: 'Contact message not found'
      });
      return;
    }

    await (contact as any).respond(responseMessage, userId);

    const updatedContact = await Contact.findById(id)
      .populate('responseBy', 'name');

    res.json({
      success: true,
      message: 'Response sent successfully',
      data: updatedContact
    });

    logger.info(`Contact ${id} responded to by admin ${userId}`);
  } catch (error: any) {
    logger.error('Error responding to contact message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to respond to contact message',
      error: error.message
    });
  }
};

// Close contact message (Admin only)
export const closeContact = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?._id?.toString();

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    // Check admin permissions
    if (!['admin', 'ngo'].includes(req.user?.role || '')) {
      res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
      return;
    }

    const contact = await Contact.findById(id);
    if (!contact) {
      res.status(404).json({
        success: false,
        message: 'Contact message not found'
      });
      return;
    }

    await (contact as any).close();

    res.json({
      success: true,
      message: 'Contact message closed successfully',
      data: contact
    });

    logger.info(`Contact ${id} closed by admin ${userId}`);
  } catch (error: any) {
    logger.error('Error closing contact message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to close contact message',
      error: error.message
    });
  }
};

// Get unread contact messages (Admin only)
export const getUnreadContacts = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check admin permissions
    if (!['admin', 'ngo'].includes(req.user?.role || '')) {
      res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
      return;
    }

    const unreadContacts = await (Contact as any).getUnread();

    res.json({
      success: true,
      data: unreadContacts
    });
  } catch (error: any) {
    logger.error('Error fetching unread contact messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unread contact messages',
      error: error.message
    });
  }
};

// Get contact statistics (Admin only)
export const getContactStats = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check admin permissions
    if (!['admin', 'ngo'].includes(req.user?.role || '')) {
      res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
      return;
    }

    const stats = await (Contact as any).getStatistics();

    res.json({
      success: true,
      data: stats[0] || {
        totalContacts: 0,
        newContacts: 0,
        inProgressContacts: 0,
        resolvedContacts: 0,
        closedContacts: 0,
        unreadContacts: 0,
        averageResponseTime: 0,
        contactsByType: []
      }
    });
  } catch (error: any) {
    logger.error('Error fetching contact statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contact statistics',
      error: error.message
    });
  }
};
