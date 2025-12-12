import { Router } from 'express';
import { testAuth, testLogin } from '../controllers/testController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

// Test routes for debugging authentication
router.post('/login', testLogin);
router.get('/auth', authenticate, testAuth);

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Test routes are working',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

export default router;
