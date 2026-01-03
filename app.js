// API Configuration
const RENDER_API_URL = 'https://stockappv3.onrender.com'; // Your Render API
const USE_RENDER_API = true; // Primary method - Render API (most reliable)

// Using Yahoo Finance via public endpoint (no API key needed) - Fallback
const USE_YAHOO_FINANCE_DIRECT = true; // Fallback method when Render API fails

// Finnhub API (requires free API key)
const USE_FINNHUB_API = false; // Disabled - requires API key

// Financial Modeling Prep API (requires API key)
const USE_FMP_API = false; // Disabled - requires API key

// Alpha Vantage (Free API) - Backup option
const ALPHA_VANTAGE_API_KEY = 'demo'; // Replace with your free API key from alphavantage.co
const API_BASE_URL = 'https://www.alphavantage.co/query';

// State Management
let watchlists = JSON.parse(localStorage.getItem('watchlists')) || [];
let currentWatchlistId = null;
let currentStockTicker = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    renderWatchlists();
    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    // Navigation buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const page = e.target.dataset.page;
            switchPage(page === 'watchlists' ? 'watchlists' : 'home');
        });
    });

    // Enter key for search inputs
    document.getElementById('stock-search')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchStock();
    });

    document.getElementById('company-search')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchByCompanyName();
    });

    document.getElementById('watchlist-name-input')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') createWatchlist();
    });
}

// Page Navigation
function switchPage(pageName) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

    if (pageName === 'home') {
        document.getElementById('home-page').classList.add('active');
        document.querySelector('[data-page="home"]').classList.add('active');
    } else if (pageName === 'watchlists') {
        document.getElementById('watchlists-page').classList.add('active');
        document.querySelector('[data-page="watchlists"]').classList.add('active');
    }
}

// Watchlist Management
function renderWatchlists() {
    const grid = document.getElementById('watchlists-grid');
    if (!grid) return;
    
    grid.innerHTML = '';

    if (watchlists.length === 0) {
        grid.innerHTML = '<p style="text-align: center; color: white; font-size: 1.2rem; grid-column: 1/-1;">No watchlists yet. Create one to get started!</p>';
        return;
    }

    watchlists.forEach(watchlist => {
        const card = document.createElement('div');
        card.className = 'watchlist-card';
        card.innerHTML = `
            <div class="watchlist-card-header">
                <h3>${watchlist.name}</h3>
                <button class="delete-watchlist" onclick="deleteWatchlist('${watchlist.id}')">Delete</button>
            </div>
            <div class="watchlist-stock-count">${watchlist.stocks.length} stock(s)</div>
        `;
        card.addEventListener('click', (e) => {
            if (!e.target.classList.contains('delete-watchlist')) {
                openWatchlist(watchlist.id);
            }
        });
        grid.appendChild(card);
    });
}

function showCreateWatchlistModal() {
    document.getElementById('create-modal').classList.add('active');
    document.getElementById('watchlist-name-input').value = '';
    document.getElementById('watchlist-name-input').focus();
}

function closeCreateModal() {
    document.getElementById('create-modal').classList.remove('active');
}

function createWatchlist() {
    const name = document.getElementById('watchlist-name-input').value.trim();
    if (!name) {
        alert('Please enter a watchlist name');
        return;
    }

    const newWatchlist = {
        id: Date.now().toString(),
        name: name,
        stocks: []
    };

    watchlists.push(newWatchlist);
    saveWatchlists();
    renderWatchlists();
    closeCreateModal();
}

function deleteWatchlist(id) {
    if (confirm('Are you sure you want to delete this watchlist?')) {
        watchlists = watchlists.filter(w => w.id !== id);
        saveWatchlists();
        renderWatchlists();
    }
}

function saveWatchlists() {
    localStorage.setItem('watchlists', JSON.stringify(watchlists));
}

function openWatchlist(id) {
    currentWatchlistId = id;
    const watchlist = watchlists.find(w => w.id === id);
    if (!watchlist) return;

    document.getElementById('watchlist-detail-title').textContent = watchlist.name;
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById('watchlist-detail-page').classList.add('active');
    
    renderStockTable();
}

function goBackToWatchlists() {
    currentWatchlistId = null;
    switchPage('watchlists');
}

// Stock Search
async function searchStock() {
    const ticker = document.getElementById('stock-search').value.trim().toUpperCase();
    if (!ticker) {
        alert('Please enter a stock ticker');
        return;
    }

    const searchBtn = document.querySelector('.search-btn');
    const originalText = searchBtn?.textContent;
    if (searchBtn) {
        searchBtn.disabled = true;
        searchBtn.textContent = 'Loading Real Data...';
    }

    try {
        console.log('🔍 Fetching REAL stock data for:', ticker);
        const stockData = await fetchStockData(ticker);
        if (stockData) {
            console.log('✅ Successfully got REAL data:', stockData);
            addStockToWatchlist(stockData);
            document.getElementById('stock-search').value = '';
            alert(`✅ Added ${ticker} with REAL stock data!\nPrice: $${stockData.price}`);
        } else {
            alert('Failed to fetch stock data. Please try again.');
        }
    } catch (error) {
        console.error('❌ Error searching stock:', error);
        alert(`Error: ${error.message}\n\nCheck browser console (F12) for details.`);
    } finally {
        if (searchBtn) {
            searchBtn.disabled = false;
            searchBtn.textContent = originalText || 'Search';
        }
    }
}

async function searchByCompanyName() {
    const companyName = document.getElementById('company-search').value.trim();
    if (!companyName) {
        alert('Please enter a company name');
        return;
    }

    try {
        const ticker = await findTickerByCompanyName(companyName);
        if (ticker) {
            document.getElementById('stock-search').value = ticker;
            alert(`Found ticker: ${ticker}`);
        } else {
            alert('Company not found. Please try a different name.');
        }
    } catch (error) {
        console.error('Error finding ticker:', error);
        alert('Error finding company ticker. Please check your API connection.');
    }
}

// API Functions - Use Render API first, fallback to Yahoo Finance direct
async function fetchStockData(ticker) {
    try {
        // Try Render API first (has complete financial data from yahoo-finance2)
        if (USE_RENDER_API) {
            try {
                const renderData = await fetchRenderAPI(ticker);
                if (renderData && renderData.pe !== 'N/A' && renderData.pe !== undefined) {
                    console.log('✅ Render API succeeded for', ticker);
                    return renderData;
                }
            } catch (renderError) {
                console.warn('Render API failed, trying Yahoo Finance direct:', renderError.message);
            }
        }
        
        // Fallback to Yahoo Finance direct method (works even when Render API is blocked)
        console.log('🔄 Trying Yahoo Finance direct method...');
        try {
            return await fetchYahooFinanceDirect(ticker);
        } catch (yahooError) {
            console.warn('Yahoo Finance direct failed, trying alternative:', yahooError.message);
            try {
                return await fetchYahooFinanceAlternative(ticker);
            } catch (altError) {
                console.warn('All Yahoo Finance methods failed:', altError.message);
                // Final fallback to Alpha Vantage
                try {
                    return await fetchAlphaVantageData(ticker);
                } catch (avError) {
                    throw new Error('All data sources failed');
                }
            }
        }
    } catch (error) {
        console.error('Error fetching stock data:', error);
        console.error(`Failed to fetch stock data for ${ticker}: ${error.message}`);
        return null;
    }
}

