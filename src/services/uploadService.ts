import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import config from '../config/config';
import logger from '../utils/logger';

// Firebase Admin (optional - only if using Firebase)
let admin: any;
try {
  admin = require('firebase-admin');
  
  if (!admin.apps.length && config.storageProvider === 'firebase') {
    const serviceAccount = {
      type: "service_account",
      project_id: config.firebase.projectId,
      private_key_id: config.firebase.privateKeyId,
      private_key: config.firebase.privateKey,
      client_email: config.firebase.clientEmail,
      client_id: config.firebase.clientId,
      auth_uri: config.firebase.authUri,
      token_uri: config.firebase.tokenUri,
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: config.firebase.storageBucket,
      databaseURL: config.firebase.databaseURL // <-- Add this line
    });
  }
} catch (error) {
  logger.warn('Firebase Admin SDK not available or not configured');
}

// Cloudinary (optional - only if using Cloudinary)
let cloudinary: any;
try {
  cloudinary = require('cloudinary').v2;
  
  if (config.storageProvider === 'cloudinary') {
    cloudinary.config({
      cloud_name: config.cloudinary.cloudName,
      api_key: config.cloudinary.apiKey,
      api_secret: config.cloudinary.apiSecret,
    });
  }
} catch (error) {
  logger.warn('Cloudinary not available or not configured');
}

interface FileUpload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination?: string;
  filename?: string;
  path?: string;
  buffer?: Buffer;
}

// Allowed file types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/jpg',
  'image/png'
];

// File size limits (in bytes)
const _MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB

// Ensure upload directory exists
const ensureUploadDir = (dir: string): void => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Local storage configuration
const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = path.join(config.uploadPath);
    
    // Create subdirectories based on file type
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      uploadPath = path.join(uploadPath, 'images');
    } else if (ALLOWED_DOCUMENT_TYPES.includes(file.mimetype)) {
      uploadPath = path.join(uploadPath, 'documents');
    }
    
    ensureUploadDir(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${uuidv4()}-${Date.now()}`;
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

// Memory storage for cloud uploads
const memoryStorage = multer.memoryStorage();

// File filter
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Check file type
  const isImage = ALLOWED_IMAGE_TYPES.includes(file.mimetype);
  const isDocument = ALLOWED_DOCUMENT_TYPES.includes(file.mimetype);
    if (!isImage && !isDocument) {
    return cb(new Error(`File type ${file.mimetype} is not allowed`));
  }
  
  cb(null, true);
};

// Configure multer based on storage provider
export const upload = multer({
  storage: config.storageProvider === 'local' ? localStorage : memoryStorage,
  limits: {
    fileSize: MAX_DOCUMENT_SIZE, // Max file size
    files: 10 // Max number of files
  },
  fileFilter
});

// Upload to cloud storage
export const uploadToStorage = async (file: FileUpload, folder: string = 'misc'): Promise<string> => {
  try {
    switch (config.storageProvider) {
      case 'firebase':
        return await uploadToFirebase(file, folder);
      case 'cloudinary':
        return await uploadToCloudinary(file, folder);
      default:
        return uploadToLocal(file, folder);
    }
  } catch (error) {
    logger.error('Error uploading file:', error);
    throw new Error('File upload failed');
  }
};

// Upload to Firebase Storage
const uploadToFirebase = async (file: FileUpload, folder: string): Promise<string> => {
  if (!admin || !admin.apps.length) {
    throw new Error('Firebase not configured');
  }

  const bucket = admin.storage().bucket();
  const fileName = `${folder}/${uuidv4()}-${file.originalname}`;
  const fileBuffer = file.buffer || fs.readFileSync(file.path!);

  // Optimize image if it's an image
  let processedBuffer = fileBuffer;
  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    processedBuffer = await sharp(fileBuffer)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
  }

  const fileUpload = bucket.file(fileName);
  
  await fileUpload.save(processedBuffer, {
    metadata: {
      contentType: file.mimetype,
    },
  });

  // Make file publicly accessible
  await fileUpload.makePublic();

  return `https://storage.googleapis.com/${bucket.name}/${fileName}`;
};

// Upload to Cloudinary
const uploadToCloudinary = async (file: FileUpload, folder: string): Promise<string> => {
  if (!cloudinary) {
    throw new Error('Cloudinary not configured');
  }

  const fileBuffer = file.buffer || fs.readFileSync(file.path!);
  
  return new Promise((resolve, reject) => {
    const resourceType = ALLOWED_IMAGE_TYPES.includes(file.mimetype) ? 'image' : 'raw';
    
    cloudinary.uploader.upload_stream(
      {
        folder: `sevadaan/${folder}`,
        resource_type: resourceType,
        unique_filename: true,
        ...(resourceType === 'image' && {
          transformation: [
            { width: 1200, height: 1200, crop: 'limit' },
            { quality: 'auto:good' }
          ]
        })
      },
      (error: any, result: any) => {
        if (error) {
          reject(error);
        } else {
          resolve(result.secure_url);
        }
      }
    ).end(fileBuffer);
  });
};

// Local file upload (returns relative URL)
const uploadToLocal = (file: FileUpload, folder: string): string => {
  if (file.path) {
    // File already saved to disk, return relative path
    return file.path.replace(config.uploadPath, '/uploads');
  }
  
  // If using memory storage, save to disk
  const fileName = `${uuidv4()}-${file.originalname}`;
  const folderPath = path.join(config.uploadPath, folder);
  const filePath = path.join(folderPath, fileName);
  
  ensureUploadDir(folderPath);
  
  if (file.buffer) {
    fs.writeFileSync(filePath, file.buffer);
  }
  
  return `/uploads/${folder}/${fileName}`;
};

// Optimize image
export const optimizeImage = async (inputPath: string, outputPath: string): Promise<void> => {
  try {
    await sharp(inputPath)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toFile(outputPath);
    
    // Remove original file
    fs.unlinkSync(inputPath);
  } catch (error) {
    logger.error('Error optimizing image:', error);
    throw error;
  }
};

// Delete file from storage
export const deleteFromStorage = async (fileUrl: string): Promise<void> => {
  try {
    switch (config.storageProvider) {
      case 'firebase':
        await deleteFromFirebase(fileUrl);
        break;
      case 'cloudinary':
        await deleteFromCloudinary(fileUrl);
        break;
      default:
        deleteFromLocal(fileUrl);
    }
  } catch (error) {
    logger.error('Error deleting file:', error);
    // Don't throw error for file deletion failures
  }
};

const deleteFromFirebase = async (fileUrl: string): Promise<void> => {
  if (!admin || !admin.apps.length) return;
  
  const bucket = admin.storage().bucket();
  const fileName = fileUrl.split('/').pop();
  if (fileName) {
    await bucket.file(fileName).delete();
  }
};

const deleteFromCloudinary = async (fileUrl: string): Promise<void> => {
  if (!cloudinary) return;
  
  const publicId = fileUrl.split('/').slice(-2).join('/').split('.')[0];
  await cloudinary.uploader.destroy(publicId);
};

const deleteFromLocal = (fileUrl: string): void => {
  const filePath = path.join(config.uploadPath, fileUrl.replace('/uploads', ''));
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};
