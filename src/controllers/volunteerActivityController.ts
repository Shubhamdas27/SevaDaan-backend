import { Request, Response } from 'express';
import mongoose from 'mongoose';
import VolunteerActivity from '../models/VolunteerActivity';
import ServiceApplication from '../models/ServiceApplication';
import NGO from '../models/NGO';
import User from '../models/User';
import { AuthRequest } from '../middleware/authMiddleware';
import { asyncHandler } from '../utils/asyncHandler';
import logger from '../utils/logger';

// Create volunteer activity log
export const createVolunteerActivity = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?._id;
  const userRole = req.user?.role;

  if (!userId) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  if (userRole !== 'volunteer') {
    res.status(403).json({ success: false, message: 'Only volunteers can log activities' });
    return;
  }

  const {
    applicationId,
    programId,
    ngoId,
    activityType,
    title,
    description,
    hoursLogged,
    location,
    date,
    notes,
    attachments,
    skillsUsed,
    impactDescription,
    beneficiariesServed
  } = req.body;

  // Verify NGO exists
  const ngo = await NGO.findById(ngoId);
  if (!ngo) {
    res.status(404).json({ success: false, message: 'NGO not found' });
    return;
  }

  // If applicationId is provided, verify volunteer is assigned to it
  if (applicationId) {
    const application = await ServiceApplication.findById(applicationId);
    if (!application) {
      res.status(404).json({ success: false, message: 'Application not found' });
      return;
    }

    if (!application.assignedVolunteer?.equals(userId)) {
      res.status(403).json({ success: false, message: 'You are not assigned to this application' });
      return;
    }
  }

  const activity = new VolunteerActivity({
    volunteerId: userId,
    applicationId,
    programId,
    ngoId,
    activityType,
    title,
    description,
    hoursLogged,
    location,
    date: date || new Date(),
    status: 'completed',
    notes,
    attachments: attachments || [],
    skillsUsed: skillsUsed || [],
    impactDescription,
    beneficiariesServed: beneficiariesServed || 0
  });

  await activity.save();

  await activity.populate([
    { path: 'volunteerId', select: 'name email' },
    { path: 'ngoId', select: 'name email' },
    { path: 'applicationId', select: 'title serviceType' },
    { path: 'programId', select: 'title description' }
  ]);

  logger.info(`Volunteer activity logged: ${activity._id} by volunteer: ${userId}`);

  res.status(201).json({
    success: true,
    data: activity,
    message: 'Activity logged successfully'
  });
});

// Get volunteer activities
export const getVolunteerActivities = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?._id;
  const userRole = req.user?.role;

  if (!userId) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  const {
    volunteerId,
    ngoId,
    applicationId,
    status,
    activityType,
    page = 1,
    limit = 10,
    startDate,
    endDate
  } = req.query;

  let filter: any = {};

  // Role-based filtering
  if (userRole === 'volunteer') {
    // Volunteers see only their activities
    filter.volunteerId = userId;
  } else if (userRole === 'ngo' || userRole === 'ngo_admin' || userRole === 'ngo_manager') {
    // NGO staff see activities for their NGO
    const ngo = await NGO.findOne({
      $or: [
        { adminId: userId },
        { 'managers': userId },
        { 'staff': userId }
      ]
    });

    if (!ngo) {
      res.status(403).json({ success: false, message: 'No NGO association found' });
      return;
    }

    filter.ngoId = ngo._id;

    // Allow filtering by specific volunteer if provided
    if (volunteerId) {
      filter.volunteerId = volunteerId;
    }
  } else {
    res.status(403).json({ success: false, message: 'Insufficient permissions' });
    return;
  }

  // Apply additional filters
  if (ngoId && (userRole !== 'ngo' && userRole !== 'ngo_admin' && userRole !== 'ngo_manager')) {
    filter.ngoId = ngoId;
  }
  if (applicationId) filter.applicationId = applicationId;
  if (status) filter.status = status;
  if (activityType) filter.activityType = activityType;

  // Date range filter
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate as string);
    if (endDate) filter.date.$lte = new Date(endDate as string);
  }

  const pageNumber = parseInt(page as string);
  const limitNumber = parseInt(limit as string);
  const skip = (pageNumber - 1) * limitNumber;

  const activities = await VolunteerActivity.find(filter)
    .populate([
      { path: 'volunteerId', select: 'name email' },
      { path: 'ngoId', select: 'name email logo' },
      { path: 'applicationId', select: 'title serviceType' },
      { path: 'programId', select: 'title description' },
      { path: 'verifiedBy', select: 'name email' }
    ])
    .sort({ date: -1 })
    .skip(skip)
    .limit(limitNumber);

  const total = await VolunteerActivity.countDocuments(filter);

  res.json({
    success: true,
    data: {
      activities,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        pages: Math.ceil(total / limitNumber)
      }
    }
  });
});

