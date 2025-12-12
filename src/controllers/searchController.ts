import { Request, Response } from 'express';
import NGO from '../models/NGO';
import Program from '../models/Program';
import Testimonial from '../models/Testimonial';
import Notice from '../models/Notice';
import logger from '../utils/logger';

// Global search across all entities
export const globalSearch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q: query, type, limit = '10', page = '1' } = req.query;

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters long'
      });
      return;
    }

    const searchQuery = query.trim();
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));
    const pageNum = Math.max(1, parseInt(page as string));
    const skip = (pageNum - 1) * limitNum;

    const searchRegex = new RegExp(searchQuery, 'i');
    const results: any = {};

    // Search NGOs
    if (!type || type === 'ngos') {
      const ngos = await NGO.find({
        $and: [
          { status: 'verified' },
          {
            $or: [
              { name: searchRegex },
              { description: searchRegex },
              { operationalAreas: searchRegex },
              { targetBeneficiaries: searchRegex },
              { 'representative.name': searchRegex }
            ]
          }
        ]
      })
        .select('name description logo city state operationalAreas status')
        .skip(skip)
        .limit(limitNum)
        .lean();

      results.ngos = {
        data: ngos,
        count: ngos.length
      };
    }

    // Search Programs
    if (!type || type === 'programs') {
      const programs = await Program.find({
        $and: [
          { status: 'active' },
          {
            $or: [
              { title: searchRegex },
              { description: searchRegex },
              { category: searchRegex },
              { targetAudience: searchRegex },
              { location: searchRegex }
            ]
          }
        ]
      })
        .populate('ngo', 'name logo')
        .select('title description category targetAudience location startDate endDate budget')
        .skip(skip)
        .limit(limitNum)
        .lean();

      results.programs = {
        data: programs,
        count: programs.length
      };
    }

    // Search Testimonials (approved only)
    if (!type || type === 'testimonials') {
      const testimonials = await Testimonial.find({
        $and: [
          { isApproved: true, isVisible: true },
          {
            $or: [
              { name: searchRegex },
              { message: searchRegex },
              { company: searchRegex },
              { designation: searchRegex }
            ]
          }
        ]
      })
        .populate('ngo', 'name logo')
        .populate('program', 'title')
        .select('name message rating designation company')
        .skip(skip)
        .limit(limitNum)
        .lean();

      results.testimonials = {
        data: testimonials,
        count: testimonials.length
      };
    }

    // Search Notices (active only)
    if (!type || type === 'notices') {
      const notices = await Notice.find({
        $and: [
          { 
            isActive: true,
            $or: [
              { expiryDate: { $exists: false } },
              { expiryDate: null },
              { expiryDate: { $gt: new Date() } }
            ]
          },
          {
            $or: [
              { title: searchRegex },
              { content: searchRegex }
            ]
          }
        ]
      })
        .populate('ngoId', 'name logo')
        .select('title content type isHighlighted createdAt')
        .skip(skip)
        .limit(limitNum)
        .lean();

      results.notices = {
        data: notices,
        count: notices.length
      };
    }

    // Calculate total results
    const totalResults = Object.values(results).reduce((sum: number, category: any) => sum + category.count, 0);

    res.json({
      success: true,
      query: searchQuery,
      totalResults,
      results,
      pagination: {
        currentPage: pageNum,
        itemsPerPage: limitNum
      }
    });

    logger.info(`Global search performed: "${searchQuery}" - ${totalResults} results`);
  } catch (error: any) {
    logger.error('Error performing global search:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform search',
      error: error.message
    });
  }
};

