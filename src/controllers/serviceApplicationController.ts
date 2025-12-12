import { Request, Response } from 'express';
import mongoose from 'mongoose';
import ServiceApplication from '../models/ServiceApplication';
import VolunteerActivity from '../models/VolunteerActivity';
import NGO from '../models/NGO';
import User from '../models/User';
import { AuthRequest } from '../middleware/authMiddleware';
import { asyncHandler } from '../utils/asyncHandler';
import logger from '../utils/logger';
import { SocketService } from '../socket/socketService';
import { ApplicationSocketData } from '../socket/socketTypes';

// Create a service application (Citizens)
export const createApplication = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?._id;
  if (!userId) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  const {
    ngoId,
    programId,
    applicationType,
    serviceType,
    title,
    description,
    urgencyLevel,
    documents,
    beneficiariesCount,
    location,
    tags
  } = req.body;

  // Verify NGO exists and is verified
  const ngo = await NGO.findById(ngoId);
  if (!ngo) {
    res.status(404).json({ success: false, message: 'NGO not found' });
    return;
  }

  if (ngo.status !== 'verified') {
    res.status(400).json({ success: false, message: 'Can only apply to verified NGOs' });
    return;
  }

  const application = new ServiceApplication({
    userId,
    ngoId,
    programId,
    applicationType,
    serviceType,
    title,
    description,
    urgencyLevel: urgencyLevel || 'medium',
    documents: documents || [],
    beneficiariesCount: beneficiariesCount || 1,
    location,
    tags: tags || []
  });

  await application.save();

  await application.populate([
    { path: 'userId', select: 'name email phone' },
    { path: 'ngoId', select: 'name email contactPhone' },
    { path: 'programId', select: 'title description' }
  ]);
  logger.info(`Service application created: ${application._id} by user: ${userId}`);

  // Emit new application event
  const applicationSocketData: ApplicationSocketData = {
    applicationId: application._id.toString(),
    applicantId: application.userId.toString(),
    applicantName: (application.userId as any).name || 'Unknown',
    serviceType: application.serviceType,
    status: application.status === 'submitted' ? 'pending' : 
           application.status === 'in_progress' ? 'under_review' :
           application.status === 'cancelled' ? 'rejected' :
           application.status as any,
    ngoId: application.ngoId.toString(),
    timestamp: new Date().toISOString()
  };
  
  SocketService.emitNewApplication(applicationSocketData);

  res.status(201).json({
    success: true,
    data: application,
    message: 'Application submitted successfully'
  });
});

