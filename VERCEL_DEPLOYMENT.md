# SevaDaan Backend - Vercel Deployment Guide

## Environment Variables to Add in Vercel

Go to your Vercel project → Settings → Environment Variables and add:

### Required Variables

```
NODE_ENV=production
PORT=5000

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/sevadaan

# JWT
JWT_SECRET=generate-a-strong-secret-key-minimum-32-characters
JWT_EXPIRES_IN=7d

# Email (Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password
EMAIL_FROM=SevaDaan <noreply@sevadaan.org>

# Cloudinary (File Uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Payment Gateway
RAZORPAY_KEY_ID=your-razorpay-key
RAZORPAY_KEY_SECRET=your-razorpay-secret

# Frontend URL
FRONTEND_URL=https://sevadaan-teal.vercel.app
ALLOWED_ORIGINS=https://sevadaan-teal.vercel.app

# Session
SESSION_SECRET=another-strong-secret-key
```

## Deploy to Vercel

### Option 1: Using Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
cd Backend
vercel --prod
```

### Option 2: Using Vercel Dashboard

1. Go to https://vercel.com
2. Click "Add New..." → "Project"
3. Import `SevaDaan-backend` repository
4. Configure:
   - Framework Preset: Other
   - Root Directory: ./
   - Build Command: `npm run build`
   - Output Directory: dist
5. Add all environment variables (from above)
6. Click "Deploy"

## Important Notes

⚠️ **Vercel Limitations for Backend:**
- Serverless functions have 10s timeout (Hobby), 60s (Pro)
- Not ideal for WebSocket connections
- File uploads stored temporarily (use Cloudinary)
- Cold starts on first request

✅ **Better Alternatives for Backend:**
- Render.com (recommended)
- Railway.app
- Heroku
- DigitalOcean App Platform

## If Using Render Instead (Recommended)

1. Go to https://render.com
2. New Web Service
3. Connect GitHub repo: SevaDaan-backend
4. Settings:
   - Build: `npm install && npm run build`
   - Start: `npm start`
5. Add environment variables
6. Deploy!
