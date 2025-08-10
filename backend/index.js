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

const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  logger.error('Missing required environment variables:', missingVars);
  process.exit(1);
}

// Initialize Express
const app = express();
const server = http.createServer(app);

// Environment detection - Force production on Render
const isDevelopment = false; // Force production mode for now
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

// 🚨 EMERGENCY FIX: Load routes one by one with individual try-catch
logger.info('📡 Loading routes with emergency error handling...');

// Load each route individually to identify the problematic one
const routesToLoad = [
  { path: '/api/auth', file: './routes/authroutes', name: 'Authentication' },
  { path: '/api/admin', file: './routes/adminroutes', name: 'Admin' },
  { path: '/api/profile', file: './routes/profile', name: 'Profile' },
  { path: '/api/contact', file: './routes/contactroutes', name: 'Contact' },
  { path: '/api/cv', file: './routes/cvgenerator', name: 'CV' },
  { path: '/api/blogs', file: './routes/blogroutes', name: 'Blogs' },
  { path: '/api/scholarships', file: './routes/scholarshiproutes', name: 'Scholarships' },
  { path: '/api/feedback', file: './routes/feedbackroutes', name: 'Feedback' },
  { path: '/api/recommendations', file: './routes/recommendationroutes', name: 'Recommendations' },
  { path: '/api/parking', file: './routes/userparkingroutes', name: 'Parking' }
  // Temporarily commenting out EV charging to identify if it's the problem
  // { path: '/api/ev-charging', file: './routes/evChargingRoutes', name: 'EV Charging' }
];

let loadedRoutes = [];
let failedRoutes = [];

for (const route of routesToLoad) {
  try {
    logger.info(`🔄 Loading ${route.name}...`);
    
    // Use dynamic import to catch errors
    const routeModule = require(route.file);
    app.use(route.path, routeModule);
    
    loadedRoutes.push(route);
    logger.info(`✅ ${route.name} loaded successfully`);
    
  } catch (error) {
    failedRoutes.push({ ...route, error: error.message });
    logger.error(`❌ ${route.name} FAILED: ${error.message}`);
    
    // If it's a router error, log more details
    if (error.message.includes('Missing parameter name')) {
      logger.error(`🔍 Router error in ${route.file} - check for invalid route patterns`);
    }
  }
}

// Try to load EV charging separately with extra protection
try {
  logger.info('🔄 Attempting to load EV Charging routes...');
  
  // Test if the file exists and can be required
  const evModule = require('./routes/evChargingRoutes');
  app.use('/api/ev-charging', evModule);
  
  loadedRoutes.push({ path: '/api/ev-charging', name: 'EV Charging' });
  logger.info('✅ EV Charging routes loaded successfully');
  
} catch (error) {
  failedRoutes.push({ 
    path: '/api/ev-charging', 
    name: 'EV Charging', 
    file: './routes/evChargingRoutes',
    error: error.message 
  });
  logger.error(`❌ EV Charging FAILED: ${error.message}`);
  
  // Create a temporary EV charging health endpoint
  app.get('/api/ev-charging/health', (req, res) => {
    res.json({
      status: 'ERROR',
      service: 'EV Charging API',
      message: 'EV Charging routes failed to load',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  });
  
  logger.info('📡 Created fallback EV charging health endpoint');
}

logger.info(`📊 Route loading complete: ${loadedRoutes.length} successful, ${failedRoutes.length} failed`);

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
      total: routesToLoad.length + 1, // +1 for EV charging
      working: loadedRoutes.map(r => r.path)
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
      loaded: loadedRoutes.map(r => ({ path: r.path, name: r.name })),
      failed: failedRoutes.map(r => ({ path: r.path, name: r.name, error: r.error })),
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
    failedRoutes: failedRoutes.map(route => ({ path: route.path, error: route.error }))
  });
});

// Error handling
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`);
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    availableEndpoints: loadedRoutes.map(r => r.path),
    timestamp: new Date().toISOString()
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
    logger.warn('⚠️  Failed routes:');
    failedRoutes.forEach(route => {
      logger.warn(`   - ${route.name}: ${route.error}`);
    });
  }
  
  logger.info(`💚 Server is running successfully!`);
});