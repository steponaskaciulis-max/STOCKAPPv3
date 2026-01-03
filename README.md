# 📈 Stock Watch Website

A modern, interactive stock tracking website with personalized watchlists, real-time data, and detailed stock analytics.

## ✨ Features

- 🏠 **Welcoming Homepage** - Beautiful landing page with feature highlights
- 📊 **Custom Watchlists** - Create and manage multiple stock watchlists
- 🔍 **Stock Search** - Search stocks by ticker symbol or company name
- 📈 **Interactive Charts** - Spark graphs for quick overview and detailed interactive charts
- 📋 **Comprehensive Metrics** - View sector, price, 1D%, 1W%, 1M%, P/E, PEG, EPS, DIV %, 52W High, and Delta from 52W
- 💾 **Local Storage** - All watchlists are saved locally in your browser

## 🚀 Quick Start

Simply open `index.html` in your web browser. No build process required!

## ⚙️ API Configuration

The API is currently configured to use:
```javascript
const API_BASE_URL = 'https://stockapp-kym2.onrender.com';
```

To update the API endpoint, edit `app.js` and modify the `API_BASE_URL` constant.

## 📡 API Endpoints Required

Your Render API should provide the following endpoints:

#### Get Stock Data
```
GET /stock/:ticker
```

#### Search Company by Name
```
GET /search?q=companyname
```

## 📖 Usage

1. **Create a Watchlist**: Click "Create Watchlist" button and enter a name
2. **Open Watchlist**: Click on any watchlist card to view its contents
3. **Add Stocks**: 
   - Search by ticker (e.g., AAPL, MSFT)
   - Or search by company name to find the ticker
4. **View Details**: Click on the spark graph next to any stock to see full details and interactive chart
5. **Remove Stocks**: Click "Remove" button to delete a stock from the watchlist

## 🚀 Deploy to Vercel

1. Push this repository to GitHub
2. Go to [vercel.com](https://vercel.com) and import your repository
3. Vercel will auto-detect it as a static site
4. Deploy! Your site will be live in seconds

**Important**: In Vercel project settings, make sure:
- Framework Preset: **Other**
- Build Command: **(empty)**
- Output Directory: **(empty)**

## 🎯 Deploy to Render

1. Push this repository to GitHub
2. Go to [render.com](https://render.com) and create a new Static Site
3. Connect your GitHub repository
4. Leave all build settings empty
5. Deploy!

## Technologies Used

- **HTML5** - Structure
- **CSS3** - Modern styling with gradients and animations
- **JavaScript (ES6+)** - Application logic
- **Chart.js** - Interactive charts (loaded via CDN)
- **LocalStorage API** - Data persistence

## Browser Support

Works on all modern browsers:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## License

MIT License

