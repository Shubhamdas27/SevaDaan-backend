import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Program, { IProgram as _IProgram } from '../models/Program';
import NGO from '../models/NGO';
import { AuthRequest } from '../middleware/authMiddleware';
import logger from '../utils/logger';
import SocketService from '../socket/socketService';

// Create a new program
export const createProgram = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    
    // Check if user has an NGO and has permission to create programs
    const ngo = await NGO.findOne({ 
      adminId: userId
    });

    if (!ngo) {
      res.status(403).json({ 
        success: false, 
        message: 'You do not have permission to create programs' 
      });
      return;
    }
    
    if (ngo.status !== 'verified') {
      res.status(403).json({ 
        success: false, 
        message: 'NGO must be verified to create programs' 
      });
      return;
    }

    const programData = {
      ...req.body,
      ngo: ngo._id,
      createdBy: userId
    };

    const program = new Program(programData);
    await program.save();

    await program.populate([
      { path: 'ngo', select: 'name email logo' },
      { path: 'createdBy', select: 'fullName email' }
    ]);

    logger.info(`Program created: ${program._id} by user: ${userId}`);

    // Emit Socket.IO event for real-time updates
    SocketService.emitToNGO(ngo._id.toString(), 'program_update', {
      activity: 'program_created',
      program: program
    });
    SocketService.emitToRole('user', 'program_update', {
      activity: 'new_program_available',
      programId: program._id,
      title: program.title,
      ngoName: ngo.name
    });

    res.status(201).json({
      success: true,
      message: 'Program created successfully',
      data: program
    });
  } catch (error: any) {
    logger.error('Error creating program:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create program',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get all programs with filtering and pagination
export const getPrograms = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please try again later.'
      });
      return;
    }

    const {
      page = 1,
      limit = 12,
      category,
      status,
      featured,
      ngo,
      city,
      state,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      targetAmountMin,
      targetAmountMax,
      startDateFrom,
      startDateTo
    } = req.query;

    const query: any = {};

    // Build query filters
    if (category) query.category = category;
    if (status) query.status = status;
    if (featured !== undefined) query.featured = featured === 'true';
    if (ngo) query.ngo = ngo;
    
    // Handle location filters more safely
    if (city && typeof city === 'string') {
      query['location.city'] = { $regex: city, $options: 'i' };
    }
    if (state && typeof state === 'string') {
      query['location.state'] = { $regex: state, $options: 'i' };
    }

    // Amount range filter with safety checks
    if (targetAmountMin || targetAmountMax) {
      query.targetAmount = {};
      if (targetAmountMin && !isNaN(Number(targetAmountMin))) {
        query.targetAmount.$gte = Number(targetAmountMin);
      }
      if (targetAmountMax && !isNaN(Number(targetAmountMax))) {
        query.targetAmount.$lte = Number(targetAmountMax);
      }
    }

    // Date range filter with safety checks
    if (startDateFrom || startDateTo) {
      query.startDate = {};
      if (startDateFrom && !isNaN(Date.parse(startDateFrom as string))) {
        query.startDate.$gte = new Date(startDateFrom as string);
      }
      if (startDateTo && !isNaN(Date.parse(startDateTo as string))) {
        query.startDate.$lte = new Date(startDateTo as string);
      }
    }

    // Text search with safety check
    if (search && typeof search === 'string') {
      query.$text = { $search: search };
    }

    // Pagination with safety checks
    const pageNum = Math.max(1, parseInt(typeof page === 'string' ? page : '1'));
    const limitNum = Math.min(50, Math.max(1, parseInt(typeof limit === 'string' ? limit : '12')));
    const skip = (pageNum - 1) * limitNum;

    // Sort options with safety checks
    const sortOptions: any = {};
    if (search && typeof search === 'string') {
      sortOptions.score = { $meta: 'textScore' };
    }
    
    // Ensure sortBy is a valid string and exists in the schema
    const validSortBy = typeof sortBy === 'string' && ['createdAt', 'startDate', 'endDate', 'targetAmount', 'raisedAmount'].includes(sortBy) 
      ? sortBy 
      : 'createdAt';
    
    sortOptions[validSortBy] = sortOrder === 'asc' ? 1 : -1;    try {
      // Execute query with pagination and handle potential errors
      const [programs, total] = await Promise.all([
        Program.find(query)
          .populate('ngo', 'name email logo verificationStatus')
          .populate('createdBy', 'fullName email')
          .sort(sortOptions)
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Program.countDocuments(query)
      ]);      res.json({
        success: true,
        data: programs || [], // Ensure data is always at least an empty array
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          itemsPerPage: limitNum,
          hasNextPage: pageNum < Math.ceil(total / limitNum),
          hasPrevPage: pageNum > 1
        }
      });} catch (queryError) {
      logger.error('Error in program database query:', queryError);
      res.status(500).json({
        success: false,
        message: 'Error executing program database query',
        error: process.env.NODE_ENV === 'development' ? 
          (queryError instanceof Error ? queryError.message : 'Unknown error') : 
          'Database query error'
      });
      return;
    }
  } catch (error: any) {
    logger.error('Error fetching programs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch programs',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get a single program by ID
export const getProgramById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ 
        success: false, 
        message: 'Invalid program ID' 
      });
      return;
    }

    const program = await Program.findById(id)
      .populate('ngo', 'name email phone website logo address description verificationStatus')
      .populate('createdBy', 'fullName email')
      .lean();

    if (!program) {
      res.status(404).json({ 
        success: false, 
        message: 'Program not found' 
      });
      return;
    }

    res.json({
      success: true,
      data: program
    });
  } catch (error: any) {
    logger.error('Error fetching program:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch program',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Update a program
export const updateProgram = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ 
        success: false, 
        message: 'Invalid program ID' 
      });
      return;
    }

    const program = await Program.findById(id);
    if (!program) {
      res.status(404).json({ 
        success: false, 
        message: 'Program not found' 
      });
      return;
    }    // Check permissions
    const ngo = await NGO.findById(program.ngo);
    if (!ngo) {
      res.status(404).json({ 
        success: false, 
        message: 'Associated NGO not found' 
      });
      return;
    }    const hasPermission = 
      program.createdBy.toString() === userId.toString() ||
      ngo.adminId.toString() === userId.toString() ||
      req.user?.role === 'ngo';

    if (!hasPermission) {
      res.status(403).json({ 
        success: false, 
        message: 'You do not have permission to update this program' 
      });
      return;
    }

    // Prevent updating certain fields if program is active
    if (program.status === 'active') {
      const restrictedFields = ['ngo', 'targetAmount'];
      const hasRestrictedUpdates = restrictedFields.some(field => field in req.body);
      
      if (hasRestrictedUpdates) {
        res.status(400).json({ 
          success: false, 
          message: 'Cannot update NGO or target amount for active programs' 
        });
        return;
      }
    }

    const updatedProgram = await Program.findByIdAndUpdate(
      id,
      { ...req.body },
      { new: true, runValidators: true }
    ).populate([
      { path: 'ngo', select: 'name email logo' },
      { path: 'createdBy', select: 'fullName email' }
    ]);

    logger.info(`Program updated: ${id} by user: ${userId}`);

    // Emit Socket.IO event for real-time updates
    if (updatedProgram) {
      SocketService.emitToNGO(ngo._id.toString(), 'program_update', {
        activity: 'program_updated',
        program: updatedProgram
      });
      SocketService.emitToRole('user', 'program_update', {
        activity: 'program_updated',
        programId: updatedProgram._id,
        title: updatedProgram.title,
        ngoName: ngo.name
      });
    }

    res.json({
      success: true,
      message: 'Program updated successfully',
      data: updatedProgram
    });
  } catch (error: any) {
    logger.error('Error updating program:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update program',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Delete a program
export const deleteProgram = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ 
        success: false, 
        message: 'Invalid program ID' 
      });
      return;
    }

    const program = await Program.findById(id);
    if (!program) {
      res.status(404).json({ 
        success: false, 
        message: 'Program not found' 
      });
      return;
    }

    // Check permissions
    const ngo = await NGO.findById(program.ngo);
    if (!ngo) {
      res.status(404).json({ 
        success: false, 
        message: 'Associated NGO not found' 
      });
      return;
    }    const hasPermission = 
      program.createdBy.toString() === userId.toString() ||
      ngo.adminId.toString() === userId.toString() ||
      req.user?.role === 'ngo';

    if (!hasPermission) {
      res.status(403).json({ 
        success: false, 
        message: 'You do not have permission to delete this program' 
      });
      return;
    }

    // Prevent deletion of active programs with donations
    if (program.status === 'active' && program.raisedAmount > 0) {
      res.status(400).json({ 
        success: false, 
        message: 'Cannot delete active programs that have received donations' 
      });
      return;
    }

    await Program.findByIdAndDelete(id);

    logger.info(`Program deleted: ${id} by user: ${userId}`);

    // Emit Socket.IO event for real-time updates
    SocketService.emitToNGO(ngo._id.toString(), 'program_update', {
      activity: 'program_deleted',
      programId: id,
      title: program.title
    });

    res.json({
      success: true,
      message: 'Program deleted successfully'
    });
  } catch (error: any) {
    logger.error('Error deleting program:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete program',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Add program update
export const addProgramUpdate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ 
        success: false, 
        message: 'Invalid program ID' 
      });
      return;
    }

    const program = await Program.findById(id);
    if (!program) {
      res.status(404).json({ 
        success: false, 
        message: 'Program not found' 
      });
      return;
    }    // Check permissions
    const ngo = await NGO.findById(program.ngo);
    if (!ngo) {
      res.status(404).json({ 
        success: false, 
        message: 'Associated NGO not found' 
      });
      return;
    }    const hasPermission = 
      program.createdBy.toString() === userId.toString() ||
      ngo.adminId.toString() === userId.toString();

    if (!hasPermission) {
      res.status(403).json({ 
        success: false, 
        message: 'You do not have permission to add updates to this program' 
      });
      return;
    }

    const updateData = {
      ...req.body,
      date: new Date()
    };

    program.updates.push(updateData);
    await program.save();

    logger.info(`Program update added: ${id} by user: ${userId}`);

    res.json({
      success: true,
      message: 'Program update added successfully',
      data: program.updates[program.updates.length - 1]
    });
  } catch (error: any) {
    logger.error('Error adding program update:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add program update',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get featured programs
export const getFeaturedPrograms = async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit = 6 } = req.query;
    const limitNum = Math.min(20, Math.max(1, parseInt(limit as string)));

    const programs = await Program.find({ 
      featured: true, 
      status: 'active' 
    })
      .populate('ngo', 'name email logo verificationStatus')
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .lean();

    res.json({
      success: true,
      data: programs
    });
  } catch (error: any) {
    logger.error('Error fetching featured programs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch featured programs',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get programs by NGO
export const getProgramsByNGO = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ngoId } = req.params;
    const { 
      page = 1, 
      limit = 12, 
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    if (!mongoose.Types.ObjectId.isValid(ngoId)) {
      res.status(400).json({ 
        success: false, 
        message: 'Invalid NGO ID' 
      });
      return;
    }

    const query: any = { ngo: ngoId };
    if (status) query.status = status;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    const sortOptions: any = {};
    sortOptions[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

    const [programs, total] = await Promise.all([
      Program.find(query)
        .populate('createdBy', 'fullName email')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Program.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: programs,
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
    logger.error('Error fetching programs by NGO:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch programs',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get program statistics
export const getProgramStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = await Program.aggregate([
      {
        $group: {
          _id: null,
          totalPrograms: { $sum: 1 },
          activePrograms: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          completedPrograms: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          totalTargetAmount: { $sum: '$targetAmount' },
          totalRaisedAmount: { $sum: '$raisedAmount' },
          totalBeneficiaries: { $sum: '$beneficiariesCount' }
        }
      }
    ]);

    const categoryStats = await Program.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalTarget: { $sum: '$targetAmount' },
          totalRaised: { $sum: '$raisedAmount' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        overall: stats[0] || {
          totalPrograms: 0,
          activePrograms: 0,
          completedPrograms: 0,
          totalTargetAmount: 0,
          totalRaisedAmount: 0,
          totalBeneficiaries: 0
        },
        byCategory: categoryStats
      }
    });
  } catch (error: any) {
    logger.error('Error fetching program statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch program statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};
