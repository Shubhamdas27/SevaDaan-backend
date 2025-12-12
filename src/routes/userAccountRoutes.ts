import express from 'express';
import multer from 'multer';
import {
  getCurrentUser,
  updateProfile,
  changePassword,
  uploadAvatar
} from '../controllers/userAccountController';
import { authenticate } from '../middleware/authMiddleware';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 1024 * 1024 * 2 // 2MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// All routes are protected
router.use(authenticate);

// Get current user profile
router.get('/me', getCurrentUser);

// Update user profile
router.patch('/update-profile', updateProfile);

// Change password
router.patch('/change-password', changePassword);

// Upload avatar
router.post('/upload-avatar', upload.single('avatar'), uploadAvatar);

export default router;
