# Quick API Setup - Step by Step

## Option 1: Simple Express API (Recommended)

### 1. Create New Folder
```bash
mkdir stock-api
cd stock-api
```

### 2. Initialize Project
```bash
npm init -y
npm install express cors yahoo-finance2
```

### 3. Create `server.js`
Copy the server.js code from `API_SETUP_GUIDE.md`

### 4. Create `package.json` (update scripts)
```json
{
  "scripts": {
    "start": "node server.js"
  }
}
```

### 5. Test Locally
```bash
node server.js
# Visit http://localhost:3000/stock/AAPL
```

### 6. Push to GitHub
```bash
git init
git add .
git commit -m "Stock API"
# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/stock-api.git
git push -u origin main
```

### 7. Deploy on Render
1. Go to render.com
2. New → Web Service
3. Connect GitHub repo
4. Settings:
   - Build: `npm install`
   - Start: `npm start`
5. Deploy!

### 8. Update Frontend
Change `app.js` line 2:
```javascript
const API_BASE_URL = 'https://your-api-name.onrender.com';
```

## Option 2: Use Existing API Service

If you already have an API running at `https://stockapp-kym2.onrender.com`:

1. Test it: Visit `https://stockapp-kym2.onrender.com/stock/AAPL`
2. If it works, you're done!
3. If not, check the endpoint path (might need `/api/stock/AAPL`)

## Need Help?

Check `API_SETUP_GUIDE.md` for detailed instructions!

