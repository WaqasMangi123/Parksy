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

// Enhanced logging configuration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Validate required environment variables
const requiredEnvVars = [
  'MONGO_URI',
  'JWT_SECRET',
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD'
];

// Optional environment variables for EV charging and other APIs
const optionalEnvVars = [
  'OPEN_CHARGE_MAP_API_KEY',
  'GOOGLE_MAPS_API_KEY',
  'MAPBOX_ACCESS_TOKEN',
  'CLIENT_URL',
  'FRONTEND_URL'
];

const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  logger.error('Missing required environment variables:', missingVars);
  process.exit(1);
}

// Log optional environment variables status
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

// Environment detection - Fixed to properly detect production on Render
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// If NODE_ENV is not set, assume production on Render
const actualEnvironment = process.env.NODE_ENV || 'production';

logger.info(`🌍 Environment: ${actualEnvironment}`);
logger.info(`🔧 NODE_ENV: ${process.env.NODE_ENV || 'not set (defaulting to production)'}`);

// Production CORS configuration with your actual URLs
const allowedOrigins = [
  // Local development URLs
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://localhost:5000',
  
  // Your actual production URLs
  'https://parksy.uk',
  'https://www.parksy.uk',
  
  // Environment variables
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
  
  // Your backend URL
  'https://parksy-backend.onrender.com',
  
  // Custom domains
  process.env.CUSTOM_DOMAIN,
  process.env.ADDITIONAL_DOMAIN
].filter(Boolean);

logger.info(`🔗 Backend URL: https://parksy-backend.onrender.com`);
logger.info(`🌐 Frontend URL: https://parksy.uk`);
logger.info(`🎯 CORS Mode: ${isDevelopment ? 'Development (*)' : 'Production (restricted)'}`);

// Socket.io setup with production-ready CORS
const io = socketio(server, {
  cors: {
    origin: isDevelopment ? '*' : allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

// Enhanced security middleware for production
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", ...(isDevelopment ? ["http://localhost:*", "ws://localhost:*"] : allowedOrigins)],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.disable('x-powered-by');
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Production-ready CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman, server-to-server)
    if (!origin) return callback(null, true);
    
    // In development, allow all origins
    if (isDevelopment) {
      logger.info(`🟢 CORS allowing origin (dev mode): ${origin}`);
      return callback(null, true);
    }
    
    // In production, check against allowed origins
    if (allowedOrigins.includes(origin)) {
      logger.info(`🟢 CORS allowing origin: ${origin}`);
      return callback(null, true);
    }
    
    const msg = `🔴 CORS policy violation: ${origin} not allowed`;
    logger.warn(msg);
    return callback(new Error(msg), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'X-Request-ID',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  optionsSuccessStatus: 200
}));

// Handle preflight requests explicitly
app.options('*', cors());

// Request logging middleware
app.use((req, res, next) => {
  const requestId = uuidv4();
  req.id = requestId;
  
  // Minimal logging in production for performance
  if (isDevelopment) {
    logger.info({
      message: 'Incoming request',
      requestId,
      method: req.method,
      path: req.path,
      origin: req.get('origin'),
      ip: req.ip
    });
  }

  res.on('finish', () => {
    if (isDevelopment || res.statusCode >= 400) {
      logger.info({
        message: 'Request completed',
        requestId,
        method: req.method,
        path: req.path,
        status: res.statusCode
      });
    }
  });

  next();
});