// Verify volunteer activity (NGO Manager)
export const verifyVolunteerActivity = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = req.user?._id;
  const userRole = req.user?.role;

  if (!userId) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  if (userRole !== 'ngo_manager' && userRole !== 'ngo_admin' && userRole !== 'ngo') {
    res.status(403).json({ success: false, message: 'Only NGO managers can verify activities' });
    return;
  }

  const activity = await VolunteerActivity.findById(id);
  if (!activity) {
    res.status(404).json({ success: false, message: 'Activity not found' });
    return;
  }

  // Check if user has permission to verify this activity
  const ngo = await NGO.findOne({
    $or: [
      { adminId: userId },
      { 'managers': userId },
      { 'staff': userId }
    ]
  });

  if (!ngo || !activity.ngoId.equals(ngo._id)) {
    res.status(403).json({ success: false, message: 'Not authorized to verify this activity' });
    return;
  }

  const { notes } = req.body;

  activity.verifiedBy = userId;
  activity.verifiedAt = new Date();
  if (notes) {
    activity.notes = `${activity.notes || ''}\n\nVerification Notes: ${notes}`.trim();
  }

  await activity.save();

  await activity.populate([
    { path: 'volunteerId', select: 'name email' },
    { path: 'verifiedBy', select: 'name email' }
  ]);

  logger.info(`Volunteer activity ${id} verified by user: ${userId}`);

  res.json({
    success: true,
    data: activity,
    message: 'Activity verified successfully'
  });
});

// Get volunteer statistics
export const getVolunteerStats = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?._id;
  const userRole = req.user?.role;

  if (!userId) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  const { volunteerId } = req.query;
  let targetVolunteerId = userId;

  // If querying for another volunteer, check permissions
  if (volunteerId && volunteerId !== userId.toString()) {
    if (userRole !== 'ngo' && userRole !== 'ngo_admin' && userRole !== 'ngo_manager') {
      res.status(403).json({ success: false, message: 'Insufficient permissions' });
      return;
    }
    targetVolunteerId = new mongoose.Types.ObjectId(volunteerId as string);
  }

  const stats = await VolunteerActivity.aggregate([
    { $match: { volunteerId: targetVolunteerId } },
    {
      $group: {
        _id: null,
        totalActivities: { $sum: 1 },
        totalHours: { $sum: '$hoursLogged' },
        totalBeneficiaries: { $sum: '$beneficiariesServed' },
        verifiedActivities: {
          $sum: { $cond: [{ $ne: ['$verifiedBy', null] }, 1, 0] }
        },
        completedActivities: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        }
      }
    }
  ]);

  const activityTypeStats = await VolunteerActivity.aggregate([
    { $match: { volunteerId: targetVolunteerId } },
    {
      $group: {
        _id: '$activityType',
        count: { $sum: 1 },
        hours: { $sum: '$hoursLogged' }
      }
    },
    { $sort: { count: -1 } }
  ]);

  const monthlyStats = await VolunteerActivity.aggregate([
    { $match: { volunteerId: targetVolunteerId } },
    {
      $group: {
        _id: {
          year: { $year: '$date' },
          month: { $month: '$date' }
        },
        activities: { $sum: 1 },
        hours: { $sum: '$hoursLogged' },
        beneficiaries: { $sum: '$beneficiariesServed' }
      }
    },
    { $sort: { '_id.year': -1, '_id.month': -1 } },
    { $limit: 12 }
  ]);

  const recentActivities = await VolunteerActivity.find({ volunteerId: targetVolunteerId })
    .populate([
      { path: 'ngoId', select: 'name logo' },
      { path: 'applicationId', select: 'title serviceType' },
      { path: 'programId', select: 'title' }
    ])
    .sort({ date: -1 })
    .limit(5);

  res.json({
    success: true,
    data: {
      overview: stats[0] || {
        totalActivities: 0,
        totalHours: 0,
        totalBeneficiaries: 0,
        verifiedActivities: 0,
        completedActivities: 0
      },
      byActivityType: activityTypeStats,
      monthlyTrend: monthlyStats,
      recentActivities
    }
  });
});

