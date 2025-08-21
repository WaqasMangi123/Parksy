require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketio = require('socket.io');
const path = require('path');

// Validate required environment variables - UPDATED FOR STRIPE TEST MODE
const requiredEnvVars = [
  'MONGO_URI',
  'JWT_SECRET',
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD'
  // Stripe keys are now optional to allow development without Stripe
];

// Stripe environment variables (now optional for development)
const stripeVars = [
  'STRIPE_SECRET_KEY',
  'STRIPE_PUBLISHABLE_KEY'
];

// Optional Stripe environment variables
const optionalStripeVars = [
  'STRIPE_WEBHOOK_SECRET'
];

const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars);
  process.exit(1);
}

// Check Stripe configuration - ENHANCED FOR TEST MODE
const checkStripeConfiguration = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
  
  // Check if Stripe is configured
  const stripeConfigured = !!(secretKey && publishableKey);
  
  if (!stripeConfigured) {
    console.warn('⚠️ Stripe not configured - Payment features will be disabled');
    console.warn('📝 To enable Stripe payments, set these environment variables:');
    console.warn('   - STRIPE_SECRET_KEY=sk_test_... (for test mode)');
    console.warn('   - STRIPE_PUBLISHABLE_KEY=pk_test_... (for test mode)');
    console.warn('   - STRIPE_WEBHOOK_SECRET=whsec_... (optional, for webhooks)');
    return { configured: false, mode: 'disabled' };
  }

  // Validate Stripe key formats
  if (!secretKey.startsWith('sk_')) {
    console.error('❌ Invalid STRIPE_SECRET_KEY format. Should start with "sk_"');
    process.exit(1);
  }
  
  if (!publishableKey.startsWith('pk_')) {
    console.error('❌ Invalid STRIPE_PUBLISHABLE_KEY format. Should start with "pk_"');
    process.exit(1);
  }
  
  // Determine mode (test vs live)
  const isTestMode = secretKey.includes('test') && publishableKey.includes('test');
  const isLiveMode = secretKey.includes('live') && publishableKey.includes('live');
  
  if (!isTestMode && !isLiveMode) {
    console.error('❌ Stripe keys mismatch. Both keys should be either test or live keys.');
    process.exit(1);
  }
  
  const mode = isTestMode ? 'test' : 'live';
  
  console.log(`💳 Stripe configured in ${mode.toUpperCase()} mode`);
  
  // Enhanced test mode messaging
  if (isTestMode) {
    console.log('🧪 TEST MODE ACTIVE:');
    console.log('   ✅ Safe for development - no real charges');
    console.log('   ✅ Use test card numbers for payments');
    console.log('   ✅ Test cards: 4242 4242 4242 4242 (success)');
    console.log('   ✅ Test cards: 4000 0000 0000 0002 (declined)');
  } else {
    console.log('🔴 LIVE MODE ACTIVE:');
    console.log('   ⚠️ REAL PAYMENTS WILL BE PROCESSED');
    console.log('   ⚠️ Ensure proper testing before deployment');
  }
  
  // Production environment warning
  if (process.env.NODE_ENV === 'production' && isTestMode) {
    console.warn('⚠️ WARNING: Using Stripe TEST keys in production environment!');
    console.warn('   Consider using live keys for production deployment');
  }
  
  // Check optional webhook secret
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.warn('⚠️ STRIPE_WEBHOOK_SECRET not configured');
    console.warn('   Webhook signature verification will be skipped');
  }
  
  return { 
    configured: true, 
    mode: mode,
    isTestMode: isTestMode,
    hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET
  };
};

const stripeConfig = checkStripeConfiguration();

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

// CORS configuration - Enhanced for Stripe test mode
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
      'http://localhost:3001',
      // Additional origins for Stripe test mode development
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'https://127.0.0.1:3000',
      'https://127.0.0.1:3001'
    ];
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Log unauthorized origins for debugging
    console.warn(`❌ CORS blocked origin: ${origin}`);
    
    // For Stripe test mode development, be more permissive
    if (stripeConfig.isTestMode && isDevelopment) {
      console.log(`🧪 TEST MODE: Allowing origin for development: ${origin}`);
      return callback(null, true);
    }
    
    // For deployment testing, be more permissive (remove in production if needed)
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Origin', 'stripe-signature']
};

app.use(cors(corsOptions));

// Socket.io setup with enhanced CORS for Stripe development
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

