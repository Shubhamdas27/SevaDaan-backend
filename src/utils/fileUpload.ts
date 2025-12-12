import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import logger from './logger';

// Define allowed file types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const ALLOWED_FILE_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES];

// File size limits (in bytes)
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads');
const createUploadsDir = () => {
  const dirs = [
    uploadsDir,
    path.join(uploadsDir, 'logos'),
    path.join(uploadsDir, 'banners'),
    path.join(uploadsDir, 'events'),
    path.join(uploadsDir, 'documents'),
    path.join(uploadsDir, 'temp')
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logger.info(`Created directory: ${dir}`);
    }
  });
};

// Initialize directories
createUploadsDir();

// Storage configuration
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    let uploadPath = uploadsDir;
    
    // Determine upload path based on file type and purpose
    if (req.route?.path?.includes('logo')) {
      uploadPath = path.join(uploadsDir, 'logos');
    } else if (req.route?.path?.includes('banner')) {
      uploadPath = path.join(uploadsDir, 'banners');
    } else if (req.route?.path?.includes('event')) {
      uploadPath = path.join(uploadsDir, 'events');
    } else if (file.mimetype.startsWith('image/')) {
      uploadPath = path.join(uploadsDir, 'images');
    } else {
      uploadPath = path.join(uploadsDir, 'documents');
    }

    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    const fileName = file.fieldname + '-' + uniqueSuffix + fileExtension;
    cb(null, fileName);
  }
});

// File filter
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Check file type
  if (!ALLOWED_FILE_TYPES.includes(file.mimetype)) {
    const error = new Error('Invalid file type. Only images and documents are allowed.') as any;
    error.name = 'INVALID_FILE_TYPE';
    return cb(error, false);
  }

  // Check file size based on type
  const isImage = ALLOWED_IMAGE_TYPES.includes(file.mimetype);
  const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_DOCUMENT_SIZE;
  
  // Note: file.size is not available in fileFilter, size check is done in upload middleware
  cb(null, true);
};

// Create multer instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_DOCUMENT_SIZE // Use the larger limit, check specific limits in routes
  }
});

// Helper function to upload single file
export const uploadSingleFile = (fieldName: string = 'file') => {
  return upload.single(fieldName);
};

// Helper function to upload multiple files
export const uploadMultipleFiles = (fieldName: string = 'files', maxCount: number = 5) => {
  return upload.array(fieldName, maxCount);
};

// Helper function to validate file size after upload
export const validateFileSize = (file: Express.Multer.File | undefined): boolean => {
  if (!file) return false;
  
  const isImage = ALLOWED_IMAGE_TYPES.includes(file.mimetype);
  const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_DOCUMENT_SIZE;
  
  return file.size <= maxSize;
};

// Helper function to delete file
export const deleteFile = (filePath: string): boolean => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info(`File deleted: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    logger.error(`Error deleting file ${filePath}:`, error);
    return false;
  }
};

// Helper function to get file URL
export const getFileUrl = (fileName: string, fileType: 'logo' | 'banner' | 'event' | 'document' = 'document'): string => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  return `${baseUrl}/uploads/${fileType}s/${fileName}`;
};

// Export utility function (legacy support)
export const uploadFile = uploadSingleFile;

// Export configuration
export const uploadConfig = {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_DOCUMENT_TYPES,
  ALLOWED_FILE_TYPES,
  MAX_IMAGE_SIZE,
  MAX_DOCUMENT_SIZE,
  uploadsDir
};

export default {
  uploadSingleFile,
  uploadMultipleFiles,
  validateFileSize,
  deleteFile,
  getFileUrl,
  uploadFile,
  uploadConfig
};
