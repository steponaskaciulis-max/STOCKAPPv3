# Fix Vercel Deployment Failure

## Quick Fix Steps

### 1. Set Root Directory in Vercel
1. Go to: https://vercel.com/dashboard
2. Click on your project
3. Go to **Settings** → **General**
4. Find **"Root Directory"**
5. Click **"Edit"** or toggle it ON
6. Enter: `stock-watch-clean`
7. Click **"Save"**

### 2. Clear Build Settings
In **Settings** → **General** → **Build & Development Settings**:

- **Framework Preset**: `Other` (or leave blank)
- **Build Command**: **DELETE everything** - leave empty
- **Output Directory**: **DELETE everything** - leave empty  
- **Install Command**: **DELETE everything** - leave empty

Click **"Save"**

### 3. Redeploy
1. Go to **"Deployments"** tab
2. Click **"..."** (three dots) on latest deployment
3. Click **"Redeploy"**
4. Wait 2-3 minutes

## Why This Happens

Your files are in `stock-watch-clean/` folder, but Vercel is looking in the root. Setting Root Directory tells Vercel where to find your `index.html`.

## After Fixing

Your site should deploy successfully and show real stock data!