// Yahoo Finance Direct - Using a working public endpoint
async function fetchYahooFinanceDirect(ticker) {
    try {
        console.log('📊 Fetching from Yahoo Finance (direct):', ticker);
        
        // Use a different CORS proxy that works better
        const proxies = [
            'https://api.allorigins.win/raw?url=',
            'https://corsproxy.io/?',
            'https://api.codetabs.com/v1/proxy?quest='
        ];
        
        // Fetch comprehensive data from quoteSummary endpoint
        const summaryUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=price,summaryProfile,financialData,defaultKeyStatistics`;
        
        let summaryData = null;
        
        // Try each proxy
        for (const proxy of proxies) {
            try {
                const fullUrl = proxy + encodeURIComponent(summaryUrl);
                const response = await fetch(fullUrl, {
                    headers: {
                        'Accept': 'application/json',
                    }
                });
                
                if (!response.ok) continue;
                
                const data = await response.json();
                
                // Handle different response formats
                let parsed;
                if (typeof data === 'string') {
                    parsed = JSON.parse(data);
                } else if (data.contents) {
                    parsed = JSON.parse(data.contents);
                } else {
                    parsed = data;
                }
                
                if (parsed.quoteSummary && parsed.quoteSummary.result && parsed.quoteSummary.result.length > 0) {
                    summaryData = parsed.quoteSummary.result[0];
                    console.log('✅ Summary data fetched via proxy');
                    break;
                }
            } catch (err) {
                console.log(`Proxy failed:`, err.message);
                continue;
            }
        }
        
        // Also fetch chart data
        const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1y`;
        let chartData = null;
        
        for (const proxy of proxies) {
            try {
                const fullUrl = proxy + encodeURIComponent(chartUrl);
                const response = await fetch(fullUrl);
                
                if (!response.ok) continue;
                
                const data = await response.json();
                let parsed;
                if (typeof data === 'string') {
                    parsed = JSON.parse(data);
                } else if (data.contents) {
                    parsed = JSON.parse(data.contents);
                } else {
                    parsed = data;
                }
                
                if (parsed.chart && parsed.chart.result && parsed.chart.result.length > 0) {
                    chartData = parsed.chart.result[0];
                    break;
                }
            } catch (err) {
                continue;
            }
        }
        
        if (!summaryData && !chartData) {
            throw new Error('Could not fetch stock data');
        }
        
        // Extract data
        const priceData = summaryData?.price || {};
        const financialData = summaryData?.financialData || {};
        const defaultKeyStats = summaryData?.defaultKeyStatistics || {};
        const summaryProfile = summaryData?.summaryProfile || {};
        const meta = chartData?.meta || {};
        
        // Helper to extract values
        const getValue = (obj, key) => {
            if (!obj || !obj[key]) return null;
            const val = obj[key];
            if (typeof val === 'object' && val !== null && 'raw' in val) return val.raw;
            return val;
        };
        
        const currentPrice = getValue(priceData, 'regularMarketPrice') || priceData?.regularMarketPrice || meta.regularMarketPrice || 0;
        const closes = chartData?.indicators?.quote?.[0]?.close?.filter(v => v !== null && v !== undefined) || [currentPrice];
        
        // Calculate changes
        const currentIdx = closes.length - 1;
        const oneDayAgo = closes[currentIdx - 1] || currentPrice;
        const oneWeekAgo = closes[Math.max(0, currentIdx - 5)] || currentPrice;
        const oneMonthAgo = closes[Math.max(0, currentIdx - 20)] || currentPrice;
        
        const change1D = oneDayAgo ? ((currentPrice - oneDayAgo) / oneDayAgo) * 100 : 0;
        const change1W = oneWeekAgo ? ((currentPrice - oneWeekAgo) / oneWeekAgo) * 100 : 0;
        const change1M = oneMonthAgo ? ((currentPrice - oneMonthAgo) / oneMonthAgo) * 100 : 0;
        
        const high52W = getValue(priceData, 'fiftyTwoWeekHigh') || getValue(defaultKeyStats, 'fiftyTwoWeekHigh') || meta.fiftyTwoWeekHigh || currentPrice;
        const low52W = getValue(priceData, 'fiftyTwoWeekLow') || getValue(defaultKeyStats, 'fiftyTwoWeekLow') || meta.fiftyTwoWeekLow || currentPrice;
        const delta52W = high52W ? ((currentPrice - high52W) / high52W) * 100 : 0;
        
        // Get financial metrics
        const pe = getValue(financialData, 'trailingPE') || getValue(defaultKeyStats, 'trailingPE') || getValue(financialData, 'forwardPE') || 'N/A';
        const peg = getValue(financialData, 'pegRatio') || getValue(defaultKeyStats, 'pegRatio') || 'N/A';
        const eps = getValue(financialData, 'trailingEps') || getValue(defaultKeyStats, 'trailingEps') || getValue(financialData, 'forwardEps') || 'N/A';
        const dividendYield = getValue(financialData, 'dividendYield') || getValue(defaultKeyStats, 'dividendYield') || 0;
        const marketCap = getValue(priceData, 'marketCap') || getValue(defaultKeyStats, 'marketCap') || 'N/A';
        const volume = getValue(priceData, 'regularMarketVolume') || meta.regularMarketVolume || 0;
        const avgVolume = getValue(defaultKeyStats, 'averageDailyVolume10Day') || getValue(defaultKeyStats, 'averageVolume') || 'N/A';
        
        const sector = summaryProfile?.sector || 'N/A';
        const industry = summaryProfile?.industry || 'N/A';
        
        console.log('✅ Yahoo Finance direct data fetched for', ticker);
        console.log('   P/E:', pe, '| PEG:', peg, '| EPS:', eps);
        console.log('   Dividend:', dividendYield, '| Market Cap:', marketCap);
        console.log('   Sector:', sector, '| Industry:', industry);
        console.log('   SummaryData available:', !!summaryData);
        
        return {
            ticker: ticker.toUpperCase(),
            sector: sector,
            industry: industry,
            price: parseFloat(currentPrice).toFixed(2),
            change1D: change1D.toFixed(2),
            change1W: change1W.toFixed(2),
            change1M: change1M.toFixed(2),
            pe: pe !== 'N/A' && pe !== null && pe !== undefined && pe !== 0 ? parseFloat(pe).toFixed(2) : 'N/A',
            peg: peg !== 'N/A' && peg !== null && peg !== undefined && peg !== 0 ? parseFloat(peg).toFixed(2) : 'N/A',
            eps: eps !== 'N/A' && eps !== null && eps !== undefined && eps !== 0 ? parseFloat(eps).toFixed(2) : 'N/A',
            dividend: dividendYield && dividendYield !== 0 ? (parseFloat(dividendYield) * 100).toFixed(2) : '0.00',
            high52W: parseFloat(high52W).toFixed(2),
            low52W: parseFloat(low52W).toFixed(2),
            delta52W: delta52W.toFixed(2),
            marketCap: marketCap !== 'N/A' && marketCap !== null && marketCap !== undefined && marketCap !== 0 ? formatMarketCap(marketCap) : 'N/A',
            volume: formatVolume(volume),
            avgVolume: avgVolume !== 'N/A' && avgVolume !== null && avgVolume !== undefined && avgVolume !== 0 ? formatVolume(avgVolume) : 'N/A',
            chartData: closes,
            chartTimestamps: [],
            fullChartData: closes
        };
    } catch (error) {
        console.error('Yahoo Finance direct error:', error);
        throw error;
    }
}

