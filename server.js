// server.js

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.json());
app.use(express.static('public'));

// In-memory "database"
let players = []; // { username, password, funds, portfolio, predictions }
let companies = [
  { name: "Reliance", price: 1000 },
  { name: "Tata Motors", price: 500 },
  { name: "Infosys", price: 800 },
  { name: "HDFC Bank", price: 1200 },
  { name: "Wipro", price: 600 },
  { name: "Adani", price: 1500 }
];

// Register a new player
app.post('/register', (req, res) => {
  const { username, password } = req.body;
  if (players.find(p => p.username === username)) {
    return res.json({ error: "Username already exists." });
  }
  players.push({
    username,
    password,
    funds: 10000,
    portfolio: {}, // companyName: shares
    predictions: []
  });
  res.json({ success: true });
});

// Login a player
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const player = players.find(p => p.username === username && p.password === password);
  if (!player) return res.json({ error: "Invalid username or password." });
  res.json(player);
});

// Get all companies
app.get('/companies', (req, res) => {
  res.json(companies);
});

// Give each player 5 predictions
app.post('/round/start', (req, res) => {
  players.forEach(player => {
    player.predictions = [];
    for (let i = 0; i < 5; i++) {
      const c = companies[Math.floor(Math.random() * companies.length)];
      const change = Math.floor(Math.random() * 101) - 50; // -50 to +50 rupees
      player.predictions.push({ company: c.name, change });
    }
  });
  res.json({ ok: true });
});

// Get predictions for a player
app.get('/predictions/:username', (req, res) => {
  const p = players.find(p => p.username === req.params.username);
  res.json(p ? p.predictions : []);
});

// End round: apply predictions to prices
app.post('/round/end', (req, res) => {
  players.forEach(player => {
    player.predictions.forEach(pred => {
      const c = companies.find(c => c.name === pred.company);
      if (c) {
        c.price = Math.max(1, c.price + pred.change);
      }
    });
    player.predictions = [];
  });
  io.emit('update', companies);
  res.json({ ok: true });
});

// Real-time chat & trades
io.on('connection', socket => {
  console.log('A player connected');

  socket.on('chat', msg => {
    io.emit('chat', msg);
  });

  socket.on('trade', msg => {
    io.emit('trade', msg);
  });

  socket.on('disconnect', () => {
    console.log('A player disconnected');
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
