# Render API Setup - Fix Root Directory

## The Problem
Render is looking for `package.json` but can't find it because the Root Directory setting is incorrect.

## The Solution

In your Render dashboard for the API service:

1. Go to your Render service: `stockapp-kym2`
2. Click on **Settings**
3. Scroll down to **Root Directory**
4. Set it to: `stock-watch-clean/stock-api`
5. Click **Save Changes**
6. Render will automatically redeploy

## Alternative: Move stock-api to Root

If the above doesn't work, we can move `stock-api` to the root of the repository so you can set Root Directory to just `stock-api`.

## Verify the Structure

Your GitHub repo should have:
```
STOCKAPPv3/
  ├── stock-watch-clean/
  │   ├── stock-api/
  │   │   ├── package.json  ← This file exists
  │   │   ├── server.js
  │   │   └── ...
  │   └── ...
```

## After Fixing Root Directory

Once you set Root Directory to `stock-watch-clean/stock-api`, Render should:
1. Find the `package.json` file
2. Run `npm install`
3. Start the server with `npm start`
4. Your API will be live at `https://stockapp-kym2.onrender.com`

