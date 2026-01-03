# Fix Vercel 404 Error - Step by Step

## The Problem
Vercel is showing a 404 because it's not detecting your static files correctly.

## Solution: Fix Vercel Project Settings

### Step 1: Go to Vercel Dashboard
1. Open https://vercel.com/dashboard
2. Click on your project name

### Step 2: Update Build Settings
1. Click **"Settings"** tab (top navigation)
2. Click **"General"** in the left sidebar
3. Scroll down to **"Build & Development Settings"** section
4. Click **"Edit"** or the pencil icon

### Step 3: Clear ALL Build Settings
**IMPORTANT**: Delete/clear ALL of these fields:

- **Framework Preset**: 
  - Click the dropdown
  - Select **"Other"** (or leave completely blank)
  
- **Build Command**: 
  - **DELETE everything** in this field
  - Leave it **completely empty**
  - Do NOT put anything here
  
- **Output Directory**: 
  - **DELETE everything** in this field
  - Leave it **completely empty**
  - Do NOT put "./" or "dist" or anything
  
- **Install Command**: 
  - **DELETE everything** in this field
  - Leave it **completely empty**

### Step 4: Save
1. Click **"Save"** button at the bottom
2. Wait for confirmation

### Step 5: Redeploy
1. Go to **"Deployments"** tab
2. Find your latest deployment
3. Click the **"..."** (three dots) menu on the right
4. Click **"Redeploy"**
5. Confirm the redeploy
6. Wait 1-2 minutes

### Step 6: Test
1. Click on the deployment
2. Click **"Visit"** or open the URL
3. Your site should now load!

## Alternative: If Still Not Working

If it still shows 404 after the above steps:

1. **Delete the project** in Vercel
2. **Create a new project** and import your GitHub repo again
3. When importing, make sure:
   - Framework: **Other**
   - Root Directory: **./** (or leave default)
   - Build Command: **Leave empty**
   - Output Directory: **Leave empty**

## Why This Happens

Vercel sometimes auto-detects frameworks and tries to build your project. For a pure HTML/CSS/JS static site:
- No build is needed
- No framework is needed
- Files should be served directly from root

The fix is **always** in the Vercel dashboard settings, not your code!

