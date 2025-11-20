# How to Connect Backend to Frontend

## Overview

Your frontend (Vercel) needs to connect to your backend API. Here's how to deploy the backend and connect them.

---

## Step 1: Deploy Backend to Railway (Recommended)

### 1.1 Sign Up for Railway

1. Go to https://railway.app
2. Click **"Start a New Project"**
3. Sign up with **GitHub** (easiest way)

### 1.2 Create New Project

1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose your repository: `Rukkiiii/AIVENTORY-V4`
4. Railway will import your repository

### 1.3 Configure Backend Service

1. Railway will show your repository
2. Click **"Add Service"** → **"Empty Service"**
3. Click on the new service to configure it
4. Go to **Settings** tab
5. Set **Root Directory**: `aiventory-web/server`
6. Go to **Variables** tab (we'll add these in Step 1.5)

### 1.4 Add MySQL Database

1. In your Railway project, click **"New"** button
2. Select **"Database"** → **"Add MySQL"**
3. Railway will create a MySQL database
4. **Copy the connection details** (you'll need them next):
   - `MYSQLHOST`
   - `MYSQLUSER`
   - `MYSQLPASSWORD`
   - `MYSQLDATABASE`
   - `MYSQLPORT`

### 1.5 Add Environment Variables

In your Railway service **Variables** tab, add these:

```
DB_HOST=${{MySQL.MYSQLHOST}}
DB_USER=${{MySQL.MYSQLUSER}}
DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
DB_NAME=${{MySQL.MYSQLDATABASE}}
PORT=${{MySQL.MYSQLPORT}}
JWT_SECRET=<generate-a-random-secret>
NODE_ENV=production
```

**To generate JWT_SECRET:**
- Option 1: Use online generator: https://randomkeygen.com/ (use "CodeIgniter Encryption Keys")
- Option 2: In PowerShell:
  ```powershell
  [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes([System.Guid]::NewGuid().ToString() + [System.Guid]::NewGuid().ToString()))
  ```

**Important:** Railway automatically provides MySQL variables. Use `${{MySQL.MYSQLHOST}}` format to reference them.

### 1.6 Set Start Command

1. In Railway service, go to **Settings**
2. Find **"Start Command"**
3. Set it to: `npm start`
4. **Build Command** should be: `npm install` (auto-detected)

### 1.7 Deploy

1. Railway will automatically deploy when you save
2. Wait for deployment to complete (green checkmark)
3. Go to **Settings** → **Networking**
4. Click **"Generate Domain"** to get a public URL
5. **Copy this URL** - this is your backend URL! (e.g., `https://your-app.up.railway.app`)

---

## Step 2: Migrate Database to Railway

### 2.1 Export Local Database

On your local machine:

```bash
# Windows (PowerShell)
mysqldump -u root -p aiventory > aiventory_backup.sql
```

Or use phpMyAdmin:
1. Open phpMyAdmin
2. Select `aiventory` database
3. Click **Export** tab
4. Click **Go** to download SQL file

### 2.2 Import to Railway MySQL

**Option A: Using Railway's MySQL Console**

1. In Railway, click on your MySQL database
2. Go to **"Data"** tab
3. Click **"Connect"** → Copy the connection string
4. Use a MySQL client (like MySQL Workbench, DBeaver, or command line) to connect
5. Import your `aiventory_backup.sql` file

**Option B: Using Railway CLI**

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Connect to MySQL
railway connect mysql

# Import database
mysql -h $MYSQLHOST -u $MYSQLUSER -p$MYSQLPASSWORD $MYSQLDATABASE < aiventory_backup.sql
```

---

## Step 3: Update Backend CORS

Your backend needs to allow requests from your Vercel frontend.

### 3.1 Update CORS in Backend

Edit `aiventory-web/server/index.js`:

Find this line (around line 22):
```javascript
app.use(cors());
```

Replace it with:
```javascript
app.use(cors({
  origin: [
    'https://aiventory-web-two.vercel.app',  // Your Vercel URL
    'https://aiventory-v4.vercel.app',        // Alternative Vercel URL (if different)
    'http://localhost:5173',                  // Local development
    'http://localhost:3000'                   // Local development alternative
  ],
  credentials: true
}));
```

### 3.2 Commit and Push

```bash
git add aiventory-web/server/index.js
git commit -m "Update CORS for Vercel deployment"
git push
```

Railway will auto-redeploy.

---

## Step 4: Update Vercel Environment Variable

### 4.1 Get Your Backend URL

From Railway:
- Go to your backend service
- Settings → Networking
- Copy the public domain (e.g., `https://your-app.up.railway.app`)

### 4.2 Add to Vercel

1. Go to Vercel Dashboard
2. Click your project: **AIVENTORY-V4**
3. Go to **Settings** → **Environment Variables**
4. Find `VITE_API_BASE` (or add it if missing)
5. **Edit** the value:
   - **Key**: `VITE_API_BASE`
   - **Value**: `https://your-app.up.railway.app` (your Railway backend URL)
   - **Environment**: Select **All Environments** (Production, Preview, Development)
6. Click **Save**

### 4.3 Redeploy Frontend

1. Go to **Deployments** tab
2. Click **three dots (⋯)** on latest deployment
3. Click **Redeploy**
4. Wait for deployment

---

## Step 5: Test the Connection

### 5.1 Test Backend Directly

Open in browser:
```
https://your-backend-url.railway.app/api/suppliers
```

You should see JSON data (or an empty array `[]`).

### 5.2 Test Frontend

1. Visit your Vercel URL: `https://aiventory-web-two.vercel.app`
2. Open browser **Developer Tools** (F12)
3. Go to **Console** tab
4. Try logging in or navigating
5. Check **Network** tab for API calls
6. Look for errors like:
   - `CORS policy` → Backend CORS not updated
   - `Failed to fetch` → Backend URL wrong or backend not running
   - `404 Not Found` → API endpoint doesn't exist

---

## Alternative: Deploy Backend to Render

If you prefer Render instead of Railway:

### Render Setup

1. Go to https://render.com
2. Sign up with GitHub
3. Create **New** → **Web Service**
4. Connect repository: `Rukkiiii/AIVENTORY-V4`
5. Configure:
   - **Name**: `aiventory-backend`
   - **Root Directory**: `aiventory-web/server`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
6. Add **MySQL Database**:
   - Create **New** → **Database** → **MySQL**
7. Add Environment Variables:
   ```
   DB_HOST=<from Render MySQL>
   DB_USER=<from Render MySQL>
   DB_PASSWORD=<from Render MySQL>
   DB_NAME=<from Render MySQL>
   JWT_SECRET=<generate-random-secret>
   NODE_ENV=production
   ```
8. Deploy and get your backend URL
9. Follow Steps 3-5 above to connect

---

## Troubleshooting

### Backend Not Starting?

1. Check Railway/Render **Logs** tab
2. Common issues:
   - Database connection failed → Check DB credentials
   - Port conflict → Use `PORT` environment variable
   - Missing dependencies → Check `package.json`

### CORS Errors?

- Error: `Access-Control-Allow-Origin`
- Fix: Update CORS in `server/index.js` (Step 3)

### 404 on API Calls?

- Check backend URL is correct in `VITE_API_BASE`
- Verify backend is running (check Railway/Render logs)
- Test backend URL directly in browser

### Database Connection Errors?

- Verify MySQL credentials in Railway/Render
- Check database is accessible (not localhost)
- Ensure database is imported with your data

### Frontend Can't Connect?

1. Check browser console for errors
2. Verify `VITE_API_BASE` is set correctly in Vercel
3. Check Network tab to see actual API calls
4. Ensure backend is deployed and running

---

## Quick Checklist

- [ ] Backend deployed to Railway/Render
- [ ] MySQL database created
- [ ] Environment variables set in Railway/Render
- [ ] Database migrated from local to cloud
- [ ] Backend URL copied from Railway/Render
- [ ] CORS updated in `server/index.js`
- [ ] CORS changes committed and pushed
- [ ] `VITE_API_BASE` set in Vercel environment variables
- [ ] Frontend redeployed
- [ ] Tested connection (backend URL works)
- [ ] Tested frontend (can make API calls)

---

## Summary

1. **Deploy backend** → Railway or Render
2. **Add MySQL database** → In Railway/Render
3. **Set environment variables** → DB credentials, JWT_SECRET
4. **Migrate database** → Export local, import to cloud
5. **Update CORS** → Allow Vercel domain
6. **Get backend URL** → Copy from Railway/Render
7. **Update Vercel** → Set `VITE_API_BASE` environment variable
8. **Redeploy** → Both backend and frontend
9. **Test** → Verify connection works

Your frontend and backend should now be connected! 🎉