// Rate limiting - More permissive for Stripe test mode
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: stripeConfig.isTestMode ? 300 : (isProduction ? 100 : 200), // Higher limit for test mode
  message: {
    error: 'Too many requests from this IP, please try again later',
    stripe_test_mode: stripeConfig.isTestMode,
    reset_time: new Date(Date.now() + 15 * 60 * 1000).toISOString()
  }
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

// Socket.io connection handling with Stripe test mode awareness
io.of('/notifications').on('connection', (socket) => {
  console.log(`📱 New notification client connected: ${socket.id}`);
  
  // Send Stripe mode info to connected clients
  socket.emit('stripe-mode', {
    configured: stripeConfig.configured,
    mode: stripeConfig.mode,
    isTestMode: stripeConfig.isTestMode
  });

  socket.on('joinRoom', (room) => {
    socket.join(room);
    console.log(`🏠 Client ${socket.id} joined room ${room}`);
  });

  socket.on('disconnect', (reason) => {
    console.log(`👋 Client disconnected (${socket.id}): ${reason}`);
  });
});

// SAFE route loading function with Stripe awareness
const loadRoute = (routePath, routeName) => {
  try {
    console.log(`📂 Loading ${routeName} from: ${routePath}`);
    
    // Special handling for Stripe-dependent routes
    if ((routeName === 'Parking' || routeName === 'EV Charging') && !stripeConfig.configured) {
      console.warn(`⚠️ ${routeName} route loaded with limited functionality (Stripe not configured)`);
    }
    
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
        stripe_configured: stripeConfig.configured,
        stripe_mode: stripeConfig.mode,
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
        error: 'Route mounting failed',
        stripe_configured: stripeConfig.configured
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

// Enhanced health check endpoint with comprehensive Stripe status
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const dbStates = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  // Enhanced Stripe configuration status
  const stripeStatus = {
    configured: stripeConfig.configured,
    mode: stripeConfig.mode,
    is_test_mode: stripeConfig.isTestMode,
    secret_key_configured: !!process.env.STRIPE_SECRET_KEY,
    publishable_key_configured: !!process.env.STRIPE_PUBLISHABLE_KEY,
    webhook_secret_configured: !!process.env.STRIPE_WEBHOOK_SECRET,
    keys_format_valid: process.env.STRIPE_SECRET_KEY?.startsWith('sk_') && 
                      process.env.STRIPE_PUBLISHABLE_KEY?.startsWith('pk_'),
    keys_match: stripeConfig.configured && (
      (process.env.STRIPE_SECRET_KEY?.includes('test') && process.env.STRIPE_PUBLISHABLE_KEY?.includes('test')) ||
      (process.env.STRIPE_SECRET_KEY?.includes('live') && process.env.STRIPE_PUBLISHABLE_KEY?.includes('live'))
    ),
    // Test mode specific info
    test_cards_available: stripeConfig.isTestMode,
    environment_warning: process.env.NODE_ENV === 'production' && stripeConfig.isTestMode ? 
                        'Using test keys in production' : null
  };

  // Service availability based on Stripe configuration
  const services = {
    parking: stripeConfig.configured ? 'available_with_payments' : 'available_limited',
    ev_charging: stripeConfig.configured ? 'available_with_payments' : 'available_limited',
    core_api: 'running',
    stripe_payments: stripeConfig.configured ? 
                     `${stripeConfig.mode}_mode_ready` : 'not_configured',
    webhooks: stripeConfig.hasWebhookSecret ? 'configured' : 'not_configured'
  };

  const healthData = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    database: dbStates[dbStatus] || 'unknown',
    environment: process.env.NODE_ENV || 'development',
    uptime: Math.floor(process.uptime()),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
    },
    services: services,
    stripe: stripeStatus,
    // Additional test mode information
    ...(stripeConfig.isTestMode && {
      test_mode_info: {
        message: 'Stripe TEST MODE active - no real charges will be made',
        test_cards: {
          visa_success: '4242 4242 4242 4242',
          visa_declined: '4000 0000 0000 0002',
          mastercard: '5555 5555 5555 4444',
          visa_debit: '4000 0566 5566 5556'
        },
        test_card_note: 'Use any future expiry date, any 3-digit CVC, and any postal code'
      }
    })
  };

  res.status(200).json(healthData);
});

