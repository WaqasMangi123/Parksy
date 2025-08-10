require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketio = require('socket.io');
const winston = require('winston');
const { v4: uuidv4 } = require('uuid');

// Enhanced logging
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.simple()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

// Log environment status
logger.info('🚀 Starting Parksy Backend Server...');
logger.info(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
logger.info(`🌐 Server URL: https://parksy-backend.onrender.com`);

// Validate required environment variables
const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET', 'ADMIN_EMAIL', 'ADMIN_PASSWORD'];
const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  logger.error('❌ Missing required environment variables:', missingVars);
  process.exit(1);
}

// Check optional environment variables
const optionalEnvVars = ['OPEN_CHARGE_MAP_API_KEY', 'GOOGLE_MAPS_API_KEY', 'MAPBOX_ACCESS_TOKEN'];
optionalEnvVars.forEach(envVar => {
  if (process.env[envVar]) {
    logger.info(`✅ ${envVar} is configured`);
  } else {
    logger.warn(`⚠️  ${envVar} is not configured (optional)`);
  }
});

// Initialize Express
const app = express();
const server = http.createServer(app);

// CORS setup with your actual domains
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'https://parksy.uk',
  'https://www.parksy.uk',
  'https://parksy-backend.onrender.com',
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL
].filter(Boolean);

logger.info(`🔗 Allowed CORS origins: ${allowedOrigins.join(', ')}`);

const io = socketio(server, {
  cors: { 
    origin: allowedOrigins, 
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Security middleware
app.use(helmet({ 
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`🔴 CORS blocked origin: ${origin}`);
      callback(null, true); // Allow for now, log for monitoring
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

// Handle preflight requests
app.options('*', cors());

// Rate limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // requests per window
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/api/health' || req.path === '/'
}));

// Database connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 15000,
  maxPoolSize: 10,
  retryWrites: true
}).then(() => {
  logger.info('✅ Connected to MongoDB successfully');
}).catch(err => {
  logger.error('❌ MongoDB connection error:', err.message);
  process.exit(1);
});

// MongoDB event listeners
mongoose.connection.on('connected', () => {
  logger.info('🟢 MongoDB connection established');
});