// Update volunteer activity
export const updateVolunteerActivity = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = req.user?._id;
  const userRole = req.user?.role;

  if (!userId) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  const activity = await VolunteerActivity.findById(id);
  if (!activity) {
    res.status(404).json({ success: false, message: 'Activity not found' });
    return;
  }

  // Check permissions - volunteers can only edit their own activities
  if (userRole === 'volunteer' && !activity.volunteerId.equals(userId)) {
    res.status(403).json({ success: false, message: 'Can only edit your own activities' });
    return;
  }

  // NGO managers can edit activities for their NGO
  if (userRole === 'ngo_manager' || userRole === 'ngo_admin' || userRole === 'ngo') {
    const ngo = await NGO.findOne({
      $or: [
        { adminId: userId },
        { 'managers': userId },
        { 'staff': userId }
      ]
    });

    if (!ngo || !activity.ngoId.equals(ngo._id)) {
      res.status(403).json({ success: false, message: 'Not authorized to edit this activity' });
      return;
    }
  }

  // Cannot edit verified activities
  if (activity.verifiedBy && userRole === 'volunteer') {
    res.status(400).json({ success: false, message: 'Cannot edit verified activities' });
    return;
  }

  const {
    activityType,
    title,
    description,
    hoursLogged,
    location,
    date,
    status,
    notes,
    attachments,
    skillsUsed,
    impactDescription,
    beneficiariesServed
  } = req.body;

  // Update allowed fields
  if (activityType) activity.activityType = activityType;
  if (title) activity.title = title;
  if (description) activity.description = description;
  if (hoursLogged !== undefined) activity.hoursLogged = hoursLogged;
  if (location) activity.location = location;
  if (date) activity.date = new Date(date);
  if (status) activity.status = status;
  if (notes) activity.notes = notes;
  if (attachments) activity.attachments = attachments;
  if (skillsUsed) activity.skillsUsed = skillsUsed;
  if (impactDescription) activity.impactDescription = impactDescription;
  if (beneficiariesServed !== undefined) activity.beneficiariesServed = beneficiariesServed;

  await activity.save();

  await activity.populate([
    { path: 'volunteerId', select: 'name email' },
    { path: 'ngoId', select: 'name email' },
    { path: 'applicationId', select: 'title serviceType' },
    { path: 'programId', select: 'title description' },
    { path: 'verifiedBy', select: 'name email' }
  ]);

  logger.info(`Volunteer activity ${id} updated by user: ${userId}`);

  res.json({
    success: true,
    data: activity,
    message: 'Activity updated successfully'
  });
});

// Delete volunteer activity
export const deleteVolunteerActivity = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = req.user?._id;
  const userRole = req.user?.role;

  if (!userId) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  const activity = await VolunteerActivity.findById(id);
  if (!activity) {
    res.status(404).json({ success: false, message: 'Activity not found' });
    return;
  }

  // Check permissions
  if (userRole === 'volunteer' && !activity.volunteerId.equals(userId)) {
    res.status(403).json({ success: false, message: 'Can only delete your own activities' });
    return;
  }

  // Cannot delete verified activities
  if (activity.verifiedBy) {
    res.status(400).json({ success: false, message: 'Cannot delete verified activities' });
    return;
  }

  await VolunteerActivity.findByIdAndDelete(id);

  logger.info(`Volunteer activity ${id} deleted by user: ${userId}`);

  res.json({
    success: true,
    message: 'Activity deleted successfully'
  });
});
