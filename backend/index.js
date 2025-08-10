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
const fs = require('fs');
const path = require('path');

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

const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  logger.error('Missing required environment variables:', missingVars);
  process.exit(1);
}

// Initialize Express
const app = express();
const server = http.createServer(app);

// Environment detection
const isDevelopment = false;
const isProduction = true;

logger.info(`🌍 Environment: production (forced)`);
logger.info(`🔗 Backend URL: https://parksy-backend.onrender.com`);
logger.info(`🌐 Frontend URL: https://parksy.uk`);

// Production CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://parksy.uk',
  'https://www.parksy.uk',
  'https://parksy-backend.onrender.com',
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL
].filter(Boolean);

// Socket.io setup
const io = socketio(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.disable('x-powered-by');
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    logger.warn(`CORS blocked: ${origin}`);
    return callback(null, true); // Allow for now to debug
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

app.options('*', cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests' },
  skip: (req) => req.path === '/api/health' || req.path === '/'
});
app.use(limiter);

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    logger.info('✅ Connected to MongoDB');
  } catch (err) {
    logger.error(`❌ MongoDB error: ${err.message}`);
    process.exit(1);
  }
};

connectDB();

// Socket.io handling
io.of('/notifications').on('connection', (socket) => {
  logger.info(`🔌 Client connected: ${socket.id}`);
  socket.on('disconnect', () => logger.info(`🔌 Client disconnected: ${socket.id}`));
});

// 🔍 DIAGNOSTIC: Check what route files actually exist
logger.info('🔍 Checking available route files...');
try {
  const routesDir = path.resolve(__dirname, 'routes');
  const actualFiles = fs.readdirSync(routesDir);
  logger.info('📁 Available route files:');
  actualFiles.forEach(file => {
    logger.info(`   - ${file}`);
  });
} catch (error) {
  logger.error('❌ Cannot read routes directory:', error.message);
}

// 🚨 ENHANCED ROUTE LOADING with better error detection
logger.info('📡 Loading routes with enhanced error handling...');

// Define routes to load with multiple possible filenames
const routesToLoad = [
  { 
    path: '/api/auth', 
    possibleFiles: ['./routes/authroutes', './routes/authRoutes', './routes/auth'], 
    name: 'Authentication' 
  },
  { 
    path: '/api/admin', 
    possibleFiles: ['./routes/adminroutes', './routes/adminRoutes', './routes/admin'], 
    name: 'Admin' 
  },
  { 
    path: '/api/profile', 
    possibleFiles: ['./routes/profile', './routes/profileRoutes'], 
    name: 'Profile' 
  },
  { 
    path: '/api/contact', 
    possibleFiles: ['./routes/contactroutes', './routes/contactRoutes', './routes/contact'], 
    name: 'Contact' 
  },
  { 
    path: '/api/cv', 
    possibleFiles: ['./routes/cvgenerator', './routes/cvGenerator', './routes/cv'], 
    name: 'CV' 
  },
  { 
    path: '/api/blogs', 
    possibleFiles: ['./routes/blogroutes', './routes/blogRoutes', './routes/blogs'], 
    name: 'Blogs' 
  },
  { 
    path: '/api/scholarships', 
    possibleFiles: ['./routes/scholarshiproutes', './routes/scholarshipRoutes', './routes/scholarships'], 
    name: 'Scholarships' 
  },
  { 
    path: '/api/feedback', 
    possibleFiles: ['./routes/feedbackroutes', './routes/feedbackRoutes', './routes/feedback'], 
    name: 'Feedback' 
  },
  { 
    path: '/api/recommendations', 
    possibleFiles: ['./routes/recommendationroutes', './routes/recommendationRoutes', './routes/recommendations'], 
    name: 'Recommendations' 
  },
  { 
    path: '/api/parking', 
    possibleFiles: ['./routes/userparkingroutes', './routes/parkingRoutes', './routes/parking'], 
    name: 'Parking' 
  },
  { 
    path: '/api/ev-charging', 
    possibleFiles: ['./routes/evChargingRoutes', './routes/evchargingroutes', './routes/evCharging'], 
    name: 'EV Charging' 
  }
];

let loadedRoutes = [];
let failedRoutes = [];

