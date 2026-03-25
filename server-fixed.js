const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'ridgecore-supersecret2024';

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
app.use('/api/auth/', limiter);

// JSON DB
let usersDB = [];
let tradesDB = [];
const USERS_FILE = 'users.json';
const TRADES_FILE = 'trades.json';

function loadDB() {
  try {
    if (fs.existsSync(USERS_FILE)) usersDB = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    if (fs.existsSync(TRADES_FILE)) tradesDB = JSON.parse(fs.readFileSync(TRADES_FILE, 'utf8'));
  } catch (e) {
    console.error('DB load error:', e);
  }
}

function saveDB() {
  fs.writeFileSync(USERS_FILE, JSON.stringify(usersDB, null, 2));
  fs.writeFileSync(TRADES_FILE, JSON.stringify(tradesDB, null, 2));
}

loadDB();

const markets = [
  { symbol: 'EUR/USD', price: 1.0850, change: 0.5 },
  { symbol: 'GBP/USD', price: 1.2650, change: -0.2 },
  { symbol: 'USD/JPY', price: 150.20, change: 1.1 },
  { symbol: 'Gold', price: 2050.50, change: -0.8 },
  { symbol: 'BTC/USD', price: 65200, change: 3.2 }
];

const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Routes
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: 'Missing fields' });
  const exists = usersDB.find(u => u.username === username || u.email === email);
  if (exists) return res.status(400).json({ error: 'User exists' });
  const hashed = await bcrypt.hash(password, 10);
  const newUser = { id: Date.now(), username, email, password: hashed, balance: 10000 };
  usersDB.push(newUser);
  saveDB();
  res.json({ message: 'Registered! Please login.' });
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const user = usersDB.find(u => u.username === username);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, username: user.username, balance: user.balance } });
});

app.get('/api/user', authenticateToken, (req, res) => {
  const user = usersDB.find(u => u.id === req.user.id);
  res.json({ username: user.username, balance: user.balance });
});

app.get('/api/markets', (req, res) => res.json(markets));

app.post('/api/trade', authenticateToken, (req, res) => {
  const { symbol, type, amount } = req.body;
  const market = markets.find(m => m.symbol === symbol);
  if (!market) return res.status(400).json({ error: 'Invalid symbol' });
  const user = usersDB.find(u => u.id === req.user.id);
  if (user.balance < amount * market.price) return res.status(400).json({ error: 'Insufficient balance' });
  const newTrade = { id: Date.now(), user_id: req.user.id, symbol, type, amount, price: market.price, created_at: new Date().toISOString() };
  tradesDB.push(newTrade);
  saveDB();
  res.json({ success: true, price: market.price, message: `Trade executed: ${type} ${amount} ${symbol}` });
});

app.get('/api/trades', authenticateToken, (req, res) => {
  const userTrades = tradesDB.filter(t => t.user_id === req.user.id)
    .sort((a,b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 50);
  res.json(userTrades);
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => {
  console.log(`Ridgecore running on http://localhost:${PORT}`);
});
