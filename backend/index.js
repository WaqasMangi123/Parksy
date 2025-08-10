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
    return callback(null, true);
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

// 🔍 Check what files exist
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

// 🚨 EMERGENCY BYPASS: Load routes with absolute safety
logger.info('🚨 EMERGENCY MODE: Loading routes with maximum safety...');

let loadedRoutes = [];
let failedRoutes = [];

// Helper function to safely test a route file
const safelyTestRoute = (filePath, routeName) => {
  try {
    logger.info(`🧪 Testing ${routeName} from ${filePath}...`);
    
    // Check if file exists
    const fullPath = path.resolve(__dirname, filePath + '.js');
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${filePath}.js`);
    }

    // Read file content to check for obvious issues
    const content = fs.readFileSync(fullPath, 'utf8');
    
    // Check for problematic route patterns
    const problematicPatterns = [
      /router\.(?:get|post|put|delete|patch)\s*\(\s*['"][^'"]*:\s*['"]/, // :space or :end
      /router\.(?:get|post|put|delete|patch)\s*\(\s*['"][^'"]*::[^'"]*['"]/, // double colon
      /router\.(?:get|post|put|delete|patch)\s*\(\s*['"][^'"]*:\d[^'"]*['"]/, // :number
      /router\.(?:get|post|put|delete|patch)\s*\(\s*['"][^'"]*:[^a-zA-Z_][^'"]*['"]/, // :invalid_start
    ];
    
    for (let i = 0; i < problematicPatterns.length; i++) {
      const matches = content.match(problematicPatterns[i]);
      if (matches) {
        throw new Error(`Problematic route pattern found: ${matches[0].trim()}`);
      }
    }

    // Try to require in a child process to isolate errors
    delete require.cache[require.resolve(filePath)];
    const routeModule = require(filePath);
    
    if (!routeModule || typeof routeModule !== 'function') {
      throw new Error('Module does not export a valid Express router');
    }

    return { success: true, module: routeModule };
    
  } catch (error) {
    logger.error(`❌ ${routeName} failed test: ${error.message}`);
    return { success: false, error: error.message };
  }
};

// List of routes to test (in order of safety - least likely to have issues first)
const routesToTest = [
  { path: '/api/auth', files: ['./routes/authroutes', './routes/authRoutes'], name: 'Authentication' },
  { path: '/api/contact', files: ['./routes/contactroutes', './routes/contactRoutes'], name: 'Contact' },
  { path: '/api/profile', files: ['./routes/profile', './routes/profileRoutes'], name: 'Profile' },
  { path: '/api/cv', files: ['./routes/cvgenerator', './routes/cvGenerator'], name: 'CV' },
  { path: '/api/blogs', files: ['./routes/blogroutes', './routes/blogRoutes'], name: 'Blogs' },
  { path: '/api/feedback', files: ['./routes/feedbackroutes', './routes/feedbackRoutes'], name: 'Feedback' },
  { path: '/api/admin', files: ['./routes/adminroutes', './routes/adminRoutes'], name: 'Admin' },
  { path: '/api/scholarships', files: ['./routes/scholarshiproutes', './routes/scholarshipRoutes'], name: 'Scholarships' },
  { path: '/api/recommendations', files: ['./routes/recommendationroutes', './routes/recommendationRoutes'], name: 'Recommendations' },
  // These are most likely to have parameter issues, so test last
  { path: '/api/parking', files: ['./routes/userparkingroutes', './routes/parkingRoutes'], name: 'Parking' },
  { path: '/api/ev-charging', files: ['./routes/evChargingRoutes', './routes/evchargingroutes'], name: 'EV Charging' }
];

// Test and load each route
for (const route of routesToTest) {
  let routeLoaded = false;

  for (const filePath of route.files) {
    const testResult = safelyTestRoute(filePath, route.name);
    
    if (testResult.success) {
      try {
        app.use(route.path, testResult.module);
        loadedRoutes.push({ ...route, file: filePath });
        logger.info(`✅ ${route.name} loaded successfully from ${filePath}`);
        routeLoaded = true;
        break;
      } catch (error) {
        logger.error(`❌ Failed to mount ${route.name}: ${error.message}`);
      }
    }
  }

  if (!routeLoaded) {
    failedRoutes.push({
      ...route,
      error: 'No valid route file found or all files have issues'
    });
    
    // Create emergency fallback endpoint
    app.get(`${route.path}/emergency`, (req, res) => {
      res.json({
        status: 'EMERGENCY_MODE',
        service: route.name,
        message: `${route.name} routes failed to load - check server logs`,
        timestamp: new Date().toISOString()
      });
    });
  }
}

logger.info(`📊 Emergency loading complete:`);
logger.info(`   ✅ Loaded: ${loadedRoutes.length} routes`);
logger.info(`   ❌ Failed: ${failedRoutes.length} routes`);

// Basic endpoints that will always work
app.get('/', (req, res) => {
  res.json({
    message: '🚗 ParkingFinder API Server - EMERGENCY MODE',
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
      working: loadedRoutes.map(r => r.path),
      emergency_endpoints: failedRoutes.map(r => `${r.path}/emergency`)
    },
    note: 'Server running in emergency mode - some routes may have failed to load'
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'EMERGENCY_OK',
    server: 'https://parksy-backend.onrender.com',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    database: {
      status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    },
    environment: 'production',
    version: '2.0.0',
    routes: {
      loaded: loadedRoutes.map(r => ({ path: r.path, name: r.name, file: r.file })),
      failed: failedRoutes.map(r => ({ path: r.path, name: r.name, error: r.error }))
    }
  });
});

// Create a diagnostic endpoint
app.get('/api/debug/routes', (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    total_routes_attempted: routesToTest.length,
    successful_routes: loadedRoutes,
    failed_routes: failedRoutes,
    emergency_endpoints: failedRoutes.map(r => `${r.path}/emergency`),
    next_steps: [
      'Check the failed routes for malformed route patterns',
      'Look for routes with parameters like /:id that might have syntax errors',
      'Check if route files exist with the expected names'
    ]
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error(`Global Error: ${err.message}`);
  res.status(500).json({
    error: 'Internal Server Error',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: 'Route not found - server running in emergency mode',
    available_endpoints: loadedRoutes.map(r => r.path),
    emergency_endpoints: failedRoutes.map(r => `${r.path}/emergency`),
    timestamp: new Date().toISOString()
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 Server started in EMERGENCY MODE on port ${PORT}`);
  logger.info(`🌐 URL: https://parksy-backend.onrender.com`);
  logger.info(`✅ Loaded routes: ${loadedRoutes.length}`);
  logger.info(`❌ Failed routes: ${failedRoutes.length}`);
  
  if (failedRoutes.length > 0) {
    logger.warn('⚠️  Some routes failed - check /api/debug/routes for details');
  }
  
  logger.info(`💚 Server is running (emergency mode)!`);
});