// Enhanced rate limiting for production
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 200 : 1000,
  message: {
    error: 'Too many requests from this IP, please try again later',
    retryAfter: 15 * 60,
    type: 'rate_limit_exceeded'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`⚠️ Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
    res.status(429).json({
      error: 'Too many requests, please try again later',
      retryAfter: 900,
      type: 'rate_limit_exceeded'
    });
  },
  skip: (req) => {
    return req.path === '/api/health' || req.path === '/';
  }
});
app.use(limiter);

// Database connection with production optimizations
const connectDB = async (retries = 5, interval = 5000) => {
  try {
    logger.info('🔄 Attempting MongoDB connection...');
    
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 15000,
      maxPoolSize: 10,
      retryWrites: true,
      w: 'majority',
      bufferCommands: false,
      bufferMaxEntries: 0,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 30000,
      heartbeatFrequencyMS: 10000,
      maxIdleTimeMS: 30000
    });
    
    logger.info('✅ Connected to MongoDB successfully');
  } catch (err) {
    logger.error(`❌ MongoDB connection error: ${err.message}`);
    
    if (retries > 0) {
      logger.info(`🔄 Retrying connection (${retries} attempts left)...`);
      setTimeout(() => connectDB(retries - 1, interval), interval);
    } else {
      logger.error('💥 Failed to connect to MongoDB after multiple attempts');
      process.exit(1);
    }
  }
};

mongoose.connection.on('connected', () => {
  logger.info('🟢 MongoDB connection established and ready');
});

mongoose.connection.on('error', (err) => {
  logger.error(`🔴 MongoDB connection error: ${err.message}`);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('🟡 MongoDB connection disconnected');
});

mongoose.connection.on('reconnected', () => {
  logger.info('🔄 MongoDB reconnected');
});

// Connect to database
connectDB();

// Socket.io connection handling
io.of('/notifications').on('connection', (socket) => {
  logger.info(`🔌 New notification client connected: ${socket.id}`);

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

// API Routes with enhanced error handling to prevent deployment failures
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
  { path: '/api/ev-charging', file: './routes/evChargingRoutes', name: 'EV Charging' }
];

// Enhanced route registration with individual error handling
let successfulRoutes = 0;
let failedRoutes = [];
const registeredRoutes = [];

routes.forEach(route => {
  try {
    logger.info(`🔄 Loading ${route.name} route: ${route.path}`);
    
    // Try to require the route file
    const routeModule = require(route.file);
    
    // Validate that it's a proper router
    if (!routeModule || typeof routeModule !== 'function') {
      throw new Error(`Invalid router module: ${route.file} did not export a valid router`);
    }
    
    // Try to register the route
    app.use(route.path, routeModule);
    
    successfulRoutes++;
    registeredRoutes.push({ path: route.path, name: route.name });
    logger.info(`✅ Successfully registered ${route.name}: ${route.path}`);
    
  } catch (error) {
    failedRoutes.push({
      name: route.name,
      path: route.path,
      file: route.file,
      error: error.message
    });
    
    logger.error(`❌ FAILED to register ${route.name}: ${route.path}`);
    logger.error(`📁 File: ${route.file}`);
    logger.error(`🚨 Error: ${error.message}`);
    
    // Provide specific guidance for common router errors
    if (error.message.includes('Missing parameter name') || error.message.includes('pathToRegexpError')) {
      logger.error(`🔍 ROUTER PATH ERROR detected in ${route.file}:`);
      logger.error(`   Check for invalid route patterns like:`);
      logger.error(`   - /:id: (double colon)`);
      logger.error(`   - /user/: (missing parameter name)`);
      logger.error(`   - /:: (empty parameter)`);
      logger.error(`   - Routes with malformed path patterns`);
    }
    
    // Continue with other routes instead of crashing the entire server
    logger.warn(`⚠️  Continuing server startup without ${route.name} route...`);
  }
});

// Log route registration summary
logger.info(`📊 Route Registration Summary:`);
logger.info(`✅ Successful routes: ${successfulRoutes}/${routes.length}`);

if (failedRoutes.length > 0) {
  logger.error(`❌ Failed routes: ${failedRoutes.length}`);
  failedRoutes.forEach(route => {
    logger.error(`   - ${route.name} (${route.path}): ${route.error}`);
  });
  
  // Don't exit for non-critical route failures in production
  if (!isProduction) {
    logger.warn('⚠️  Some routes failed to load, but continuing in production mode...');
  }
} else {
  logger.info('🎉 All routes registered successfully!');
}

// Root endpoint with comprehensive info
app.get('/', (req, res) => {
  res.json({
    message: '🚗 ParkingFinder API Server',
    status: 'running',
    version: '2.0.0',
    environment: actualEnvironment,
    timestamp: new Date().toISOString(),
    server: {
      name: 'Parksy Backend',
      url: 'https://parksy-backend.onrender.com',
      uptime: Math.round(process.uptime())
    },
    features: [
      'User Authentication',
      'Parking Management', 
      'EV Charging Stations',
      'Admin Dashboard',
      'Real-time Notifications'
    ],
    routes: {
      total: routes.length,
      registered: successfulRoutes,
      failed: failedRoutes.length,
      active: registeredRoutes.map(r => r.path)
    },
    cors: isDevelopment ? 'development (permissive)' : 'production (restricted)'
  });
});

// Enhanced health check endpoint
app.get('/api/health', (req, res) => {
  const healthcheck = {
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
    environment: actualEnvironment,
    version: '2.0.0',
    services: {
      mongodb: mongoose.connection.readyState === 1,
      evCharging: !!process.env.OPEN_CHARGE_MAP_API_KEY,
      googleMaps: !!process.env.GOOGLE_MAPS_API_KEY,
      mapbox: !!process.env.MAPBOX_ACCESS_TOKEN,
      socketIO: true
    },
    routes: {
      total: routes.length,
      registered: successfulRoutes,
      failed: failedRoutes.length
    },
    cors: {
      mode: isDevelopment ? 'development' : 'production',
      allowedOrigins: isDevelopment ? ['*'] : allowedOrigins
    }
  };

  const status = healthcheck.database.status === 'connected' ? 200 : 503;
  res.status(status).json(healthcheck);
});

// API info endpoint
app.get('/api/info', (req, res) => {
  res.json({
    name: 'ParkingFinder API',
    version: '2.0.0',
    description: 'Backend API for ParkingFinder application with EV charging support',
    server: {
      url: 'https://parksy-backend.onrender.com',
      environment: actualEnvironment
    },
    endpoints: registeredRoutes.map(route => ({
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
    cors: {
      mode: isDevelopment ? 'development (permissive)' : 'production (restricted)',
      allowedOrigins: isDevelopment ? ['*'] : allowedOrigins
    },
    documentation: {
      health: 'https://parksy-backend.onrender.com/api/health',
      info: 'https://parksy-backend.onrender.com/api/info'
    }
  });
});

// Temporary EV Charging health endpoint (in case EV routes fail to load)
app.get('/api/ev-charging/health', (req, res) => {
  const evRouteLoaded = registeredRoutes.some(r => r.path === '/api/ev-charging');
  
  res.json({
    status: evRouteLoaded ? 'OK' : 'ROUTE_NOT_LOADED',
    service: 'EV Charging API',
    timestamp: new Date().toISOString(),
    routeLoaded: evRouteLoaded,
    apiKey: !!process.env.OPEN_CHARGE_MAP_API_KEY ? 'configured' : 'missing',
    message: evRouteLoaded ? 'EV Charging routes loaded successfully' : 'EV Charging routes failed to load - check route file for errors',
    features: [
      'Search by location',
      'Search by area', 
      'Operator filtering',
      'Connection type filtering',
      'Real-time status'
    ],
    endpoints: evRouteLoaded ? [
      '/api/ev-charging/search-by-location',
      '/api/ev-charging/search-by-area',
      '/api/ev-charging/operators',
      '/api/ev-charging/connection-types'
    ] : ['Routes not available due to loading error']
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  const errorId = uuidv4();
  
  logger.error({
    message: err.message,
    errorId,
    stack: isDevelopment ? err.stack : undefined,
    request: {
      method: req.method,
      path: req.path,
      ip: req.ip
    }
  });

  const errorResponse = {
    error: isProduction ? 'Internal Server Error' : err.message,
    errorId,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  };

  if (isDevelopment) {
    errorResponse.stack = err.stack;
  }

  res.status(err.status || 500).json(errorResponse);
});

// 404 handler
app.use((req, res) => {
  logger.warn(`🔍 404 Not Found: ${req.method} ${req.path} from ${req.ip}`);
  res.status(404).json({ 
    error: 'Not Found',
    message: `The requested endpoint ${req.method} ${req.path} was not found`,
    server: 'https://parksy-backend.onrender.com',
    availableEndpoints: registeredRoutes.map(route => route.path),
    documentation: {
      health: '/api/health',
      info: '/api/info'
    },
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown
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
  logger.info(`📍 Environment: ${actualEnvironment}`);
  logger.info(`🔐 CORS Mode: ${isDevelopment ? 'Development (*)' : 'Production (restricted)'}`);
  
  if (!isDevelopment) {
    logger.info(`🌍 Allowed Frontend URLs:`);
    allowedOrigins.forEach(origin => logger.info(`   - ${origin}`));
  }
  
  logger.info(`📊 Routes Status: ${successfulRoutes}/${routes.length} loaded successfully`);
  logger.info(`📊 Health Check: https://parksy-backend.onrender.com/api/health`);
  logger.info(`📖 API Info: https://parksy-backend.onrender.com/api/info`);
  logger.info(`💚 ParkingFinder API is ready to serve requests!`);
  
  if (failedRoutes.length > 0) {
    logger.warn(`⚠️  Note: ${failedRoutes.length} routes failed to load but server started successfully`);
    logger.warn(`🔧 Check the logs above for specific route errors to fix`);
  }
});