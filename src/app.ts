import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss';
import hpp from 'hpp';
import path from 'path';
import mongoose from 'mongoose';
import { connectDB } from './config/database';
import { errorHandler, notFound } from './middleware/errorMiddleware';
import logger from './utils/logger';
import config from './config/config';

// Basic console fallback in case logger fails
const safeLog = {
  info: (message: string) => {
    console.log(message);
    try {
      logger.info(message);
    } catch (e) {
      console.error('Logger error:', e);
    }
  },
  error: (message: string, error?: any) => {
    console.error(message, error);
    try {
      if (error) {
        logger.error(message, { error });
      } else {
        logger.error(message);
      }
    } catch (e) {
      console.error('Logger error:', e);
    }
  }
};

// Import routes
import authRoutes from './routes/authRoutes';
import ngoRoutes from './routes/ngoRoutes';
import userRoutes from './routes/userRoutes';
import userAccountRoutes from './routes/userAccountRoutes';
import uploadRoutes from './routes/uploadRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import programRoutes from './routes/programRoutes';
import donationRoutes from './routes/donationRoutes';
import volunteerRoutes from './routes/volunteerRoutes';
import grantRoutes from './routes/grantRoutes';
import testimonialRoutes from './routes/testimonialRoutes';
import noticeRoutes from './routes/noticeRoutes';
import searchRoutes from './routes/searchRoutes';
import emergencyRoutes from './routes/emergencyRoutes';
import contactRoutes from './routes/contactRoutes';
import cityRoutes from './routes/cityRoutes';
import referralRoutes from './routes/referralRoutes';
import certificateRoutes from './routes/certificateRoutes';
import programRegistrationRoutes from './routes/programRegistrationRoutes';
import invoiceRoutes from './routes/invoiceRoutes';
import paymentRoutes from './routes/paymentRoutes';
import kycRoutes from './routes/kycRoutes';
// New service application system routes
import serviceApplicationRoutes from './routes/serviceApplicationRoutes';
import volunteerActivityRoutes from './routes/volunteerActivityRoutes';
import notificationRoutes from './routes/notificationRoutes';
import testRoutes from './routes/testRoutes';
import managerRoutes from './routes/managerRoutes';
import googleFormRoutes from './routes/googleFormRoutes';

// Import new CMS and Event Management routes
import contentRoutes from './routes/contentRoutes';
import eventRoutes from './routes/eventRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import multiTenantAdminRoutes from './routes/multiTenantAdminRoutes';
import volunteerTrackingRoutes from './routes/volunteerTrackingRoutes';
import integrationRoutes from './routes/integrationRoutes';

// Import new role-based routes
import adminRoutes from './routes/adminRoutes';
import donorRoutes from './routes/donorRoutes';
import citizenRoutes from './routes/citizenRoutes';
import aiRoutes from './routes/aiRoutes';

const app = express();

// We'll export a function to start the app after DB connection
export const startApp = async () => {
  try {
    // Try to connect to MongoDB
    await connectDB();
    safeLog.info('✅ Database connected successfully');
  } catch (err) {
    safeLog.error('❌ Error connecting to MongoDB:', err);
    safeLog.info('⚠️  Application will continue without database connection. Some features will not work.');
    // Don't throw error, continue without database
  }
};

// Trust proxy for rate limiting and security headers
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:5173', 
    'http://localhost:5174', 
    'http://localhost:3000',
    'https://sevadaan-teal.vercel.app',
    'https://frontend-32yysvoj1-subhdas272004-gmailcoms-projects.vercel.app',
    /^https:\/\/.*\.vercel\.app$/  // Allow all Vercel preview deployments
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count']
};

app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use((req, res, next) => {
  try {
    if (req.body) {
      for (const key in req.body) {
        if (typeof req.body[key] === 'string') {
          req.body[key] = xss(req.body[key]);
        }
      }
    }
    next();
  } catch (err) {
    safeLog.error('Error in XSS middleware:', err);
    next(); // Continue without sanitization rather than crashing
  }
});

// Prevent parameter pollution
app.use(hpp());

// Compression middleware
app.use(compression());

// Logging middleware
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message: string) => {
        try {
          logger.info(message.trim());
        } catch (err) {
          console.log(message.trim());
          console.error('Error logging with winston:', err);
        }
      }
    }
  }));
}

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
try {
  if (!require('fs').existsSync(uploadDir)) {
    require('fs').mkdirSync(uploadDir, { recursive: true });
    safeLog.info(`Created uploads directory at ${uploadDir}`);
  }
} catch (err) {
  safeLog.error(`Failed to create uploads directory: ${err}`);
}

// Serve static files
app.use('/uploads', express.static(uploadDir));

// Health check endpoint - public access
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    version: process.env.npm_package_version || '1.0.0',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

// Root route handler
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'SevaDaan Backend API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      api: '/api/v1',
      docs: '/api/v1/docs'
    },
    timestamp: new Date().toISOString()
  });
});

// Add a root route for API verification
app.get('/api/v1', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'SevaDaan API is running properly',
    version: process.env.npm_package_version || '1.0.0',
    environment: config.nodeEnv
  });
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/ngos', ngoRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/users', userAccountRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/programs', programRoutes);
app.use('/api/v1/donations', donationRoutes);
app.use('/api/v1/volunteer-opportunities', volunteerRoutes);
app.use('/api/v1/grants', grantRoutes);
app.use('/api/v1/testimonials', testimonialRoutes);
app.use('/api/v1/notices', noticeRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/emergency-help', emergencyRoutes);
app.use('/api/v1/contact', contactRoutes);
app.use('/api/v1/cities', cityRoutes);
app.use('/api/v1/referrals', referralRoutes);
app.use('/api/v1/certificates', certificateRoutes);
app.use('/api/v1/program-registrations', programRegistrationRoutes);
app.use('/api/v1/invoices', invoiceRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/kyc', kycRoutes);
// New CMS and Event Management routes
app.use('/api/v1/content', contentRoutes);
app.use('/api/v1/events', eventRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/volunteer-tracking', volunteerTrackingRoutes);
app.use('/api/v1/integrations', integrationRoutes);
// New service application system routes
app.use('/api/v1/applications', serviceApplicationRoutes);
app.use('/api/v1/volunteer-activities', volunteerActivityRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/ngo/managers', managerRoutes);
app.use('/api/v1/test', testRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/google-forms', googleFormRoutes);

// Role-based routes
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/super-admin', multiTenantAdminRoutes);
app.use('/api/v1/manager', managerRoutes);
app.use('/api/v1/volunteer', volunteerRoutes);
app.use('/api/v1/donor', donorRoutes);
app.use('/api/v1/citizen', citizenRoutes);

// Catch 404 and forward to error handler
app.use(notFound);

// Error handling middleware
app.use(errorHandler);

export default app;