for (const route of routesToLoad) {
  let routeLoaded = false;
  let lastError = null;

  // Try each possible filename
  for (const filePath of route.possibleFiles) {
    try {
      logger.info(`🔄 Trying to load ${route.name} from ${filePath}...`);
      
      // Check if file exists first
      const fullPath = path.resolve(__dirname, filePath + '.js');
      if (!fs.existsSync(fullPath)) {
        logger.warn(`📁 File not found: ${fullPath}`);
        continue;
      }

      // Clear require cache to ensure fresh load
      delete require.cache[require.resolve(filePath)];
      
      // Try to require the module
      const routeModule = require(filePath);
      
      // Validate it's a proper router
      if (!routeModule || typeof routeModule !== 'function') {
        throw new Error(`${filePath} does not export a valid Express router`);
      }

      // Test the router by creating a temporary app (this will catch route pattern errors)
      const testApp = express();
      testApp.use(route.path, routeModule);
      
      // If we get here, the router is valid - add it to the main app
      app.use(route.path, routeModule);
      
      loadedRoutes.push({ ...route, file: filePath });
      logger.info(`✅ ${route.name} loaded successfully from ${filePath}`);
      routeLoaded = true;
      break;
      
    } catch (error) {
      lastError = error;
      logger.warn(`⚠️  Failed to load ${route.name} from ${filePath}: ${error.message}`);
      
      // Log specific error details for debugging
      if (error.message.includes('Missing parameter name')) {
        logger.error(`🔍 ROUTE PATTERN ERROR in ${filePath}:`);
        logger.error(`   - Check for malformed route parameters like '/:' or '::'`);
        logger.error(`   - Ensure parameter names follow pattern '/:paramName'`);
      } else if (error.message.includes('Cannot find module')) {
        logger.warn(`📁 File not found: ${filePath}.js`);
      } else {
        logger.error(`🐛 Unexpected error: ${error.message}`);
      }
    }
  }

  // If no file worked, mark as failed
  if (!routeLoaded) {
    failedRoutes.push({ 
      ...route, 
      error: lastError ? lastError.message : 'No valid route file found',
      attemptedFiles: route.possibleFiles
    });
    logger.error(`❌ ${route.name} FAILED to load from any file`);
    
    // Create a fallback health endpoint for failed routes
    app.get(`${route.path}/health`, (req, res) => {
      res.status(503).json({
        status: 'ERROR',
        service: route.name,
        message: `${route.name} routes failed to load`,
        error: lastError ? lastError.message : 'Route file not found',
        attemptedFiles: route.possibleFiles,
        timestamp: new Date().toISOString()
      });
    });
    logger.info(`📡 Created fallback health endpoint for ${route.name}`);
  }
}

logger.info(`📊 Route loading summary:`);
logger.info(`   ✅ Loaded: ${loadedRoutes.length} routes`);
logger.info(`   ❌ Failed: ${failedRoutes.length} routes`);

if (loadedRoutes.length > 0) {
  logger.info(`📋 Successfully loaded routes:`);
  loadedRoutes.forEach(route => {
    logger.info(`   - ${route.name}: ${route.path} (from ${route.file})`);
  });
}

if (failedRoutes.length > 0) {
  logger.warn(`⚠️  Failed routes:`);
  failedRoutes.forEach(route => {
    logger.warn(`   - ${route.name}: ${route.error}`);
  });
}

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: '🚗 ParkingFinder API Server',
    status: 'running',
    version: '2.0.0',
    environment: 'production',
    timestamp: new Date().toISOString(),
    server: {
      name: 'Parksy Backend',
      url: 'https://parksy-backend.onrender.com',
      uptime: Math.round(process.uptime())
    },
    routes: {
      loaded: loadedRoutes.length,
      failed: failedRoutes.length,
      total: routesToLoad.length,
      working: loadedRoutes.map(r => ({ path: r.path, name: r.name })),
      failed_routes: failedRoutes.map(r => ({ 
        path: r.path, 
        name: r.name, 
        error: r.error 
      }))
    }
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    server: 'https://parksy-backend.onrender.com',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    database: {
      status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    },
    environment: 'production',
    version: '2.0.0',
    services: {
      mongodb: mongoose.connection.readyState === 1,
      evCharging: !!process.env.OPEN_CHARGE_MAP_API_KEY
    },
    routes: {
      loaded: loadedRoutes.map(r => ({ path: r.path, name: r.name, file: r.file })),
      failed: failedRoutes.map(r => ({ 
        path: r.path, 
        name: r.name, 
        error: r.error,
        attemptedFiles: r.attemptedFiles 
      })),
      total: loadedRoutes.length + failedRoutes.length
    }
  });
});

// API info endpoint
app.get('/api/info', (req, res) => {
  res.json({
    name: 'ParkingFinder API',
    version: '2.0.0',
    description: 'Backend API for ParkingFinder application',
    server: 'https://parksy-backend.onrender.com',
    endpoints: loadedRoutes.map(route => route.path),
    failedRoutes: failedRoutes.map(route => ({ 
      path: route.path, 
      error: route.error,
      attemptedFiles: route.attemptedFiles 
    }))
  });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Global Error Handler:`, {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });
  
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: isProduction ? 'Something went wrong' : err.message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    availableEndpoints: loadedRoutes.map(r => r.path),
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  logger.info('🛑 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    logger.info('💀 Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('🛑 SIGINT received, shutting down gracefully...');
  server.close(() => {
    logger.info('💀 Process terminated');
    process.exit(0);
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 Server started on port ${PORT}`);
  logger.info(`🌐 URL: https://parksy-backend.onrender.com`);
  logger.info(`✅ Loaded routes: ${loadedRoutes.length}`);
  logger.info(`❌ Failed routes: ${failedRoutes.length}`);
  
  if (failedRoutes.length > 0) {
    logger.warn('⚠️  Some routes failed to load but server is still running');
    logger.warn('⚠️  Check the /api/health endpoint for detailed error information');
  }
  
  logger.info(`💚 Server is running successfully!`);
});