// Fetch from Financial Modeling Prep API (Free tier available)
async function fetchFMPData(ticker) {
    try {
        console.log('📊 Fetching from Financial Modeling Prep:', ticker);
        
        // Fetch profile (sector, industry)
        const profileUrl = `https://financialmodelingprep.com/api/v3/profile/${ticker}?apikey=demo`;
        const profileResponse = await fetch(profileUrl);
        
        // Fetch key metrics (P/E, PEG, EPS, etc.)
        const metricsUrl = `https://financialmodelingprep.com/api/v3/key-metrics/${ticker}?period=annual&limit=1&apikey=demo`;
        const metricsResponse = await fetch(metricsUrl);
        
        // Fetch quote (price, volume, etc.)
        const quoteUrl = `https://financialmodelingprep.com/api/v3/quote/${ticker}?apikey=demo`;
        const quoteResponse = await fetch(quoteUrl);
        
        // Fetch historical prices for chart
        const historicalUrl = `https://financialmodelingprep.com/api/v3/historical-price-full/${ticker}?apikey=demo&from=2023-01-01`;
        const historicalResponse = await fetch(historicalUrl);
        
        if (!profileResponse.ok || !quoteResponse.ok) {
            throw new Error('FMP API request failed');
        }
        
        const profileData = await profileResponse.json();
        const quoteData = await quoteResponse.json();
        const metricsData = metricsResponse.ok ? await metricsResponse.json() : [];
        const historicalData = historicalResponse.ok ? await historicalResponse.json() : { historical: [] };
        
        if (!quoteData || quoteData.length === 0) {
            throw new Error('Stock not found');
        }
        
        const quote = quoteData[0];
        const profile = profileData && profileData.length > 0 ? profileData[0] : {};
        const metrics = metricsData && metricsData.length > 0 ? metricsData[0] : {};
        const historical = historicalData.historical || [];
        
        const currentPrice = quote.price || 0;
        const closes = historical.map(h => h.close).filter(Boolean).reverse();
        const chartData = closes.length > 0 ? closes : [currentPrice];
        
        // Calculate changes
        const currentIdx = chartData.length - 1;
        const oneDayAgo = chartData[currentIdx - 1] || currentPrice;
        const oneWeekAgo = chartData[Math.max(0, currentIdx - 5)] || currentPrice;
        const oneMonthAgo = chartData[Math.max(0, currentIdx - 20)] || currentPrice;
        
        const change1D = oneDayAgo ? ((currentPrice - oneDayAgo) / oneDayAgo) * 100 : 0;
        const change1W = oneWeekAgo ? ((currentPrice - oneWeekAgo) / oneWeekAgo) * 100 : 0;
        const change1M = oneMonthAgo ? ((currentPrice - oneMonthAgo) / oneMonthAgo) * 100 : 0;
        
        const high52W = quote.yearHigh || currentPrice;
        const low52W = quote.yearLow || currentPrice;
        const delta52W = high52W ? ((currentPrice - high52W) / high52W) * 100 : 0;
        
        // Get financial metrics
        const pe = metrics.peRatio || quote.pe || 'N/A';
        const peg = metrics.pegRatio || 'N/A';
        const eps = metrics.earningsPerShare || quote.eps || 'N/A';
        const dividendYield = quote.dividendYield || 0;
        const marketCap = quote.marketCap || 'N/A';
        const volume = quote.volume || 0;
        const avgVolume = quote.avgVolume || 'N/A';
        
        console.log('✅ FMP data fetched for', ticker);
        console.log('   P/E:', pe, '| PEG:', peg, '| EPS:', eps);
        console.log('   Dividend:', dividendYield, '| Market Cap:', marketCap);
        console.log('   Sector:', profile.sector, '| Industry:', profile.industry);
        
        return {
            ticker: ticker.toUpperCase(),
            sector: profile.sector || 'N/A',
            industry: profile.industry || 'N/A',
            price: parseFloat(currentPrice).toFixed(2),
            change1D: change1D.toFixed(2),
            change1W: change1W.toFixed(2),
            change1M: change1M.toFixed(2),
            pe: pe !== 'N/A' && pe !== null && pe !== undefined && pe !== 0 ? parseFloat(pe).toFixed(2) : 'N/A',
            peg: peg !== 'N/A' && peg !== null && peg !== undefined && peg !== 0 ? parseFloat(peg).toFixed(2) : 'N/A',
            eps: eps !== 'N/A' && eps !== null && eps !== undefined && eps !== 0 ? parseFloat(eps).toFixed(2) : 'N/A',
            dividend: dividendYield && dividendYield !== 0 ? (parseFloat(dividendYield) * 100).toFixed(2) : '0.00',
            high52W: parseFloat(high52W).toFixed(2),
            low52W: parseFloat(low52W).toFixed(2),
            delta52W: delta52W.toFixed(2),
            marketCap: marketCap !== 'N/A' && marketCap !== null && marketCap !== undefined && marketCap !== 0 ? formatMarketCap(marketCap) : 'N/A',
            volume: formatVolume(volume),
            avgVolume: avgVolume !== 'N/A' && avgVolume !== null && avgVolume !== undefined && avgVolume !== 0 ? formatVolume(avgVolume) : 'N/A',
            chartData: chartData,
            chartTimestamps: [],
            fullChartData: chartData
        };
    } catch (error) {
        console.error('FMP API error:', error);
        throw error;
    }
}

