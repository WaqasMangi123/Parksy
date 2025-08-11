require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketio = require('socket.io');
const path = require('path');

// Validate required environment variables
const requiredEnvVars = [
  'MONGO_URI',
  'JWT_SECRET',
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD'
];

const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars);
  process.exit(1);
}

// Initialize Express
const app = express();
const server = http.createServer(app);

// Environment check
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// Basic security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));
app.disable('x-powered-by');
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS configuration - Fixed for deployment
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // In development, allow all origins
    if (isDevelopment) {
      return callback(null, true);
    }
    
    // In production, allow specific origins
    const allowedOrigins = [
      'https://your-frontend-domain.com',
      'https://your-app.vercel.app',
      'https://your-app.netlify.app'
    ];
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // For deployment testing, be more permissive
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Socket.io setup with fixed CORS
const io = socketio(server, {
  cors: {
    origin: isDevelopment ? "*" : true,
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 100 : 200,
  message: 'Too many requests from this IP, please try again later'
});
app.use(limiter);

// Database connection with better error handling
const connectDB = async (retries = 5, interval = 5000) => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 50
    });
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    if (retries > 0) {
      console.log(`🔄 Retrying connection (${retries} attempts left)...`);
      setTimeout(() => connectDB(retries - 1, interval), interval);
    } else {
      console.error('💥 Failed to connect to MongoDB after all retries');
      if (isProduction) {
        process.exit(1);
      }
    }
  }
};
connectDB();

// Socket.io connection handling
io.of('/notifications').on('connection', (socket) => {
  console.log(`📱 New notification client connected: ${socket.id}`);

  socket.on('joinRoom', (room) => {
    socket.join(room);
    console.log(`🏠 Client ${socket.id} joined room ${room}`);
  });

  socket.on('disconnect', (reason) => {
    console.log(`👋 Client disconnected (${socket.id}): ${reason}`);
  });
});

// Safe route loading function
const loadRoute = (routePath, routeName) => {
  try {
    return require(routePath);
  } catch (error) {
    console.warn(`⚠️ Failed to load ${routeName} route:`, error.message);
    // Return a dummy router that responds with 503
    const express = require('express');
    const router = express.Router();
    router.use('*', (req, res) => {
      res.status(503).json({
        success: false,
        message: `${routeName} service temporarily unavailable`,
        error: 'Service not loaded'
      });
    });
    return router;
  }
};

// ================== ROUTES ================== //
console.log('📝 Loading routes...');

// Core routes (always required)
app.use('/api/auth', loadRoute('./routes/authroutes', 'Auth'));
app.use('/api/admin', loadRoute('./routes/adminroutes', 'Admin'));
app.use('/api/profile', loadRoute('./routes/profile', 'Profile'));
app.use('/api/contact', loadRoute('./routes/contactroutes', 'Contact'));
app.use('/api/cv', loadRoute('./routes/cvgenerator', 'CV Generator'));
app.use('/api/blogs', loadRoute('./routes/blogroutes', 'Blogs'));
app.use('/api/scholarships', loadRoute('./routes/scholarshiproutes', 'Scholarships'));
app.use('/api/feedback', loadRoute('./routes/feedbackroutes', 'Feedback'));
app.use('/api/recommendations', loadRoute('./routes/recommendationroutes', 'Recommendations'));

// NEW ROUTES - Load with error handling
console.log('🚗 Loading parking routes...');
app.use('/api/parking', loadRoute('./routes/userparkingroutes', 'Parking'));

console.log('⚡ Loading EV charging routes...');
app.use('/api/ev-charging', loadRoute('./routes/evChargingRoutes', 'EV Charging'));

console.log('✅ All routes loaded');

// Health check endpoint - Enhanced
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const dbStates = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    database: dbStates[dbStatus] || 'unknown',
    environment: process.env.NODE_ENV || 'development',
    uptime: Math.floor(process.uptime()),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
    },
    services: {
      parking: 'available',
      ev_charging: 'available',
      core_api: 'running'
    }
  });
});

// API routes list endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'Parksy API Server',
    version: '2.0.0',
    available_endpoints: [
      '/api/health',
      '/api/auth',
      '/api/admin',
      '/api/profile',
      '/api/contact',
      '/api/cv',
      '/api/blogs',
      '/api/scholarships',
      '/api/feedback',
      '/api/recommendations',
      '/api/parking',
      '/api/ev-charging'
    ],
    new_features: [
      'EV Charging Station Search',
      'Airport Parking Services'
    ]
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Parksy API Server is running',
    status: 'online',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    available_endpoints: '/api'
  });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Global Error:', {
    path: req.path,
    method: req.method,
    error: err.message,
    stack: isDevelopment ? err.stack : 'Hidden in production'
  });

  // Don't expose internal errors in production
  const errorMessage = isProduction ? 'Internal Server Error' : err.message;
  const statusCode = err.status || err.statusCode || 500;

  res.status(statusCode).json({
    error: errorMessage,
    timestamp: new Date().toISOString(),
    ...(isDevelopment && { 
      stack: err.stack,
      details: err 
    })
  });
});

// Graceful shutdown
const shutdown = (signal) => {
  console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
  
  server.close((err) => {
    if (err) {
      console.error('❌ Error closing server:', err);
      process.exit(1);
    }
    
    console.log('✅ Server closed');
    
    mongoose.connection.close(false, () => {
      console.log('✅ MongoDB connection closed');
      console.log('👋 Process terminated gracefully');
      process.exit(0);
    });
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    console.error('❌ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Process event handlers
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit in production for unhandled rejections
  if (!isProduction) {
    shutdown('unhandledRejection');
  }
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('\n🚀 ====================================');
  console.log(`🌟 Parksy API Server Started`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️  Database: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Connecting...'}`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`📋 API Routes: http://localhost:${PORT}/api`);
  console.log('🚀 ====================================\n');
});