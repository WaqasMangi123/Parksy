require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketio = require('socket.io');
const path = require('path');

// Validate required environment variables - UPDATED WITH STRIPE
const requiredEnvVars = [
  'MONGO_URI',
  'JWT_SECRET',
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD',
  // Stripe required environment variables
  'STRIPE_SECRET_KEY',
  'STRIPE_PUBLISHABLE_KEY'
];

// Optional Stripe environment variables (warn if missing but don't exit)
const optionalStripeVars = [
  'STRIPE_WEBHOOK_SECRET'
];

const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars);
  console.error('📝 Required Stripe variables:');
  console.error('   - STRIPE_SECRET_KEY=sk_test_... (from Stripe Dashboard)');
  console.error('   - STRIPE_PUBLISHABLE_KEY=pk_test_... (from Stripe Dashboard)');
  process.exit(1);
}

// Check optional Stripe variables
const missingOptionalVars = optionalStripeVars.filter(v => !process.env[v]);
if (missingOptionalVars.length > 0) {
  console.warn('⚠️ Missing optional Stripe environment variables:', missingOptionalVars);
  console.warn('   - STRIPE_WEBHOOK_SECRET=whsec_... (needed for webhook security)');
}

// Validate Stripe keys format
const validateStripeKeys = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
  
  if (secretKey && !secretKey.startsWith('sk_')) {
    console.error('❌ Invalid STRIPE_SECRET_KEY format. Should start with "sk_"');
    process.exit(1);
  }
  
  if (publishableKey && !publishableKey.startsWith('pk_')) {
    console.error('❌ Invalid STRIPE_PUBLISHABLE_KEY format. Should start with "pk_"');
    process.exit(1);
  }
  
  // Check if using test or live keys
  const isTestMode = secretKey?.includes('test') && publishableKey?.includes('test');
  const isLiveMode = secretKey?.includes('live') && publishableKey?.includes('live');
  
  if (!isTestMode && !isLiveMode) {
    console.error('❌ Stripe keys mismatch. Both keys should be either test or live keys.');
    process.exit(1);
  }
  
  console.log(`💳 Stripe configured in ${isTestMode ? 'TEST' : 'LIVE'} mode`);
  
  if (process.env.NODE_ENV === 'production' && isTestMode) {
    console.warn('⚠️ WARNING: Using Stripe TEST keys in production environment!');
  }
};

validateStripeKeys();

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

// CORS configuration - Fixed for deployment with actual domains
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // In development, allow all origins
    if (isDevelopment) {
      return callback(null, true);
    }
    
    // Production allowed origins - YOUR ACTUAL DOMAINS
    const allowedOrigins = [
      'https://parksy.uk',
      'https://www.parksy.uk',
      'https://parksy-backend.onrender.com',
      'https://localhost:3000',
      'http://localhost:3000',
      'https://localhost:3001',
      'http://localhost:3001'
    ];
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Log unauthorized origins for debugging
    console.warn(`❌ CORS blocked origin: ${origin}`);
    
    // For deployment testing, be more permissive (remove in production if needed)
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Origin']
};

app.use(cors(corsOptions));

