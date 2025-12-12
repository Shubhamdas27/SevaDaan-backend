import { Request, Response, NextFunction } from 'express';

/**
 * Async handler wrapper to catch errors and pass them to next()
 * This prevents having to use try/catch blocks in all controllers
 * 
 * @param fn The async controller function to wrap
 */
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
