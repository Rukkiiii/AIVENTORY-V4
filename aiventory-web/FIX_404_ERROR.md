# Fix 404 Error on Vercel

## The Problem
You're seeing a 404 error because Vercel doesn't know where your app files are located. Your project structure has the frontend in the `aiventory-web` subdirectory, but Vercel is looking in the root.

## Solution: Set Root Directory in Vercel

### Step 1: Go to Vercel Project Settings

1. Open your Vercel dashboard: https://vercel.com/dashboard
2. Click on your project: `aiventory-web-two`
3. Click **Settings** (top menu)
4. Scroll down to **General** section

### Step 2: Configure Root Directory

1. Find **Root Directory** setting
2. Click **Edit**
3. Enter: `aiventory-web`
4. Click **Save**

### Step 3: Verify Build Settings

While you're in Settings, verify these settings:

- **Framework Preset**: `Vite` (or auto-detected)
- **Build Command**: `npm run build` (should auto-detect)
- **Output Directory**: `dist` (should auto-detect)
- **Install Command**: `npm install` (should auto-detect)

### Step 4: Add Environment Variable (Important!)

1. In Settings, go to **Environment Variables**
2. Click **Add New**
3. Add:
   - **Name**: `VITE_API_BASE`
   - **Value**: `https://your-backend-url.railway.app` (or your backend URL)
   - **Environment**: Select all (Production, Preview, Development)
4. Click **Save**

### Step 5: Redeploy

1. Go to **Deployments** tab
2. Find your latest deployment
3. Click the **three dots (⋯)** menu
4. Click **Redeploy**
5. Wait for deployment to complete

### Step 6: Test

Visit your Vercel URL: `https://aiventory-web-two.vercel.app`

The app should now load correctly!

---

## Alternative: If Root Directory Setting Doesn't Work

If you can't find the Root Directory setting, try this:

### Option A: Move vercel.json to Root

1. Copy `aiventory-web/vercel.json` to the repository root
2. Update it to point to the correct directory:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "aiventory-web/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "aiventory-web/dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

### Option B: Use Vercel CLI

```bash
cd aiventory-web
npm i -g vercel
vercel --prod
```

When prompted:
- Set up and deploy? **Yes**
- Which scope? **Your account**
- Link to existing project? **Yes** → Select `aiventory-web-two`
- Override settings? **No**

---

## Troubleshooting

### Still Getting 404?

1. **Check Build Logs**:
   - Go to Deployments → Click on the deployment
   - Check the Build Logs tab
   - Look for any errors

2. **Verify Build Output**:
   - The build should create a `dist` folder with `index.html`
   - Check if `dist/index.html` exists after build

3. **Check vercel.json Location**:
   - Make sure `vercel.json` is in `aiventory-web/` directory
   - Or in root with correct paths

4. **Test Build Locally**:
   ```bash
   cd aiventory-web
   npm run build
   ls dist  # Should show index.html and assets folder
   ```

### Build Fails?

- Check Node.js version (Vercel uses Node 18+)
- Ensure all dependencies are in `package.json`
- Check for any local file references

### CORS Errors?

- Make sure `VITE_API_BASE` environment variable is set
- Verify backend CORS allows your Vercel domain

---

## Quick Checklist

- [ ] Root Directory set to `aiventory-web` in Vercel settings
- [ ] `vercel.json` exists in `aiventory-web/` directory
- [ ] Environment variable `VITE_API_BASE` is set
- [ ] Build command: `npm run build`
- [ ] Output directory: `dist`
- [ ] Redeployed after changes
- [ ] Checked build logs for errors

---

## Still Need Help?

1. Check Vercel deployment logs
2. Verify the `dist` folder is created during build
3. Ensure `index.html` exists in `dist` folder
4. Check browser console for any JavaScript errors

