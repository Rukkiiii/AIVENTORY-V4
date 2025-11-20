# Fix Vercel Build Failure - Step by Step

## Current Problem
- Deployment failing with "Error creating build plan with Railpack"
- Vercel can't detect or build your Vite project

## Critical Fix: Set Root Directory in Vercel

This is the **MOST IMPORTANT** step. Vercel needs to know your app is in the `aiventory-web` folder.

### Step 1: Go to Vercel Project Settings

1. Open: https://vercel.com/dashboard
2. Click on project: **AIVENTORY-V4**
3. Click **Settings** (top menu)

### Step 2: Set Root Directory

1. Scroll down to **General** section
2. Find **Root Directory**
3. Click **Edit** (or "Override" if it says "No Root Directory")
4. Enter: `aiventory-web`
5. Click **Save**

⚠️ **This is critical!** Without this, Vercel looks in the wrong folder.

### Step 3: Verify Build Settings

In the same Settings page, scroll to **Build and Deployment Settings**:

- **Framework Preset**: Should show `Vite` (if not, select it manually)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

If any are wrong, click **Edit** and fix them.

### Step 4: Check Build Logs

1. Go to **Deployments** tab
2. Click on the failed deployment
3. Click **Build Logs** tab
4. Look for specific error messages

Common errors you might see:
- "Cannot find package.json" → Root directory not set
- "Command not found: vite" → Dependencies not installed
- "ENOENT: no such file or directory" → Wrong root directory

### Step 5: Commit and Push

Make sure your updated `vercel.json` is committed:

```bash
cd aiventory-web
git add vercel.json
git commit -m "Fix Vercel build configuration"
git push
```

### Step 6: Redeploy

After pushing:

1. Vercel will auto-deploy, OR
2. Go to **Deployments** → Click **three dots (⋯)** → **Redeploy**

---

## Alternative: Delete vercel.json and Let Vercel Auto-Detect

If the above doesn't work, try this:

1. **Delete** `aiventory-web/vercel.json`
2. **Set Root Directory** to `aiventory-web` in Vercel (Step 2 above)
3. **Set Framework Preset** to `Vite` manually
4. **Commit and push** (removing vercel.json)
5. **Redeploy**

Vercel's auto-detection for Vite is very good when the root directory is set correctly.

---

## Quick Checklist

- [ ] Root Directory set to `aiventory-web` in Vercel Settings
- [ ] Framework Preset: `Vite`
- [ ] Build Command: `npm run build`
- [ ] Output Directory: `dist`
- [ ] `vercel.json` updated (or deleted for auto-detect)
- [ ] Changes committed and pushed to GitHub
- [ ] Checked Build Logs for specific errors
- [ ] Redeployed

---

## Still Not Working?

### Check Build Logs for These Errors:

1. **"Cannot find package.json"**
   - → Root Directory is wrong or not set
   - → Fix: Set Root Directory to `aiventory-web`

2. **"vite: command not found"**
   - → Dependencies not installing
   - → Fix: Check `package.json` has all dependencies

3. **"ENOENT: dist/index.html"**
   - → Build output not in expected location
   - → Fix: Verify Output Directory is `dist`

4. **"Railpack error"**
   - → Vercel can't detect framework
   - → Fix: Manually set Framework Preset to `Vite`

### Get More Help:

1. Copy the full error from **Build Logs**
2. Check if there are any warnings before the error
3. Verify your GitHub repository structure matches:
   ```
   AIVENTORY-V4/
   └── aiventory-web/
       ├── package.json
       ├── vite.config.js
       ├── vercel.json
       └── src/
   ```

---

## Most Common Issue

**90% of the time, the problem is: Root Directory not set to `aiventory-web`**

Vercel is looking in the repository root, but your app is in the `aiventory-web` subfolder. Set the Root Directory and it should work!