// Fetch from Render API (your backend)
async function fetchRenderAPI(ticker) {
    try {
        console.log('📡 Fetching from Render API:', ticker);
        let response = await fetch(`${RENDER_API_URL}/stock/${ticker}`);
        
        // Handle rate limiting - wait and retry once
        if (!response.ok && (response.status === 429 || response.status === 503)) {
            console.log('⏳ API rate limited, waiting 2 seconds...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            response = await fetch(`${RENDER_API_URL}/stock/${ticker}`);
        }
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data) {
            throw new Error('No data received from API');
        }
        
        if (data.error) {
            // If error is about rate limiting, throw to trigger fallback
            if (data.error.includes('Too Many') || data.message?.includes('Too Many')) {
                throw new Error('API rate limited');
            }
            throw new Error(data.error);
        }
        
        console.log('✅ Render API response received:', Object.keys(data));
        
        // Transform Render API response to match our format
        const currentPrice = data.price || data.regularMarketPrice || 0;
        const chartData = data.chartData || [currentPrice];
        
        // Use provided changes or calculate
        let change1D = parseFloat(data.change1D) || 0;
        let change1W = parseFloat(data.change1W) || 0;
        let change1M = parseFloat(data.change1M) || 0;
        
        if (chartData.length > 1 && (!change1D || !change1W || !change1M)) {
            const currentIdx = chartData.length - 1;
            const oneDayAgo = chartData[currentIdx - 1] || currentPrice;
            const oneWeekAgo = chartData[Math.max(0, currentIdx - 5)] || currentPrice;
            const oneMonthAgo = chartData[Math.max(0, currentIdx - 20)] || currentPrice;
            
            if (!change1D && oneDayAgo) change1D = ((currentPrice - oneDayAgo) / oneDayAgo) * 100;
            if (!change1W && oneWeekAgo) change1W = ((currentPrice - oneWeekAgo) / oneWeekAgo) * 100;
            if (!change1M && oneMonthAgo) change1M = ((currentPrice - oneMonthAgo) / oneMonthAgo) * 100;
        }
        
        const high52W = parseFloat(data.fiftyTwoWeekHigh) || currentPrice;
        const low52W = parseFloat(data.fiftyTwoWeekLow) || currentPrice;
        const delta52W = high52W ? ((currentPrice - high52W) / high52W) * 100 : 0;
        
        // Get financial metrics (handle both formats)
        const pe = data.trailingPE || data.peRatio || 'N/A';
        const peg = data.pegRatio || 'N/A';
        const eps = data.trailingEps || data.eps || 'N/A';
        const dividendYield = data.dividendYield || data.dividendRate || 0;
        const marketCap = data.marketCap || 'N/A';
        const volume = data.volume || data.regularMarketVolume || 0;
        const avgVolume = data.averageVolume || 'N/A';
        
        console.log('✅ Render API data processed for', ticker);
        console.log('   P/E:', pe, '| PEG:', peg, '| EPS:', eps);
        console.log('   Dividend:', dividendYield, '| Market Cap:', marketCap);
        console.log('   Sector:', data.sector, '| Industry:', data.industry);
        
        return {
            ticker: data.symbol || data.ticker || ticker.toUpperCase(),
            sector: data.sector || 'N/A',
            industry: data.industry || 'N/A',
            price: parseFloat(currentPrice).toFixed(2),
            change1D: change1D.toFixed(2),
            change1W: change1W.toFixed(2),
            change1M: change1M.toFixed(2),
            pe: pe !== 'N/A' && pe !== null && pe !== undefined && pe !== 0 ? parseFloat(pe).toFixed(2) : 'N/A',
            peg: peg !== 'N/A' && peg !== null && peg !== undefined && peg !== 0 ? parseFloat(peg).toFixed(2) : 'N/A',
            eps: eps !== 'N/A' && eps !== null && eps !== undefined && eps !== 0 ? parseFloat(eps).toFixed(2) : 'N/A',
            dividend: dividendYield && dividendYield !== 0 ? (typeof dividendYield === 'string' ? parseFloat(dividendYield) : parseFloat(dividendYield) * 100).toFixed(2) : '0.00',
            high52W: high52W.toFixed(2),
            low52W: low52W.toFixed(2),
            delta52W: delta52W.toFixed(2),
            marketCap: marketCap !== 'N/A' && marketCap !== null && marketCap !== undefined && marketCap !== 0 ? formatMarketCap(marketCap) : 'N/A',
            volume: formatVolume(volume),
            avgVolume: avgVolume !== 'N/A' && avgVolume !== null && avgVolume !== undefined && avgVolume !== 0 ? formatVolume(avgVolume) : 'N/A',
            chartData: chartData,
            chartTimestamps: [],
            fullChartData: chartData
        };
    } catch (error) {
        console.error('Render API error:', error);
        throw error;
    }
}

// Alternative Yahoo Finance method using different endpoint
async function fetchYahooFinanceAlternative(ticker) {
    try {
        console.log('🔄 Trying alternative Yahoo Finance method for:', ticker);
        
        // Use a simpler, more reliable endpoint
        const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=price,summaryProfile,financialData,defaultKeyStatistics`;
        const proxyUrl = 'https://api.allorigins.win/get?url=' + encodeURIComponent(url);
        
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        const parsed = data.contents ? JSON.parse(data.contents) : data;
        
        if (!parsed.quoteSummary || !parsed.quoteSummary.result || parsed.quoteSummary.result.length === 0) {
            throw new Error('No data returned');
        }
        
        const result = parsed.quoteSummary.result[0];
        const priceData = result.price || {};
        const financialData = result.financialData || {};
        const keyStats = result.defaultKeyStatistics || {};
        const profile = result.summaryProfile || {};
        
        const currentPrice = priceData.regularMarketPrice?.raw || priceData.regularMarketPrice || 0;
        
        // Get all metrics
        const pe = financialData.trailingPE || keyStats.trailingPE || financialData.forwardPE || 'N/A';
        const peg = financialData.pegRatio || keyStats.pegRatio || 'N/A';
        const eps = financialData.trailingEps || keyStats.trailingEps || financialData.forwardEps || 'N/A';
        const dividendYield = financialData.dividendYield || keyStats.dividendYield || 0;
        const marketCap = priceData.marketCap?.raw || priceData.marketCap || keyStats.marketCap?.raw || keyStats.marketCap || 'N/A';
        const volume = priceData.regularMarketVolume?.raw || priceData.regularMarketVolume || 0;
        const avgVolume = keyStats.averageDailyVolume10Day?.raw || keyStats.averageDailyVolume10Day || 'N/A';
        const high52W = priceData.fiftyTwoWeekHigh?.raw || priceData.fiftyTwoWeekHigh || keyStats.fiftyTwoWeekHigh?.raw || keyStats.fiftyTwoWeekHigh || currentPrice;
        const low52W = priceData.fiftyTwoWeekLow?.raw || priceData.fiftyTwoWeekLow || keyStats.fiftyTwoWeekLow?.raw || keyStats.fiftyTwoWeekLow || currentPrice;
        
        // For chart data, we still need to fetch from chart endpoint
        const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1y`;
        const chartProxy = 'https://api.allorigins.win/get?url=' + encodeURIComponent(chartUrl);
        const chartResponse = await fetch(chartProxy);
        let closes = [currentPrice];
        
        if (chartResponse.ok) {
            const chartData = await chartResponse.json();
            const chartParsed = chartData.contents ? JSON.parse(chartData.contents) : chartData;
            if (chartParsed.chart?.result?.[0]?.indicators?.quote?.[0]?.close) {
                closes = chartParsed.chart.result[0].indicators.quote[0].close.filter(v => v !== null && v !== undefined);
            }
        }
        
        // Calculate changes
        const currentIdx = closes.length - 1;
        const oneDayAgo = closes[currentIdx - 1] || currentPrice;
        const oneWeekAgo = closes[Math.max(0, currentIdx - 5)] || currentPrice;
        const oneMonthAgo = closes[Math.max(0, currentIdx - 20)] || currentPrice;
        
        const change1D = oneDayAgo ? ((currentPrice - oneDayAgo) / oneDayAgo) * 100 : 0;
        const change1W = oneWeekAgo ? ((currentPrice - oneWeekAgo) / oneWeekAgo) * 100 : 0;
        const change1M = oneMonthAgo ? ((currentPrice - oneMonthAgo) / oneMonthAgo) * 100 : 0;
        const delta52W = high52W ? ((currentPrice - high52W) / high52W) * 100 : 0;
        
        console.log('✅ Alternative method succeeded for', ticker);
        console.log('   P/E:', pe, '| PEG:', peg, '| EPS:', eps);
        
        return {
            ticker: ticker.toUpperCase(),
            sector: profile.sector || 'N/A',
            industry: profile.industry || 'N/A',
            price: parseFloat(currentPrice).toFixed(2),
            change1D: change1D.toFixed(2),
            change1W: change1W.toFixed(2),
            change1M: change1M.toFixed(2),
            pe: pe !== 'N/A' && pe !== null && pe !== undefined && pe !== 0 ? parseFloat(pe).toFixed(2) : 'N/A',
            peg: peg !== 'N/A' && peg !== null && peg !== undefined && peg !== 0 ? parseFloat(peg).toFixed(2) : 'N/A',
            eps: eps !== 'N/A' && eps !== null && eps !== undefined && eps !== 0 ? parseFloat(eps).toFixed(2) : 'N/A',
            dividend: dividendYield && dividendYield !== 0 ? (parseFloat(dividendYield) * 100).toFixed(2) : '0.00',
            high52W: parseFloat(high52W).toFixed(2),
            low52W: parseFloat(low52W).toFixed(2),
            delta52W: delta52W.toFixed(2),
            marketCap: marketCap !== 'N/A' && marketCap !== null && marketCap !== undefined && marketCap !== 0 ? formatMarketCap(marketCap) : 'N/A',
            volume: formatVolume(volume),
            avgVolume: avgVolume !== 'N/A' && avgVolume !== null && avgVolume !== undefined && avgVolume !== 0 ? formatVolume(avgVolume) : 'N/A',
            chartData: closes,
            chartTimestamps: [],
            fullChartData: closes
        };
    } catch (error) {
        console.error('Alternative Yahoo Finance method failed:', error);
        throw error;
    }
}

