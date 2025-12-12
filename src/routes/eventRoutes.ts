import express from 'express';
import { EventController } from '../controllers/eventController';
import { authenticate } from '../middleware/authMiddleware';
import { requirePermission } from '../middleware/roleMiddleware';
import { uploadSingleFile } from '../utils/fileUpload';
import { Request, Response } from 'express';

const router = express.Router();

// ==================== EVENT MANAGEMENT ====================

/**
 * @route   POST /api/v1/events
 * @desc    Create new event
 * @access  Private (NGO Admin/Manager)
 */
router.post('/', [
  authenticate,
  requirePermission('events_write')
], EventController.createEvent);

/**
 * @route   GET /api/v1/events
 * @desc    Get all events (with filtering and pagination)
 * @access  Public
 */
router.get('/', EventController.getEvents);

/**
 * @route   GET /api/v1/events/:id
 * @desc    Get single event by ID
 * @access  Public
 */
router.get('/:id', EventController.getEventById);

/**
 * @route   PUT /api/v1/events/:id
 * @desc    Update event
 * @access  Private (NGO Admin/Manager)
 */
router.put('/:id', [
  authenticate,
  requirePermission('events_write')
], EventController.updateEvent);

/**
 * @route   DELETE /api/v1/events/:id
 * @desc    Delete event
 * @access  Private (NGO Admin/Manager)
 */
router.delete('/:id', [
  authenticate,
  requirePermission('events_write')
], EventController.deleteEvent);

// ==================== EVENT REGISTRATION ====================

/**
 * @route   POST /api/v1/events/:id/register
 * @desc    Register for an event
 * @access  Private (Any authenticated user)
 */
router.post('/:id/register', [
  authenticate,
  requirePermission('events_register')
], EventController.registerForEvent);

/**
 * @route   GET /api/v1/events/:id/registrations
 * @desc    Get event registrations (NGO staff only)
 * @access  Private (NGO Admin/Manager)
 */
router.get('/:id/registrations', [
  authenticate,
  requirePermission('events_manage')
], EventController.getEventRegistrations);

// ==================== EVENT ATTENDANCE ====================

/**
 * @route   POST /api/v1/events/:id/attendance
 * @desc    Mark attendance for event
 * @access  Private (NGO Admin/Manager)
 */
router.post('/:id/attendance', [
  authenticate,
  requirePermission('events_manage')
], EventController.markAttendance);

// ==================== EVENT FEEDBACK ====================

/**
 * @route   POST /api/v1/events/:id/feedback
 * @desc    Submit feedback for attended event
 * @access  Private (Registered attendees only)
 */
router.post('/:id/feedback', [
  authenticate,
  requirePermission('events_feedback')
], EventController.addFeedback);

// ==================== EVENT IMAGES ====================

/**
 * @route   POST /api/v1/events/:id/images
 * @desc    Upload event images
 * @access  Private (NGO Admin/Manager)
 */
router.post('/:id/images', [
  authenticate,
  requirePermission('events_write'),
  uploadSingleFile('image')
], EventController.uploadEventImages);

export default router;
