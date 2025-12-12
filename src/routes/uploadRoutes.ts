import express, { Response } from 'express';
import { upload } from '../services/uploadService';
import { authenticate } from '../middleware/authMiddleware';
import { uploadToStorage } from '../services/uploadService';
import { CustomError, asyncHandler } from '../middleware/errorMiddleware';
import { AuthRequest } from '../middleware/authMiddleware';

const router = express.Router();

// @route   POST /api/v1/upload/single
// @desc    Upload single file
// @access  Private
router.post('/single', 
  authenticate,
  upload.single('file'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!(req as any).file) {
      throw new CustomError('No file provided', 400);
    }

    const fileUrl = await uploadToStorage((req as any).file, 'misc');

    res.json({
      success: true,
      data: {
        url: fileUrl,
        filename: (req as any).file.originalname,
        size: (req as any).file.size,
        type: (req as any).file.mimetype
      }
    });
  })
);

// @route   POST /api/v1/upload/multiple
// @desc    Upload multiple files
// @access  Private
router.post('/multiple', 
  authenticate,
  upload.array('files', 5),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const files = (req as any).files as any[];
    
    if (!files || files.length === 0) {
      throw new CustomError('No files provided', 400);
    }

    const uploadPromises = files.map(file => uploadToStorage(file, 'misc'));
    const urls = await Promise.all(uploadPromises);

    res.json({
      success: true,
      data: urls.map((url, index) => ({
        url,
        filename: files[index].originalname,
        size: files[index].size,
        type: files[index].mimetype
      }))
    });
  })
);

export default router;
