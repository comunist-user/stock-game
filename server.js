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

// In-memory store
const players = [];
const companies = [
  { name: 'Reliance', price: 1000 },
  { name: 'Tata Motors', price: 800 },
  { name: 'Infosys', price: 600 },
  { name: 'HDFC Bank', price: 1200 },
  { name: 'Wipro', price: 500 },
  { name: 'Adani', price: 1500 }
];

// REGISTER
app.post('/register', (req, res) => {
  let body = '';
  req.on('data', chunk => body += chunk.toString());
  req.on('end', () => {
    const { username, password } = JSON.parse(body);
    if (players.find(p => p.username === username)) {
      return res.json({ error: 'Username exists' });
    }
    players.push({ username, password, funds: 10000, predictions: [] });
    res.json({ success: true });
  });
});

// LOGIN
app.post('/login', (req, res) => {
  let body = '';
  req.on('data', chunk => body += chunk.toString());
  req.on('end', () => {
    const { username, password } = JSON.parse(body);
    const player = players.find(p => p.username === username && p.password === password);
    if (!player) return res.json({ error: 'Invalid credentials' });
    res.json({ username: player.username });
  });
});

// Companies
app.get('/companies', (req, res) => res.json(companies));

// Give predictions
app.post('/round/start', (req, res) => {
  players.forEach(p => {
    p.predictions = [];
    for (let i = 0; i < 5; i++) {
      const c = companies[Math.floor(Math.random() * companies.length)];
      const change = Math.floor(Math.random() * 101) - 50; // -50 to +50 rupees
      p.predictions.push({ company: c.name, change });
    }
  });
  res.json({ ok: true });
});

// Get predictions for player
app.get('/predictions/:username', (req, res) => {
  const p = players.find(p => p.username === req.params.username);
  res.json(p ? p.predictions : []);
});

// End round: apply predictions
app.post('/round/end', (req, res) => {
  players.forEach(p => {
    p.predictions.forEach(pred => {
      const c = companies.find(c => c.name === pred.company);
      if (c) {
        c.price = Math.max(1, c.price + pred.change);
      }
    });
    p.predictions = [];
  });
  io.emit('update', companies);
  res.json({ ok: true });
});

// Real-time chat
io.on('connection', socket => {
  socket.on('chat', msg => io.emit('chat', msg));
  socket.on('trade', msg => io.emit('trade', msg));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