// Get applications (NGO Manager/Admin view)
export const getApplications = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?._id;
  const userRole = req.user?.role;

  if (!userId) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  const {
    status,
    serviceType,
    urgencyLevel,
    assignedTo,
    page = 1,
    limit = 10,
    search
  } = req.query;

  let filter: any = {};

  // Role-based filtering
  if (userRole === 'citizen') {
    // Citizens see only their applications
    filter.userId = userId;
  } else if (userRole === 'ngo' || userRole === 'ngo_admin' || userRole === 'ngo_manager') {
    // NGO staff see applications for their NGO
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
  } else if (userRole === 'volunteer') {
    // Volunteers see applications assigned to them
    filter.assignedVolunteer = userId;
  }

  // Apply additional filters
  if (status) filter.status = status;
  if (serviceType) filter.serviceType = serviceType;
  if (urgencyLevel) filter.urgencyLevel = urgencyLevel;
  if (assignedTo) filter.assignedVolunteer = assignedTo;

  // Search functionality
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  const pageNumber = parseInt(page as string);
  const limitNumber = parseInt(limit as string);
  const skip = (pageNumber - 1) * limitNumber;

  const applications = await ServiceApplication.find(filter)
    .populate([
      { path: 'userId', select: 'name email phone' },
      { path: 'ngoId', select: 'name email contactPhone' },
      { path: 'programId', select: 'title description' },
      { path: 'assignedManager', select: 'name email' },
      { path: 'assignedVolunteer', select: 'name email' }
    ])
    .sort({ createdAt: -1, urgencyLevel: 1 })
    .skip(skip)
    .limit(limitNumber);

  const total = await ServiceApplication.countDocuments(filter);

  // If no applications found, return mock data for demonstration
  if (applications.length === 0 && pageNumber === 1) {
    const mockApplications = [
      {
        _id: 'mock-app-1',
        title: 'Education Support Request',
        description: 'Request for educational materials and support for underprivileged children in our community.',
        serviceType: 'education',
        urgencyLevel: 'medium',
        status: 'pending',
        userId: {
          name: 'Ramesh Kumar',
          email: 'ramesh.kumar@example.com',
          phone: '+91-9876543210'
        },
        ngoId: {
          name: 'Education for All Foundation',
          email: 'contact@educationforall.org',
          contactPhone: '+91-9123456789'
        },
        programId: {
          title: 'Rural Education Initiative',
          description: 'Bringing quality education to rural communities'
        },
        contactInfo: {
          phone: '+91-9876543210',
          email: 'ramesh.kumar@example.com',
          address: 'Village Rampur, District Haridwar, Uttarakhand'
        },
        location: {
          address: 'Village Rampur',
          city: 'Haridwar',
          state: 'Uttarakhand',
          pincode: '249407'
        },
        createdAt: new Date('2024-07-10T10:00:00.000Z'),
        updatedAt: new Date('2024-07-10T10:00:00.000Z')
      },
      {
        _id: 'mock-app-2',
        title: 'Healthcare Emergency Assistance',
        description: 'Urgent medical assistance required for elderly family member. Need help with hospital admission and treatment costs.',
        serviceType: 'healthcare',
        urgencyLevel: 'high',
        status: 'in_progress',
        userId: {
          name: 'Priya Sharma',
          email: 'priya.sharma@example.com',
          phone: '+91-8765432109'
        },
        ngoId: {
          name: 'Community Health Services',
          email: 'help@communityhealth.org',
          contactPhone: '+91-8123456789'
        },
        assignedManager: {
          name: 'Dr. Anjali Verma',
          email: 'anjali.verma@communityhealth.org'
        },
        contactInfo: {
          phone: '+91-8765432109',
          email: 'priya.sharma@example.com',
          address: 'Sector 15, Chandigarh'
        },
        location: {
          address: 'Sector 15',
          city: 'Chandigarh',
          state: 'Chandigarh',
          pincode: '160015'
        },
        createdAt: new Date('2024-07-12T14:30:00.000Z'),
        updatedAt: new Date('2024-07-13T09:15:00.000Z')
      },
      {
        _id: 'mock-app-3',
        title: 'Food Security Support',
        description: 'Family facing food insecurity due to job loss. Request for temporary food assistance and support to find employment.',
        serviceType: 'food_security',
        urgencyLevel: 'high',
        status: 'approved',
        userId: {
          name: 'Mohammad Ali',
          email: 'mohammad.ali@example.com',
          phone: '+91-7654321098'
        },
        ngoId: {
          name: 'Food Security Foundation',
          email: 'support@foodsecurity.org',
          contactPhone: '+91-7123456789'
        },
        assignedVolunteer: {
          name: 'Rahul Gupta',
          email: 'rahul.gupta@volunteer.org'
        },
        contactInfo: {
          phone: '+91-7654321098',
          email: 'mohammad.ali@example.com',
          address: 'Old Delhi, Delhi'
        },
        location: {
          address: 'Old Delhi',
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110006'
        },
        createdAt: new Date('2024-07-08T16:45:00.000Z'),
        updatedAt: new Date('2024-07-11T11:20:00.000Z')
      },
      {
        _id: 'mock-app-4',
        title: 'Skill Development Program',
        description: 'Looking for skill development opportunities in computer literacy and digital marketing to improve employment prospects.',
        serviceType: 'skill_development',
        urgencyLevel: 'low',
        status: 'completed',
        userId: {
          name: 'Sunita Devi',
          email: 'sunita.devi@example.com',
          phone: '+91-6543210987'
        },
        ngoId: {
          name: 'Skills for Future',
          email: 'training@skillsforfuture.org',
          contactPhone: '+91-6123456789'
        },
        programId: {
          title: 'Digital Literacy Program',
          description: 'Computer and internet skills training for rural women'
        },
        assignedManager: {
          name: 'Ms. Kavita Singh',
          email: 'kavita.singh@skillsforfuture.org'
        },
        contactInfo: {
          phone: '+91-6543210987',
          email: 'sunita.devi@example.com',
          address: 'Jaipur Rural, Rajasthan'
        },
        location: {
          address: 'Village Madhorajpura',
          city: 'Jaipur',
          state: 'Rajasthan',
          pincode: '302012'
        },
        createdAt: new Date('2024-06-15T09:00:00.000Z'),
        updatedAt: new Date('2024-07-05T17:30:00.000Z')
      }
    ];

    res.json({
      success: true,
      data: {
        applications: mockApplications,
        pagination: {
          page: 1,
          limit: limitNumber,
          total: mockApplications.length,
          pages: 1
        }
      },
      message: 'Demo applications data - showing sample service applications'
    });
    return;
  }

  res.json({
    success: true,
    data: {
      applications,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        pages: Math.ceil(total / limitNumber)
      }
    }
  });
});

