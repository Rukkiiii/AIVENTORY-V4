# Deploying AIVENTORY V4 to Vercel

This guide will help you deploy your AIVENTORY V4 application to Vercel.

## 📋 Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub/GitLab/Bitbucket Account**: For connecting your repository
3. **Cloud Database**: MySQL database (recommended: [PlanetScale](https://planetscale.com), [Railway](https://railway.app), or [Aiven](https://aiven.io))
4. **Vercel CLI** (optional): `npm i -g vercel`

## 🏗️ Project Structure

Your project has:
- **Frontend**: React app in `aiventory-web/` (Vite)
- **Backend**: Node.js/Express API in `aiventory-web/server/`
- **Database**: MySQL (needs cloud hosting)

## ✅ Pre-Deployment Setup (Already Done!)

All API references have been updated to use environment variables:
- Created `src/config/api.js` for centralized API configuration
- Updated all pages to import `API_BASE` from config
- API URLs now use: `import.meta.env.VITE_API_BASE || 'http://localhost:5001'`

---

## 🚀 Deployment Steps

### Step 1: Deploy Backend First (Railway/Render)

**Why?** You need the backend URL to configure the frontend.

#### Option A: Railway (Recommended)

1. **Sign up** at [railway.app](https://railway.app)
2. **Create new project** → "Deploy from GitHub repo"
3. **Select your repository**
4. **Add service** → "Empty Service"
5. **Configure**:
   - Root Directory: `aiventory-web/server`
   - Build Command: `npm install`
   - Start Command: `npm start`
6. **Add MySQL Database**:
   - Click "New" → "Database" → "MySQL"
   - Railway will provide connection details
7. **Add Environment Variables**:
   ```
   DB_HOST=<from Railway MySQL>
   DB_USER=<from Railway MySQL>
   DB_PASSWORD=<from Railway MySQL>
   DB_NAME=aiventory
   JWT_SECRET=<generate a random secret>
   PORT=5001
   NODE_ENV=production
   ```
8. **Deploy** and copy your backend URL (e.g., `https://your-app.railway.app`)

#### Option B: Render

1. Go to [render.com](https://render.com)
2. Create "Web Service"
3. Connect GitHub repository
4. Configure:
   - Root Directory: `aiventory-web/server`
   - Build Command: `npm install`
   - Start Command: `npm start`
5. Add MySQL database and environment variables (same as Railway)

### Step 2: Migrate Database to Cloud

1. **Export local database**:
   ```bash
   mysqldump -u root -p aiventory > aiventory_backup.sql
   ```

2. **Import to cloud database**:
   - Use MySQL client or phpMyAdmin
   - Connect using credentials from Railway/Render
   - Import `aiventory_backup.sql`

### Step 3: Update Backend CORS

In `aiventory-web/server/index.js`, update CORS to allow your Vercel domain:

```javascript
app.use(cors({
  origin: [
    'https://your-app.vercel.app',  // Your Vercel URL
    'http://localhost:5173'          // Keep for local dev
  ],
  credentials: true
}));
```

### Step 4: Deploy Frontend to Vercel

#### Method A: Using Vercel Dashboard (Easiest)

1. **Push code to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Prepare for Vercel deployment"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Go to Vercel Dashboard**:
   - Visit [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository

3. **Configure Project**:
   - **Framework Preset**: Vite (auto-detected)
   - **Root Directory**: `aiventory-web`
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `dist` (auto-detected)
   - **Install Command**: `npm install` (auto-detected)

4. **Add Environment Variables**:
   - Go to "Environment Variables" section
   - Add:
     ```
     VITE_API_BASE=https://your-backend-url.railway.app
     ```
     (Replace with your actual backend URL from Step 1)

5. **Deploy**: Click "Deploy"

#### Method B: Using Vercel CLI

```bash
cd aiventory-web
npm i -g vercel
vercel login
vercel
```

When prompted:
- Set up and deploy? **Yes**
- Which scope? **Your account**
- Link to existing project? **No**
- Project name? **aiventory-v4** (or your choice)
- Directory? **./**
- Override settings? **No**

Then add environment variable:
```bash
vercel env add VITE_API_BASE
# Enter: https://your-backend-url.railway.app
```

Redeploy:
```bash
vercel --prod
```

### Step 5: Test Deployment

1. Visit your Vercel URL (e.g., `https://aiventory-v4.vercel.app`)
2. Test login functionality
3. Check browser console for any errors
4. Verify API calls are working

---

## 🔐 Environment Variables Reference

### Frontend (Vercel)
- `VITE_API_BASE` - Your backend API URL (e.g., `https://your-app.railway.app`)

### Backend (Railway/Render)
- `DB_HOST` - Database host
- `DB_USER` - Database user
- `DB_PASSWORD` - Database password
- `DB_NAME` - Database name (`aiventory`)
- `JWT_SECRET` - Secret key for JWT tokens (use a strong random string)
- `PORT` - Server port (usually `5001`)
- `NODE_ENV` - Set to `production`

---

## 🐛 Troubleshooting

### CORS Errors
- **Problem**: Frontend can't connect to backend
- **Solution**: Update CORS in `aiventory-web/server/index.js` to include your Vercel domain

### API Connection Errors
- **Problem**: `Failed to fetch` or network errors
- **Solution**: 
  - Verify `VITE_API_BASE` is set correctly in Vercel
  - Check backend is running and accessible
  - Verify backend URL is correct (no trailing slash)

### Build Errors
- **Problem**: Build fails on Vercel
- **Solution**:
  - Check Node.js version (Vercel uses Node 18+)
  - Verify all dependencies are in `package.json`
  - Check for any local file references

### Database Connection Errors
- **Problem**: Backend can't connect to database
- **Solution**:
  - Verify database credentials
  - Check database is accessible from cloud (not localhost)
  - Ensure database firewall allows connections from Railway/Render IPs

### 404 Errors on Refresh
- **Problem**: Page shows 404 when refreshing
- **Solution**: Already handled by `vercel.json` rewrites configuration

---

## 📝 Quick Deployment Checklist

- [ ] Backend deployed to Railway/Render
- [ ] Database migrated to cloud
- [ ] Backend CORS updated with Vercel domain
- [ ] Frontend code pushed to GitHub
- [ ] Vercel project created
- [ ] Environment variable `VITE_API_BASE` set
- [ ] Frontend deployed successfully
- [ ] Tested login functionality
- [ ] Tested API endpoints
- [ ] Verified database connections

---

## 🔄 Updating After Deployment

### Update Frontend
1. Make changes locally
2. Push to GitHub
3. Vercel automatically redeploys

### Update Backend
1. Make changes locally
2. Push to GitHub
3. Railway/Render automatically redeploys

### Update Environment Variables
- **Vercel**: Project Settings → Environment Variables
- **Railway**: Variables tab
- **Render**: Environment tab

---

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Railway Documentation](https://docs.railway.app)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Render Documentation](https://render.com/docs)

---

## 💡 Tips

1. **Use Preview Deployments**: Vercel creates preview URLs for each PR - great for testing!
2. **Monitor Logs**: Check Vercel and Railway logs for errors
3. **Database Backups**: Set up regular backups for your cloud database
4. **SSL Certificates**: Automatically handled by Vercel and Railway
5. **Custom Domain**: Add your own domain in Vercel project settings

### Step 2: Deploy to Vercel

#### Method A: Using Vercel Dashboard (Easiest)

1. **Push your code to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Configure:
     - **Framework Preset**: Vite
     - **Root Directory**: `aiventory-web`
     - **Build Command**: `npm run build`
     - **Output Directory**: `dist`
     - **Install Command**: `npm install`

3. **Add Environment Variables**:
   - Go to Project Settings → Environment Variables
   - Add:
     ```
     VITE_API_BASE=https://your-backend-url.railway.app
     ```

4. **Deploy**: Click "Deploy"

#### Method B: Using Vercel CLI

```bash
cd aiventory-web
npm i -g vercel
vercel login
vercel
```

Follow the prompts and deploy.

### Step 3: Update Frontend Code for Environment Variables

Update all API references to use environment variables:

**Files to update:**
- `src/pages/Reports.jsx`
- `src/pages/Dashboard.jsx`
- `src/pages/Inventory.jsx`
- `src/pages/Invoices.jsx`
- `src/pages/Analysis.jsx`
- `src/pages/Prediction.jsx`
- `src/pages/Suppliers.jsx`
- `src/pages/Orders.jsx`
- `src/pages/Settings.jsx`
- `src/pages/Login.jsx`
- `src/App.jsx`

**Example change:**
```javascript
// Before:
const API_BASE = 'http://localhost:5001';

// After:
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001';
```

---

## 🔧 Option 2: Backend Deployment

### Recommended: Deploy Backend to Railway or Render

**Railway** (Recommended):
1. Go to [railway.app](https://railway.app)
2. Create new project → Deploy from GitHub
3. Select your repository
4. Set root directory: `aiventory-web/server`
5. Add environment variables:
   ```
   DB_HOST=your-db-host
   DB_USER=your-db-user
   DB_PASSWORD=your-db-password
   DB_NAME=aiventory
   JWT_SECRET=your-secret-key
   PORT=5001
   NODE_ENV=production
   ```
6. Railway will provide a URL like: `https://your-app.railway.app`

**Render** (Alternative):
1. Go to [render.com](https://render.com)
2. Create new Web Service
3. Connect GitHub repository
4. Configure:
   - Root Directory: `aiventory-web/server`
   - Build Command: `npm install`
   - Start Command: `npm start`
5. Add environment variables (same as Railway)

### Alternative: Vercel Serverless Functions

If you want to use Vercel for the backend, you'll need to convert Express routes to serverless functions. This is more complex but possible.

---

## 🗄️ Database Setup (Cloud MySQL)

### Option A: PlanetScale (Recommended)

1. Sign up at [planetscale.com](https://planetscale.com)
2. Create a new database
3. Get connection string
4. Update backend environment variables

### Option B: Railway Database

1. In Railway, add a MySQL service
2. Get connection details
3. Update backend environment variables

### Option C: Aiven

1. Sign up at [aiven.io](https://aiven.io)
2. Create MySQL service
3. Get connection details

### Migrate Your Data

Export your local database and import to cloud:
```bash
# Export
mysqldump -u root -p aiventory > aiventory_backup.sql

# Import to cloud (using connection details from your provider)
mysql -h your-host -u your-user -p aiventory < aiventory_backup.sql
```

---

## 🔐 Environment Variables Checklist

### Frontend (Vercel)
- `VITE_API_BASE` - Your backend API URL

### Backend (Railway/Render)
- `DB_HOST` - Database host
- `DB_USER` - Database user
- `DB_PASSWORD` - Database password
- `DB_NAME` - Database name (aiventory)
- `JWT_SECRET` - Secret key for JWT tokens
- `PORT` - Server port (usually 5001)
- `NODE_ENV` - Set to "production"

---

## 📝 Step-by-Step Deployment

### 1. Update Frontend API URLs

Create a script to update all API references, or manually update each file.

### 2. Test Locally with Production Environment

```bash
cd aiventory-web
# Create .env.production
echo "VITE_API_BASE=https://your-backend-url.railway.app" > .env.production

# Build and test
npm run build
npm run preview
```

### 3. Deploy Frontend to Vercel

- Use Vercel dashboard or CLI
- Set root directory: `aiventory-web`
- Build command: `npm run build`
- Output directory: `dist`

### 4. Deploy Backend to Railway/Render

- Connect GitHub repo
- Set root directory: `aiventory-web/server`
- Add environment variables
- Deploy

### 5. Update CORS Settings

In `aiventory-web/server/index.js`, update CORS to allow your Vercel domain:
```javascript
app.use(cors({
  origin: [
    'https://your-app.vercel.app',
    'http://localhost:5173' // Keep for local dev
  ],
  credentials: true
}));
```

### 6. Test Deployment

1. Visit your Vercel URL
2. Try logging in
3. Test API calls
4. Check browser console for errors

---

## 🐛 Troubleshooting

### CORS Errors
- Update CORS settings in backend to include Vercel domain
- Check that backend URL is correct

### API Connection Errors
- Verify `VITE_API_BASE` environment variable is set
- Check backend is running and accessible
- Verify database connection

### Build Errors
- Check Node.js version (Vercel uses Node 18+ by default)
- Verify all dependencies are in `package.json`
- Check for any local file references

### Database Connection Errors
- Verify database credentials
- Check database is accessible from cloud (not localhost)
- Ensure database firewall allows connections

---

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Railway Documentation](https://docs.railway.app)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)

---

## ✅ Post-Deployment Checklist

- [ ] Frontend deployed to Vercel
- [ ] Backend deployed to Railway/Render
- [ ] Database migrated to cloud
- [ ] Environment variables configured
- [ ] CORS settings updated
- [ ] API URLs updated in frontend
- [ ] Test login functionality
- [ ] Test API endpoints
- [ ] Verify database connections
- [ ] Check mobile app API URL (if applicable)

