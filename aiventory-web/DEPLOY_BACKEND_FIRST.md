# Deploy Backend First - Quick Guide

## ❌ Current Problem

Your `VITE_API_BASE` in Vercel is set to:
```
http://localhost/phpmyadmin/index...
```

This is **WRONG** because:
- It points to phpMyAdmin (database tool), not your backend API
- `localhost` won't work in production (only works on your computer)
- Your frontend needs to connect to your **Node.js backend API**

## ✅ Solution: Deploy Backend to Railway (Recommended)

### Step 1: Sign Up for Railway

1. Go to https://railway.app
2. Sign up with GitHub
3. Create a new project

### Step 2: Deploy Backend

1. **Create New Project** → "Deploy from GitHub repo"
2. **Select your repository**: `Rukkiiii/AIVENTORY-V4`
3. **Add Service** → "Empty Service"
4. **Configure Service**:
   - **Root Directory**: `aiventory-web/server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Port**: Railway auto-detects, but ensure it's set to use `PORT` environment variable

### Step 3: Add MySQL Database

1. In Railway project, click **"New"** → **"Database"** → **"MySQL"**
2. Railway will create a MySQL database
3. Copy the connection details (you'll need them in Step 4)

### Step 4: Add Environment Variables in Railway

In your Railway service settings, add these environment variables:

```
DB_HOST=<from Railway MySQL>
DB_USER=<from Railway MySQL>
DB_PASSWORD=<from Railway MySQL>
DB_NAME=railway
JWT_SECRET=<generate a random secret, e.g., openssl rand -base64 32>
PORT=5001
NODE_ENV=production
```

**To generate JWT_SECRET:**
```bash
# On Windows PowerShell:
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes([System.Guid]::NewGuid().ToString() + [System.Guid]::NewGuid().ToString()))
```

Or use an online generator: https://randomkeygen.com/

### Step 5: Migrate Database

1. **Export your local database**:
   ```bash
   mysqldump -u root -p aiventory > aiventory_backup.sql
   ```

2. **Import to Railway MySQL**:
   - Use Railway's MySQL connection details
   - Connect with MySQL client or phpMyAdmin
   - Import `aiventory_backup.sql`

### Step 6: Get Your Backend URL

1. In Railway, go to your service
2. Click on the service to see details
3. Find the **"Public Domain"** or **"Generate Domain"** button
4. Copy the URL (e.g., `https://your-app-name.up.railway.app`)

### Step 7: Update Vercel Environment Variable

1. Go back to Vercel → Your Project → Settings → Environment Variables
2. **Edit** the `VITE_API_BASE` variable:
   - **Key**: `VITE_API_BASE`
   - **Value**: `https://your-app-name.up.railway.app` (your Railway backend URL)
   - **Environment**: All Environments
3. **Click Save**

### Step 8: Update Backend CORS

In `aiventory-web/server/index.js`, update CORS to allow your Vercel domain:

```javascript
app.use(cors({
  origin: [
    'https://aiventory-web-two.vercel.app',  // Your Vercel URL
    'http://localhost:5173'                  // Keep for local dev
  ],
  credentials: true
}));
```

Then commit and push to GitHub. Railway will auto-redeploy.

### Step 9: Redeploy Frontend

1. Go to Vercel → Deployments
2. Click **three dots (⋯)** on latest deployment
3. Click **Redeploy**
4. Wait for deployment

### Step 10: Test

Visit: `https://aiventory-web-two.vercel.app`

Your app should now connect to the backend! 🎉

---

## Alternative: Deploy Backend to Render

If you prefer Render:

1. Go to https://render.com
2. Create **Web Service**
3. Connect GitHub repository
4. Configure:
   - **Root Directory**: `aiventory-web/server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Add environment variables (same as Railway)
6. Add MySQL database
7. Get your Render backend URL
8. Update `VITE_API_BASE` in Vercel

---

## Quick Checklist

- [ ] Backend deployed to Railway/Render
- [ ] MySQL database created and migrated
- [ ] Environment variables set in Railway/Render
- [ ] Backend URL copied
- [ ] `VITE_API_BASE` updated in Vercel (NOT phpMyAdmin URL!)
- [ ] CORS updated in backend
- [ ] Frontend redeployed
- [ ] Tested the app

---

## Common Issues

### Backend URL Not Working?
- Make sure it's `https://` not `http://`
- No trailing slash: `https://api.example.com` not `https://api.example.com/`
- Check Railway/Render logs for errors

### CORS Errors?
- Update CORS in `server/index.js` to include your Vercel domain
- Redeploy backend after CORS changes

### Database Connection Errors?
- Verify database credentials in Railway/Render
- Check database is accessible (not localhost)
- Ensure database firewall allows connections