// Update application status (NGO Manager/Admin)
export const updateApplicationStatus = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = req.user?._id;
  const userRole = req.user?.role;

  if (!userId) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  const application = await ServiceApplication.findById(id);
  if (!application) {
    res.status(404).json({ success: false, message: 'Application not found' });
    return;
  }

  // Check permissions
  if (userRole === 'ngo_manager' || userRole === 'ngo_admin' || userRole === 'ngo') {
    const ngo = await NGO.findOne({
      $or: [
        { adminId: userId },
        { 'managers': userId },
        { 'staff': userId }
      ]
    });

    if (!ngo || !application.ngoId.equals(ngo._id)) {
      res.status(403).json({ success: false, message: 'Not authorized to update this application' });
      return;
    }
  } else {
    res.status(403).json({ success: false, message: 'Insufficient permissions' });
    return;
  }

  const {
    status,
    assignedManager,
    assignedVolunteer,
    reviewNotes,
    completionNotes,
    rejectionReason,
    estimatedCompletionDate,
    actualCompletionDate
  } = req.body;

  // Update fields
  if (status) application.status = status;
  if (assignedManager) {
    application.assignedManager = assignedManager;
    application.assignedAt = new Date();
  }
  if (assignedVolunteer) {
    application.assignedVolunteer = assignedVolunteer;
    if (!application.assignedAt) application.assignedAt = new Date();
  }
  if (reviewNotes) application.reviewNotes = reviewNotes;
  if (completionNotes) application.completionNotes = completionNotes;
  if (rejectionReason) application.rejectionReason = rejectionReason;
  if (estimatedCompletionDate) application.estimatedCompletionDate = new Date(estimatedCompletionDate);
  if (actualCompletionDate) application.actualCompletionDate = new Date(actualCompletionDate);
  await application.save();

  await application.populate([
    { path: 'userId', select: 'name email phone' },
    { path: 'ngoId', select: 'name email contactPhone' },
    { path: 'assignedManager', select: 'name email' },
    { path: 'assignedVolunteer', select: 'name email' }
  ]);

  // Emit application status change event
  const applicationSocketData: ApplicationSocketData = {
    applicationId: application._id.toString(),
    applicantId: application.userId.toString(),
    applicantName: (application.userId as any).name || 'Applicant',
    serviceType: application.serviceType,
    status: application.status === 'submitted' ? 'pending' : 
           application.status === 'in_progress' ? 'under_review' :
           application.status === 'cancelled' ? 'rejected' :
           application.status as any,
    ngoId: application.ngoId.toString(),
    timestamp: new Date().toISOString()
  };
  
  SocketService.emitApplicationStatusChange(applicationSocketData);

  logger.info(`Application ${id} updated by user: ${userId}`);

  res.json({
    success: true,
    data: application,
    message: 'Application updated successfully'
  });
});

