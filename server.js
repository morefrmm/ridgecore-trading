const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'ridgecore-supersecret2024'; // Change in prod

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10 // 10 requests
});
app.use('/api/auth/', limiter);

// DB Setup
const db = new sqlite3.Database('users.db');
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    email TEXT UNIQUE,
    password TEXT,
    balance REAL DEFAULT 10000.00,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    symbol TEXT,
    type TEXT,
    amount REAL,
    price REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);
});

// Mock markets data
const markets = [
  { symbol: 'EUR/USD', price: 1.0850, change: 0.5 },
  { symbol: 'GBP/USD', price: 1.2650, change: -0.2 },
  { symbol: 'USD/JPY', price: 150.20, change: 1.1 },
  { symbol: 'Gold', price: 2050.50, change: -0.8 },
  { symbol: 'BTC/USD', price: 65200, change: 3.2 }
];

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Routes

// Register
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: 'Missing fields' });

  const hashed = await bcrypt.hash(password, 10);
  db.run('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, hashed],
    function(err) {
      if (err) return res.status(400).json({ error: 'User exists' });
      res.json({ message: 'Registered! Please login.' });
    }
  );
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err || !user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, username: user.username, balance: user.balance } });
  });
});

// Get user profile
app.get('/api/user', authenticateToken, (req, res) => {
  db.get('SELECT username, balance FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(user);
  });
});

// Get markets
app.get('/api/markets', (req, res) => {
  res.json(markets);
});

// Execute trade (mock)
app.post('/api/trade', authenticateToken, (req, res) => {
  const { symbol, type, amount } = req.body;
  const market = markets.find(m => m.symbol === symbol);
  if (!market) return res.status(400).json({ error: 'Invalid symbol' });

  const price = market.price;
  db.get('SELECT balance FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err || !user || user.balance < amount * price) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    // Mock trade (no real balance update for demo)
    db.run('INSERT INTO trades (user_id, symbol, type, amount, price) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, symbol, type, amount, price]);
    res.json({ success: true, price, message: `Trade executed: ${type} ${amount} ${symbol} @ ${price}` });
  });
});

// Get user trades
app.get('/api/trades', authenticateToken, (req, res) => {
  db.all('SELECT * FROM trades WHERE user_id = ? ORDER BY created_at DESC LIMIT 50', [req.user.id], (err, trades) => {
    res.json(trades);
  });
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Ridgecore Trading Platform running on http://localhost:${PORT}`);
});

