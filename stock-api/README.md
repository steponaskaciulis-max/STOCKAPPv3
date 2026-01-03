# Stock API

Backend API for the Stock Watch website.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Run locally:
```bash
npm start
```

3. Test endpoints:
- http://localhost:3000/stock/AAPL
- http://localhost:3000/search?q=Apple

## Deploy to Render

1. Push to GitHub
2. Create new Web Service on Render
3. Connect GitHub repository
4. Build Command: `npm install`
5. Start Command: `npm start`
6. Deploy!

## Endpoints

- `GET /stock/:ticker` - Get stock data by ticker symbol
- `GET /search?q=companyname` - Search for company ticker by name

