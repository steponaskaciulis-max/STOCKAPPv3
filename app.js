// API Configuration - Using Alpha Vantage (Free API)
// Get your free API key at: https://www.alphavantage.co/support/#api-key
const ALPHA_VANTAGE_API_KEY = 'demo'; // Replace with your free API key from alphavantage.co
const API_BASE_URL = 'https://www.alphavantage.co/query';

// Alternative: Using Yahoo Finance via CORS proxy (no API key needed)
const USE_YAHOO_FINANCE = true; // Set to false to use Alpha Vantage

// Financial Modeling Prep API (Free tier: 250 requests/day)
// Get your free API key at: https://site.financialmodelingprep.com/developer/docs/
const FMP_API_KEY = 'demo'; // Replace with your free API key from financialmodelingprep.com
const USE_FMP_FALLBACK = true; // Use FMP as fallback when Yahoo Finance fails

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

// API Functions - Using Yahoo Finance (Free, no API key needed)
async function fetchStockData(ticker) {
    try {
        if (USE_YAHOO_FINANCE) {
            try {
                return await fetchYahooFinanceData(ticker);
            } catch (yahooError) {
                console.warn('Yahoo Finance failed, trying alternative method:', yahooError);
                // Try alternative Yahoo Finance method
                return await fetchYahooFinanceAlternative(ticker);
            }
        } else {
            return await fetchAlphaVantageData(ticker);
        }
    } catch (error) {
        console.error('Error fetching stock data:', error);
        // Don't show alert on every failure, just log it
        console.error(`Failed to fetch stock data for ${ticker}: ${error.message}`);
        return null;
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

// Yahoo Finance API (via CORS proxy) - ENHANCED VERSION with Complete Data
async function fetchYahooFinanceData(ticker) {
    try {
        const proxies = [
            'https://api.allorigins.win/get?url=',
            'https://corsproxy.io/?',
            'https://api.codetabs.com/v1/proxy?quest='
        ];
        
        console.log('📊 Fetching COMPLETE stock data from Yahoo Finance:', ticker);
        
        // Use comprehensive endpoints
        const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1y&includePrePost=false`;
        const quoteUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${ticker}&fields=symbol,regularMarketPrice,regularMarketChangePercent,regularMarketVolume,averageDailyVolume10Day,marketCap,trailingPE,forwardPE,pegRatio,trailingEps,forwardEps,dividendYield,fiftyTwoWeekHigh,fiftyTwoWeekLow,sector,industry,longName,shortName`;
        const summaryUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=summaryProfile,financialData,defaultKeyStatistics`;
        
        let chartData = null;
        let quoteData = null;
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
        
        // Fetch quote data with explicit fields
        for (const proxyUrl of proxies) {
            try {
                const fullUrl = proxyUrl + encodeURIComponent(quoteUrl);
                const response = await fetch(fullUrl);
                
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                
                const data = await response.json();
                let parsed;
                if (data.contents) {
                    parsed = JSON.parse(data.contents);
                } else if (data.quoteResponse) {
                    parsed = data;
                } else {
                    throw new Error('Unexpected quote format');
                }
                
                if (parsed.quoteResponse && parsed.quoteResponse.result && parsed.quoteResponse.result.length > 0) {
                    quoteData = parsed.quoteResponse.result[0];
                    console.log('✅ Quote data fetched. Keys:', Object.keys(quoteData));
                    console.log('   P/E:', quoteData.trailingPE, '| PEG:', quoteData.pegRatio, '| EPS:', quoteData.trailingEps);
                    break;
                }
            } catch (err) {
                console.log('Quote fetch attempt failed:', err.message);
                continue;
            }
        }
        
        // Fetch summary data for comprehensive financial metrics
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
        
        // Calculate changes
        const currentIdx = closes.length - 1;
        const oneDayAgo = closes[currentIdx - 1] || currentPrice;
        const oneWeekAgo = closes[Math.max(0, currentIdx - 5)] || currentPrice;
        const oneMonthAgo = closes[Math.max(0, currentIdx - 20)] || currentPrice;
        
        const change1D = oneDayAgo ? ((currentPrice - oneDayAgo) / oneDayAgo) * 100 : 0;
        const change1W = oneWeekAgo ? ((currentPrice - oneWeekAgo) / oneWeekAgo) * 100 : 0;
        const change1M = oneMonthAgo ? ((currentPrice - oneMonthAgo) / oneMonthAgo) * 100 : 0;
        
        // Get comprehensive data from all sources (prioritize quote, then summary, then meta)
        const financialData = summaryData?.financialData || {};
        const defaultKeyStats = summaryData?.defaultKeyStatistics || {};
        const summaryProfile = summaryData?.summaryProfile || {};
        
        // Prioritize quoteData as it's most reliable
        const fiftyTwoWeekHigh = quoteData?.fiftyTwoWeekHigh || meta.fiftyTwoWeekHigh || defaultKeyStats?.fiftyTwoWeekHigh || currentPrice;
        const fiftyTwoWeekLow = quoteData?.fiftyTwoWeekLow || meta.fiftyTwoWeekLow || defaultKeyStats?.fiftyTwoWeekLow || currentPrice;
        const delta52W = fiftyTwoWeekHigh ? ((currentPrice - fiftyTwoWeekHigh) / fiftyTwoWeekHigh) * 100 : 0;
        
        // Get financial metrics - prioritize quoteData (most reliable), then summary, then meta
        // Handle both raw number format and object format from Yahoo Finance
        const getValue = (obj, key) => {
            if (!obj) return null;
            const val = obj[key];
            if (val === null || val === undefined) return null;
            if (typeof val === 'object' && val.raw !== undefined) return val.raw;
            return val;
        };
        
        const pe = getValue(quoteData, 'trailingPE') || getValue(financialData, 'trailingPE') || getValue(defaultKeyStats, 'trailingPE') || meta.trailingPE || getValue(quoteData, 'forwardPE') || 'N/A';
        const peg = getValue(quoteData, 'pegRatio') || getValue(financialData, 'pegRatio') || getValue(defaultKeyStats, 'pegRatio') || meta.pegRatio || 'N/A';
        const eps = getValue(quoteData, 'trailingEps') || getValue(financialData, 'trailingEps') || getValue(defaultKeyStats, 'trailingEps') || meta.trailingEps || getValue(quoteData, 'forwardEps') || 'N/A';
        const dividendYield = getValue(quoteData, 'dividendYield') || getValue(financialData, 'dividendYield') || getValue(defaultKeyStats, 'dividendYield') || meta.dividendYield || 0;
        const marketCap = getValue(quoteData, 'marketCap') || getValue(defaultKeyStats, 'marketCap') || meta.marketCap || 'N/A';
        const volume = getValue(quoteData, 'regularMarketVolume') || meta.regularMarketVolume || 0;
        const avgVolume = getValue(quoteData, 'averageDailyVolume10Day') || getValue(quoteData, 'averageVolume') || getValue(defaultKeyStats, 'averageDailyVolume10Day') || 'N/A';
        
        // Get sector and industry
        const sector = quoteData?.sector || summaryProfile?.sector || meta.sector || 'N/A';
        const industry = quoteData?.industry || summaryProfile?.industry || meta.industry || 'N/A';
        
        console.log('✅ Final data for', ticker);
        console.log('   Price:', currentPrice);
        console.log('   P/E:', pe, '| PEG:', peg, '| EPS:', eps);
        console.log('   Dividend:', dividendYield, '| Market Cap:', marketCap);
        console.log('   Sector:', sector, '| Industry:', industry);
        console.log('   QuoteData available:', !!quoteData, '| SummaryData available:', !!summaryData);
        
        return {
            ticker: meta.symbol || ticker,
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

