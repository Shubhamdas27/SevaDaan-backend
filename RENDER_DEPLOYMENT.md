# 🚀 SevaDaan Backend - Render Deployment Guide

## Step-by-Step Deployment Process

### 1️⃣ Setup MongoDB Atlas (Free Database)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up / Login
3. **Create Cluster**:
   - Choose **FREE tier (M0)**
   - Region: Singapore (closest to Render Singapore)
   - Cluster Name: `sevadaan-cluster`

4. **Create Database User**:
   - Database Access → Add New Database User
   - Username: `sevadaan_admin`
   - Password: Generate strong password → **SAVE IT!**
   - User Privileges: Read and write to any database

5. **Network Access**:
   - Network Access → Add IP Address
   - Click **"Allow Access from Anywhere"** (0.0.0.0/0)
   - Confirm

6. **Get Connection String**:
   - Click **"Connect"** on your cluster
   - Choose **"Connect your application"**
   - Copy the connection string:
   ```
   mongodb+srv://sevadaan_admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   - Replace `<password>` with your actual password
   - Add database name at the end:
   ```
   mongodb+srv://sevadaan_admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/sevadaan?retryWrites=true&w=majority
   ```

---

### 2️⃣ Deploy to Render

#### Option A: Using Render Dashboard (Recommended)

1. **Sign Up / Login**
   - Go to [render.com](https://render.com)
   - Sign up with GitHub

2. **Create New Web Service**
   - Click **"New +"** → **"Web Service"**
   - Connect your GitHub account if not connected
   - Select repository: `SevaDaan-backend`
   - Click **"Connect"**

3. **Configure Service**
   ```
   Name: sevadaan-backend
   Region: Singapore (or closest to you)
   Branch: main
   Root Directory: (leave empty)
   Runtime: Node
   Build Command: npm install && npm run build
   Start Command: npm start
   Instance Type: Free
   ```

4. **Add Environment Variables**
   
   Click **"Advanced"** → **"Add Environment Variable"**

   **Required Variables:**
   ```
   NODE_ENV=production
   PORT=10000
   
   # Database - Add your MongoDB Atlas connection string
   MONGODB_URI=mongodb+srv://sevadaan_admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/sevadaan
   
   # JWT - Render will auto-generate these
   JWT_SECRET=auto-generated-by-render
   JWT_EXPIRES_IN=7d
   SESSION_SECRET=auto-generated-by-render
   
   # Frontend URL
   FRONTEND_URL=https://sevadaan-teal.vercel.app
   ALLOWED_ORIGINS=https://sevadaan-teal.vercel.app
   
   # Email (Gmail) - IMPORTANT: Get App Password first!
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-16-character-app-password
   EMAIL_FROM=SevaDaan <noreply@sevadaan.org>
   
   # Cloudinary (Optional - for file uploads)
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   
   # Razorpay (Optional - for payments)
   RAZORPAY_KEY_ID=your-razorpay-key
   RAZORPAY_KEY_SECRET=your-razorpay-secret
   ```

5. **Deploy**
   - Click **"Create Web Service"**
   - Wait 3-5 minutes for deployment
   - Your backend URL will be: `https://sevadaan-backend-xxxx.onrender.com`

---

#### Option B: Using render.yaml (Automatic)

1. **Push Code to GitHub** (Already done ✅)