mongoose.connection.on('error', (err) => {
  logger.error('🔴 MongoDB connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('🟡 MongoDB connection disconnected');
});

// Socket.io connection handling
io.of('/notifications').on('connection', (socket) => {
  logger.info(`🔌 Client connected: ${socket.id}`);
  
  socket.on('joinRoom', (room) => {
    socket.join(room);
    logger.info(`👥 Client ${socket.id} joined room ${room}`);
  });
  
  socket.on('disconnect', (reason) => {
    logger.info(`🔌 Client disconnected (${socket.id}): ${reason}`);
  });
  
  socket.on('error', (err) => {
    logger.error(`❌ Socket error (${socket.id}): ${err.message}`);
  });
});

// 📡 ENHANCED ROUTE LOADING WITH EV CHARGING ENABLED
logger.info('📡 Loading application routes...');

const routes = [
  { path: '/api/auth', file: './routes/authroutes', name: 'Authentication' },
  { path: '/api/admin', file: './routes/adminroutes', name: 'Admin' },
  { path: '/api/profile', file: './routes/profile', name: 'Profile' },
  { path: '/api/contact', file: './routes/contactroutes', name: 'Contact' },
  { path: '/api/cv', file: './routes/cvgenerator', name: 'CV Generator' },
  { path: '/api/blogs', file: './routes/blogroutes', name: 'Blogs' },
  { path: '/api/scholarships', file: './routes/scholarshiproutes', name: 'Scholarships' },
  { path: '/api/feedback', file: './routes/feedbackroutes', name: 'Feedback' },
  { path: '/api/recommendations', file: './routes/recommendationroutes', name: 'Recommendations' },
  { path: '/api/parking', file: './routes/userparkingroutes', name: 'Parking' },
  { path: '/api/ev-charging', file: './routes/evChargingRoutes', name: 'EV Charging' } // ✅ ENABLED
];

let loadedRoutes = [];
let failedRoutes = [];

// Load each route with enhanced error handling
routes.forEach(route => {
  try {
    logger.info(`🔄 Loading ${route.name} routes...`);
    
    const routeModule = require(route.file);
    
    // Validate the module
    if (!routeModule || typeof routeModule !== 'function') {
      throw new Error(`Invalid router module - ${route.file} did not export a valid Express router`);
    }
    
    app.use(route.path, routeModule);
    loadedRoutes.push(route);
    logger.info(`✅ ${route.name} routes loaded successfully`);
    
  } catch (error) {
    failedRoutes.push({ ...route, error: error.message });
    logger.error(`❌ ${route.name} routes FAILED: ${error.message}`);
    
    // Create fallback endpoints for failed routes
    if (route.path === '/api/ev-charging') {
      logger.info('🔧 Creating fallback EV charging endpoints...');
      
      app.get('/api/ev-charging/health', (req, res) => {
        res.json({
          status: 'ERROR',
          service: 'EV Charging API',
          message: 'EV Charging routes failed to load',
          error: error.message,
          timestamp: new Date().toISOString(),
          fix: 'Check evChargingRoutes.js and evchargingservices.js files'
        });
      });
      
      app.get('/api/ev-charging/search-by-location', (req, res) => {
        res.status(503).json({
          success: false,
          message: 'EV Charging service temporarily unavailable',
          error: 'Route loading failed',
          data: []
        });
      });
      
      app.get('/api/ev-charging/search-by-area', (req, res) => {
        res.status(503).json({
          success: false,
          message: 'EV Charging service temporarily unavailable',
          error: 'Route loading failed',
          data: []
        });
      });
      
      logger.info('🔧 Fallback EV charging endpoints created');
    }
  }
});

// Route loading summary
logger.info(`📊 Route Loading Summary:`);
logger.info(`✅ Successfully loaded: ${loadedRoutes.length}/${routes.length}`);
logger.info(`❌ Failed to load: ${failedRoutes.length}/${routes.length}`);

if (failedRoutes.length > 0) {
  logger.warn('⚠️  Failed routes:');
  failedRoutes.forEach(route => {
    logger.warn(`   - ${route.name}: ${route.error}`);
  });
}

// Root endpoint with comprehensive info
app.get('/', (req, res) => {
  res.json({
    message: '🚗 ParkingFinder API Server',
    status: 'running',
    version: '2.1.0',
    environment: process.env.NODE_ENV || 'production',
    timestamp: new Date().toISOString(),
    server: {
      name: 'Parksy Backend',
      url: 'https://parksy-backend.onrender.com',
      uptime: Math.round(process.uptime()),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
      }
    },
    routes: {
      total: routes.length,
      loaded: loadedRoutes.length,
      failed: failedRoutes.length,
      working: loadedRoutes.map(r => r.path),
      failed_routes: failedRoutes.map(r => ({ path: r.path, error: r.error }))
    },
    features: [
      'User Authentication',
      'Parking Management',
      'EV Charging Stations',
      'Admin Dashboard',
      'Real-time Notifications'
    ]
  });
});

// Enhanced health check endpoint
app.get('/api/health', (req, res) => {
  const healthStatus = {
    status: 'OK',
    server: 'https://parksy-backend.onrender.com',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    database: {
      status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      readyState: mongoose.connection.readyState
    },
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
    },
    environment: process.env.NODE_ENV || 'production',
    version: '2.1.0',
    services: {
      mongodb: mongoose.connection.readyState === 1,
      evCharging: !!process.env.OPEN_CHARGE_MAP_API_KEY,
      googleMaps: !!process.env.GOOGLE_MAPS_API_KEY,
      mapbox: !!process.env.MAPBOX_ACCESS_TOKEN,
      socketIO: true
    },
    routes: {
      total: routes.length,
      loaded: loadedRoutes.length,
      failed: failedRoutes.length,
      working_routes: loadedRoutes.map(r => r.path),
      failed_routes: failedRoutes.map(r => ({ path: r.path, name: r.name, error: r.error }))
    },
    cors: {
      allowedOrigins: allowedOrigins
    }
  };

  const status = healthStatus.database.status === 'connected' ? 200 : 503;
  res.status(status).json(healthStatus);
});

