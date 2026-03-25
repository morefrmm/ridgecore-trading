// Ridgecore Frontend Logic
const API_BASE = '/api';
let currentUser = null;
let markets = [];
let trades = [];

// DOM Elements
const loader = document.getElementById('loader');
const landing = document.getElementById('landing');
const authSection = document.getElementById('auth');
const dashboard = document.getElementById('dashboard');
const authForm = document.getElementById('authForm');
const authMessage = document.getElementById('authMessage');

// Init
document.addEventListener('DOMContentLoaded', async () => {
  hideLoader();
  
  const token = localStorage.getItem('token');
  if (token) {
    try {
      currentUser = await apiGet('/user', token);
      showDashboard();
    } catch (e) {
      localStorage.removeItem('token');
    }
  }
  
  loadMarkets();
  setupEventListeners();
});

function hideLoader() {
  loader.style.display = 'none';
}

function setupEventListeners() {
  authForm.addEventListener('submit', handleAuth);
}

function toggleMenu() {
  document.getElementById('menu').classList.toggle('active');
}

function showSection(section, mode = null) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  if (section === 'auth') {
    authSection.classList.remove('hidden');
    switchAuth(mode);
  }
}

function hideSection(section) {
  if (section === 'auth') authSection.classList.add('hidden');
}

function switchAuth(mode) {
  const tabs = authSection.querySelectorAll('.tab');
  tabs.forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  
  const isLogin = mode === 'login';
  authForm.dataset.mode = isLogin ? 'login' : 'register';
}

async function handleAuth(e) {
  e.preventDefault();
  const mode = authForm.dataset.mode;
  const email = document.getElementById('email').value;
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  
  showMessage('Processing...', 'info');
  
  try {
    let data;
    if (mode === 'login') {
      data = await apiPost('/auth/login', { username, password });
      currentUser = data.user;
      localStorage.setItem('token', data.token);
      showDashboard();
    } else {
      data = await apiPost('/auth/register', { username, email, password });
      showMessage(data.message, 'success');
      setTimeout(() => switchAuth('login'), 1500);
    }
  } catch (error) {
    showMessage(error.message || 'Error occurred', 'error');
  }
}

function showDashboard() {
  landing.classList.add('hidden');
  dashboard.classList.remove('hidden');
  document.getElementById('userBalance').textContent = `$${currentUser.balance?.toLocaleString() || '10,000'}`;
  loadMarkets();
  loadTrades();
  populateTradeSymbols();
}

function logout() {
  currentUser = null;
  localStorage.removeItem('token');
  dashboard.classList.add('hidden');
  landing.classList.remove('hidden');
}

async function loadMarkets() {
  try {
    markets = await apiGet('/markets');
    renderMarkets();
    populateTradeSymbols();
  } catch (e) {
    console.error('Failed to load markets');
  }
}

function renderMarkets() {
  const container = document.getElementById('marketsList');
  container.innerHTML = markets.map(market => `
    <div class="market-card">
      <div>
        <div class="market-symbol">${market.symbol}</div>
      </div>
      <div class="text-right">
        <div class="market-price">${market.price.toLocaleString()}</div>
        <span class="change ${market.change >= 0 ? 'change-pos' : 'change-neg'}">${market.change >= 0 ? '+' : ''}${market.change}%</span>
      </div>
    </div>
  `).join('');
}

async function loadTrades() {
  try {
    trades = await apiGet('/trades');
    renderTrades();
  } catch (e) {
    console.error('Failed to load trades');
  }
}

function renderTrades() {
  const container = document.getElementById('tradesList');
  container.innerHTML = trades.map(trade => `
    <div class="trade-item">
      <div>
        <strong>${trade.symbol}</strong> - ${trade.type} ${trade.amount}
      </div>
      <div>
        <span>@ ${trade.price}</span>
        <small style="color:#aaa">${new Date(trade.created_at).toLocaleString()}</small>
      </div>
    </div>
  `).join('') || '<p>No trades yet. Make your first trade!</p>';
}

function populateTradeSymbols() {
  const select = document.getElementById('tradeSymbol');
  select.innerHTML = markets.map(m => `<option value="${m.symbol}">${m.symbol}</option>`).join('');
}

async function executeTrade() {
  const symbol = document.getElementById('tradeSymbol').value;
  const type = document.getElementById('tradeType').value;
  const amount = parseFloat(document.getElementById('tradeAmount').value);
  
  if (!symbol || !amount || amount <= 0) {
    showTradeMessage('Please fill all fields correctly', 'error');
    return;
  }
  
  const token = localStorage.getItem('token');
  showTradeMessage('Executing trade...', 'info');
  
  try {
    const result = await apiPost('/trade', { symbol, type, amount }, token);
    showTradeMessage(result.message, 'success');
    loadTrades();
    document.getElementById('tradeAmount').value = '';
  } catch (error) {
    showTradeMessage(error.message || 'Trade failed', 'error');
  }
}

function showTradeMessage(msg, type) {
  const el = document.getElementById('tradeMessage');
  el.textContent = msg;
  el.className = `message ${type}`;
  setTimeout(() => el.textContent = '', 5000);
}

function showMessage(msg, type) {
  authMessage.textContent = msg;
  authMessage.className = `message ${type}`;
}

function apiGet(endpoint, token = null) {
  return fetch(API_BASE + endpoint, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
    .then(res => res.ok ? res.json() : Promise.reject(res.statusText));
}

function apiPost(endpoint, data, token = null) {
  return fetch(API_BASE + endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    },
    body: JSON.stringify(data)
  }).then(res => res.ok ? res.json() : Promise.reject(res.statusText));
}

// Auto refresh markets every 10s
setInterval(loadMarkets, 10000);

// Close menu on outside click
document.addEventListener('click', (e) => {
  if (!e.target.closest('.side-menu') && !e.target.closest('.menu-btn')) {
    document.getElementById('menu').classList.remove('active');
  }
});