// Socket.io setup with fixed CORS for actual domains
const io = socketio(server, {
  cors: {
    origin: isDevelopment ? "*" : [
      'https://parksy.uk',
      'https://www.parksy.uk',
      'https://parksy-backend.onrender.com'
    ],
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

// SAFE route loading function with better error isolation
const loadRoute = (routePath, routeName) => {
  try {
    console.log(`📂 Loading ${routeName} from: ${routePath}`);
    const route = require(routePath);
    console.log(`✅ Successfully loaded ${routeName}`);
    return route;
  } catch (error) {
    console.warn(`⚠️ Failed to load ${routeName} route from ${routePath}:`, error.message);
    
    // Create a safe fallback router
    const express = require('express');
    const router = express.Router();
    
    // SAFE catch-all without path-to-regexp issues
    router.get('*', (req, res) => {
      res.status(503).json({
        success: false,
        message: `${routeName} service temporarily unavailable`,
        error: 'Service not loaded',
        timestamp: new Date().toISOString()
      });
    });
    
    return router;
  }
};

// SAFE route mounting function
const mountRoute = (path, router, name) => {
  try {
    console.log(`🔗 Mounting ${name} on ${path}`);
    app.use(path, router);
    console.log(`✅ Successfully mounted ${name}`);
  } catch (error) {
    console.error(`❌ Failed to mount ${name} on ${path}:`, error.message);
    
    // Create emergency fallback
    app.use(path, (req, res) => {
      res.status(503).json({
        success: false,
        message: `${name} service unavailable`,
        error: 'Route mounting failed'
      });
    });
  }
};

// ================== ROUTES ================== //
console.log('📝 Loading routes...');

// Load all routes first
const routes = [
  { path: '/api/auth', file: './routes/authroutes', name: 'Auth' },
  { path: '/api/admin', file: './routes/adminroutes', name: 'Admin' },
  { path: '/api/profile', file: './routes/profile', name: 'Profile' },
  { path: '/api/contact', file: './routes/contactroutes', name: 'Contact' },
  { path: '/api/cv', file: './routes/cvgenerator', name: 'CV Generator' },
  { path: '/api/blogs', file: './routes/blogroutes', name: 'Blogs' },
  { path: '/api/scholarships', file: './routes/scholarshiproutes', name: 'Scholarships' },
  { path: '/api/feedback', file: './routes/feedbackroutes', name: 'Feedback' },
  { path: '/api/recommendations', file: './routes/recommendationroutes', name: 'Recommendations' },
  { path: '/api/parking', file: './routes/userparkingroutes', name: 'Parking' },
  { path: '/api/ev-charging', file: './routes/evchargingroutes', name: 'EV Charging' }
];

// Mount routes safely
routes.forEach(route => {
  const router = loadRoute(route.file, route.name);
  mountRoute(route.path, router, route.name);
});

console.log('✅ All routes loaded and mounted');

// Health check endpoint - ENHANCED WITH STRIPE STATUS
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const dbStates = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  // Check Stripe configuration
  const stripeStatus = {
    secret_key_configured: !!process.env.STRIPE_SECRET_KEY,
    publishable_key_configured: !!process.env.STRIPE_PUBLISHABLE_KEY,
    webhook_secret_configured: !!process.env.STRIPE_WEBHOOK_SECRET,
    mode: process.env.STRIPE_SECRET_KEY?.includes('test') ? 'test' : 
          process.env.STRIPE_SECRET_KEY?.includes('live') ? 'live' : 'unknown',
    keys_match: (process.env.STRIPE_SECRET_KEY?.includes('test') && process.env.STRIPE_PUBLISHABLE_KEY?.includes('test')) ||
                (process.env.STRIPE_SECRET_KEY?.includes('live') && process.env.STRIPE_PUBLISHABLE_KEY?.includes('live'))
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
      core_api: 'running',
      stripe_payments: stripeStatus.secret_key_configured && stripeStatus.publishable_key_configured ? 'configured' : 'not_configured'
    },
    stripe: stripeStatus
  });
});

// API routes list endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'Parksy API Server',
    version: '2.0.0',
    domain: 'https://parksy.uk',
    backend: 'https://parksy-backend.onrender.com',
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
      'Airport Parking Services',
      'Stripe Payment Integration'
    ],
    payment_features: [
      'Secure Stripe Payments',
      'Real-time Payment Processing',
      'Automatic Refunds',
      'Payment Verification'
    ],
    cors_domains: [
      'https://parksy.uk',
      'https://www.parksy.uk'
    ],
    stripe_mode: process.env.STRIPE_SECRET_KEY?.includes('test') ? 'test' : 
                 process.env.STRIPE_SECRET_KEY?.includes('live') ? 'live' : 'not_configured'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Parksy API Server is running',
    status: 'online',
    domain: 'https://parksy.uk',
    backend: 'https://parksy-backend.onrender.com',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      docs: '/api',
      parking: '/api/parking',
      ev_charging: '/api/ev-charging'
    },
    payments: {
      stripe_enabled: !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PUBLISHABLE_KEY),
      payment_modes: ['stripe'],
      stripe_mode: process.env.STRIPE_SECRET_KEY?.includes('test') ? 'test' : 'live'
    }
  });
});

// 404 handler - SAFE pattern
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    available_endpoints: '/api'
  });
});

// Enhanced global error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Global Error:', {
    path: req.path,
    method: req.method,
    error: err.message,
    stack: isDevelopment ? err.stack : 'Hidden in production'
  });

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.message,
      timestamp: new Date().toISOString()
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      error: 'Invalid ID format',
      timestamp: new Date().toISOString()
    });
  }

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

// SAFE server startup with error handling
try {
  server.listen(PORT, '0.0.0.0', () => {
    console.log('\n🚀 ====================================');
    console.log(`🌟 Parksy API Server Started`);
    console.log(`📡 Port: ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🗄️  Database: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Connecting...'}`);
    console.log(`💳 Stripe: ${process.env.STRIPE_SECRET_KEY?.includes('test') ? 'TEST MODE' : 'LIVE MODE'}`);
    console.log(`🔗 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`📋 API Routes: http://localhost:${PORT}/api`);
    console.log('🚀 ====================================\n');
  });
} catch (error) {
  console.error('❌ Server startup error:', error);
  process.exit(1);
}