// Yahoo Finance API (via CORS proxy) - SIMPLIFIED and RELIABLE VERSION
async function fetchYahooFinanceData(ticker) {
    try {
        console.log('📊 Fetching stock data from Yahoo Finance:', ticker);
        
        // Try the alternative method first (more reliable)
        try {
            return await fetchYahooFinanceAlternative(ticker);
        } catch (altError) {
            console.log('Alternative method failed, trying main method:', altError.message);
        }
        
        const proxies = [
            'https://api.allorigins.win/get?url=',
            'https://corsproxy.io/?',
            'https://api.codetabs.com/v1/proxy?quest='
        ];
        
        // Use comprehensive endpoints
        const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1y&includePrePost=false`;
        const summaryUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=price,summaryProfile,financialData,defaultKeyStatistics`;
        
        let chartData = null;
        let summaryData = null;
        
        // Fetch chart data
        for (const proxyUrl of proxies) {
            try {
                const fullUrl = proxyUrl + encodeURIComponent(chartUrl);
                const response = await fetch(fullUrl);
                
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                
                const data = await response.json();
                let parsed;
                if (data.contents) {
                    parsed = JSON.parse(data.contents);
                } else if (data.chart) {
                    parsed = data;
                } else {
                    throw new Error('Unexpected response format');
                }
                
                if (parsed.chart && parsed.chart.result && parsed.chart.result.length > 0) {
                    chartData = parsed.chart.result[0];
                    break;
                }
            } catch (err) {
                console.log('Chart fetch attempt failed:', err.message);
                continue;
            }
        }
        
        // Fetch summary data for comprehensive financial metrics (has everything we need)
        for (const proxyUrl of proxies) {
            try {
                const fullUrl = proxyUrl + encodeURIComponent(summaryUrl);
                const response = await fetch(fullUrl);
                
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                
                const data = await response.json();
                let parsed;
                if (data.contents) {
                    parsed = JSON.parse(data.contents);
                } else if (data.quoteSummary) {
                    parsed = data;
                } else {
                    throw new Error('Unexpected summary format');
                }
                
                if (parsed.quoteSummary && parsed.quoteSummary.result && parsed.quoteSummary.result.length > 0) {
                    summaryData = parsed.quoteSummary.result[0];
                    console.log('✅ Summary data fetched');
                    if (summaryData.financialData) {
                        console.log('   Financial Data:', Object.keys(summaryData.financialData));
                    }
                    break;
                }
            } catch (err) {
                console.log('Summary fetch attempt failed:', err.message);
                continue;
            }
        }
        
        if (!chartData) {
            throw new Error('Could not fetch stock data');
        }
        
        const meta = chartData.meta;
        const quotes = chartData.indicators.quote[0];
        
        if (!meta || !meta.regularMarketPrice) {
            throw new Error('Invalid stock data received');
        }
        
        const currentPrice = meta.regularMarketPrice || meta.previousClose || 0;
        const closes = quotes.close.filter(v => v !== null && v !== undefined);
        
        if (closes.length === 0) {
            throw new Error('No price data available');
        }
        
        // Get comprehensive data from summary (has all financial metrics)
        const financialData = summaryData?.financialData || {};
        const defaultKeyStats = summaryData?.defaultKeyStatistics || {};
        const summaryProfile = summaryData?.summaryProfile || {};
        const priceData = summaryData?.price || {};
        
        // Helper to extract values (handles both raw and direct values)
        const getValue = (obj, key) => {
            if (!obj || !obj[key]) return null;
            const val = obj[key];
            if (typeof val === 'object' && val !== null && 'raw' in val) return val.raw;
            return val;
        };
        
        // Get price from summary or chart meta
        const summaryPrice = getValue(priceData, 'regularMarketPrice') || priceData?.regularMarketPrice || currentPrice;
        const finalPrice = summaryPrice || currentPrice;
        
        // Calculate changes
        const currentIdx = closes.length - 1;
        const oneDayAgo = closes[currentIdx - 1] || finalPrice;
        const oneWeekAgo = closes[Math.max(0, currentIdx - 5)] || finalPrice;
        const oneMonthAgo = closes[Math.max(0, currentIdx - 20)] || finalPrice;
        
        const change1D = oneDayAgo ? ((finalPrice - oneDayAgo) / oneDayAgo) * 100 : 0;
        const change1W = oneWeekAgo ? ((finalPrice - oneWeekAgo) / oneWeekAgo) * 100 : 0;
        const change1M = oneMonthAgo ? ((finalPrice - oneMonthAgo) / oneMonthAgo) * 100 : 0;
        
        const fiftyTwoWeekHigh = getValue(priceData, 'fiftyTwoWeekHigh') || getValue(defaultKeyStats, 'fiftyTwoWeekHigh') || meta.fiftyTwoWeekHigh || finalPrice;
        const fiftyTwoWeekLow = getValue(priceData, 'fiftyTwoWeekLow') || getValue(defaultKeyStats, 'fiftyTwoWeekLow') || meta.fiftyTwoWeekLow || finalPrice;
        const delta52W = fiftyTwoWeekHigh ? ((finalPrice - fiftyTwoWeekHigh) / fiftyTwoWeekHigh) * 100 : 0;
        
        // Get financial metrics from summary (most reliable source)
        const pe = getValue(financialData, 'trailingPE') || getValue(defaultKeyStats, 'trailingPE') || getValue(financialData, 'forwardPE') || meta.trailingPE || 'N/A';
        const peg = getValue(financialData, 'pegRatio') || getValue(defaultKeyStats, 'pegRatio') || meta.pegRatio || 'N/A';
        const eps = getValue(financialData, 'trailingEps') || getValue(defaultKeyStats, 'trailingEps') || getValue(financialData, 'forwardEps') || meta.trailingEps || 'N/A';
        const dividendYield = getValue(financialData, 'dividendYield') || getValue(defaultKeyStats, 'dividendYield') || meta.dividendYield || 0;
        const marketCap = getValue(priceData, 'marketCap') || getValue(defaultKeyStats, 'marketCap') || meta.marketCap || 'N/A';
        const volume = getValue(priceData, 'regularMarketVolume') || meta.regularMarketVolume || 0;
        const avgVolume = getValue(defaultKeyStats, 'averageDailyVolume10Day') || getValue(defaultKeyStats, 'averageVolume') || 'N/A';
        
        // Get sector and industry
        const sector = summaryProfile?.sector || meta.sector || 'N/A';
        const industry = summaryProfile?.industry || meta.industry || 'N/A';
        
        console.log('✅ Final data for', ticker);
        console.log('   Price:', finalPrice);
        console.log('   P/E:', pe, '| PEG:', peg, '| EPS:', eps);
        console.log('   Dividend:', dividendYield, '| Market Cap:', marketCap);
        console.log('   Sector:', sector, '| Industry:', industry);
        console.log('   SummaryData available:', !!summaryData);
        
        return {
            ticker: meta.symbol || ticker,
            sector: sector,
            industry: industry,
            price: parseFloat(finalPrice).toFixed(2),
            change1D: change1D.toFixed(2),
            change1W: change1W.toFixed(2),
            change1M: change1M.toFixed(2),
            pe: pe !== 'N/A' && pe !== null && pe !== undefined && pe !== 0 ? parseFloat(pe).toFixed(2) : 'N/A',
            peg: peg !== 'N/A' && peg !== null && peg !== undefined && peg !== 0 ? parseFloat(peg).toFixed(2) : 'N/A',
            eps: eps !== 'N/A' && eps !== null && eps !== undefined && eps !== 0 ? parseFloat(eps).toFixed(2) : 'N/A',
            dividend: dividendYield && dividendYield !== 0 ? (parseFloat(dividendYield) * 100).toFixed(2) : '0.00',
            high52W: parseFloat(fiftyTwoWeekHigh).toFixed(2),
            low52W: parseFloat(fiftyTwoWeekLow).toFixed(2),
            delta52W: delta52W.toFixed(2),
            marketCap: marketCap !== 'N/A' && marketCap !== null && marketCap !== undefined && marketCap !== 0 ? formatMarketCap(marketCap) : 'N/A',
            volume: formatVolume(volume),
            avgVolume: avgVolume !== 'N/A' && avgVolume !== null && avgVolume !== undefined && avgVolume !== 0 ? formatVolume(avgVolume) : 'N/A',
            chartData: closes, // Full year of data
            chartTimestamps: chartData.timestamp || [],
            fullChartData: closes // Store full data for all timeframes
        };
    } catch (error) {
        console.error('Yahoo Finance error for', ticker, ':', error);
        throw new Error(`Failed to fetch real stock data: ${error.message}`);
    }
}

