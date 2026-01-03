# Fix Vercel 404 Error

## Quick Fix Steps:

### Option 1: Update Vercel Project Settings (Recommended)

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Click on your project
3. Go to **Settings** → **General**
4. Scroll to **Build & Development Settings**
5. Make sure these settings are:
   - **Framework Preset**: `Other` (or leave blank)
   - **Build Command**: **LEAVE EMPTY** (delete anything there)
   - **Output Directory**: **LEAVE EMPTY** (delete anything there)
   - **Install Command**: **LEAVE EMPTY** (delete anything there)
6. Click **Save**
7. Go to **Deployments** tab
8. Click the **"..."** menu (three dots) on the latest deployment
9. Click **Redeploy**
10. Wait 1-2 minutes

### Option 2: Delete vercel.json (If Option 1 doesn't work)

If the above doesn't work, delete `vercel.json` entirely and let Vercel auto-detect:

1. Delete `vercel.json` from your repository
2. Push to GitHub
3. Vercel will auto-redeploy

### Option 3: Verify File Structure

Make sure your files are in the root of your repository:
```
your-repo/
├── index.html  ← Must be in root
├── styles.css
├── app.js
└── vercel.json (optional)
```

## Why This Happens

Vercel sometimes misconfigures static sites and tries to build them. For pure HTML/CSS/JS sites:
- No build is needed
- No output directory needed
- Framework should be "Other" or blank

The fix is almost always in the Vercel project settings, not the code!

