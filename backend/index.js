require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketio = require('socket.io');

// Validate required environment variables
const requiredEnvVars = [
  'MONGO_URI',
  'JWT_SECRET',
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD',
  'ADMIN_JWT_SECRET',
  'AWIN_API_TOKEN',          // Added for Awin
  'AWIN_PUBLISHER_ID',       // Added for Awin
  'AWIN_ADVERTISER_ID'       // Added for Awin
];

const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars);
  process.exit(1);
}

// Initialize Express
const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = socketio(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Basic security middleware
app.use(helmet());
app.disable('x-powered-by');
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: 'Too many requests from this IP, please try again later'
});
app.use(limiter);

// Database connection
const connectDB = async (retries = 5, interval = 5000) => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 50
    });
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    if (retries > 0) {
      console.log(`Retrying connection (${retries} attempts left)...`);
      setTimeout(() => connectDB(retries - 1, interval), interval);
    } else {
      process.exit(1);
    }
  }
};
connectDB();

// Socket.io notifications
io.of('/notifications').on('connection', (socket) => {
  console.log(`New notification client connected: ${socket.id}`);

  socket.on('joinRoom', (room) => {
    socket.join(room);
    console.log(`Client ${socket.id} joined room ${room}`);
  });

  socket.on('disconnect', (reason) => {
    console.log(`Client disconnected (${socket.id}): ${reason}`);
  });
});

// ================== Routes ================== //
app.use('/api/auth', require('./routes/authroutes'));
app.use('/api/admin', require('./routes/adminroutes'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/contact', require('./routes/contactroutes'));
app.use('/api/cv', require('./routes/cvgenerator'));
app.use('/api/blogs', require('./routes/blogroutes'));
app.use('/api/scholarships', require('./routes/scholarshiproutes'));
app.use('/api/feedback', require('./routes/feedbackroutes'));
app.use('/api/recommendations', require('./routes/recommendationroutes'));
app.use('/api/awin', require('./routes/awin')); // NEW Awin API route

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    services: {
      awin: process.env.AWIN_API_TOKEN ? 'Configured' : 'Disabled' // Awin status
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('❌ Error:', {
    path: req.path,
    method: req.method,
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { details: err.stack })
  });
});

// Graceful shutdown
const shutdown = () => {
  console.log('Shutting down gracefully...');
  server.close(() => {
    mongoose.connection.close(false, () => {
      console.log('Server stopped');
      process.exit(0);
    });
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Awin API: ${process.env.AWIN_API_TOKEN ? 'Enabled' : 'Disabled'}`);
});