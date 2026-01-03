// API Configuration - Update this with your Render account API endpoint
const API_BASE_URL = 'https://stockapp-kym2.onrender.com'; // Replace with your actual Render URL

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

// API Functions
async function fetchStockData(ticker) {
    try {
        // Try the API endpoint
        const apiUrl = `${API_BASE_URL}/stock/${ticker}`;
        console.log('Fetching from API:', apiUrl);
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error:', response.status, errorText);
            throw new Error(`API returned ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        console.log('API Response:', data);
        
        // Transform API response to our format
        return {
            ticker: data.symbol || ticker,
            sector: data.sector || 'N/A',
            price: data.price || data.regularMarketPrice || 0,
            change1D: data.change1D || data.regularMarketChangePercent || 0,
            change1W: data.change1W || 0,
            change1M: data.change1M || 0,
            pe: data.peRatio || data.trailingPE || 'N/A',
            peg: data.pegRatio || 'N/A',
            eps: data.eps || data.trailingEps || 'N/A',
            dividend: data.dividendYield || data.dividendRate || 0,
            high52W: data.fiftyTwoWeekHigh || data.fiftyTwoWeekHigh || 0,
            delta52W: data.delta52W || 0,
            chartData: data.chartData || generateMockChartData()
        };
    } catch (error) {
        // Show error to user instead of silently using mock data
        console.error('API Error Details:', error);
        const errorMessage = error.message || 'Failed to fetch stock data';
        alert(`Error fetching stock data for ${ticker}: ${errorMessage}\n\nPlease check:\n1. Your API is running at ${API_BASE_URL}\n2. CORS is enabled on your API\n3. The endpoint /stock/${ticker} exists\n\nCheck browser console (F12) for more details.`);
        
        // Still return mock data for testing, but user knows it's not real
        console.warn('Using mock data as fallback:', error);
        return generateMockStockData(ticker);
    }
}

async function findTickerByCompanyName(companyName) {
    try {
        const apiUrl = `${API_BASE_URL}/search?q=${encodeURIComponent(companyName)}`;
        console.log('Searching API:', apiUrl);
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Search API Error:', response.status, errorText);
            throw new Error(`Search API returned ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Search API Response:', data);
        return data.ticker || data.symbol || null;
    } catch (error) {
        console.warn('Search API failed, using mock search:', error);
        // Mock search - in production, use your API
        const mockTickers = {
            'apple': 'AAPL',
            'microsoft': 'MSFT',
            'google': 'GOOGL',
            'amazon': 'AMZN',
            'tesla': 'TSLA',
            'meta': 'META',
            'nvidia': 'NVDA'
        };
        const result = mockTickers[companyName.toLowerCase()];
        if (result) {
            console.log('Using mock ticker:', result);
        }
        return result || null;
    }
}

// Mock Data Functions (for development/testing)
function generateMockStockData(ticker) {
    const basePrice = 100 + Math.random() * 200;
    const change1D = (Math.random() - 0.5) * 10;
    const change1W = (Math.random() - 0.5) * 15;
    const change1M = (Math.random() - 0.5) * 20;
    
    return {
        ticker: ticker,
        sector: ['Technology', 'Finance', 'Healthcare', 'Energy', 'Consumer'][Math.floor(Math.random() * 5)],
        price: basePrice.toFixed(2),
        change1D: change1D.toFixed(2),
        change1W: change1W.toFixed(2),
        change1M: change1M.toFixed(2),
        pe: (15 + Math.random() * 30).toFixed(2),
        peg: (1 + Math.random() * 2).toFixed(2),
        eps: (2 + Math.random() * 5).toFixed(2),
        dividend: (Math.random() * 5).toFixed(2),
        high52W: (basePrice * 1.2).toFixed(2),
        delta52W: ((basePrice - basePrice * 1.2) / (basePrice * 1.2) * 100).toFixed(2),
        chartData: generateMockChartData()
    };
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
    tbody.innerHTML = '';

    if (watchlist.stocks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="14" style="text-align: center; padding: 2rem; color: #666;">No stocks in this watchlist. Search and add stocks to get started!</td></tr>';
        return;
    }

    watchlist.stocks.forEach(stock => {
        const row = document.createElement('tr');
        
        const delta52W = ((parseFloat(stock.price) - parseFloat(stock.high52W)) / parseFloat(stock.high52W) * 100).toFixed(2);
        
        row.innerHTML = `
            <td><strong>${stock.ticker}</strong></td>
            <td>${stock.sector}</td>
            <td>$${parseFloat(stock.price).toFixed(2)}</td>
            <td class="${parseFloat(stock.change1D) >= 0 ? 'positive' : 'negative'}">${parseFloat(stock.change1D) >= 0 ? '+' : ''}${parseFloat(stock.change1D).toFixed(2)}%</td>
            <td class="${parseFloat(stock.change1W) >= 0 ? 'positive' : 'negative'}">${parseFloat(stock.change1W) >= 0 ? '+' : ''}${parseFloat(stock.change1W).toFixed(2)}%</td>
            <td class="${parseFloat(stock.change1M) >= 0 ? 'positive' : 'negative'}">${parseFloat(stock.change1M) >= 0 ? '+' : ''}${parseFloat(stock.change1M).toFixed(2)}%</td>
            <td>${stock.pe}</td>
            <td>${stock.peg}</td>
            <td>$${stock.eps}</td>
            <td>${parseFloat(stock.dividend).toFixed(2)}%</td>
            <td>$${parseFloat(stock.high52W).toFixed(2)}</td>
            <td class="${parseFloat(delta52W) >= 0 ? 'positive' : 'negative'}">${parseFloat(delta52W) >= 0 ? '+' : ''}${delta52W}%</td>
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
    
    const delta52W = ((parseFloat(stock.price) - parseFloat(stock.high52W)) / parseFloat(stock.high52W) * 100).toFixed(2);
    
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
                    ${parseFloat(stock.change1D) >= 0 ? '+' : ''}${parseFloat(stock.change1D).toFixed(2)}%
                </div>
            </div>
            <div class="metric-card">
                <div class="metric-label">1 Week Change</div>
                <div class="metric-value ${parseFloat(stock.change1W) >= 0 ? 'positive' : 'negative'}">
                    ${parseFloat(stock.change1W) >= 0 ? '+' : ''}${parseFloat(stock.change1W).toFixed(2)}%
                </div>
            </div>
            <div class="metric-card">
                <div class="metric-label">1 Month Change</div>
                <div class="metric-value ${parseFloat(stock.change1M) >= 0 ? 'positive' : 'negative'}">
                    ${parseFloat(stock.change1M) >= 0 ? '+' : ''}${parseFloat(stock.change1M).toFixed(2)}%
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
                <div class="metric-value ${parseFloat(delta52W) >= 0 ? 'positive' : 'negative'}">
                    ${parseFloat(delta52W) >= 0 ? '+' : ''}${delta52W}%
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