2. **Create Blueprint in Render**
   - Go to [render.com](https://render.com)
   - Click **"New +"** → **"Blueprint"**
   - Connect `SevaDaan-backend` repository
   - Render will detect `render.yaml` automatically

3. **Fill Environment Variables**
   - Render will show all required variables from `render.yaml`
   - Fill in the values (same as Option A above)

4. **Apply Blueprint**
   - Click **"Apply"**
   - Service will deploy automatically

---

### 3️⃣ Get Gmail App Password (For Email Notifications)

1. **Enable 2-Step Verification**:
   - Google Account → Security
   - Enable 2-Step Verification

2. **Generate App Password**:
   - Google Account → Security → 2-Step Verification
   - Scroll down → **"App passwords"**
   - Select app: Mail
   - Select device: Other (Custom name) → "SevaDaan"
   - Click **"Generate"**
   - Copy the 16-character password (e.g., `abcd efgh ijkl mnop`)
   - Use this as `EMAIL_PASS` in Render

---

### 4️⃣ Setup Cloudinary (Optional - For File Uploads)

1. Go to [cloudinary.com](https://cloudinary.com)
2. Sign up (Free account)
3. Dashboard will show:
   - Cloud name
   - API Key
   - API Secret
4. Add these to Render environment variables

---

### 5️⃣ Setup Razorpay (Optional - For Payments)

1. Go to [razorpay.com](https://razorpay.com)
2. Sign up and complete KYC
3. Dashboard → Settings → API Keys
4. Generate Test Mode keys (or Live keys after KYC)
5. Add to Render environment variables

---

### 6️⃣ Verify Deployment

1. **Check Logs**:
   - Render Dashboard → Your Service → Logs
   - Should see: "Server running on port 10000"

2. **Test Health Endpoint**:
   ```bash
   curl https://your-backend-url.onrender.com/api/health
   ```
   Should return: `{"status":"ok","message":"Server is running"}`

3. **Update Frontend**:
   - Go to Vercel Dashboard
   - Your Frontend project → Settings → Environment Variables
   - Update `VITE_API_URL` to: `https://your-backend-url.onrender.com/api`
   - Redeploy frontend

---

## 🔧 Post-Deployment Configuration

### Update CORS in Backend

If you get different Render URL, update CORS:

1. Edit `Backend/src/app.ts`
2. Add your Render URL to CORS origins
3. Commit and push (auto-deploys)

### Auto-Deploy on Git Push

✅ Already configured in `render.yaml` with `autoDeploy: true`

Every time you push to `main` branch, Render will automatically rebuild and deploy!

---

## 📊 Monitor Your Backend

### Render Dashboard
- **Logs**: Real-time application logs
- **Metrics**: CPU, Memory usage
- **Events**: Deployment history

### Free Tier Limits
- 750 hours/month (enough for 1 app 24/7)
- Service spins down after 15 min of inactivity
- Cold start: ~30 seconds on first request

---

## 🐛 Troubleshooting

### Build Failed
- Check logs in Render Dashboard
- Verify all dependencies in package.json
- Ensure TypeScript compiles: `npm run build`

### Database Connection Failed
- Check MongoDB Atlas IP whitelist (0.0.0.0/0)
- Verify connection string format
- Test connection locally first

### Service Not Starting
- Check `PORT=10000` is set
- Verify start command: `npm start`
- Check logs for errors

### Email Not Sending
- Use Gmail App Password, NOT regular password
- Verify EMAIL_HOST and EMAIL_PORT
- Test with a simple email

---

## 🎯 Your URLs After Deployment

- **Backend API**: `https://sevadaan-backend-xxxx.onrender.com`
- **Frontend**: `https://sevadaan-teal.vercel.app`
- **Database**: MongoDB Atlas Cluster
- **Health Check**: `https://sevadaan-backend-xxxx.onrender.com/api/health`

---

## 🔄 Redeployment

### Auto Deploy (Recommended)
```bash
git add .
git commit -m "Update backend"
git push origin main
# Render automatically deploys!
```

### Manual Deploy
- Render Dashboard → Your Service
- Click **"Manual Deploy"** → **"Deploy latest commit"**

---

## 💰 Cost (Free Tier)

- **Render Free**: $0/month
- **MongoDB Atlas M0**: $0/month
- **Vercel Free**: $0/month
- **Total**: **$0/month** 🎉

---

## 📝 Environment Variables Checklist

Copy this and fill in your values:

```bash
# Server
NODE_ENV=production
PORT=10000

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/sevadaan

# JWT
JWT_SECRET=auto-generated
JWT_EXPIRES_IN=7d
SESSION_SECRET=auto-generated

# Frontend
FRONTEND_URL=https://sevadaan-teal.vercel.app
ALLOWED_ORIGINS=https://sevadaan-teal.vercel.app

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=SevaDaan <noreply@sevadaan.org>

# Cloudinary (Optional)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Razorpay (Optional)
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
```

---

**Ready to deploy? Let's go! 🚀**