// Add case note (NGO Manager/Volunteer)
export const addCaseNote = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = req.user?._id;
  const userRole = req.user?.role;

  if (!userId) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  const application = await ServiceApplication.findById(id);
  if (!application) {
    res.status(404).json({ success: false, message: 'Application not found' });
    return;
  }

  // Check permissions
  const canAddNote = (
    (userRole === 'ngo_manager' || userRole === 'ngo_admin') ||
    (userRole === 'volunteer' && application.assignedVolunteer?.equals(userId))
  );

  if (!canAddNote) {
    res.status(403).json({ success: false, message: 'Not authorized to add notes to this application' });
    return;
  }

  const {
    noteType,
    title,
    content,
    attachments,
    isPrivate,
    hoursLogged,
    activitiesCompleted,
    nextSteps
  } = req.body;

  const caseNote = {
    applicationId: application._id,
    authorId: userId,
    authorRole: userRole === 'volunteer' ? 'volunteer' : 'ngo_manager',
    noteType,
    title,
    content,
    attachments: attachments || [],
    isPrivate: isPrivate || false,
    hoursLogged,
    activitiesCompleted: activitiesCompleted || [],
    nextSteps: nextSteps || []
  };

  application.caseNotes.push(caseNote as any);
  await application.save();

  // If volunteer is logging hours, also create a VolunteerActivity record
  if (userRole === 'volunteer' && hoursLogged) {
    const volunteerActivity = new VolunteerActivity({
      volunteerId: userId,
      applicationId: application._id,
      ngoId: application.ngoId,
      activityType: 'field_work',
      title: title,
      description: content,
      hoursLogged,
      date: new Date(),
      status: 'completed',
      notes: content,
      attachments: attachments || [],
      skillsUsed: [],
      beneficiariesServed: application.beneficiariesCount
    });

    await volunteerActivity.save();
  }

  await application.populate([
    { path: 'caseNotes.authorId', select: 'name email' }
  ]);

  logger.info(`Case note added to application ${id} by user: ${userId}`);

  res.json({
    success: true,
    data: application,
    message: 'Case note added successfully'
  });
});

// Get single application with full details
export const getApplication = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = req.user?._id;
  const userRole = req.user?.role;

  if (!userId) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  const application = await ServiceApplication.findById(id)
    .populate([
      { path: 'userId', select: 'name email phone' },
      { path: 'ngoId', select: 'name email contactPhone logo' },
      { path: 'programId', select: 'title description' },
      { path: 'assignedManager', select: 'name email' },
      { path: 'assignedVolunteer', select: 'name email' },
      { path: 'caseNotes.authorId', select: 'name email' }
    ]);

  if (!application) {
    res.status(404).json({ success: false, message: 'Application not found' });
    return;
  }

  // Check permissions
  let hasAccess = false;

  if (userRole === 'citizen' && application.userId.equals(userId)) {
    hasAccess = true;
  } else if (userRole === 'volunteer' && application.assignedVolunteer?.equals(userId)) {
    hasAccess = true;
  } else if (userRole === 'ngo_manager' || userRole === 'ngo_admin' || userRole === 'ngo') {
    const ngo = await NGO.findOne({
      $or: [
        { adminId: userId },
        { 'managers': userId },
        { 'staff': userId }
      ]
    });

    if (ngo && application.ngoId.equals(ngo._id)) {
      hasAccess = true;
    }
  }

  if (!hasAccess) {
    res.status(403).json({ success: false, message: 'Not authorized to view this application' });
    return;
  }

  res.json({
    success: true,
    data: application
  });
});

// Get application statistics (NGO Dashboard)
export const getApplicationStats = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?._id;
  const userRole = req.user?.role;

  if (!userId) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  let ngoFilter: any = {};

  if (userRole === 'ngo' || userRole === 'ngo_admin' || userRole === 'ngo_manager') {
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

    ngoFilter.ngoId = ngo._id;
  }

  const stats = await ServiceApplication.aggregate([
    { $match: ngoFilter },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        submitted: { $sum: { $cond: [{ $eq: ['$status', 'submitted'] }, 1, 0] } },
        under_review: { $sum: { $cond: [{ $eq: ['$status', 'under_review'] }, 1, 0] } },
        approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
        in_progress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
        critical: { $sum: { $cond: [{ $eq: ['$urgencyLevel', 'critical'] }, 1, 0] } },
        high: { $sum: { $cond: [{ $eq: ['$urgencyLevel', 'high'] }, 1, 0] } },
        totalBeneficiaries: { $sum: '$beneficiariesCount' }
      }
    }
  ]);

  const serviceTypeStats = await ServiceApplication.aggregate([
    { $match: ngoFilter },
    {
      $group: {
        _id: '$serviceType',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);

  res.json({
    success: true,
    data: {
      overview: stats[0] || {
        total: 0,
        submitted: 0,
        under_review: 0,
        approved: 0,
        in_progress: 0,
        completed: 0,
        rejected: 0,
        critical: 0,
        high: 0,
        totalBeneficiaries: 0
      },
      byServiceType: serviceTypeStats
    }
  });
});
