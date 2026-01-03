// API Configuration - Using Alpha Vantage (Free API)
// Get your free API key at: https://www.alphavantage.co/support/#api-key
const ALPHA_VANTAGE_API_KEY = 'demo'; // Replace with your free API key from alphavantage.co
const API_BASE_URL = 'https://www.alphavantage.co/query';

// Alternative: Using Yahoo Finance via CORS proxy (no API key needed)
const USE_YAHOO_FINANCE = true; // Set to false to use Alpha Vantage

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

    try {
        const stockData = await fetchStockData(ticker);
        if (stockData) {
            addStockToWatchlist(stockData);
            document.getElementById('stock-search').value = '';
        }
    } catch (error) {
        console.error('Error searching stock:', error);
        alert('Error fetching stock data. Please check your API connection.');
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
            return await fetchYahooFinanceData(ticker);
        } else {
            return await fetchAlphaVantageData(ticker);
        }
    } catch (error) {
        console.error('Error fetching stock data:', error);
        alert(`Error fetching stock data for ${ticker}: ${error.message}`);
        return null;
    }
}

// Yahoo Finance API (via CORS proxy)
async function fetchYahooFinanceData(ticker) {
    try {
        // Using a CORS proxy to access Yahoo Finance
        const proxyUrl = 'https://api.allorigins.win/get?url=';
        const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1mo`;
        
        console.log('Fetching from Yahoo Finance:', ticker);
        
        const response = await fetch(proxyUrl + encodeURIComponent(yahooUrl));
        const data = await response.json();
        
        if (!data.contents) {
            throw new Error('No data received from Yahoo Finance');
        }
        
        const chartData = JSON.parse(data.contents);
        
        if (!chartData.chart || !chartData.chart.result || chartData.chart.result.length === 0) {
            throw new Error('Stock not found');
        }
        
        const result = chartData.chart.result[0];
        const meta = result.meta;
        const quotes = result.indicators.quote[0];
        
        // Get current price
        const currentPrice = meta.regularMarketPrice || meta.previousClose || 0;
        
        // Calculate changes
        const closes = quotes.close.filter(v => v !== null);
        const currentIdx = closes.length - 1;
        const oneDayAgo = closes[currentIdx - 1] || currentPrice;
        const oneWeekAgo = closes[Math.max(0, currentIdx - 5)] || currentPrice;
        const oneMonthAgo = closes[0] || currentPrice;
        
        const change1D = oneDayAgo ? ((currentPrice - oneDayAgo) / oneDayAgo) * 100 : 0;
        const change1W = oneWeekAgo ? ((currentPrice - oneWeekAgo) / oneWeekAgo) * 100 : 0;
        const change1M = oneMonthAgo ? ((currentPrice - oneMonthAgo) / oneMonthAgo) * 100 : 0;
        
        // Get additional data
        const fiftyTwoWeekHigh = meta.fiftyTwoWeekHigh || currentPrice;
        const delta52W = ((currentPrice - fiftyTwoWeekHigh) / fiftyTwoWeekHigh) * 100;
        
        return {
            ticker: meta.symbol || ticker,
            sector: meta.sector || 'N/A',
            price: currentPrice.toFixed(2),
            change1D: change1D.toFixed(2),
            change1W: change1W.toFixed(2),
            change1M: change1M.toFixed(2),
            pe: meta.trailingPE ? meta.trailingPE.toFixed(2) : 'N/A',
            peg: meta.pegRatio ? meta.pegRatio.toFixed(2) : 'N/A',
            eps: meta.trailingEps ? meta.trailingEps.toFixed(2) : 'N/A',
            dividend: meta.dividendYield ? (meta.dividendYield * 100).toFixed(2) : '0.00',
            high52W: fiftyTwoWeekHigh.toFixed(2),
            delta52W: delta52W.toFixed(2),
            chartData: closes.slice(-30) // Last 30 days
        };
    } catch (error) {
        console.error('Yahoo Finance error:', error);
        throw new Error(`Failed to fetch data: ${error.message}`);
    }
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

function renderStockDetail(stock) {
    const container = document.getElementById('stock-detail-content');
    if (!container) return;
    
    const delta52W = parseFloat(stock.delta52W) || 0;
    
    container.innerHTML = `
        <div class="stock-detail-header">
            <h1>${stock.ticker}</h1>
            <div class="ticker">${stock.sector}</div>
        </div>
        
        <div class="chart-container">
            <h3>Price Chart</h3>
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
                <div class="metric-label">Delta from 52W High</div>
                <div class="metric-value ${delta52W >= 0 ? 'positive' : 'negative'}">
                    ${delta52W >= 0 ? '+' : ''}${delta52W.toFixed(2)}%
                </div>
            </div>
        </div>
    `;

    // Render interactive chart
    setTimeout(() => {
        renderInteractiveChart(stock.chartData || generateMockChartData());
    }, 100);
}

function renderInteractiveChart(data) {
    const ctx = document.getElementById('main-chart');
    if (!ctx) return;

    // Generate labels for the chart
    const labels = data.map((_, index) => `Day ${index + 1}`);

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Price',
                data: data,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 5
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
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: {
                        size: 14
                    },
                    bodyFont: {
                        size: 12
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                },
                x: {
                    grid: {
                        display: false
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

