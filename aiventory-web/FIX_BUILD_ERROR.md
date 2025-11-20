# Fix "Error creating build plan with Railpack"

## The Problem

Vercel is failing to build your project with the error:
```
Error creating build plan with Railpack
```

This happens when Vercel can't properly detect or configure the build process.

## Solution

### Step 1: Verify Root Directory in Vercel

1. Go to Vercel Dashboard → Your Project → **Settings**
2. Scroll to **General** section
3. Check **Root Directory**:
   - Should be: `aiventory-web`
   - If it's empty or different, click **Edit** and set it to `aiventory-web`
   - Click **Save**

### Step 2: Verify Build Settings

In the same Settings page, check:

- **Framework Preset**: Should be `Vite` (auto-detected)
- **Build Command**: Should be `npm run build` (auto-detected)
- **Output Directory**: Should be `dist` (auto-detected)
- **Install Command**: Should be `npm install` (auto-detected)

If any of these are wrong, click **Edit** and fix them.

### Step 3: Simplified vercel.json

I've updated your `vercel.json` to a simpler format that works better with Vite. The new file only contains:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

This lets Vercel auto-detect Vite and handle the build automatically.

### Step 4: Commit and Push Changes

```bash
git add aiventory-web/vercel.json
git commit -m "Fix Vercel build configuration"
git push
```

### Step 5: Redeploy

1. Go to Vercel → **Deployments**
2. Click **three dots (⋯)** on the failed deployment
3. Click **Redeploy**
4. Or push a new commit to trigger automatic deployment

### Step 6: Check Build Logs

If it still fails:

1. Go to the deployment
2. Click **Build Logs** tab
3. Look for specific error messages
4. Share the error if you need help

---

## Alternative: Remove vercel.json Entirely

If the simplified version still doesn't work, try removing `vercel.json` completely:

1. Delete `aiventory-web/vercel.json`
2. Make sure **Root Directory** is set to `aiventory-web` in Vercel settings
3. Vercel should auto-detect Vite and configure everything automatically
4. The SPA routing (rewrites) will be handled automatically by Vercel for Vite projects

---

## Why This Happens

The "Railpack" error usually occurs when:
- Vercel can't detect the framework (but Vite should be auto-detected)
- The `vercel.json` format is incompatible
- Root directory is not set correctly
- Build settings are misconfigured

The simplified `vercel.json` lets Vercel handle Vite detection automatically, which is more reliable.

---

## Quick Checklist

- [ ] Root Directory set to `aiventory-web` in Vercel
- [ ] Framework Preset: `Vite`
- [ ] Build Command: `npm run build`
- [ ] Output Directory: `dist`
- [ ] `vercel.json` updated (simplified)
- [ ] Changes committed and pushed
- [ ] Redeployed
- [ ] Checked build logs if still failing