// Helper function to format market cap
function formatMarketCap(value) {
    if (value >= 1e12) return (value / 1e12).toFixed(2) + 'T';
    if (value >= 1e9) return (value / 1e9).toFixed(2) + 'B';
    if (value >= 1e6) return (value / 1e6).toFixed(2) + 'M';
    return value.toFixed(0);
}

// Helper function to format volume
function formatVolume(value) {
    if (value >= 1e9) return (value / 1e9).toFixed(2) + 'B';
    if (value >= 1e6) return (value / 1e6).toFixed(2) + 'M';
    if (value >= 1e3) return (value / 1e3).toFixed(2) + 'K';
    return value.toFixed(0);
}

// Alpha Vantage API (requires free API key)
async function fetchAlphaVantageData(ticker) {
    try {
        const url = `${API_BASE_URL}?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${ALPHA_VANTAGE_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data['Error Message'] || data['Note']) {
            throw new Error(data['Error Message'] || data['Note']);
        }
        
        const quote = data['Global Quote'];
        if (!quote || !quote['05. price']) {
            throw new Error('Stock not found');
        }
        
        const price = parseFloat(quote['05. price']);
        const change = parseFloat(quote['09. change']);
        const changePercent = parseFloat(quote['10. change percent'].replace('%', ''));
        const high52W = parseFloat(quote['52. week high']);
        
        return {
            ticker: quote['01. symbol'],
            sector: 'N/A',
            price: price.toFixed(2),
            change1D: changePercent.toFixed(2),
            change1W: '0.00',
            change1M: '0.00',
            pe: 'N/A',
            peg: 'N/A',
            eps: 'N/A',
            dividend: '0.00',
            high52W: high52W.toFixed(2),
            delta52W: ((price - high52W) / high52W * 100).toFixed(2),
            chartData: generateMockChartData()
        };
    } catch (error) {
        console.error('Alpha Vantage error:', error);
        throw error;
    }
}

async function findTickerByCompanyName(companyName) {
    // Simple mapping for common companies
    const companyMap = {
        'apple': 'AAPL',
        'microsoft': 'MSFT',
        'google': 'GOOGL',
        'alphabet': 'GOOGL',
        'amazon': 'AMZN',
        'tesla': 'TSLA',
        'meta': 'META',
        'facebook': 'META',
        'nvidia': 'NVDA',
        'netflix': 'NFLX',
        'disney': 'DIS',
        'coca cola': 'KO',
        'pepsi': 'PEP',
        'walmart': 'WMT',
        'jpmorgan': 'JPM',
        'bank of america': 'BAC',
        'visa': 'V',
        'mastercard': 'MA',
        'adobe': 'ADBE',
        'salesforce': 'CRM'
    };
    
    const lowerName = companyName.toLowerCase();
    return companyMap[lowerName] || null;
}

function generateMockChartData() {
    const data = [];
    const baseValue = 100;
    let currentValue = baseValue;
    
    for (let i = 0; i < 30; i++) {
        currentValue += (Math.random() - 0.5) * 5;
        data.push(currentValue);
    }
    
    return data;
}

// Stock Table Management
function addStockToWatchlist(stockData) {
    if (!currentWatchlistId) {
        alert('Please select a watchlist first');
        return;
    }

    const watchlist = watchlists.find(w => w.id === currentWatchlistId);
    if (!watchlist) return;

    // Check if stock already exists
    if (watchlist.stocks.some(s => s.ticker === stockData.ticker)) {
        alert('Stock already in watchlist');
        return;
    }

    watchlist.stocks.push(stockData);
    saveWatchlists();
    renderStockTable();
}

function removeStockFromWatchlist(ticker) {
    if (!currentWatchlistId) return;

    const watchlist = watchlists.find(w => w.id === currentWatchlistId);
    if (!watchlist) return;

    watchlist.stocks = watchlist.stocks.filter(s => s.ticker !== ticker);
    saveWatchlists();
    renderStockTable();
}

// Refresh all stocks with real data
async function refreshAllStocks() {
    if (!currentWatchlistId) {
        alert('Please select a watchlist first');
        return;
    }

    const watchlist = watchlists.find(w => w.id === currentWatchlistId);
    if (!watchlist || watchlist.stocks.length === 0) {
        alert('No stocks to refresh');
        return;
    }

    const refreshBtn = document.querySelector('.refresh-btn');
    if (refreshBtn) {
        refreshBtn.disabled = true;
        refreshBtn.textContent = 'Refreshing...';
    }

    try {
        // Refresh each stock with real data
        for (let i = 0; i < watchlist.stocks.length; i++) {
            const stock = watchlist.stocks[i];
            const ticker = stock.ticker;
            
            console.log(`Refreshing ${ticker} with real data...`);
            
            try {
                const realData = await fetchStockData(ticker);
                if (realData) {
                    watchlist.stocks[i] = realData;
                    console.log(`✅ Updated ${ticker} with real data`);
                }
            } catch (error) {
                console.error(`Failed to refresh ${ticker}:`, error);
                // Keep existing data if refresh fails
            }
        }

        saveWatchlists();
        renderStockTable();
        
        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.textContent = '🔄 Refresh All Stocks';
        }
        
        alert('Stocks refreshed with real data!');
    } catch (error) {
        console.error('Error refreshing stocks:', error);
        alert('Error refreshing stocks. Check console for details.');
        
        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.textContent = '🔄 Refresh All Stocks';
        }
    }
}

function renderStockTable() {
    if (!currentWatchlistId) return;

    const watchlist = watchlists.find(w => w.id === currentWatchlistId);
    if (!watchlist) return;

    const tbody = document.getElementById('stock-table-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';

    if (watchlist.stocks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="14" style="text-align: center; padding: 2rem; color: #666;">No stocks in this watchlist. Search and add stocks to get started!</td></tr>';
        return;
    }

    watchlist.stocks.forEach(stock => {
        const row = document.createElement('tr');
        
        const delta52W = parseFloat(stock.delta52W) || 0;
        
        row.innerHTML = `
            <td><strong>${stock.ticker}</strong></td>
            <td>${stock.sector}</td>
            <td>$${parseFloat(stock.price).toFixed(2)}</td>
            <td class="${parseFloat(stock.change1D) >= 0 ? 'positive' : 'negative'}">${parseFloat(stock.change1D) >= 0 ? '+' : ''}${parseFloat(stock.change1D)}%</td>
            <td class="${parseFloat(stock.change1W) >= 0 ? 'positive' : 'negative'}">${parseFloat(stock.change1W) >= 0 ? '+' : ''}${parseFloat(stock.change1W)}%</td>
            <td class="${parseFloat(stock.change1M) >= 0 ? 'positive' : 'negative'}">${parseFloat(stock.change1M) >= 0 ? '+' : ''}${parseFloat(stock.change1M)}%</td>
            <td>${stock.pe}</td>
            <td>${stock.peg}</td>
            <td>$${stock.eps}</td>
            <td>${parseFloat(stock.dividend).toFixed(2)}%</td>
            <td>$${parseFloat(stock.high52W).toFixed(2)}</td>
            <td class="${delta52W >= 0 ? 'positive' : 'negative'}">${delta52W >= 0 ? '+' : ''}${delta52W.toFixed(2)}%</td>
            <td><canvas class="spark-chart" data-ticker="${stock.ticker}" onclick="openStockDetail('${stock.ticker}')"></canvas></td>
            <td><button class="remove-stock" onclick="removeStockFromWatchlist('${stock.ticker}')">Remove</button></td>
        `;
        
        tbody.appendChild(row);
        
        // Render spark chart
        setTimeout(() => {
            renderSparkChart(stock.ticker, stock.chartData || generateMockChartData());
        }, 100);
    });
}

function renderSparkChart(ticker, data) {
    const canvas = document.querySelector(`.spark-chart[data-ticker="${ticker}"]`);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width = 100;
    const height = canvas.height = 40;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Find min and max for scaling
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    
    // Draw line
    ctx.strokeStyle = data[data.length - 1] >= data[0] ? '#2ecc71' : '#e74c3c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    data.forEach((value, index) => {
        const x = (index / (data.length - 1)) * width;
        const y = height - ((value - min) / range) * height;
        
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    
    ctx.stroke();
}

// Stock Detail Page
async function openStockDetail(ticker) {
    currentStockTicker = ticker;
    
    try {
        const stockData = await fetchStockData(ticker);
        if (!stockData) {
            alert('Stock data not found');
            return;
        }

        document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
        document.getElementById('stock-detail-page').classList.add('active');

        renderStockDetail(stockData);
    } catch (error) {
        console.error('Error opening stock detail:', error);
        alert('Error loading stock details');
    }
}

// Fetch chart data for specific timeframe
async function fetchChartDataForTimeframe(ticker, timeframe) {
    const timeframes = {
        '1D': { interval: '5m', range: '1d' },
        '1W': { interval: '15m', range: '5d' },
        '1M': { interval: '1d', range: '1mo' },
        '3M': { interval: '1d', range: '3mo' },
        '6M': { interval: '1d', range: '6mo' },
        '1Y': { interval: '1d', range: '1y' },
        '5Y': { interval: '1wk', range: '5y' }
    };
    
    const config = timeframes[timeframe] || timeframes['1M'];
    const proxies = ['https://api.allorigins.win/get?url=', 'https://corsproxy.io/?'];
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=${config.interval}&range=${config.range}`;
    
    for (const proxyUrl of proxies) {
        try {
            const response = await fetch(proxyUrl + encodeURIComponent(yahooUrl));
            if (!response.ok) continue;
            
            const data = await response.json();
            let parsed;
            if (data.contents) {
                parsed = JSON.parse(data.contents);
            } else if (data.chart) {
                parsed = data;
            } else {
                continue;
            }
            
            if (parsed.chart && parsed.chart.result && parsed.chart.result.length > 0) {
                const result = parsed.chart.result[0];
                const quotes = result.indicators.quote[0];
                const closes = quotes.close.filter(v => v !== null && v !== undefined);
                const timestamps = result.timestamp;
                
                return {
                    data: closes,
                    timestamps: timestamps,
                    labels: timestamps.map(ts => new Date(ts * 1000))
                };
            }
        } catch (error) {
            console.warn(`Failed to fetch ${timeframe} data:`, error);
            continue;
        }
    }
    
    return null;
}

function renderStockDetail(stock) {
    const container = document.getElementById('stock-detail-content');
    if (!container) return;
    
    const delta52W = parseFloat(stock.delta52W) || 0;
    const low52W = parseFloat(stock.low52W) || 0;
    
    container.innerHTML = `
        <div class="stock-detail-header">
            <h1>${stock.ticker}</h1>
            <div class="ticker">${stock.sector} ${stock.industry ? '• ' + stock.industry : ''}</div>
        </div>
        
        <div class="chart-container">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h3 style="margin: 0;">Price Chart</h3>
                <div class="timeframe-selector">
                    <button class="timeframe-btn active" data-timeframe="1D" onclick="changeChartTimeframe('1D')">1D</button>
                    <button class="timeframe-btn" data-timeframe="1W" onclick="changeChartTimeframe('1W')">1W</button>
                    <button class="timeframe-btn" data-timeframe="1M" onclick="changeChartTimeframe('1M')">1M</button>
                    <button class="timeframe-btn" data-timeframe="3M" onclick="changeChartTimeframe('3M')">3M</button>
                    <button class="timeframe-btn" data-timeframe="6M" onclick="changeChartTimeframe('6M')">6M</button>
                    <button class="timeframe-btn" data-timeframe="1Y" onclick="changeChartTimeframe('1Y')">1Y</button>
                    <button class="timeframe-btn" data-timeframe="5Y" onclick="changeChartTimeframe('5Y')">5Y</button>
                </div>
            </div>
            <div class="chart-wrapper">
                <canvas id="main-chart"></canvas>
            </div>
        </div>
        
        <div class="stock-metrics-grid">
            <div class="metric-card">
                <div class="metric-label">Current Price</div>
                <div class="metric-value">$${parseFloat(stock.price).toFixed(2)}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">1 Day Change</div>
                <div class="metric-value ${parseFloat(stock.change1D) >= 0 ? 'positive' : 'negative'}">
                    ${parseFloat(stock.change1D) >= 0 ? '+' : ''}${parseFloat(stock.change1D)}%
                </div>
            </div>
            <div class="metric-card">
                <div class="metric-label">1 Week Change</div>
                <div class="metric-value ${parseFloat(stock.change1W) >= 0 ? 'positive' : 'negative'}">
                    ${parseFloat(stock.change1W) >= 0 ? '+' : ''}${parseFloat(stock.change1W)}%
                </div>
            </div>
            <div class="metric-card">
                <div class="metric-label">1 Month Change</div>
                <div class="metric-value ${parseFloat(stock.change1M) >= 0 ? 'positive' : 'negative'}">
                    ${parseFloat(stock.change1M) >= 0 ? '+' : ''}${parseFloat(stock.change1M)}%
                </div>
            </div>
            <div class="metric-card">
                <div class="metric-label">P/E Ratio</div>
                <div class="metric-value">${stock.pe}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">PEG Ratio</div>
                <div class="metric-value">${stock.peg}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">EPS</div>
                <div class="metric-value">$${stock.eps}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Dividend Yield</div>
                <div class="metric-value">${parseFloat(stock.dividend).toFixed(2)}%</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">52 Week High</div>
                <div class="metric-value">$${parseFloat(stock.high52W).toFixed(2)}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">52 Week Low</div>
                <div class="metric-value">$${low52W.toFixed(2)}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Delta from 52W High</div>
                <div class="metric-value ${delta52W >= 0 ? 'positive' : 'negative'}">
                    ${delta52W >= 0 ? '+' : ''}${delta52W.toFixed(2)}%
                </div>
            </div>
            ${stock.marketCap !== 'N/A' ? `
            <div class="metric-card">
                <div class="metric-label">Market Cap</div>
                <div class="metric-value">$${stock.marketCap}</div>
            </div>
            ` : ''}
            ${stock.volume ? `
            <div class="metric-card">
                <div class="metric-label">Volume</div>
                <div class="metric-value">${stock.volume}</div>
            </div>
            ` : ''}
            ${stock.avgVolume !== 'N/A' ? `
            <div class="metric-card">
                <div class="metric-label">Avg Volume</div>
                <div class="metric-value">${stock.avgVolume}</div>
            </div>
            ` : ''}
        </div>
    `;

    // Store stock data for timeframe switching
    window.currentStockData = stock;
    window.currentTimeframe = '1M';

    // Render interactive chart with default timeframe
    setTimeout(() => {
        renderInteractiveChart(stock.chartData || generateMockChartData(), stock.chartTimestamps || []);
    }, 100);
}

// Change chart timeframe
async function changeChartTimeframe(timeframe) {
    if (!currentStockTicker) return;
    
    // Update active button
    document.querySelectorAll('.timeframe-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.timeframe === timeframe) {
            btn.classList.add('active');
        }
    });
    
    // Show loading
    const canvas = document.getElementById('main-chart');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#667eea';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Loading...', canvas.width / 2, canvas.height / 2);
    }
    
    try {
        const chartData = await fetchChartDataForTimeframe(currentStockTicker, timeframe);
        if (chartData && chartData.data) {
            window.currentTimeframe = timeframe;
            renderInteractiveChart(chartData.data, chartData.timestamps, chartData.labels);
        } else {
            // Fallback to existing data
            if (window.currentStockData && window.currentStockData.chartData) {
                renderInteractiveChart(window.currentStockData.chartData, window.currentStockData.chartTimestamps || []);
            }
        }
    } catch (error) {
        console.error('Error fetching timeframe data:', error);
        alert('Failed to load chart data for this timeframe');
    }
}

