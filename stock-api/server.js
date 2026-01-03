const express = require('express');
const cors = require('cors');
const yahooFinance = require('yahoo-finance2').default;

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS - Allow all origins (update with your Vercel domain in production)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Stock API is running!', endpoints: ['/stock/:ticker', '/search?q=companyname'] });
});

// Get stock data by ticker
app.get('/stock/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const tickerUpper = ticker.toUpperCase();
    
    console.log(`📊 Fetching COMPLETE data for: ${tickerUpper}`);
    
    // Fetch comprehensive quote data
    const quote = await yahooFinance.quote(tickerUpper);
    
    if (!quote) {
      return res.status(404).json({ error: 'Stock not found' });
    }
    
    // Fetch quoteSummary for additional financial metrics
    let quoteSummary = null;
    try {
      quoteSummary = await yahooFinance.quoteSummary(tickerUpper, {
        modules: ['summaryProfile', 'financialData', 'defaultKeyStatistics']
      });
    } catch (summaryError) {
      console.log('QuoteSummary not available, using quote data only');
    }
    
    // Fetch historical data for chart (last year for better data)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);
    
    const historical = await yahooFinance.historical(tickerUpper, {
      period1: startDate,
      period2: endDate,
      interval: '1d'
    });
    
    // Extract chart data (closing prices)
    const chartData = historical.map(day => day.close).filter(Boolean);
    
    // Calculate percentage changes
    const currentPrice = quote.regularMarketPrice || quote.price || 0;
    const oneDayAgo = historical[historical.length - 2]?.close || currentPrice;
    const oneWeekAgo = historical[Math.max(0, historical.length - 8)]?.close || currentPrice;
    const oneMonthAgo = historical[0]?.close || currentPrice;
    
    const change1D = oneDayAgo ? ((currentPrice - oneDayAgo) / oneDayAgo) * 100 : 0;
    const change1W = oneWeekAgo ? ((currentPrice - oneWeekAgo) / oneWeekAgo) * 100 : 0;
    const change1M = oneMonthAgo ? ((currentPrice - oneMonthAgo) / oneMonthAgo) * 100 : 0;
    
    // Get comprehensive data from quoteSummary if available
    const financialData = quoteSummary?.financialData || {};
    const defaultKeyStats = quoteSummary?.defaultKeyStatistics || {};
    const summaryProfile = quoteSummary?.summaryProfile || {};
    
    // Get financial metrics (prioritize quoteSummary, fallback to quote)
    const pe = financialData.trailingPE || defaultKeyStats.trailingPE || quote.trailingPE || quote.peRatio || 'N/A';
    const peg = financialData.pegRatio || defaultKeyStats.pegRatio || quote.pegRatio || 'N/A';
    const eps = financialData.trailingEps || defaultKeyStats.trailingEps || quote.trailingEps || quote.eps || 'N/A';
    const dividendYield = financialData.dividendYield || defaultKeyStats.dividendYield || quote.dividendYield || 0;
    const marketCap = quote.marketCap || defaultKeyStats.marketCap || 'N/A';
    const volume = quote.regularMarketVolume || quote.volume || 0;
    const avgVolume = quote.averageDailyVolume10Day || quote.averageVolume || defaultKeyStats.averageDailyVolume10Day || 'N/A';
    const high52W = quote.fiftyTwoWeekHigh || defaultKeyStats.fiftyTwoWeekHigh || Math.max(...chartData) || currentPrice;
    const low52W = quote.fiftyTwoWeekLow || defaultKeyStats.fiftyTwoWeekLow || Math.min(...chartData) || currentPrice;
    
    const delta52W = high52W ? (((currentPrice - high52W) / high52W) * 100).toFixed(2) : 0;
    
    // Get sector and industry
    const sector = summaryProfile.sector || quote.sector || 'N/A';
    const industry = summaryProfile.industry || quote.industry || 'N/A';
    
    console.log(`✅ Successfully fetched data for ${tickerUpper}`);
    console.log(`   P/E: ${pe}, PEG: ${peg}, EPS: ${eps}`);
    console.log(`   Sector: ${sector}, Industry: ${industry}`);
    
    // Build comprehensive response
    const response = {
      symbol: quote.symbol,
      ticker: quote.symbol,
      sector: sector,
      industry: industry,
      price: currentPrice,
      regularMarketPrice: currentPrice,
      change1D: change1D.toFixed(2),
      regularMarketChangePercent: change1D.toFixed(2),
      change1W: change1W.toFixed(2),
      change1M: change1M.toFixed(2),
      peRatio: pe,
      trailingPE: pe,
      pegRatio: peg,
      eps: eps,
      trailingEps: eps,
      dividendYield: dividendYield ? (dividendYield * 100).toFixed(2) : '0.00',
      dividendRate: dividendYield ? (dividendYield * 100).toFixed(2) : '0.00',
      fiftyTwoWeekHigh: high52W,
      fiftyTwoWeekLow: low52W,
      delta52W: delta52W,
      marketCap: marketCap,
      volume: volume,
      regularMarketVolume: volume,
      averageVolume: avgVolume,
      chartData: chartData.length > 0 ? chartData : [currentPrice]
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
    
    console.log(`Searching for: ${q}`);
    
    // Use Yahoo Finance search
    const searchResults = await yahooFinance.search(q);
    
    if (searchResults.quotes && searchResults.quotes.length > 0) {
      const firstResult = searchResults.quotes[0];
      res.json({
        ticker: firstResult.symbol,
        symbol: firstResult.symbol,
        name: firstResult.longname || firstResult.shortname || q
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
  console.log(`🚀 Stock API server running on port ${PORT}`);
  console.log(`📊 Endpoints:`);
  console.log(`   GET /stock/:ticker`);
  console.log(`   GET /search?q=companyname`);
});

