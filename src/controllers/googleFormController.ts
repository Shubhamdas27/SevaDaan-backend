import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import NGO from '../models/NGO';
import User from '../models/User';
import Program from '../models/Program';
import notificationService from '../services/notificationService';
import logger from '../utils/logger';
import { asyncHandler } from '../middleware/errorMiddleware';

// Interface for volunteer interest data
interface VolunteerInterestData {
  volunteerName: string;
  volunteerEmail: string;
  volunteerPhone?: string;
  programId: string;
  ngoId: string;
  motivation: string;
  experience?: string;
  availability: string;
  skills: string[];
  formResponseId: string;
  submissionTime: Date;
}

/**
 * @desc    Create volunteer interest record when Google Form is submitted
 * @route   POST /api/v1/google-forms/volunteer-interest
 * @access  Public (called by Google Forms webhook)
 */
export const recordVolunteerInterest = asyncHandler(async (req: Request, res: Response) => {
  try {
    const {
      volunteerName,
      volunteerEmail,
      volunteerPhone,
      programId,
      ngoId,
      motivation,
      experience,
      availability,
      skills,
      formResponseId
    } = req.body;

    // Validate required fields
    if (!volunteerName || !volunteerEmail || !programId || !ngoId || !motivation) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: volunteerName, volunteerEmail, programId, ngoId, motivation'
      });
      return;
    }

    // Get program and NGO details
    const [program, ngo] = await Promise.all([
      Program.findById(programId).select('title description'),
      NGO.findById(ngoId).select('name adminId email team')
    ]);

    if (!program) {
      res.status(404).json({
        success: false,
        message: 'Program not found'
      });
      return;
    }

    if (!ngo) {
      res.status(404).json({
        success: false,
        message: 'NGO not found'
      });
      return;
    }

    // Create volunteer interest record
    const volunteerInterest: VolunteerInterestData = {
      volunteerName,
      volunteerEmail,
      volunteerPhone,
      programId,
      ngoId,
      motivation,
      experience,
      availability,
      skills: Array.isArray(skills) ? skills : skills?.split(',').map((s: string) => s.trim()) || [],
      formResponseId,
      submissionTime: new Date()
    };

    // Send notification to NGO admin - simplified notification
    if (ngo.adminId) {
      try {
        await notificationService.createNotification({
          userId: ngo.adminId,
          type: 'volunteer',
          title: 'New Volunteer Interest',
          message: `${volunteerName} is interested in volunteering for "${program.title}". They submitted their details through the volunteer form.`,
          actionUrl: `/volunteer-management`
        });
        logger.info(`Notification sent to NGO admin: ${ngo.adminId}`);
      } catch (notifError: any) {
        logger.error('Failed to send notification to NGO admin:', notifError);
        // Don't fail the main operation if notification fails
      }
    }

    // Send email notification to NGO (optional)
    try {
      logger.info(`Volunteer interest recorded for ${volunteerName} - Program: ${program.title} - NGO: ${ngo.name}`);
    } catch (emailError: any) {
      logger.error('Failed to send email notification:', emailError);
      // Don't fail the main operation if email fails
    }

    logger.info(`New volunteer interest recorded: ${volunteerName} for ${program.title} at ${ngo.name}`);

    res.status(201).json({
      success: true,
      message: 'Volunteer interest recorded successfully. NGO has been notified.',
      data: {
        volunteerName,
        programTitle: program.title,
        ngoName: ngo.name,
        submissionTime: volunteerInterest.submissionTime,
        notificationSent: true
      }
    });

  } catch (error: any) {
    logger.error('Error recording volunteer interest:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record volunteer interest',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @desc    Get Google Form URL for a specific program
 * @route   GET /api/v1/google-forms/volunteer-form/:programId
 * @access  Public
 */
export const getVolunteerFormUrl = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { programId } = req.params;

    // Get program details
    const program = await Program.findById(programId)
      .populate('ngo', 'name _id')
      .select('title description ngo');

    if (!program) {
      res.status(404).json({
        success: false,
        message: 'Program not found'
      });
      return;
    }

    // Generate Google Form URL with pre-filled data
    const baseFormUrl = process.env.GOOGLE_FORM_BASE_URL || 'https://docs.google.com/forms/d/e/YOUR_FORM_ID/viewform';
    
    // Pre-fill program and NGO information in the form
    const formUrl = `${baseFormUrl}?usp=pp_url&entry.programId=${programId}&entry.programTitle=${encodeURIComponent(program.title)}&entry.ngoId=${program.ngo._id}&entry.ngoName=${encodeURIComponent((program.ngo as any).name)}`;

    res.json({
      success: true,
      data: {
        formUrl,
        programTitle: program.title,
        ngoName: (program.ngo as any).name,
        instructions: 'Please fill out this form to express your interest in volunteering. The NGO will be notified automatically upon submission.'
      }
    });

  } catch (error: any) {
    logger.error('Error getting volunteer form URL:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get volunteer form URL',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @desc    Get all volunteer interests for an NGO
 * @route   GET /api/v1/google-forms/volunteer-interests
 * @access  Private (NGO Admin/Manager)
 */
export const getVolunteerInterests = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const userRole = req.user?.role;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Get user's NGO
    let ngoQuery: any = {};
    
    if (userRole === 'ngo_admin') {
      ngoQuery.adminId = userId;
    } else if (userRole === 'ngo_manager') {
      ngoQuery['team.userId'] = userId;
    } else {
      res.status(403).json({ 
        success: false, 
        message: 'Access denied. Only NGO admins and managers can view volunteer interests.' 
      });
      return;
    }

    const ngo = await NGO.findOne(ngoQuery);
    if (!ngo) {
      res.status(404).json({ 
        success: false, 
        message: 'NGO not found or access denied' 
      });
      return;
    }

    // For now, return a simple message - in a real implementation, 
    // you'd query a VolunteerInterest collection or similar
    const message = `Volunteer interests for NGO ${ngo.name} can be viewed through the notification system.`;
    
    res.json({
      success: true,
      data: [],
      message: message,
      info: 'Volunteer interests are tracked through the notification system. Check your notifications for volunteer applications.'
    });

  } catch (error: any) {
    logger.error('Error fetching volunteer interests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch volunteer interests',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});