// Enhanced API routes list endpoint with Stripe information
app.get('/api', (req, res) => {
  const apiInfo = {
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
      stripeConfig.configured ? 'Stripe Payment Integration' : 'Stripe Integration (Not Configured)'
    ],
    payment_features: stripeConfig.configured ? [
      `Stripe ${stripeConfig.mode.toUpperCase()} Mode`,
      'Real-time Payment Processing',
      'Automatic Refunds',
      'Payment Verification',
      ...(stripeConfig.isTestMode ? ['Safe Test Payments', 'Test Card Support'] : ['Live Payment Processing'])
    ] : [
      'Stripe Not Configured',
      'Payment Features Disabled'
    ],
    cors_domains: [
      'https://parksy.uk',
      'https://www.parksy.uk'
    ],
    stripe: {
      configured: stripeConfig.configured,
      mode: stripeConfig.mode,
      is_test_mode: stripeConfig.isTestMode,
      payment_endpoints: stripeConfig.configured ? [
        '/api/parking/stripe-config',
        '/api/parking/create-payment-intent',
        '/api/parking/verify-payment',
        '/api/parking/stripe-webhook'
      ] : [],
      ...(stripeConfig.isTestMode && {
        test_mode_note: 'Using TEST mode - no real charges will be made',
        test_cards_available: true
      })
    }
  };

  res.json(apiInfo);
});

// Enhanced root endpoint with Stripe test mode information
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
      stripe_enabled: stripeConfig.configured,
      stripe_mode: stripeConfig.mode,
      is_test_mode: stripeConfig.isTestMode,
      payment_modes: stripeConfig.configured ? ['stripe'] : [],
      ...(stripeConfig.configured && {
        payment_status: `Stripe ${stripeConfig.mode} mode ready`,
        ...(stripeConfig.isTestMode && {
          test_mode_warning: 'TEST MODE - No real charges will be made',
          test_cards_supported: true
        })
      }),
      ...(!stripeConfig.configured && {
        payment_status: 'Stripe not configured - payments disabled',
        setup_instructions: 'Set STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY environment variables'
      })
    }
  });
});

// Enhanced 404 handler with Stripe context
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    available_endpoints: '/api',
    stripe_configured: stripeConfig.configured,
    stripe_mode: stripeConfig.mode
  });
});

// Enhanced global error handling middleware with Stripe awareness
app.use((err, req, res, next) => {
  console.error('❌ Global Error:', {
    path: req.path,
    method: req.method,
    error: err.message,
    stack: isDevelopment ? err.stack : 'Hidden in production',
    stripe_configured: stripeConfig.configured
  });

  // Handle Stripe-specific errors
  if (err.type === 'StripeCardError') {
    return res.status(400).json({
      error: 'Card Error',
      message: err.message,
      stripe_error: true,
      test_mode: stripeConfig.isTestMode,
      timestamp: new Date().toISOString()
    });
  }

  if (err.type === 'StripeInvalidRequestError') {
    return res.status(400).json({
      error: 'Invalid Stripe Request',
      message: err.message,
      stripe_error: true,
      test_mode: stripeConfig.isTestMode,
      timestamp: new Date().toISOString()
    });
  }

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
    stripe_configured: stripeConfig.configured,
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

// Start server with enhanced Stripe information
const PORT = process.env.PORT || 5000;

try {
  server.listen(PORT, '0.0.0.0', () => {
    console.log('\n🚀 ====================================');
    console.log(`🌟 Parksy API Server Started`);
    console.log(`📡 Port: ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🗄️  Database: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Connecting...'}`);
    
    // Enhanced Stripe startup information
    if (stripeConfig.configured) {
      console.log(`💳 Stripe: ${stripeConfig.mode.toUpperCase()} MODE`);
      if (stripeConfig.isTestMode) {
        console.log(`🧪 Test Mode Active - Safe for development`);
        console.log(`📋 Test Cards: 4242 4242 4242 4242 (success)`);
      } else {
        console.log(`🔴 LIVE MODE - Real payments will be processed`);
      }
    } else {
      console.log(`💳 Stripe: NOT CONFIGURED - Payment features disabled`);
    }
    
    console.log(`🔗 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`📋 API Routes: http://localhost:${PORT}/api`);
    
    // Show Stripe-specific endpoints if configured
    if (stripeConfig.configured) {
      console.log(`💳 Stripe Config: http://localhost:${PORT}/api/parking/stripe-config`);
    }
    
    console.log('🚀 ====================================\n');
    
    // Additional test mode reminders
    if (stripeConfig.isTestMode) {
      console.log('🧪 STRIPE TEST MODE REMINDERS:');
      console.log('   ✅ No real money will be charged');
      console.log('   ✅ Use test card numbers for testing');
      console.log('   ✅ All transactions are simulated');
      console.log('   ✅ Safe for development and testing\n');
    }
  });
} catch (error) {
  console.error('❌ Server startup error:', error);
  process.exit(1);
}