// API information endpoint
app.get('/api/info', (req, res) => {
  res.json({
    name: 'ParkingFinder API',
    version: '2.1.0',
    description: 'Backend API for ParkingFinder application with EV charging support',
    server: {
      url: 'https://parksy-backend.onrender.com',
      environment: process.env.NODE_ENV || 'production'
    },
    endpoints: loadedRoutes.map(route => ({
      path: route.path,
      name: route.name,
      url: `https://parksy-backend.onrender.com${route.path}`
    })),
    features: [
      'User Authentication & Authorization',
      'Parking Space Management',
      'EV Charging Station Finder',
      'Admin Dashboard & Analytics',
      'Real-time Notifications',
      'Contact Management',
      'Blog & Content Management'
    ],
    documentation: {
      health: 'https://parksy-backend.onrender.com/api/health',
      info: 'https://parksy-backend.onrender.com/api/info'
    },
    status: failedRoutes.length > 0 
      ? `${failedRoutes.length} routes failed to load` 
      : 'All routes loaded successfully'
  });
});

// Request logging middleware (add after routes for performance)
app.use((req, res, next) => {
  const requestId = uuidv4();
  req.id = requestId;
  
  // Log only important requests in production
  if (req.method !== 'GET' || req.path.includes('/health')) {
    logger.info({
      requestId,
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent')?.substring(0, 100)
    });
  }
  
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  const errorId = uuidv4();
  
  logger.error({
    errorId,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    errorId,
    timestamp: new Date().toISOString(),
    path: req.path
  });
});

// 404 handler
app.use((req, res) => {
  logger.warn(`🔍 404 Not Found: ${req.method} ${req.path}`);
  res.status(404).json({ 
    error: 'Not Found',
    message: `The requested endpoint ${req.method} ${req.path} was not found`,
    server: 'https://parksy-backend.onrender.com',
    availableEndpoints: loadedRoutes.map(r => r.path),
    documentation: {
      health: '/api/health',
      info: '/api/info'
    },
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown handling
const shutdown = (signal) => {
  return () => {
    logger.info(`📥 Received ${signal}. Shutting down gracefully...`);
    
    server.close((err) => {
      if (err) {
        logger.error(`❌ Error closing server: ${err.message}`);
        process.exit(1);
      }
      
      logger.info('🔴 Server closed');
      
      mongoose.connection.close(false, () => {
        logger.info('🔴 MongoDB connection closed');
        logger.info('✅ Process terminated gracefully');
        process.exit(0);
      });
    });
    
    // Force shutdown after 30 seconds
    setTimeout(() => {
      logger.error('⏰ Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 30000);
  };
};

// Process signal handlers
process.on('SIGTERM', shutdown('SIGTERM'));
process.on('SIGINT', shutdown('SIGINT'));
process.on('unhandledRejection', (reason, promise) => {
  logger.error(`🚨 Unhandled Rejection at: ${promise}, reason: ${reason}`);
});
process.on('uncaughtException', (err) => {
  logger.error(`🚨 Uncaught Exception: ${err.message}`);
  shutdown('uncaughtException')();
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 Parksy Backend Server started successfully!`);
  logger.info(`🌐 Server URL: https://parksy-backend.onrender.com`);
  logger.info(`🔌 Running on port ${PORT}`);
  logger.info(`📍 Environment: ${process.env.NODE_ENV || 'production'}`);
  logger.info(`🔗 Frontend: https://parksy.uk`);
  
  logger.info(`📊 Loaded Routes: ${loadedRoutes.length}/${routes.length}`);
  loadedRoutes.forEach(route => {
    logger.info(`   ✅ ${route.name}: ${route.path}`);
  });
  
  if (failedRoutes.length > 0) {
    logger.warn(`⚠️  Failed Routes: ${failedRoutes.length}`);
    failedRoutes.forEach(route => {
      logger.warn(`   ❌ ${route.name}: ${route.error}`);
    });
  }
  
  logger.info(`📊 Health Check: https://parksy-backend.onrender.com/api/health`);
  logger.info(`📖 API Info: https://parksy-backend.onrender.com/api/info`);
  logger.info(`🔋 EV Charging: https://parksy-backend.onrender.com/api/ev-charging/health`);
  logger.info(`💚 ParkingFinder API is ready to serve requests!`);
});