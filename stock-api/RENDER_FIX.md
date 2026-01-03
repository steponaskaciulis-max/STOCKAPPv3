# Fix Render Deployment Error

## The Problem
Render is looking for `package.json` in the root directory, but your API files are in the `stock-api/` subfolder.

## Solution: Set Root Directory in Render

### Step 1: Go to Render Dashboard
1. Open https://render.com/dashboard
2. Click on your API service (the one that failed)

### Step 2: Update Root Directory
1. Click **"Settings"** tab
2. Scroll down to **"Root Directory"** section
3. Click **"Edit"** or toggle it ON
4. Enter: `stock-api`
5. Click **"Save"**

### Step 3: Redeploy
1. Go to **"Deployments"** tab
2. Click **"..."** (three dots) on the latest deployment
3. Click **"Redeploy"**
4. Wait 2-3 minutes

## Alternative: Move Files to Root (If Root Directory doesn't work)

If setting Root Directory doesn't work, you can move the API files to the root:

```bash
cd /Users/sk/Desktop/Cursor1
# Move API files to root
mv stock-api/package.json .
mv stock-api/server.js .
mv stock-api/.gitignore .
```

Then update Render:
- Root Directory: Leave empty (or `./`)
- Build Command: `npm install`
- Start Command: `npm start`

## Verify Your Structure

Your repository should have:
```
your-repo/
├── stock-api/
│   ├── package.json  ← Render needs to find this
│   ├── server.js
│   └── .gitignore
└── stock-watch-clean/  (frontend - separate service)
```

## After Fixing

Once Root Directory is set to `stock-api`, Render will:
1. Find `package.json` in `stock-api/`
2. Run `npm install` successfully
3. Start your API with `npm start`

Your API should deploy successfully! 🚀