function renderInteractiveChart(data, timestamps = [], labels = null) {
    const ctx = document.getElementById('main-chart');
    if (!ctx) return;

    // Generate labels from timestamps or use provided labels
    let chartLabels;
    if (labels && labels.length > 0) {
        chartLabels = labels.map(date => {
            if (date instanceof Date) {
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }
            return date;
        });
    } else if (timestamps && timestamps.length > 0) {
        chartLabels = timestamps.map(ts => {
            const date = new Date(ts * 1000);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });
    } else {
        chartLabels = data.map((_, index) => {
            const date = new Date();
            date.setDate(date.getDate() - (data.length - index));
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });
    }

    // Determine chart color based on trend
    const firstPrice = data[0];
    const lastPrice = data[data.length - 1];
    const isPositive = lastPrice >= firstPrice;
    const chartColor = isPositive ? '#2ecc71' : '#e74c3c';

    // Destroy existing chart if it exists
    if (window.currentChart) {
        window.currentChart.destroy();
    }

    window.currentChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartLabels,
            datasets: [{
                label: 'Price',
                data: data,
                borderColor: chartColor,
                backgroundColor: isPositive ? 'rgba(46, 204, 113, 0.1)' : 'rgba(231, 76, 60, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointHoverBorderWidth: 2,
                pointHoverBackgroundColor: chartColor
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: true,
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    padding: 12,
                    titleFont: {
                        size: 14,
                        weight: 'bold'
                    },
                    bodyFont: {
                        size: 13
                    },
                    callbacks: {
                        label: function(context) {
                            return `$${parseFloat(context.parsed.y).toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toFixed(2);
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxTicksLimit: 10
                    }
                }
            }
        }
    });
}

function goBackToWatchlist() {
    currentStockTicker = null;
    if (currentWatchlistId) {
        openWatchlist(currentWatchlistId);
    } else {
        switchPage('watchlists');
    }
}

// Close modals when clicking outside
window.onclick = function(event) {
    const createModal = document.getElementById('create-modal');
    const addStockModal = document.getElementById('add-stock-modal');
    
    if (event.target === createModal) {
        closeCreateModal();
    }
    if (event.target === addStockModal) {
        closeAddStockModal();
    }
}

function closeAddStockModal() {
    document.getElementById('add-stock-modal').classList.remove('active');
}

