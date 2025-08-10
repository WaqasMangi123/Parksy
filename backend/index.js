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

// Logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.simple()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

// Validate required environment variables
const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET', 'ADMIN_EMAIL', 'ADMIN_PASSWORD'];
const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  logger.error('Missing required environment variables:', missingVars);
  process.exit(1);
}

// Initialize Express
const app = express();
const server = http.createServer(app);

// CORS setup
const allowedOrigins = [
  'http://localhost:3000',
  'https://parksy.uk',
  'https://www.parksy.uk',
  'https://parksy-backend.onrender.com'
];

const io = socketio(server, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'] }
});

// Middleware
app.use(helmet({ crossOriginEmbedderPolicy: false }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for now
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH']
}));

// Rate limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests' }
}));

// Database connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  logger.info('✅ Connected to MongoDB');
}).catch(err => {
  logger.error('❌ MongoDB connection error:', err.message);
});

// Socket.io
io.of('/notifications').on('connection', (socket) => {
  logger.info(`🔌 Client connected: ${socket.id}`);
  socket.on('disconnect', () => logger.info(`🔌 Client disconnected: ${socket.id}`));
});

// 🚨 LOAD ONLY WORKING ROUTES - COMMENT OUT PROBLEMATIC ONES
logger.info('📡 Loading routes...');

// Load routes one by one and comment out the problematic one
try {
  const authRoutes = require('./routes/authroutes');
  app.use('/api/auth', authRoutes);
  logger.info('✅ Auth routes loaded');
} catch (err) {
  logger.error('❌ Auth routes failed:', err.message);
}

try {
  const adminRoutes = require('./routes/adminroutes');
  app.use('/api/admin', adminRoutes);
  logger.info('✅ Admin routes loaded');
} catch (err) {
  logger.error('❌ Admin routes failed:', err.message);
}

try {
  const profileRoutes = require('./routes/profile');
  app.use('/api/profile', profileRoutes);
  logger.info('✅ Profile routes loaded');
} catch (err) {
  logger.error('❌ Profile routes failed:', err.message);
}

try {
  const contactRoutes = require('./routes/contactroutes');
  app.use('/api/contact', contactRoutes);
  logger.info('✅ Contact routes loaded');
} catch (err) {
  logger.error('❌ Contact routes failed:', err.message);
}

try {
  const cvRoutes = require('./routes/cvgenerator');
  app.use('/api/cv', cvRoutes);
  logger.info('✅ CV routes loaded');
} catch (err) {
  logger.error('❌ CV routes failed:', err.message);
}

try {
  const blogRoutes = require('./routes/blogroutes');
  app.use('/api/blogs', blogRoutes);
  logger.info('✅ Blog routes loaded');
} catch (err) {
  logger.error('❌ Blog routes failed:', err.message);
}

try {
  const scholarshipRoutes = require('./routes/scholarshiproutes');
  app.use('/api/scholarships', scholarshipRoutes);
  logger.info('✅ Scholarship routes loaded');
} catch (err) {
  logger.error('❌ Scholarship routes failed:', err.message);
}

try {
  const feedbackRoutes = require('./routes/feedbackroutes');
  app.use('/api/feedback', feedbackRoutes);
  logger.info('✅ Feedback routes loaded');
} catch (err) {
  logger.error('❌ Feedback routes failed:', err.message);
}

try {
  const recommendationRoutes = require('./routes/recommendationroutes');
  app.use('/api/recommendations', recommendationRoutes);
  logger.info('✅ Recommendation routes loaded');
} catch (err) {
  logger.error('❌ Recommendation routes failed:', err.message);
}

try {
  const parkingRoutes = require('./routes/userparkingroutes');
  app.use('/api/parking', parkingRoutes);
  logger.info('✅ Parking routes loaded');
} catch (err) {
  logger.error('❌ Parking routes failed:', err.message);
}

// 🚨 TEMPORARILY COMMENT OUT EV CHARGING ROUTES TO IDENTIFY THE PROBLEM
/*
try {
  const evChargingRoutes = require('./routes/evChargingRoutes');
  app.use('/api/ev-charging', evChargingRoutes);
  logger.info('✅ EV Charging routes loaded');
} catch (err) {
  logger.error('❌ EV Charging routes failed:', err.message);
}
*/

// Create a temporary EV charging endpoint instead
app.get('/api/ev-charging/health', (req, res) => {
  res.json({
    status: 'DISABLED',
    service: 'EV Charging API',
    message: 'EV Charging routes temporarily disabled due to route configuration error',
    timestamp: new Date().toISOString(),
    note: 'Check evChargingRoutes.js for invalid route patterns like /:id: or /path/:'
  });
});

app.get('/api/ev-charging/search-by-location', (req, res) => {
  res.json({
    success: false,
    message: 'EV Charging service temporarily unavailable',
    error: 'Route configuration issue - check server logs',
    data: []
  });
});

app.get('/api/ev-charging/search-by-area', (req, res) => {
  res.json({
    success: false,
    message: 'EV Charging service temporarily unavailable',
    error: 'Route configuration issue - check server logs',
    data: []
  });
});

logger.info('📡 Created temporary EV charging endpoints');

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
    note: 'EV Charging routes temporarily disabled for debugging'
  });
});

// Health check
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
      evCharging: false // Temporarily disabled
    },
    routes: {
      working: [
        '/api/auth',
        '/api/admin', 
        '/api/profile',
        '/api/contact',
        '/api/cv',
        '/api/blogs',
        '/api/scholarships',
        '/api/feedback',
        '/api/recommendations',
        '/api/parking'
      ],
      disabled: [
        '/api/ev-charging (temporarily disabled due to route error)'
      ]
    }
  });
});

// API info
app.get('/api/info', (req, res) => {
  res.json({
    name: 'ParkingFinder API',
    version: '2.0.0',
    description: 'Backend API for ParkingFinder application',
    server: 'https://parksy-backend.onrender.com',
    status: 'EV Charging temporarily disabled for debugging',
    issue: 'Router configuration error in evChargingRoutes.js',
    solution: 'Check for invalid route patterns like /:id: or /path/: in the EV charging route file'
  });
});

// Error handling
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`);
  res.status(500).json({
    error: 'Internal Server Error',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: `Endpoint ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString()
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 Parksy Backend Server started successfully!`);
  logger.info(`🌐 Server URL: https://parksy-backend.onrender.com`);
  logger.info(`🔌 Running on port ${PORT}`);
  logger.info(`⚠️  Note: EV Charging routes temporarily disabled`);
  logger.info(`🔧 Fix: Check ./routes/evChargingRoutes.js for invalid route patterns`);
  logger.info(`💚 Server is ready to serve requests!`);
});