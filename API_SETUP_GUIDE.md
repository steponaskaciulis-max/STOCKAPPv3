# Complete API Setup Guide - Render & GitHub

This guide will help you create a stock API, push it to GitHub, and deploy it on Render.

## Step 1: Create API Project Structure

Create a new folder for your API (separate from your frontend):

```bash
mkdir stock-api
cd stock-api
```

## Step 2: Initialize Node.js Project

```bash
npm init -y
```

## Step 3: Install Dependencies

```bash
npm install express cors dotenv
npm install yahoo-finance2  # For stock data (or use your preferred API)
```

## Step 4: Create API Files

### Create `server.js`:

```javascript
const express = require('express');
const cors = require('cors');
const yahooFinance = require('yahoo-finance2').default;

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all origins (or specify your Vercel domain)
app.use(cors({
  origin: '*', // In production, replace with your Vercel domain
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Stock API is running!' });
});

// Get stock data by ticker
app.get('/stock/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const tickerUpper = ticker.toUpperCase();
    
    // Fetch quote data
    const quote = await yahooFinance.quote(tickerUpper);
    
    // Fetch historical data for chart
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // Last 30 days
    
    const historical = await yahooFinance.historical(tickerUpper, {
      period1: startDate,
      period2: endDate,
      interval: '1d'
    });
    
    // Extract chart data (closing prices)
    const chartData = historical.map(day => day.close);
    
    // Calculate 1D, 1W, 1M changes
    const currentPrice = quote.regularMarketPrice;
    const oneDayAgo = historical[historical.length - 2]?.close || currentPrice;
    const oneWeekAgo = historical[historical.length - 8]?.close || currentPrice;
    const oneMonthAgo = historical[0]?.close || currentPrice;
    
    const change1D = ((currentPrice - oneDayAgo) / oneDayAgo) * 100;
    const change1W = ((currentPrice - oneWeekAgo) / oneWeekAgo) * 100;
    const change1M = ((currentPrice - oneMonthAgo) / oneMonthAgo) * 100;
    
    // Build response
    const response = {
      symbol: quote.symbol,
      sector: quote.sector || 'N/A',
      price: currentPrice,
      regularMarketPrice: currentPrice,
      change1D: change1D.toFixed(2),
      regularMarketChangePercent: change1D.toFixed(2),
      change1W: change1W.toFixed(2),
      change1M: change1M.toFixed(2),
      peRatio: quote.trailingPE || 'N/A',
      trailingPE: quote.trailingPE || 'N/A',
      pegRatio: quote.pegRatio || 'N/A',
      eps: quote.trailingEps || 'N/A',
      trailingEps: quote.trailingEps || 'N/A',
      dividendYield: quote.dividendYield ? (quote.dividendYield * 100).toFixed(2) : 0,
      dividendRate: quote.dividendYield ? (quote.dividendYield * 100).toFixed(2) : 0,
      fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh || 0,
      delta52W: ((currentPrice - (quote.fiftyTwoWeekHigh || currentPrice)) / (quote.fiftyTwoWeekHigh || currentPrice) * 100).toFixed(2),
      chartData: chartData
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching stock data:', error);
    res.status(404).json({ 
      error: 'Stock not found',
      message: error.message 
    });
  }
});

// Search company by name
app.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }
    
    // Use Yahoo Finance search
    const searchResults = await yahooFinance.search(q);
    
    if (searchResults.quotes && searchResults.quotes.length > 0) {
      const firstResult = searchResults.quotes[0];
      res.json({
        ticker: firstResult.symbol,
        symbol: firstResult.symbol,
        name: firstResult.longname || firstResult.shortname
      });
    } else {
      res.status(404).json({ error: 'Company not found' });
    }
  } catch (error) {
    console.error('Error searching:', error);
    res.status(500).json({ 
      error: 'Search failed',
      message: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Stock API server running on port ${PORT}`);
});
```

### Create `.env` (optional, for local development):

```
PORT=3000
```

### Create `.gitignore`:

```
node_modules/
.env
.DS_Store
*.log
```

### Create `package.json` (update scripts):

```json
{
  "name": "stock-api",
  "version": "1.0.0",
  "description": "Stock API for Stock Watch website",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "keywords": ["stock", "api"],
  "author": "",
  "license": "MIT",
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "yahoo-finance2": "^2.4.0"
  }
}
```

## Step 5: Test Locally

```bash
node server.js
```

Test endpoints:
- http://localhost:3000/
- http://localhost:3000/stock/AAPL
- http://localhost:3000/search?q=Apple

## Step 6: Push to GitHub

### Initialize Git:

```bash
git init
git add .
git commit -m "Initial commit: Stock API"
```

### Create GitHub Repository:

1. Go to https://github.com/new
2. Repository name: `stock-api` (or your choice)
3. Make it **Public** or **Private**
4. **Don't** initialize with README
5. Click "Create repository"

### Push to GitHub:

```bash
git remote add origin https://github.com/YOUR_USERNAME/stock-api.git
git branch -M main
git push -u origin main
```

## Step 7: Deploy on Render

### Create Web Service:

1. Go to https://render.com
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account if not already connected
4. Select your `stock-api` repository
5. Click **"Connect"**

### Configure Settings:

- **Name**: `stock-api` (or your choice)
- **Environment**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Plan**: Free (or your choice)

### Environment Variables (Optional):

If you need any environment variables, add them in the Render dashboard under "Environment".

### Deploy:

1. Click **"Create Web Service"**
2. Wait 2-3 minutes for deployment
3. Your API will be live at: `https://your-api-name.onrender.com`

## Step 8: Update Frontend API URL

Update your frontend `app.js`:

```javascript
const API_BASE_URL = 'https://your-api-name.onrender.com';
```

## Step 9: Test Your API

Test your deployed API:

```
https://your-api-name.onrender.com/stock/AAPL
https://your-api-name.onrender.com/search?q=Apple
```

## Step 10: Update CORS (Important!)

In your `server.js`, update CORS to allow your Vercel domain:

```javascript
app.use(cors({
  origin: [
    'https://your-vercel-app.vercel.app',
    'http://localhost:8000' // for local testing
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));
```

## Troubleshooting

### API not responding:
- Check Render logs for errors
- Make sure `yahoo-finance2` is in dependencies
- Verify PORT is set correctly

### CORS errors:
- Update CORS origin to include your Vercel domain
- Make sure CORS middleware is before routes

### Stock data not loading:
- Check browser console for API errors
- Verify API endpoint URLs match
- Test API directly in browser

## Alternative: Use Free Stock API

If `yahoo-finance2` doesn't work, you can use free APIs like:
- Alpha Vantage (free tier available)
- Finnhub (free tier available)
- Polygon.io

You're all set! 🚀

