import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import Event from '../models/Event';
import EventRegistration from '../models/EventRegistration';
import NGO from '../models/NGO';
import logger from '../utils/logger';
import { uploadFile } from '../utils/fileUpload';

// Event Management Controller
export class EventController {

  /**
   * Create new event
   */
  static async createEvent(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?._id;
      
      // Find user's NGO
      const ngo = await NGO.findOne({ adminId: userId });
      if (!ngo) {
        res.status(404).json({
          success: false,
          message: 'NGO not found'
        });
        return;
      }

      const eventData = {
        ...req.body,
        ngo: ngo._id,
        createdBy: userId
      };

      const event = new Event(eventData);
      await event.save();

      await event.populate([
        { path: 'ngo', select: 'name logo' },
        { path: 'createdBy', select: 'name email' }
      ]);

      res.status(201).json({
        success: true,
        message: 'Event created successfully',
        data: event
      });

      logger.info(`Event created: ${event._id} by user: ${userId}`);
    } catch (error: any) {
      logger.error('Error creating event:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create event',
        error: error.message
      });
    }
  }

  /**
   * Get events with filters and pagination
   */
  static async getEvents(req: Request, res: Response): Promise<void> {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        eventType,
        category,
        ngoId,
        featured,
        upcoming,
        search,
        city,
        state
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Build filter query
      const filter: any = {};

      if (status) filter.status = status;
      if (eventType) filter.eventType = eventType;
      if (category) filter.category = category;
      if (ngoId) filter.ngo = ngoId;
      if (featured === 'true') filter.featured = true;

      if (upcoming === 'true') {
        filter.startDate = { $gte: new Date() };
      }

      if (search) {
        filter.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { tags: { $in: [new RegExp(search as string, 'i')] } }
        ];
      }

      if (city) filter['location.city'] = new RegExp(city as string, 'i');
      if (state) filter['location.state'] = new RegExp(state as string, 'i');

      const [events, total] = await Promise.all([
        Event.find(filter)
          .populate('ngo', 'name logo')
          .populate('createdBy', 'name')
          .sort({ startDate: 1, createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Event.countDocuments(filter)
      ]);

      res.json({
        success: true,
        data: {
          events,
          pagination: {
            currentPage: pageNum,
            totalPages: Math.ceil(total / limitNum),
            totalItems: total,
            itemsPerPage: limitNum
          }
        }
      });
    } catch (error: any) {
      logger.error('Error fetching events:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch events',
        error: error.message
      });
    }
  }

  /**
   * Get event by ID
   */
  static async getEventById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const event = await Event.findById(id)
        .populate('ngo', 'name logo email phone website')
        .populate('createdBy', 'name email')
        .populate('feedback.attendee', 'name');

      if (!event) {
        res.status(404).json({
          success: false,
          message: 'Event not found'
        });
        return;
      }

      res.json({
        success: true,
        data: event
      });
    } catch (error: any) {
      logger.error('Error fetching event:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch event',
        error: error.message
      });
    }
  }

  /**
   * Update event
   */
  static async updateEvent(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?._id;

      const event = await Event.findById(id);
      if (!event) {
        res.status(404).json({
          success: false,
          message: 'Event not found'
        });
        return;
      }

      // Check if user has permission to update
      const ngo = await NGO.findOne({ adminId: userId });
      if (!ngo || event.ngo.toString() !== ngo._id.toString()) {
        res.status(403).json({
          success: false,
          message: 'Access denied'
        });
        return;
      }

      Object.assign(event, req.body);
      await event.save();

      await event.populate([
        { path: 'ngo', select: 'name logo' },
        { path: 'createdBy', select: 'name email' }
      ]);

      res.json({
        success: true,
        message: 'Event updated successfully',
        data: event
      });

      logger.info(`Event updated: ${event._id} by user: ${userId}`);
    } catch (error: any) {
      logger.error('Error updating event:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update event',
        error: error.message
      });
    }
  }

  /**
   * Delete event
   */
  static async deleteEvent(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?._id;

      const event = await Event.findById(id);
      if (!event) {
        res.status(404).json({
          success: false,
          message: 'Event not found'
        });
        return;
      }

      // Check permissions
      const ngo = await NGO.findOne({ adminId: userId });
      if (!ngo || event.ngo.toString() !== ngo._id.toString()) {
        res.status(403).json({
          success: false,
          message: 'Access denied'
        });
        return;
      }

      // Check if event has registrations
      const registrationCount = await EventRegistration.countDocuments({ event: id });
      if (registrationCount > 0) {
        res.status(400).json({
          success: false,
          message: 'Cannot delete event with existing registrations'
        });
        return;
      }

      await Event.findByIdAndDelete(id);

      res.json({
        success: true,
        message: 'Event deleted successfully'
      });

      logger.info(`Event deleted: ${id} by user: ${userId}`);
    } catch (error: any) {
      logger.error('Error deleting event:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete event',
        error: error.message
      });
    }
  }

  /**
   * Register for event
   */
  static async registerForEvent(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?._id;
      const { attendees = 1, specialRequirements } = req.body;

      const event = await Event.findById(id);
      if (!event) {
        res.status(404).json({
          success: false,
          message: 'Event not found'
        });
        return;
      }

      // Check if registration is open
      if (!event.canUserRegister()) {
        res.status(400).json({
          success: false,
          message: 'Registration is not available for this event'
        });
        return;
      }

      // Check if user already registered
      const existingRegistration = await EventRegistration.findOne({
        event: id,
        user: userId
      });

      if (existingRegistration) {
        res.status(400).json({
          success: false,
          message: 'You are already registered for this event'
        });
        return;
      }

      // Check available spots
      if (event.maxAttendees && (event.currentAttendees + attendees) > event.maxAttendees) {
        res.status(400).json({
          success: false,
          message: 'Not enough spots available'
        });
        return;
      }

      // Create registration
      const registration = new EventRegistration({
        event: id,
        user: userId,
        attendees,
        specialRequirements,
        status: 'confirmed'
      });

      await registration.save();

      // Update event attendee count
      event.currentAttendees += attendees;
      await event.save();

      res.status(201).json({
        success: true,
        message: 'Successfully registered for event',
        data: registration
      });

      logger.info(`User ${userId} registered for event ${id}`);
    } catch (error: any) {
      logger.error('Error registering for event:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to register for event',
        error: error.message
      });
    }
  }

  /**
   * Get event registrations
   */
  static async getEventRegistrations(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?._id;

      // Check if user has permission to view registrations
      const event = await Event.findById(id);
      if (!event) {
        res.status(404).json({
          success: false,
          message: 'Event not found'
        });
        return;
      }

      const ngo = await NGO.findOne({ adminId: userId });
      if (!ngo || event.ngo.toString() !== ngo._id.toString()) {
        res.status(403).json({
          success: false,
          message: 'Access denied'
        });
        return;
      }

      const registrations = await EventRegistration.find({ event: id })
        .populate('user', 'name email phone')
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        data: registrations
      });
    } catch (error: any) {
      logger.error('Error fetching event registrations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch registrations',
        error: error.message
      });
    }
  }

  /**
   * Mark attendance
   */
  static async markAttendance(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id, registrationId } = req.params;
      const { attended, notes } = req.body;
      const userId = req.user?._id;

      // Check permissions
      const event = await Event.findById(id);
      if (!event) {
        res.status(404).json({
          success: false,
          message: 'Event not found'
        });
        return;
      }

      const ngo = await NGO.findOne({ adminId: userId });
      if (!ngo || event.ngo.toString() !== ngo._id.toString()) {
        res.status(403).json({
          success: false,
          message: 'Access denied'
        });
        return;
      }

      const registration = await EventRegistration.findById(registrationId);
      if (!registration) {
        res.status(404).json({
          success: false,
          message: 'Registration not found'
        });
        return;
      }

      registration.attendance = {
        attended,
        markedBy: userId!,
        markedAt: new Date(),
        notes
      };

      await registration.save();

      res.json({
        success: true,
        message: 'Attendance marked successfully',
        data: registration
      });

      logger.info(`Attendance marked for registration ${registrationId} by user ${userId}`);
    } catch (error: any) {
      logger.error('Error marking attendance:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark attendance',
        error: error.message
      });
    }
  }

  /**
   * Add event feedback
   */
  static async addFeedback(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { rating, comment } = req.body;
      const userId = req.user?._id;

      const event = await Event.findById(id);
      if (!event) {
        res.status(404).json({
          success: false,
          message: 'Event not found'
        });
        return;
      }

      // Check if user attended the event
      const registration = await EventRegistration.findOne({
        event: id,
        user: userId,
        'attendance.attended': true
      });

      if (!registration) {
        res.status(400).json({
          success: false,
          message: 'You must have attended the event to provide feedback'
        });
        return;
      }

      // Check if feedback already exists
      const existingFeedback = event.feedback?.find(
        f => f.attendee.toString() === userId?.toString()
      );

      if (existingFeedback) {
        res.status(400).json({
          success: false,
          message: 'You have already provided feedback for this event'
        });
        return;
      }

      // Add feedback
      const feedback = {
        attendee: userId!,
        rating,
        comment,
        submittedAt: new Date()
      };

      if (!event.feedback) event.feedback = [];
      event.feedback.push(feedback);
      await event.save();

      res.json({
        success: true,
        message: 'Feedback added successfully',
        data: feedback
      });

      logger.info(`Feedback added for event ${id} by user ${userId}`);
    } catch (error: any) {
      logger.error('Error adding feedback:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add feedback',
        error: error.message
      });
    }
  }

  /**
   * Upload event images
   */
  static async uploadEventImages(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const files = req.files as Express.Multer.File[];
      const userId = req.user?._id;

      if (!files || files.length === 0) {
        res.status(400).json({
          success: false,
          message: 'No files uploaded'
        });
        return;
      }

      const event = await Event.findById(id);
      if (!event) {
        res.status(404).json({
          success: false,
          message: 'Event not found'
        });
        return;
      }

      // Check permissions
      const ngo = await NGO.findOne({ adminId: userId });
      if (!ngo || event.ngo.toString() !== ngo._id.toString()) {
        res.status(403).json({
          success: false,
          message: 'Access denied'
        });
        return;
      }

      // Upload files
      const imageUrls: string[] = [];
      if (files && files.length > 0) {
        for (const file of files) {
          // For now, just use the filename - this should be replaced with actual upload logic
          const fileName = `${Date.now()}-${file.originalname}`;
          imageUrls.push(fileName);
        }
      }

      // Add to event images
      event.images.push(...imageUrls);
      await event.save();

      res.json({
        success: true,
        message: 'Images uploaded successfully',
        data: { imageUrls }
      });

      logger.info(`Images uploaded for event ${id} by user ${userId}`);
    } catch (error: any) {
      logger.error('Error uploading event images:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload images',
        error: error.message
      });
    }
  }
}
