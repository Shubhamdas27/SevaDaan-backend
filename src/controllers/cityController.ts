import { Request, Response, NextFunction } from 'express';
import City from '../models/City';
import { CustomError } from '../middleware/errorMiddleware';

// Async handler utility function
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * @desc    Search cities based on query
 * @route   GET /api/cities/search
 * @access  Public
 */
export const searchCities = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { query = '' } = req.query;
  
  if (typeof query !== 'string' || query.length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Search query must be at least 2 characters'
    });
  }
  
  // Implement the search with RegExp for partial matches
  const cities = await City.find({
    name: { $regex: query, $options: 'i' }
  })
  .select('name state country pincode')
  .limit(10)
  .sort({ name: 1 });
  
  return res.status(200).json({
    success: true,
    count: cities.length,
    data: cities
  });
});

/**
 * @desc    Get city by ID
 * @route   GET /api/cities/:id
 * @access  Public
 */
export const getCityById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const city = await City.findById(req.params.id);
  
  if (!city) {
    return res.status(404).json({
      success: false,
      message: 'City not found'
    });
  }
  
  return res.status(200).json({
    success: true,
    data: city
  });
});
