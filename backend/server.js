require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');

// Routes
const authRoutes = require('./routes/authRoutes');
const gameRoutes = require('./routes/gameRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const friendsRoutes = require('./routes/friendsRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const homeRoutes = require('./routes/homeRoutes');
const notificationsRoutes = require('./routes/notificationsRoutes');

const app = express();
const server = http.createServer(app);

// Middleware
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
  : [];

const isProduction = process.env.NODE_ENV === 'production';
const devAllowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

app.use(cors({
  origin: (origin, callback) => {
    if (
      !origin ||
      allowedOrigins.length === 0 ||
      allowedOrigins.includes(origin) ||
      (!isProduction && devAllowedOrigins.includes(origin))
    ) {
      callback(null, true);
      return;
    }
    callback(new Error('Not allowed by CORS'));
  }
}));
app.use(express.json());

// Database connection
const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!mongoUri) {
  console.error('Mongo connection string is missing. Set MONGO_URI (or MONGODB_URI) in environment variables before starting the server.');
  process.exit(1);
}

mongoose.connect(mongoUri)
.then(() => console.log("Connected to MongoDB"))
.catch(err => console.log("MongoDB connection error details:", err));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/home', homeRoutes);
app.use('/api/notifications', notificationsRoutes);

const corsOrigin = (origin, callback) => {
  if (
    !origin ||
    allowedOrigins.length === 0 ||
    allowedOrigins.includes(origin) ||
    (!isProduction && devAllowedOrigins.includes(origin))
  ) {
    callback(null, true);
    return;
  }
  callback(new Error('Not allowed by CORS'));
};

const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    credentials: true
  }
});

io.use((socket, next) => {
  try {
    const bearerHeader = socket.handshake.auth?.token || socket.handshake.headers?.authorization || '';
    const token = String(bearerHeader).startsWith('Bearer ')
      ? String(bearerHeader).slice(7)
      : String(bearerHeader || '').trim();

    if (!token) return next(new Error('Unauthorized'));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (error) {
    next(new Error('Unauthorized'));
  }
});

io.on('connection', (socket) => {
  const userId = String(socket.user?.id || '');
  if (userId) {
    socket.join(`user:${userId}`);
  }

  socket.on('disconnect', () => {
    // room cleanup is handled by socket.io automatically
  });
});

app.set('io', io);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Serve React frontend ONLY in production (Render deployment)
if (process.env.NODE_ENV === 'production') {
  const frontendDistPath = path.join(__dirname, '../frontend/dist');
  if (fs.existsSync(frontendDistPath)) {
    app.use(express.static(frontendDistPath));
    app.get(/.*/, (req, res) => {
      res.sendFile(path.join(frontendDistPath, 'index.html'));
    });
  }
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
