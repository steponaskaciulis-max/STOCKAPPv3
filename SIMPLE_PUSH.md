# Super Simple Way to Push to GitHub

## Easiest Method: Use Terminal with Token

### Step 1: Get a GitHub Token (2 minutes)

1. Go to: https://github.com/settings/tokens
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Name it: "Stock App"
4. Check the box: **`repo`** (this gives full repository access)
5. Scroll down, click **"Generate token"**
6. **COPY THE TOKEN** (it looks like: `ghp_xxxxxxxxxxxxxxxxxxxx`)
7. **SAVE IT SOMEWHERE** - you won't see it again!

### Step 2: Push Using Terminal (30 seconds)

Open Terminal and run these commands:

```bash
cd /Users/sk/Desktop/Cursor1/stock-watch-clean
git push https://YOUR_TOKEN@github.com/steponaskaciulis-max/STOCKAPPv3.git main
```

**Replace `YOUR_TOKEN` with the token you copied!**

Example:
```bash
git push https://ghp_abc123xyz@github.com/steponaskaciulis-max/STOCKAPPv3.git main
```

### That's It!

Your code will push to GitHub and Vercel will auto-deploy!

## Even Easier: Use GitHub Web Interface

If terminal is too complicated:

1. Go to: https://github.com/steponaskaciulis-max/STOCKAPPv3
2. Click "Add file" → "Upload files"
3. Drag and drop your `app.js` file
4. Scroll down, click "Commit changes"
5. Done!