// Search NGOs with advanced filters
export const searchNGOs = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      q: query,
      city,
      state,
      operationalArea,
      type: ngoType,
      verified,
      page = '1',
      limit = '10',
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    // Build query
    const searchQuery: any = {};

    // Text search
    if (query && typeof query === 'string' && query.trim()) {
      const searchRegex = new RegExp(query.trim(), 'i');
      searchQuery.$or = [
        { name: searchRegex },
        { description: searchRegex },
        { mission: searchRegex },
        { vision: searchRegex },
        { operationalAreas: searchRegex },
        { targetBeneficiaries: searchRegex }
      ];
    }

    // Location filters
    if (city) searchQuery.city = new RegExp(city as string, 'i');
    if (state) searchQuery.state = new RegExp(state as string, 'i');

    // Operational area filter
    if (operationalArea) {
      searchQuery.operationalAreas = { $in: [new RegExp(operationalArea as string, 'i')] };
    }

    // NGO type filter
    if (ngoType) searchQuery.type = ngoType;

    // Verification status
    if (verified === 'true') {
      searchQuery.status = 'verified';
    } else if (verified === 'false') {
      searchQuery.status = { $ne: 'verified' };
    } else {
      // Default to showing only verified NGOs for public search
      searchQuery.status = 'verified';
    }

    // Build sort object
    const sortObj: any = {};
    sortObj[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

    const [ngos, total] = await Promise.all([
      NGO.find(searchQuery)
        .select('name description logo website city state operationalAreas type status totalDonations donorCount programCount')
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      NGO.countDocuments(searchQuery)
    ]);

    res.json({
      success: true,
      data: ngos,
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
    logger.error('Error searching NGOs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search NGOs',
      error: error.message
    });
  }
};

// Search Programs with advanced filters
export const searchPrograms = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      q: query,
      ngoId,
      category,
      status,
      location,
      startDate,
      endDate,
      minBudget,
      maxBudget,
      page = '1',
      limit = '10',
      sortBy = 'startDate',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    // Build query
    const searchQuery: any = {};

    // Text search
    if (query && typeof query === 'string' && query.trim()) {
      const searchRegex = new RegExp(query.trim(), 'i');
      searchQuery.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { objectives: searchRegex },
        { targetAudience: searchRegex },
        { expectedOutcome: searchRegex }
      ];
    }

    // Filters
    if (ngoId) searchQuery.ngo = ngoId;
    if (category) searchQuery.category = category;
    if (status) searchQuery.status = status;
    if (location) searchQuery.location = new RegExp(location as string, 'i');

    // Date filters
    if (startDate) {
      searchQuery.startDate = { $gte: new Date(startDate as string) };
    }
    if (endDate) {
      searchQuery.endDate = { $lte: new Date(endDate as string) };
    }

    // Budget filters
    if (minBudget || maxBudget) {
      searchQuery.budget = {};
      if (minBudget) searchQuery.budget.$gte = parseFloat(minBudget as string);
      if (maxBudget) searchQuery.budget.$lte = parseFloat(maxBudget as string);
    }

    // Default to active programs for public search
    if (!status) {
      searchQuery.status = 'active';
    }

    // Build sort object
    const sortObj: any = {};
    sortObj[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

    const [programs, total] = await Promise.all([
      Program.find(searchQuery)
        .populate('ngo', 'name logo')
        .select('title description category targetAudience location startDate endDate budget status volunteersNeeded volunteersRegistered')
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Program.countDocuments(searchQuery)
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
    logger.error('Error searching programs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search programs',
      error: error.message
    });
  }
};

// Get search suggestions
export const getSearchSuggestions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q: query, type = 'all' } = req.query;

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      res.json({
        success: true,
        suggestions: []
      });
      return;
    }

    const searchRegex = new RegExp(query.trim(), 'i');
    const suggestions: any[] = [];

    // NGO suggestions
    if (type === 'all' || type === 'ngos') {
      const ngoSuggestions = await NGO.find({
        name: searchRegex,
        status: 'verified'
      })
        .select('name')
        .limit(5)
        .lean();      suggestions.push(...ngoSuggestions.map((ngo: any) => ({
        type: 'ngo',
        value: ngo.name,
        id: ngo._id
      })));
    }

    // Program suggestions
    if (type === 'all' || type === 'programs') {
      const programSuggestions = await Program.find({
        title: searchRegex,
        status: 'active'
      })
        .select('title')
        .limit(5)
        .lean();      suggestions.push(...programSuggestions.map((program: any) => ({
        type: 'program',
        value: program.title,
        id: program._id
      })));
    }

    // Category suggestions (from programs)
    if (type === 'all' || type === 'categories') {
      const categories = await Program.distinct('category', {
        category: searchRegex,
        status: 'active'
      });      suggestions.push(...categories.slice(0, 5).map((category: any) => ({
        type: 'category',
        value: category
      })));
    }

    res.json({
      success: true,
      suggestions: suggestions.slice(0, 15) // Limit total suggestions
    });
  } catch (error: any) {
    logger.error('Error getting search suggestions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get search suggestions',
      error: error.message
    });
  }
};
