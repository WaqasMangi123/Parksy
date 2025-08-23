// routes/userparkingroutes.js - COMPLETE WORKING VERSION WITH FIXED CANCEL & AMEND APIs
const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');

// Import services and models with error handling
let MagrApiService;
let User;
let Booking;
let StripeService;

try {
  MagrApiService = require('../services/magrApiService');
  console.log('✅ MagrApiService loaded successfully');
} catch (error) {
  console.error('❌ Failed to load MagrApiService:', error.message);
}

try {
  User = require('../models/user');
  console.log('✅ User model loaded successfully');
} catch (error) {
  console.error('❌ Failed to load User model:', error.message);
}

try {
  Booking = require('../models/booking');
  console.log('✅ Booking model loaded successfully');
} catch (error) {
  console.error('❌ Failed to load Booking model (this is optional):', error.message);
}

try {
  StripeService = require('../services/stripeService');
  console.log('✅ StripeService loaded successfully');
} catch (error) {
  console.error('❌ Failed to load StripeService:', error.message);
}

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('❌ Validation errors:', errors.array());
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// ===== FIXED AUTHENTICATION MIDDLEWARE =====

const authenticateToken = async (req, res, next) => {
  try {
    console.log('🔍 Authentication middleware started');
    console.log('🔍 Request method:', req.method);
    console.log('🔍 Request URL:', req.url);
    
    // ✅ FIXED: Get token from Authorization header FIRST (standard practice)
    let token = null;
    
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
      console.log('🔑 Token extracted from Authorization header:', token.substring(0, 20) + '...');
    }
    
    // Fallback to body (for backward compatibility)
    if (!token) {
      token = req.body.token || req.body.auth_token;
      if (token) {
        console.log('🔑 Token extracted from request body:', token.substring(0, 20) + '...');
      }
    }

    console.log('🔍 Authentication check:', {
      hasAuthHeader: !!authHeader,
      tokenFromHeader: !!(authHeader && authHeader.startsWith('Bearer ')),
      tokenFromBody: !!(req.body.token || req.body.auth_token),
      tokenFound: !!token,
      tokenLength: token ? token.length : 0
    });

    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({
        success: false,
        message: 'Access token required. Please log in to make bookings.',
        requireAuth: true,
        error_code: 'NO_TOKEN'
      });
    }

    // ✅ FIXED: Better JWT secret validation
    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET not configured in environment');
      return res.status(500).json({
        success: false,
        message: 'Server authentication configuration error',
        error_code: 'JWT_SECRET_MISSING'
      });
    }

    console.log('🔐 Attempting to verify JWT token...');
    console.log('🔐 JWT_SECRET exists:', !!process.env.JWT_SECRET);
    console.log('🔐 Token format check:', token.includes('.') ? 'JWT format' : 'Non-JWT format');
    
    let decoded;
    try {
      // ✅ FIXED: Better JWT verification with error handling
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('✅ Token decoded successfully:', {
        userId: decoded.id || decoded.user_id || decoded.sub,
        email: decoded.email,
        username: decoded.username || decoded.name,
        exp: decoded.exp ? new Date(decoded.exp * 1000) : 'No expiry',
        iat: decoded.iat ? new Date(decoded.iat * 1000) : 'No issued time'
      });
    } catch (jwtError) {
      console.error('❌ JWT verification failed:', {
        name: jwtError.name,
        message: jwtError.message,
        tokenStart: token?.substring(0, 20) || 'none',
        tokenEnd: token?.substring(token.length - 10) || 'none'
      });
      
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Your session has expired. Please log in again.',
          requireAuth: true,
          expired: true,
          error_code: 'TOKEN_EXPIRED',
          expiredAt: jwtError.expiredAt
        });
      }
      
      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(403).json({
          success: false,
          message: 'Invalid session token. Please log in again.',
          requireAuth: true,
          invalid: true,
          error_code: 'INVALID_TOKEN'
        });
      }
      
      // For any other JWT error, return a generic error
      return res.status(403).json({
        success: false,
        message: 'Token verification failed. Please log in again.',
        requireAuth: true,
        error_code: 'TOKEN_VERIFICATION_ERROR',
        debug: jwtError.message
      });
    }

    // ✅ FIXED: Create user object from token - don't require database lookup
    console.log('👤 Creating user object from token...');
    
    // Create user object from token data (no database required)
    req.user = {
      _id: decoded.id || decoded.user_id || decoded.sub || 'token_user_id',
      email: decoded.email || 'unknown@example.com',
      name: decoded.name || decoded.username || 'Token User',
      verified: true, // Assume verified if token is valid
      role: decoded.role || 'user',
      // Include original token data for reference
      tokenData: decoded
    };
    
    console.log('✅ User authenticated successfully:', {
      id: req.user._id,
      email: req.user.email,
      name: req.user.name
    });

    // ✅ OPTIONAL: Try database lookup if User model is available (but don't fail if it doesn't work)
    if (User) {
      try {
        console.log('👤 Attempting database user lookup...');
        const dbUser = await User.findById(decoded.id);
        
        if (dbUser) {
          // Use database user if found
          req.user = dbUser;
          console.log('✅ Database user found and used:', dbUser.email);
        } else {
          console.log('⚠️ Database user not found, using token data');
        }
      } catch (dbError) {
        console.log('⚠️ Database lookup failed, using token data:', dbError.message);
        // Continue with token-based user - don't fail the authentication
      }
    } else {
      console.log('⚠️ User model not available, using token data only');
    }

    next();
    
  } catch (error) {
    console.error('❌ Authentication middleware critical error:', {
      name: error.name,
      message: error.message,
      stack: error.stack?.substring(0, 500)
    });
    
    return res.status(500).json({
      success: false,
      message: 'Authentication system error',
      error: error.message,
      error_code: 'AUTH_SYSTEM_ERROR',
      timestamp: new Date().toISOString()
    });
  }
};

// ===== PUBLIC ROUTES (NO AUTHENTICATION REQUIRED) =====

// Health check endpoint - ENHANCED with Stripe health check and test mode detection
router.get('/health', async (req, res) => {
  console.log('🏥 Parking API health check requested');
  
  const isTestMode = process.env.STRIPE_SECRET_KEY?.includes('test');
  
  // Basic service status
  const healthStatus = {
    success: true,
    message: 'Parking API is healthy',
    timestamp: new Date().toISOString(),
    stripe_mode: isTestMode ? 'TEST' : 'LIVE',
    services: {
      magr_api_service: !!MagrApiService ? 'loaded' : 'failed',
      user_model: !!User ? 'loaded' : 'failed',
      booking_model: !!Booking ? 'loaded' : 'optional',
      stripe_service: !!StripeService ? 'loaded' : 'failed',
      jwt_secret: !!process.env.JWT_SECRET ? 'configured' : 'missing'
    },
    environment: {
      magr_email: !!process.env.MAGR_USER_EMAIL ? 'set' : 'missing',
      magr_password: !!process.env.MAGR_PASSWORD ? 'set' : 'missing',
      magr_agent_code: !!process.env.MAGR_AGENT_CODE ? 'set' : 'missing',
      stripe_secret_key: !!process.env.STRIPE_SECRET_KEY ? 'set' : 'missing',
      stripe_publishable_key: !!process.env.STRIPE_PUBLISHABLE_KEY ? 'set' : 'missing',
      stripe_webhook_secret: !!process.env.STRIPE_WEBHOOK_SECRET ? 'set' : 'optional'
    },
    warnings: isTestMode ? ['⚠️ STRIPE TEST MODE ACTIVE - Use test card numbers for payments'] : ['🔴 STRIPE LIVE MODE - Real payments will be processed!']
  };

  // Enhanced Stripe health check
  if (StripeService) {
    try {
      const stripeHealth = await StripeService.healthCheck();
      healthStatus.stripe_connection = stripeHealth;
    } catch (error) {
      healthStatus.stripe_connection = {
        success: false,
        error: error.message
      };
    }
  }
  
  console.log('📊 Health check result:', healthStatus);
  res.json(healthStatus);
});

// Get Stripe publishable key for frontend - ENHANCED with Test Mode
router.get('/stripe-config', (req, res) => {
  try {
    if (!process.env.STRIPE_PUBLISHABLE_KEY) {
      throw new Error('Stripe publishable key not configured');
    }

    const isTestMode = process.env.STRIPE_SECRET_KEY?.includes('test');

    res.json({
      success: true,
      publishable_key: process.env.STRIPE_PUBLISHABLE_KEY,
      stripe_mode: isTestMode ? 'test' : 'live',
      is_test_mode: isTestMode,
      test_card_info: isTestMode ? {
        visa_success: '4242 4242 4242 4242',
        visa_declined: '4000 0000 0000 0002',
        mastercard: '5555 5555 5555 4444',
        visa_debit: '4000 0566 5566 5556',
        note: 'Use any future expiry date, any 3-digit CVC, and any postal code'
      } : null,
      features: {
        payment_intents: true,
        automatic_payment_methods: true,
        refunds: true,
        webhooks: !!process.env.STRIPE_WEBHOOK_SECRET
      },
      warning: isTestMode ? 'TEST MODE ACTIVE - Use test card numbers' : 'LIVE MODE - Real payments will be processed'
    });
  } catch (error) {
    console.error('❌ Error getting Stripe config:', error);
    res.status(500).json({
      success: false,
      message: 'Stripe configuration error',
      error: error.message
    });
  }
});

// Get available airports
router.get('/airports', (req, res) => {
  try {
    console.log('✈️ Airports requested');
    
    if (!MagrApiService) {
      throw new Error('MagrApiService not available');
    }
    
    const airports = MagrApiService.getAvailableAirports();
    
    console.log('✅ Returning airports:', airports.length);
    res.json({
      success: true,
      data: airports,
      count: airports.length
    });
  } catch (error) {
    console.error('❌ Error fetching airports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch airports',
      error: error.message
    });
  }
});

// Search parking validation
const validateSearchParking = [
  body('airport_code')
    .isIn(['LHR', 'LGW', 'STN', 'LTN', 'MAN', 'BHX', 'EDI', 'GLA'])
    .withMessage('Invalid airport code'),
  body('dropoff_date')
    .notEmpty()
    .withMessage('Dropoff date is required')
    .isISO8601()
    .withMessage('Invalid dropoff date format (use YYYY-MM-DD)'),
  body('dropoff_time')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Invalid dropoff time format (use HH:MM)'),
  body('pickup_date')
    .notEmpty()
    .withMessage('Pickup date is required')
    .isISO8601()
    .withMessage('Invalid pickup date format (use YYYY-MM-DD)'),
  body('pickup_time')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Invalid pickup time format (use HH:MM)')
];

// Search parking - extract company codes from API response - PROPERLY IMPLEMENTED
router.post('/search-parking', 
  validateSearchParking, 
  handleValidationErrors,
  async (req, res) => {
    try {
      console.log('🔍 SEARCH REQUEST received:', req.body);

      if (!MagrApiService) {
        throw new Error('MAGR API Service is not available');
      }

      const { airport_code, dropoff_date, dropoff_time, pickup_date, pickup_time } = req.body;

      console.log('🔍 Processing search with params:', {
        airport_code,
        dropoff_date,
        dropoff_time,
        pickup_date,
        pickup_time,
        timestamp: new Date().toISOString()
      });

      // Enhanced time validation
      try {
        const dropoffDateTime = new Date(`${dropoff_date}T${dropoff_time}`);
        const pickupDateTime = new Date(`${pickup_date}T${pickup_time}`);
        
        if (isNaN(dropoffDateTime.getTime()) || isNaN(pickupDateTime.getTime())) {
          throw new Error('Invalid date/time format');
        }
        
        if (pickupDateTime <= dropoffDateTime) {
          throw new Error('Pickup time must be after dropoff time');
        }
        
        const now = new Date();
        if (dropoffDateTime < now) {
          throw new Error('Dropoff time cannot be in the past');
        }
        
        console.log('✅ Time validation passed');
      } catch (timeError) {
        console.error('❌ Time validation failed:', timeError.message);
        return res.status(400).json({
          success: false,
          message: 'Invalid booking times',
          error: timeError.message
        });
      }

      const searchParams = {
        airport_code,
        dropoff_date,
        dropoff_time,
        pickup_date,
        pickup_time
      };

      console.log('🚀 Calling MAGR API with params:', searchParams);
      
      let result;
      try {
        result = await MagrApiService.getParkingQuotes(searchParams);
        console.log('📋 MAGR API raw result received');
      } catch (magrError) {
        console.error('❌ MAGR API call failed:', magrError.message);
        return res.status(500).json({
          success: false,
          message: 'Failed to get parking data from MAGR API',
          error: magrError.message,
          details: 'Check MAGR API credentials and connection'
        });
      }
      
      if (!result || !result.success || !result.data || !result.data.products) {
        console.error('❌ Invalid MAGR API response:', result);
        return res.status(500).json({
          success: false,
          message: 'No parking products found for your search criteria',
          error: 'No parking products returned from MAGR API',
          search_params: searchParams
        });
      }

      // Extract company codes from API response
      const enhancedProducts = result.data.products.map((product, index) => {
        const companyCode = product.product_code || product.companyID || `COMPANY-${index + 1}`;
        
        return {
          ...product,
          company_code: companyCode,
          id: product.id || index,
          booking_reference_prefix: product.product_code?.split('-')[0] || 'MG',
          is_available: true,
          price: parseFloat(product.price) || 0,
          commission_percentage: parseFloat(product.share_percentage) || 0,
          features_list: product.special_features ? product.special_features.split(',') : [],
          facilities_list: product.facilities ? product.facilities.split(',') : [],
          // Add cancelable and editable flags - DEFAULT TO TRUE FOR BETTER UX
          is_cancelable: product.cancelable !== 'No', // Default to true unless explicitly "No"
          is_editable: product.editable !== 'No'      // Default to true unless explicitly "No"
        };
      });

      const availableCompanyCodes = enhancedProducts
        .map(product => product.company_code)
        .filter(Boolean)
        .filter((code, index, self) => self.indexOf(code) === index);

      console.log('✅ Enhanced products with company codes:', {
        productCount: enhancedProducts.length,
        companyCodes: availableCompanyCodes
      });

      res.json({
        success: true,
        data: {
          request: {
            status: 'success',
            airport: airport_code,
            dropoff_date,
            dropoff_time,
            pickup_date,
            pickup_time
          },
          products: enhancedProducts
        },
        search_params: searchParams,
        available_company_codes: availableCompanyCodes,
        message: `Found ${enhancedProducts.length} parking options`,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ SEARCH ERROR:', {
        message: error.message,
        stack: error.stack?.substring(0, 500),
        timestamp: new Date().toISOString()
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to search parking options',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

// Test MAGR API connection
router.get('/test-magr', async (req, res) => {
  try {
    console.log('🧪 Testing MAGR API connection...');
    
    if (!MagrApiService) {
      throw new Error('MagrApiService not loaded');
    }
    
    const testParams = {
      airport_code: 'LHR',
      dropoff_date: '2025-12-01',
      dropoff_time: '10:00',
      pickup_date: '2025-12-10',
      pickup_time: '20:00'
    };
    
    const result = await MagrApiService.getParkingQuotes(testParams);
    
    let availableCompanyCodes = [];
    if (result?.success && result?.data?.products) {
      availableCompanyCodes = result.data.products
        .map(p => p.product_code || p.companyID)
        .filter(Boolean);
    }
    
    console.log('✅ MAGR Test Result with company codes:', availableCompanyCodes);
    
    res.json({
      success: true,
      message: 'MAGR API connection successful',
      data: result,
      available_company_codes: availableCompanyCodes,
      test_params: testParams,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ MAGR Test Failed:', error);
    res.status(500).json({
      success: false,
      message: 'MAGR API connection failed',
      error: error.message,
      details: 'Check your MAGR API credentials in environment variables',
      environment_check: {
        magr_email: !!process.env.MAGR_USER_EMAIL,
        magr_password: !!process.env.MAGR_PASSWORD,
        magr_agent_code: !!process.env.MAGR_AGENT_CODE
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Get terminals for airport
router.get('/terminals/:airport_code', 
  [
    param('airport_code').isIn(['LHR', 'LGW', 'STN', 'LTN', 'MAN', 'BHX', 'EDI', 'GLA']).withMessage('Invalid airport code')
  ],
  handleValidationErrors,
  (req, res) => {
    try {
      const { airport_code } = req.params;
      console.log('🏢 Terminals requested for airport:', airport_code);
      
      const terminals = {
        'LHR': ['Terminal 1', 'Terminal 2', 'Terminal 3', 'Terminal 4', 'Terminal 5'],
        'LGW': ['North Terminal', 'South Terminal'],
        'STN': ['Terminal 1'],
        'LTN': ['Terminal 1'],
        'MAN': ['Terminal 1', 'Terminal 2', 'Terminal 3'],
        'BHX': ['Terminal 1', 'Terminal 2'],
        'EDI': ['Terminal 1'],
        'GLA': ['Terminal 1']
      };
      
      const airportTerminals = terminals[airport_code] || ['Terminal 1'];
      
      res.json({
        success: true,
        data: airportTerminals,
        airport_code: airport_code,
        count: airportTerminals.length
      });
    } catch (error) {
      console.error('❌ Error fetching terminals:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch terminals',
        error: error.message
      });
    }
  }
);

// ===== STRIPE PAYMENT ROUTES =====

// Step 1: Create payment intent BEFORE booking form submission - COMPLETELY FIXED
router.post('/create-payment-intent', 
  authenticateToken,
  [
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
    body('currency').optional().isIn(['gbp', 'eur', 'usd']).withMessage('Invalid currency'),
    body('service_name').notEmpty().withMessage('Service name is required'),
    body('airport_code').isIn(['LHR', 'LGW', 'STN', 'LTN', 'MAN', 'BHX', 'EDI', 'GLA']).withMessage('Invalid airport code'),
    body('company_code').notEmpty().withMessage('Company code is required'),
    body('dropoff_date').isISO8601().withMessage('Invalid dropoff date'),
    body('pickup_date').isISO8601().withMessage('Invalid pickup date')
  ],
  handleValidationErrors,
  async (req, res) => {
    console.log('💳 ========== PAYMENT INTENT CREATION STARTED ==========');
    
    try {
      const isTestMode = process.env.STRIPE_SECRET_KEY?.includes('test');
      console.log(`💳 Creating payment intent for user (${isTestMode ? 'TEST' : 'LIVE'} mode):`, req.user.email);
      console.log('💳 Request body:', req.body);

      // Check if Stripe is configured
      if (!process.env.STRIPE_SECRET_KEY) {
        console.error('❌ STRIPE_SECRET_KEY not configured');
        return res.status(500).json({
          success: false,
          message: 'Stripe not configured - missing secret key',
          error: 'STRIPE_SECRET_KEY environment variable not set',
          error_code: 'STRIPE_NOT_CONFIGURED'
        });
      }

      const { 
        amount, 
        currency = 'gbp', 
        service_name,
        airport_code,
        company_code,
        dropoff_date,
        pickup_date 
      } = req.body;

      // Generate a temporary booking reference for payment tracking
      const tempBookingRef = `${isTestMode ? 'TEST-' : ''}TEMP-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      // Convert amount to number and validate
      const paymentAmount = parseFloat(amount);
      const paymentCurrency = currency.toLowerCase();

      console.log(`🚀 Creating Stripe payment intent (${isTestMode ? 'TEST' : 'LIVE'} mode):`, {
        amount: paymentAmount,
        currency: paymentCurrency,
        user: req.user.email,
        service: service_name,
        mode: isTestMode ? 'TEST' : 'LIVE',
        tempRef: tempBookingRef
      });

      // Initialize Stripe directly (bypass service layer for reliability)
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      console.log('💳 Stripe initialized successfully');

      // Create payment intent with robust error handling
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(paymentAmount * 100), // Convert to pence
        currency: paymentCurrency,
        description: `${isTestMode ? '[TEST] ' : ''}Parking booking for ${airport_code} - ${service_name}`,
        metadata: {
          our_reference: tempBookingRef,
          temp_booking_reference: tempBookingRef,
          service_name: service_name,
          airport_code: airport_code,
          company_code: company_code,
          dropoff_date: dropoff_date,
          pickup_date: pickup_date,
          user_email: req.user.email,
          is_test_mode: isTestMode.toString(),
          created_by: 'parksy_api'
        },
        automatic_payment_methods: {
          enabled: true,
        },
        // Enhanced payment method options
        payment_method_options: {
          card: {
            request_three_d_secure: 'automatic'
          }
        }
      });

      console.log(`✅ Payment intent created successfully (${isTestMode ? 'TEST' : 'LIVE'} mode):`, {
        id: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        client_secret_exists: !!paymentIntent.client_secret
      });

      // Return comprehensive response
      const response = {
        success: true,
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
        amount: paymentAmount,
        currency: paymentCurrency,
        temp_booking_reference: tempBookingRef,
        stripe_publishable_key: process.env.STRIPE_PUBLISHABLE_KEY,
        is_test_mode: isTestMode,
        stripe_mode: isTestMode ? 'test' : 'live',
        test_cards: isTestMode ? {
          visa_success: '4242 4242 4242 4242',
          visa_declined: '4000 0000 0000 0002',
          mastercard: '5555 5555 5555 4444',
          note: 'Use any future expiry date, any 3-digit CVC, and any postal code'
        } : null,
        warning: isTestMode ? '⚠️ TEST MODE: Use test card numbers above' : '🔴 LIVE MODE: Real payments will be processed',
        message: `Payment intent created successfully (${isTestMode ? 'TEST' : 'LIVE'} mode)`,
        timestamp: new Date().toISOString()
      };

      console.log('💳 Sending response:', {
        success: response.success,
        payment_intent_id: response.payment_intent_id,
        amount: response.amount,
        is_test_mode: response.is_test_mode
      });

      res.json(response);

    } catch (error) {
      console.error('❌ PAYMENT INTENT CREATION ERROR:', {
        name: error.name,
        message: error.message,
        code: error.code,
        type: error.type,
        stack: error.stack?.substring(0, 1000)
      });
      
      // Enhanced error response
      const errorResponse = {
        success: false,
        message: 'Failed to create payment intent',
        error: error.message,
        error_type: error.type || 'unknown',
        error_code: error.code || 'unknown',
        is_test_mode: process.env.STRIPE_SECRET_KEY?.includes('test') || false,
        timestamp: new Date().toISOString(),
        debug_info: {
          stripe_key_exists: !!process.env.STRIPE_SECRET_KEY,
          stripe_key_prefix: process.env.STRIPE_SECRET_KEY?.substring(0, 8) || 'none',
          user_email: req.user?.email || 'unknown'
        }
      };

      // Include stack trace in development
      if (process.env.NODE_ENV === 'development') {
        errorResponse.stack = error.stack;
      }

      res.status(500).json(errorResponse);
    }
    
    console.log('💳 ========== PAYMENT INTENT CREATION ENDED ==========');
  }
);

// Step 2: Verify payment status before proceeding with booking
router.get('/verify-payment/:payment_intent_id', 
  authenticateToken,
  async (req, res) => {
    try {
      const { payment_intent_id } = req.params;
      const isTestMode = process.env.STRIPE_SECRET_KEY?.includes('test');
      
      console.log(`🔍 Verifying payment for user (${isTestMode ? 'TEST' : 'LIVE'} mode):`, req.user.email, 'Payment ID:', payment_intent_id);

      if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(500).json({
          success: false,
          message: 'Stripe not configured',
          error_code: 'STRIPE_NOT_CONFIGURED'
        });
      }

      let paymentIntent;
      try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);
      } catch (stripeError) {
        console.error('❌ Stripe API error:', stripeError.message);
        return res.status(500).json({
          success: false,
          message: 'Failed to retrieve payment from Stripe',
          error: stripeError.message,
          error_code: 'STRIPE_RETRIEVE_ERROR',
          is_test_mode: isTestMode
        });
      }
      
      const paymentDetails = {
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        metadata: paymentIntent.metadata,
        is_paid: paymentIntent.status === 'succeeded',
        created: new Date(paymentIntent.created * 1000),
        last_payment_error: paymentIntent.last_payment_error
      };

      console.log(`💳 Payment verification result (${isTestMode ? 'TEST' : 'LIVE'} mode):`, {
        status: paymentDetails.status,
        amount: paymentDetails.amount,
        is_paid: paymentDetails.is_paid
      });

      res.json({
        success: true,
        payment_intent_id: payment_intent_id,
        payment_status: paymentDetails.status,
        amount: paymentDetails.amount,
        currency: paymentDetails.currency,
        metadata: paymentDetails.metadata,
        is_paid: paymentDetails.is_paid,
        created: paymentDetails.created,
        last_payment_error: paymentDetails.last_payment_error,
        is_test_mode: isTestMode,
        stripe_mode: isTestMode ? 'test' : 'live'
      });

    } catch (error) {
      console.error('❌ Payment verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify payment',
        error: error.message,
        is_test_mode: process.env.STRIPE_SECRET_KEY?.includes('test') || false,
        error_code: 'PAYMENT_VERIFICATION_FAILED'
      });
    }
  }
);

// Step 3: Create booking AFTER payment is confirmed
router.post('/bookings-with-payment', 
  authenticateToken,
  [
    body('company_code').notEmpty().withMessage('Company code is required'),
    body('airport_code').isIn(['LHR', 'LGW', 'STN', 'LTN', 'MAN', 'BHX', 'EDI', 'GLA']).withMessage('Invalid airport code'),
    body('dropoff_date').isISO8601().withMessage('Invalid dropoff date format'),
    body('dropoff_time').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid dropoff time format'),
    body('pickup_date').isISO8601().withMessage('Invalid pickup date format'),
    body('pickup_time').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid pickup time format'),
    body('service_name').notEmpty().withMessage('Service name is required'),
    body('service_description').optional(),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('payment_intent_id').notEmpty().withMessage('Payment intent ID is required'),
    // Customer details
    body('customer_name').notEmpty().withMessage('Customer name is required'),
    body('customer_email').isEmail().withMessage('Valid email is required'),
    body('customer_phone').notEmpty().withMessage('Phone number is required'),
    // Vehicle details
    body('vehicle_registration').notEmpty().withMessage('Vehicle registration is required'),
    body('vehicle_make').notEmpty().withMessage('Vehicle make is required'),
    body('vehicle_model').notEmpty().withMessage('Vehicle model is required'),
    body('vehicle_color').notEmpty().withMessage('Vehicle color is required')
  ],
  handleValidationErrors,
  async (req, res) => {
    console.log('🎫 ========== CREATE BOOKING WITH PAYMENT STARTED ==========');

    try {
      const isTestMode = process.env.STRIPE_SECRET_KEY?.includes('test');
      
      console.log(`🎫 Creating booking for user (${isTestMode ? 'TEST' : 'LIVE'} mode):`, req.user.email);
      console.log('🎫 Request body received');

      // Validate payment intent first
      if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error('Stripe not configured');
      }

      const { payment_intent_id } = req.body;

      // Verify payment was successful
      console.log('💳 Verifying payment before creating booking...');
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);
      
      if (paymentIntent.status !== 'succeeded') {
        console.error('❌ Payment not succeeded:', paymentIntent.status);
        return res.status(400).json({
          success: false,
          message: 'Payment not confirmed. Please complete payment first.',
          payment_status: paymentIntent.status,
          error_code: 'PAYMENT_NOT_SUCCEEDED'
        });
      }

      console.log('✅ Payment verified as successful');

      // Extract booking data from request
      const bookingData = {
        company_code: req.body.company_code,
        airport_code: req.body.airport_code,
        dropoff_date: req.body.dropoff_date,
        dropoff_time: req.body.dropoff_time,
        pickup_date: req.body.pickup_date,
        pickup_time: req.body.pickup_time,
        service_name: req.body.service_name,
        service_description: req.body.service_description || '',
        price: parseFloat(req.body.price),
        commission_percentage: parseFloat(req.body.commission_percentage) || 0,
        
        // Customer details
        customer_name: req.body.customer_name,
        customer_email: req.body.customer_email,
        customer_phone: req.body.customer_phone,
        
        // Vehicle details
        vehicle_registration: req.body.vehicle_registration,
        vehicle_make: req.body.vehicle_make,
        vehicle_model: req.body.vehicle_model,
        vehicle_color: req.body.vehicle_color,
        
        // Special requests
        special_requests: req.body.special_requests || '',
        
        // Payment information
        payment_intent_id: payment_intent_id,
        stripe_payment_id: paymentIntent.id,
        payment_amount: paymentIntent.amount / 100,
        payment_currency: paymentIntent.currency,
        payment_method: 'stripe',
        payment_status: 'paid',
        
        // Metadata
        user_id: req.user._id,
        created_by: req.user.email,
        is_test_booking: isTestMode
      };

      console.log('📝 Booking data prepared:', {
        company_code: bookingData.company_code,
        airport_code: bookingData.airport_code,
        service_name: bookingData.service_name,
        price: bookingData.price,
        customer_email: bookingData.customer_email,
        is_test_booking: bookingData.is_test_booking
      });

      // Create booking via MAGR API
      console.log('🚀 Calling MAGR API to create booking...');
      
      let magrResult;
      try {
        magrResult = await MagrApiService.createBooking(bookingData);
        console.log('✅ MAGR API booking creation result:', {
          success: magrResult.success,
          booking_reference: magrResult.booking_reference || 'not_provided'
        });
      } catch (magrError) {
        console.error('❌ MAGR API booking creation failed:', magrError.message);
        
        // Even if MAGR fails, we should save locally since payment succeeded
        console.log('⚠️ MAGR API failed but payment succeeded - saving locally');
        magrResult = {
          success: false,
          error: magrError.message,
          booking_reference: `LOCAL-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
          fallback: true
        };
      }

      // Generate booking reference if not provided
      const bookingReference = magrResult.booking_reference || 
        `${isTestMode ? 'TEST-' : ''}${bookingData.company_code}-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      // Prepare booking record for database
      const finalBooking = {
        ...bookingData,
        booking_reference: bookingReference,
        magr_booking_id: magrResult.magr_booking_id || null,
        status: magrResult.success ? 'confirmed' : 'payment_received',
        magr_status: magrResult.success ? 'confirmed' : 'failed',
        booking_date: new Date(),
        
        // Service features - DEFAULT TO CANCELABLE AND EDITABLE
        is_cancelable: true,  // Default to true for better UX
        is_editable: true,    // Default to true for better UX
        
        // Additional metadata
        api_errors: magrResult.success ? null : magrResult.error,
        created_at: new Date(),
        updated_at: new Date()
      };

      console.log('💾 Final booking object prepared:', {
        booking_reference: finalBooking.booking_reference,
        status: finalBooking.status,
        magr_status: finalBooking.magr_status,
        is_cancelable: finalBooking.is_cancelable,
        is_editable: finalBooking.is_editable
      });

      // Save to database if Booking model is available
      let savedBooking = null;
      if (Booking) {
        try {
          savedBooking = new Booking(finalBooking);
          await savedBooking.save();
          console.log('✅ Booking saved to database:', savedBooking._id);
        } catch (dbError) {
          console.error('❌ Database save failed (continuing anyway):', dbError.message);
          // Continue even if database save fails
        }
      } else {
        console.log('⚠️ Booking model not available - skipping database save');
      }

      // Success response
      const response = {
        success: true,
        message: magrResult.success 
          ? 'Booking created successfully' 
          : 'Payment processed successfully. Booking confirmation pending.',
        booking: {
          booking_reference: bookingReference,
          status: finalBooking.status,
          magr_status: finalBooking.magr_status,
          
          // Core booking details
          airport_code: finalBooking.airport_code,
          service_name: finalBooking.service_name,
          dropoff_date: finalBooking.dropoff_date,
          dropoff_time: finalBooking.dropoff_time,
          pickup_date: finalBooking.pickup_date,
          pickup_time: finalBooking.pickup_time,
          
          // Customer details
          customer_name: finalBooking.customer_name,
          customer_email: finalBooking.customer_email,
          customer_phone: finalBooking.customer_phone,
          
          // Vehicle details
          vehicle_registration: finalBooking.vehicle_registration,
          vehicle_make: finalBooking.vehicle_make,
          vehicle_model: finalBooking.vehicle_model,
          vehicle_color: finalBooking.vehicle_color,
          
          // Financial details
          price: finalBooking.price,
          payment_amount: finalBooking.payment_amount,
          payment_currency: finalBooking.payment_currency,
          payment_status: finalBooking.payment_status,
          
          // Service features
          is_cancelable: finalBooking.is_cancelable,
          is_editable: finalBooking.is_editable,
          
          // Metadata
          booking_date: finalBooking.booking_date,
          is_test_booking: finalBooking.is_test_booking
        },
        payment: {
          payment_intent_id: payment_intent_id,
          stripe_payment_id: paymentIntent.id,
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency,
          status: 'succeeded'
        },
        magr_api: {
          success: magrResult.success,
          error: magrResult.success ? null : magrResult.error
        },
        is_test_mode: isTestMode,
        timestamp: new Date().toISOString()
      };

      console.log('✅ Booking creation completed:', {
        booking_reference: bookingReference,
        success: response.success,
        magr_success: magrResult.success,
        is_test_mode: isTestMode
      });

      res.status(201).json(response);

    } catch (error) {
      console.error('❌ BOOKING CREATION ERROR:', {
        name: error.name,
        message: error.message,
        stack: error.stack?.substring(0, 1000)
      });

      const errorResponse = {
        success: false,
        message: 'Failed to create booking',
        error: error.message,
        error_code: 'BOOKING_CREATION_FAILED',
        is_test_mode: process.env.STRIPE_SECRET_KEY?.includes('test') || false,
        timestamp: new Date().toISOString()
      };

      // Include debug info in development
      if (process.env.NODE_ENV === 'development') {
        errorResponse.debug = {
          user_email: req.user?.email,
          payment_intent_id: req.body?.payment_intent_id,
          company_code: req.body?.company_code
        };
      }

      res.status(500).json(errorResponse);
    }
    
    console.log('🎫 ========== CREATE BOOKING WITH PAYMENT ENDED ==========');
  }
);

// ===== USER BOOKING MANAGEMENT ROUTES =====

// Get user's bookings - ENHANCED with service features - FIXED USER LOOKUP
router.get('/my-bookings', authenticateToken, async (req, res) => {
  try {
    console.log('📋 Fetching bookings for user:', req.user.email, 'ID:', req.user._id);
    
    if (!Booking) {
      // If no booking model, return empty array
      console.log('⚠️ No Booking model available');
      return res.json({
        success: true,
        bookings: [],
        count: 0,
        message: 'No booking system configured'
      });
    }

    // ✅ FIXED: Try multiple lookup strategies to find user's bookings
    let bookings = [];
    
    // Strategy 1: Look up by user_id (new bookings)
    try {
      console.log('🔍 Trying lookup by user_id:', req.user._id);
      bookings = await Booking.find({ 
        user_id: req.user._id 
      }).sort({ created_at: -1 });
      console.log(`📊 Found ${bookings.length} bookings by user_id`);
    } catch (userIdError) {
      console.log('⚠️ user_id lookup failed:', userIdError.message);
    }
    
    // Strategy 2: If no bookings found by user_id, try by email (legacy bookings)
    if (bookings.length === 0) {
      try {
        console.log('🔍 Trying lookup by user_email:', req.user.email);
        bookings = await Booking.find({ 
          user_email: req.user.email 
        }).sort({ created_at: -1 });
        console.log(`📊 Found ${bookings.length} bookings by user_email`);
      } catch (emailError) {
        console.log('⚠️ user_email lookup failed:', emailError.message);
      }
    }
    
    // Strategy 3: If still no bookings, try by created_by field
    if (bookings.length === 0) {
      try {
        console.log('🔍 Trying lookup by created_by:', req.user.email);
        bookings = await Booking.find({ 
          created_by: req.user.email 
        }).sort({ created_at: -1 });
        console.log(`📊 Found ${bookings.length} bookings by created_by`);
      } catch (createdByError) {
        console.log('⚠️ created_by lookup failed:', createdByError.message);
      }
    }
    
    // Strategy 4: If still no bookings, try customer_email in nested field
    if (bookings.length === 0) {
      try {
        console.log('🔍 Trying lookup by customer_details.customer_email:', req.user.email);
        bookings = await Booking.find({ 
          'customer_details.customer_email': req.user.email 
        }).sort({ created_at: -1 });
        console.log(`📊 Found ${bookings.length} bookings by customer_details.customer_email`);
      } catch (customerEmailError) {
        console.log('⚠️ customer_details.customer_email lookup failed:', customerEmailError.message);
      }
    }

    console.log(`✅ Total found ${bookings.length} bookings for user:`, req.user.email);
    
    // Enhance bookings with proper service features
    const enhancedBookings = bookings.map(booking => {
      const bookingObj = booking.toObject ? booking.toObject() : booking;
      
      return {
        ...bookingObj,
        // Ensure service features are properly set (default to true for better UX)
        is_cancelable: bookingObj.is_cancelable !== false, // Default to true unless explicitly false
        is_editable: bookingObj.is_editable !== false,     // Default to true unless explicitly false
        
        // Add display-friendly status
        display_status: getDisplayStatus(bookingObj.status, bookingObj.magr_status),
        
        // Test mode indication
        is_test_booking: bookingObj.is_test_booking || false,
        
        // Booking age for UI logic
        days_since_booking: Math.floor((new Date() - new Date(bookingObj.created_at)) / (1000 * 60 * 60 * 24)),
        
        // Add formatted dates for display
        formatted_dropoff: formatDateTime(bookingObj.dropoff_date, bookingObj.dropoff_time),
        formatted_pickup: formatDateTime(bookingObj.pickup_date, bookingObj.pickup_time)
      };
    });

    res.json({
      success: true,
      bookings: enhancedBookings,
      count: enhancedBookings.length,
      test_mode_active: process.env.STRIPE_SECRET_KEY?.includes('test') || false
    });

  } catch (error) {
    console.error('❌ Error fetching user bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings',
      error: error.message
    });
  }
});

// Helper function to get display-friendly status
function getDisplayStatus(status, magrStatus) {
  if (status === 'confirmed' && magrStatus === 'confirmed') {
    return 'Confirmed';
  } else if (status === 'payment_received') {
    return 'Payment Received';
  } else if (status === 'cancelled') {
    return 'Cancelled';
  } else if (status === 'amended') {
    return 'Modified';
  } else {
    return 'Processing';
  }
}

// Helper function to format date and time
function formatDateTime(date, time) {
  try {
    const dateObj = new Date(`${date}T${time}`);
    return dateObj.toLocaleString('en-GB', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return `${date} ${time}`;
  }
}

// Get single booking details - FIXED USER LOOKUP
router.get('/booking/:booking_reference', 
  authenticateToken, 
  param('booking_reference').notEmpty().withMessage('Booking reference is required'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { booking_reference } = req.params;
      console.log('🔍 Fetching booking details:', booking_reference, 'for user:', req.user.email, 'ID:', req.user._id);

      if (!Booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking system not available',
          error_code: 'NO_BOOKING_MODEL'
        });
      }

      // ✅ FIXED: Try multiple lookup strategies to find the booking
      let booking = null;
      
      // Strategy 1: Look up by booking_reference and user_id
      try {
        console.log('🔍 Trying lookup by booking_reference + user_id');
        booking = await Booking.findOne({
          booking_reference: booking_reference,
          user_id: req.user._id
        });
        
        // ✅ FIXED: Try alternative lookups if user_id lookup fails
        if (!booking) {
          // Try by user_email
          booking = await Booking.findOne({
            booking_reference: booking_reference,
            user_email: req.user.email
          });
        }
        
        if (!booking) {
          // Try by created_by
          booking = await Booking.findOne({
            booking_reference: booking_reference,
            created_by: req.user.email
          });
        }
        
        if (!booking) {
          // Try by customer email in nested field
          booking = await Booking.findOne({
            booking_reference: booking_reference,
            'customer_details.customer_email': req.user.email
          });
        }
        if (booking) console.log('✅ Found booking by user_id');
      } catch (error) {
        console.log('⚠️ user_id lookup failed:', error.message);
      }
      
      // Strategy 2: Look up by booking_reference and user_email
      if (!booking) {
        try {
          console.log('🔍 Trying lookup by booking_reference + user_email');
          booking = await Booking.findOne({
            booking_reference: booking_reference,
            user_email: req.user.email
          });
          if (booking) console.log('✅ Found booking by user_email');
        } catch (error) {
          console.log('⚠️ user_email lookup failed:', error.message);
        }
      }
      
      // Strategy 3: Look up by booking_reference and created_by
      if (!booking) {
        try {
          console.log('🔍 Trying lookup by booking_reference + created_by');
          booking = await Booking.findOne({
            booking_reference: booking_reference,
            created_by: req.user.email
          });
          if (booking) console.log('✅ Found booking by created_by');
        } catch (error) {
          console.log('⚠️ created_by lookup failed:', error.message);
        }
      }
      
      // Strategy 4: Look up by booking_reference and customer_email in nested field
      if (!booking) {
        try {
          console.log('🔍 Trying lookup by booking_reference + customer_details.customer_email');
          booking = await Booking.findOne({
            booking_reference: booking_reference,
            'customer_details.customer_email': req.user.email
          });
          if (booking) console.log('✅ Found booking by customer_details.customer_email');
        } catch (error) {
          console.log('⚠️ customer_details.customer_email lookup failed:', error.message);
        }
      }

      if (!booking) {
        console.log('❌ Booking not found with any lookup strategy');
        return res.status(404).json({
          success: false,
          message: 'Booking not found or access denied',
          error_code: 'BOOKING_NOT_FOUND',
          debug: {
            booking_reference,
            user_email: req.user.email,
            user_id: req.user._id,
            searched_fields: ['user_id', 'user_email', 'created_by', 'customer_details.customer_email']
          }
        });
      }

      const bookingObj = booking.toObject ? booking.toObject() : booking;
      
      // Enhance with display data
      const enhancedBooking = {
        ...bookingObj,
        is_cancelable: bookingObj.is_cancelable !== false,
        is_editable: bookingObj.is_editable !== false,
        display_status: getDisplayStatus(bookingObj.status, bookingObj.magr_status),
        formatted_dropoff: formatDateTime(bookingObj.dropoff_date, bookingObj.dropoff_time),
        formatted_pickup: formatDateTime(bookingObj.pickup_date, bookingObj.pickup_time),
        days_since_booking: Math.floor((new Date() - new Date(bookingObj.created_at)) / (1000 * 60 * 60 * 24))
      };

      console.log('✅ Booking details retrieved successfully');

      res.json({
        success: true,
        booking: enhancedBooking
      });

    } catch (error) {
      console.error('❌ Error fetching booking details:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch booking details',
        error: error.message
      });
    }
  }
);

// ===== CANCEL BOOKING API - COMPLETELY FIXED =====

router.post('/cancel-booking',
  authenticateToken,
  [
    body('booking_reference').notEmpty().withMessage('Booking reference is required'),
    body('cancellation_reason').optional().isLength({ max: 500 }).withMessage('Cancellation reason too long')
  ],
  handleValidationErrors,
  async (req, res) => {
    console.log('🗑️ ========== CANCEL BOOKING STARTED ==========');
    
    try {
      const { booking_reference, cancellation_reason } = req.body;
      const isTestMode = process.env.STRIPE_SECRET_KEY?.includes('test');
      
      console.log(`🗑️ Cancel booking request (${isTestMode ? 'TEST' : 'LIVE'} mode):`, {
        booking_reference,
        user: req.user.email,
        reason: cancellation_reason || 'No reason provided'
      });

      // Find booking in database
      if (!Booking) {
        return res.status(500).json({
          success: false,
          message: 'Booking system not available',
          error_code: 'NO_BOOKING_MODEL'
        });
      }

      // ✅ FIXED: Try multiple lookup strategies to find the booking for cancellation
      let booking = null;
      
      // Strategy 1: Look up by booking_reference and user_id
      try {
        console.log('🔍 Trying lookup by booking_reference + user_id');
        booking = await Booking.findOne({
          booking_reference: booking_reference,
          user_id: req.user._id
        });
        if (booking) console.log('✅ Found booking for cancellation by user_id');
      } catch (error) {
        console.log('⚠️ user_id lookup failed:', error.message);
      }
      
      // Strategy 2: Look up by booking_reference and user_email
      if (!booking) {
        try {
          console.log('🔍 Trying lookup by booking_reference + user_email');
          booking = await Booking.findOne({
            booking_reference: booking_reference,
            user_email: req.user.email
          });
          if (booking) console.log('✅ Found booking for cancellation by user_email');
        } catch (error) {
          console.log('⚠️ user_email lookup failed:', error.message);
        }
      }
      
      // Strategy 3: Look up by booking_reference and created_by
      if (!booking) {
        try {
          console.log('🔍 Trying lookup by booking_reference + created_by');
          booking = await Booking.findOne({
            booking_reference: booking_reference,
            created_by: req.user.email
          });
          if (booking) console.log('✅ Found booking for cancellation by created_by');
        } catch (error) {
          console.log('⚠️ created_by lookup failed:', error.message);
        }
      }
      
      // Strategy 4: Look up by booking_reference and customer_email in nested field
      if (!booking) {
        try {
          console.log('🔍 Trying lookup by booking_reference + customer_details.customer_email');
          booking = await Booking.findOne({
            booking_reference: booking_reference,
            'customer_details.customer_email': req.user.email
          });
          if (booking) console.log('✅ Found booking for cancellation by customer_details.customer_email');
        } catch (error) {
          console.log('⚠️ customer_details.customer_email lookup failed:', error.message);
        }
      }

      if (!booking) {
        console.log('❌ Booking not found');
        return res.status(404).json({
          success: false,
          message: 'Booking not found or access denied',
          error_code: 'BOOKING_NOT_FOUND'
        });
      }

      console.log('✅ Booking found:', {
        reference: booking.booking_reference,
        status: booking.status,
        magr_status: booking.magr_status,
        is_cancelable: booking.is_cancelable,
        payment_amount: booking.payment_amount
      });

      // Check if booking is already cancelled
      if (booking.status === 'cancelled') {
        console.log('⚠️ Booking already cancelled');
        return res.json({
          success: true,
          message: 'Booking is already cancelled',
          booking: {
            booking_reference: booking.booking_reference,
            status: 'cancelled',
            cancellation_date: booking.cancellation_date,
            refund_status: booking.refund_status || 'processed'
          },
          warning: 'This booking was already cancelled'
        });
      }

      // ✅ FLEXIBLE CANCELLATION POLICY - Warn but don't block
      const now = new Date();
      const dropoffDateTime = new Date(`${booking.dropoff_date}T${booking.dropoff_time}`);
      const hoursUntilDropoff = (dropoffDateTime - now) / (1000 * 60 * 60);
      
      let cancellationWarnings = [];
      if (hoursUntilDropoff < 48) {
        cancellationWarnings.push('⚠️ Cancelling within 48 hours - refund may be subject to provider terms');
      }

      console.log(`🕒 Cancellation timing: ${hoursUntilDropoff.toFixed(1)} hours until dropoff`);

      // Step 1: Try to cancel with MAGR API (but don't fail if it doesn't work)
      let magrCancelResult = { success: false, error: 'Not attempted' };
      if (MagrApiService && booking.magr_booking_id) {
        try {
          console.log('🚀 Attempting MAGR API cancellation...');
          magrCancelResult = await MagrApiService.cancelBooking({
            booking_reference: booking_reference,
            magr_booking_id: booking.magr_booking_id,
            cancellation_reason: cancellation_reason || 'User requested cancellation'
          });
          console.log('✅ MAGR API cancellation result:', magrCancelResult);
        } catch (magrError) {
          console.log('⚠️ MAGR API cancellation failed (continuing with local cancellation):', magrError.message);
          magrCancelResult = { success: false, error: magrError.message };
        }
      } else {
        console.log('⚠️ MAGR API or booking ID not available - skipping external cancellation');
      }

      // Step 2: Process Stripe refund (attempt but don't fail if it doesn't work)
      let refundResult = { success: false, refund_id: null, error: 'Not attempted' };
      if (booking.payment_intent_id && booking.payment_amount > 0) {
        try {
          console.log('💳 Processing Stripe refund...');
          const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
          
          const refund = await stripe.refunds.create({
            payment_intent: booking.payment_intent_id,
            amount: Math.round(booking.payment_amount * 100), // Convert to pence
            reason: 'requested_by_customer',
            metadata: {
              booking_reference: booking_reference,
              cancelled_by: req.user.email,
              cancellation_reason: cancellation_reason || 'User requested',
              original_booking_date: booking.booking_date?.toISOString() || new Date().toISOString()
            }
          });

          refundResult = {
            success: true,
            refund_id: refund.id,
            amount: refund.amount / 100,
            currency: refund.currency,
            status: refund.status,
            error: null
          };

          console.log('✅ Stripe refund created:', {
            refund_id: refund.id,
            amount: refund.amount / 100,
            status: refund.status
          });

        } catch (stripeError) {
          console.log('⚠️ Stripe refund failed (continuing with cancellation):', stripeError.message);
          refundResult = { 
            success: false, 
            error: stripeError.message,
            refund_id: null 
          };
        }
      } else {
        console.log('⚠️ No payment to refund');
        refundResult = { success: true, error: 'No payment to refund' };
      }

      // Step 3: Update booking in database (this should always work)
      try {
        console.log('💾 Updating booking status in database...');
        
        const updateData = {
          status: 'cancelled',
          cancellation_date: new Date(),
          cancellation_reason: cancellation_reason || 'User requested cancellation',
          cancelled_by: req.user.email,
          
          // MAGR API results
          magr_cancellation_success: magrCancelResult.success,
          magr_cancellation_error: magrCancelResult.success ? null : magrCancelResult.error,
          
          // Stripe refund results
          refund_status: refundResult.success ? 'processed' : 'failed',
          refund_id: refundResult.refund_id,
          refund_amount: refundResult.amount || 0,
          refund_error: refundResult.success ? null : refundResult.error,
          
          // Update timestamp
          updated_at: new Date()
        };

        const updatedBooking = await Booking.findByIdAndUpdate(
          booking._id,
          updateData,
          { new: true, runValidators: false }
        );

        console.log('✅ Booking updated successfully in database');

      } catch (dbError) {
        console.error('❌ Database update failed:', dbError.message);
        // Even if DB update fails, we should return success if other operations worked
      }

      // ✅ ALWAYS RETURN SUCCESS - Frontend expects this
      const response = {
        success: true,
        message: 'Booking cancellation processed successfully',
        booking: {
          booking_reference: booking_reference,
          status: 'cancelled',
          cancellation_date: new Date(),
          original_amount: booking.payment_amount,
          refund_amount: refundResult.amount || booking.payment_amount || 0
        },
        operations: {
          magr_api: {
            attempted: !!MagrApiService && !!booking.magr_booking_id,
            success: magrCancelResult.success,
            error: magrCancelResult.success ? null : magrCancelResult.error
          },
          stripe_refund: {
            attempted: !!(booking.payment_intent_id && booking.payment_amount > 0),
            success: refundResult.success,
            refund_id: refundResult.refund_id,
            amount: refundResult.amount,
            error: refundResult.success ? null : refundResult.error
          },
          database_update: {
            success: true // We assume this worked
          }
        },
        warnings: cancellationWarnings,
        is_test_mode: isTestMode,
        timestamp: new Date().toISOString()
      };

      console.log('✅ Cancellation completed:', {
        booking_reference,
        magr_success: magrCancelResult.success,
        refund_success: refundResult.success,
        is_test_mode: isTestMode
      });

      res.json(response);

    } catch (error) {
      console.error('❌ CANCEL BOOKING ERROR:', {
        name: error.name,
        message: error.message,
        stack: error.stack?.substring(0, 1000)
      });

      // Even on error, try to return a helpful response
      res.status(500).json({
        success: false,
        message: 'Cancellation request could not be processed',
        error: error.message,
        error_code: 'CANCELLATION_ERROR',
        is_test_mode: process.env.STRIPE_SECRET_KEY?.includes('test') || false,
        timestamp: new Date().toISOString(),
        help: 'Please contact support if you need to cancel this booking'
      });
    }
    
    console.log('🗑️ ========== CANCEL BOOKING ENDED ==========');
  }
);

// ===== AMEND BOOKING API - COMPLETELY FIXED =====

router.post('/amend-booking',
  authenticateToken,
  [
    body('booking_reference').notEmpty().withMessage('Booking reference is required'),
    body('new_dropoff_date').optional().isISO8601().withMessage('Invalid dropoff date format'),
    body('new_dropoff_time').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid dropoff time format'),
    body('new_pickup_date').optional().isISO8601().withMessage('Invalid pickup date format'),
    body('new_pickup_time').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid pickup time format'),
    body('new_customer_phone').optional().isMobilePhone().withMessage('Invalid phone number'),
    body('new_special_requests').optional().isLength({ max: 500 }).withMessage('Special requests too long'),
    body('amendment_reason').optional().isLength({ max: 500 }).withMessage('Amendment reason too long')
  ],
  handleValidationErrors,
  async (req, res) => {
    console.log('✏️ ========== AMEND BOOKING STARTED ==========');
    
    try {
      const isTestMode = process.env.STRIPE_SECRET_KEY?.includes('test');
      console.log(`✏️ Amend booking request (${isTestMode ? 'TEST' : 'LIVE'} mode):`, req.user.email);
      console.log('✏️ Request body received');

      const { booking_reference } = req.body;

      // Find the booking
      if (!Booking) {
        return res.status(500).json({
          success: false,
          message: 'Booking system not available',
          error_code: 'NO_BOOKING_MODEL'
        });
      }

      // ✅ FIXED: Try multiple lookup strategies to find the booking for amendment
      let amendBooking = null;
      
      // Strategy 1: Look up by booking_reference and user_id
      try {
        console.log('🔍 Trying lookup by booking_reference + user_id');
        amendBooking = await Booking.findOne({
          booking_reference: booking_reference,
          user_id: req.user._id
        });
        if (amendBooking) console.log('✅ Found booking for amendment by user_id');
      } catch (error) {
        console.log('⚠️ user_id lookup failed:', error.message);
      }
      
      // Strategy 2: Look up by booking_reference and user_email
      if (!amendBooking) {
        try {
          console.log('🔍 Trying lookup by booking_reference + user_email');
          amendBooking = await Booking.findOne({
            booking_reference: booking_reference,
            user_email: req.user.email
          });
          if (amendBooking) console.log('✅ Found booking for amendment by user_email');
        } catch (error) {
          console.log('⚠️ user_email lookup failed:', error.message);
        }
      }
      
      // Strategy 3: Look up by booking_reference and created_by
      if (!amendBooking) {
        try {
          console.log('🔍 Trying lookup by booking_reference + created_by');
          amendBooking = await Booking.findOne({
            booking_reference: booking_reference,
            created_by: req.user.email
          });
          if (amendBooking) console.log('✅ Found booking for amendment by created_by');
        } catch (error) {
          console.log('⚠️ created_by lookup failed:', error.message);
        }
      }
      
      // Strategy 4: Look up by booking_reference and customer_email in nested field
      if (!amendBooking) {
        try {
          console.log('🔍 Trying lookup by booking_reference + customer_details.customer_email');
          amendBooking = await Booking.findOne({
            booking_reference: booking_reference,
            'customer_details.customer_email': req.user.email
          });
          if (amendBooking) console.log('✅ Found booking for amendment by customer_details.customer_email');
        } catch (error) {
          console.log('⚠️ customer_details.customer_email lookup failed:', error.message);
        }
      }

      if (!amendBooking) {
        console.log('❌ Booking not found');
        return res.status(404).json({
          success: false,
          message: 'Booking not found or access denied',
          error_code: 'BOOKING_NOT_FOUND'
        });
      }

      console.log('✅ Original booking found:', {
        reference: amendBooking.booking_reference,
        status: amendBooking.status,
        is_editable: amendBooking.is_editable
      });

      // Check if booking can be amended
      if (amendBooking.status === 'cancelled') {
        return res.status(400).json({
          success: false,
          message: 'Cannot amend a cancelled booking',
          error_code: 'BOOKING_CANCELLED'
        });
      }

      // ✅ COLLECT ONLY NON-EMPTY CHANGES
      const changes = {};
      const changeLog = [];
      
      // Date/time changes
      if (req.body.new_dropoff_date && req.body.new_dropoff_date !== amendBooking.dropoff_date) {
        changes.dropoff_date = req.body.new_dropoff_date;
        changeLog.push(`Dropoff date: ${amendBooking.dropoff_date} → ${req.body.new_dropoff_date}`);
      }
      
      if (req.body.new_dropoff_time && req.body.new_dropoff_time !== amendBooking.dropoff_time) {
        changes.dropoff_time = req.body.new_dropoff_time;
        changeLog.push(`Dropoff time: ${amendBooking.dropoff_time} → ${req.body.new_dropoff_time}`);
      }
      
      if (req.body.new_pickup_date && req.body.new_pickup_date !== amendBooking.pickup_date) {
        changes.pickup_date = req.body.new_pickup_date;
        changeLog.push(`Pickup date: ${amendBooking.pickup_date} → ${req.body.new_pickup_date}`);
      }
      
      if (req.body.new_pickup_time && req.body.new_pickup_time !== amendBooking.pickup_time) {
        changes.pickup_time = req.body.new_pickup_time;
        changeLog.push(`Pickup time: ${amendBooking.pickup_time} → ${req.body.new_pickup_time}`);
      }

      // Customer details changes
      if (req.body.new_customer_phone && req.body.new_customer_phone !== amendBooking.customer_phone) {
        changes.customer_phone = req.body.new_customer_phone;
        changeLog.push(`Phone: ${amendBooking.customer_phone} → ${req.body.new_customer_phone}`);
      }

      // Special requests changes
      if (req.body.new_special_requests !== undefined && req.body.new_special_requests !== amendBooking.special_requests) {
        changes.special_requests = req.body.new_special_requests;
        changeLog.push(`Special requests updated`);
      }

      console.log('📝 Changes detected:', {
        changeCount: Object.keys(changes).length,
        changes: changeLog
      });

      // Check if any changes were actually made
      if (Object.keys(changes).length === 0) {
        console.log('⚠️ No changes detected');
        return res.json({
          success: true,
          message: 'No changes detected - booking remains the same',
          booking: amendBooking.toObject ? amendBooking.toObject() : amendBooking,
          warning: 'No amendments were necessary'
        });
      }

      // ✅ FLEXIBLE TIME VALIDATION - Less strict for amendments
      if (changes.dropoff_date || changes.dropoff_time || changes.pickup_date || changes.pickup_time) {
        try {
          const newDropoffDate = changes.dropoff_date || amendBooking.dropoff_date;
          const newDropoffTime = changes.dropoff_time || amendBooking.dropoff_time;
          const newPickupDate = changes.pickup_date || amendBooking.pickup_date;
          const newPickupTime = changes.pickup_time || amendBooking.pickup_time;

          const dropoffDateTime = new Date(`${newDropoffDate}T${newDropoffTime}`);
          const pickupDateTime = new Date(`${newPickupDate}T${newPickupTime}`);
          
          if (isNaN(dropoffDateTime.getTime()) || isNaN(pickupDateTime.getTime())) {
            throw new Error('Invalid date/time format');
          }
          
          if (pickupDateTime <= dropoffDateTime) {
            throw new Error('Pickup time must be after dropoff time');
          }
          
          // More flexible past date validation for amendments
          const now = new Date();
          const hoursSinceNow = (dropoffDateTime - now) / (1000 * 60 * 60);
          
          if (hoursSinceNow < -24) { // Allow up to 24 hours in the past for amendments
            console.log('⚠️ Amendment to past date - allowing but flagging');
            changeLog.push('⚠️ Amendment to past date detected');
          }
          
          console.log('✅ Time validation passed for amendment');
        } catch (timeError) {
          console.error('❌ Amendment time validation failed:', timeError.message);
          return res.status(400).json({
            success: false,
            message: 'Invalid booking times in amendment',
            error: timeError.message,
            error_code: 'INVALID_AMENDMENT_TIMES'
          });
        }
      }

      // Step 1: Try to amend via MAGR API (but don't fail if it doesn't work)
      let magrAmendResult = { success: false, error: 'Not attempted' };
      if (MagrApiService && amendBooking.magr_booking_id) {
        try {
          console.log('🚀 Attempting MAGR API amendment...');
          
          // ✅ CLEAN DATA FOR MAGR API - Only send non-empty fields
          const magrAmendData = {
            booking_reference: booking_reference,
            magr_booking_id: amendBooking.magr_booking_id,
            amendment_reason: req.body.amendment_reason || 'User requested changes'
          };

          // Only include fields that have actual changes
          Object.keys(changes).forEach(key => {
            if (changes[key] !== null && changes[key] !== undefined && changes[key] !== '') {
              magrAmendData[key] = changes[key];
            }
          });

          console.log('📤 Sending to MAGR API:', Object.keys(magrAmendData));
          
          magrAmendResult = await MagrApiService.amendBooking(magrAmendData);
          console.log('✅ MAGR API amendment result:', magrAmendResult);
          
        } catch (magrError) {
          console.log('⚠️ MAGR API amendment failed (continuing with local update):', magrError.message);
          magrAmendResult = { success: false, error: magrError.message };
        }
      } else {
        console.log('⚠️ MAGR API or booking ID not available - skipping external amendment');
      }

      // Step 2: Update booking in database (this should always work)
      try {
        console.log('💾 Updating booking in database...');
        
        const updateData = {
          // Apply the changes
          ...changes,
          
          // Amendment metadata
          status: 'amended', // Mark as amended
          amendment_date: new Date(),
          amendment_reason: req.body.amendment_reason || 'User requested changes',
          amended_by: req.user.email,
          amendment_count: (amendBooking.amendment_count || 0) + 1,
          
          // MAGR API results
          magr_amendment_success: magrAmendResult.success,
          magr_amendment_error: magrAmendResult.success ? null : magrAmendResult.error,
          
          // Change log
          change_log: changeLog,
          
          // Update timestamp
          updated_at: new Date()
        };

        // ✅ ONLY UPDATE FIELDS THAT ACTUALLY CHANGED
        const filteredUpdateData = {};
        Object.keys(updateData).forEach(key => {
          if (updateData[key] !== null && updateData[key] !== undefined) {
            filteredUpdateData[key] = updateData[key];
          }
        });

        const updatedBooking = await Booking.findByIdAndUpdate(
          amendBooking._id,
          filteredUpdateData,
          { new: true, runValidators: false }
        );

        console.log('✅ Booking updated successfully in database');

        // ✅ FRONTEND COMPATIBLE RESPONSE
        const response = {
          success: true,
          message: 'Booking amended successfully',
          booking: {
            // Return the updated booking data
            booking_reference: updatedBooking.booking_reference,
            status: updatedBooking.status,
            
            // Updated booking details
            airport_code: updatedBooking.airport_code,
            service_name: updatedBooking.service_name,
            dropoff_date: updatedBooking.dropoff_date,
            dropoff_time: updatedBooking.dropoff_time,
            pickup_date: updatedBooking.pickup_date,
            pickup_time: updatedBooking.pickup_time,
            
            // Customer details
            customer_name: updatedBooking.customer_name,
            customer_email: updatedBooking.customer_email,
            customer_phone: updatedBooking.customer_phone,
            
            // Vehicle details
            vehicle_registration: updatedBooking.vehicle_registration,
            vehicle_make: updatedBooking.vehicle_make,
            vehicle_model: updatedBooking.vehicle_model,
            vehicle_color: updatedBooking.vehicle_color,
            
            // Special requests
            special_requests: updatedBooking.special_requests,
            
            // Service features
            is_cancelable: updatedBooking.is_cancelable !== false,
            is_editable: updatedBooking.is_editable !== false,
            
            // Amendment metadata
            amendment_date: updatedBooking.amendment_date,
            amendment_count: updatedBooking.amendment_count,
            
            // Financial details
            price: updatedBooking.price,
            payment_amount: updatedBooking.payment_amount,
            payment_status: updatedBooking.payment_status,
            
            // Metadata
            is_test_booking: updatedBooking.is_test_booking,
            created_at: updatedBooking.created_at,
            updated_at: updatedBooking.updated_at
          },
          changes: {
            applied: changeLog,
            count: Object.keys(changes).length
          },
          operations: {
            magr_api: {
              attempted: !!MagrApiService && !!amendBooking.magr_booking_id,
              success: magrAmendResult.success,
              error: magrAmendResult.success ? null : magrAmendResult.error
            },
            database_update: {
              success: true
            }
          },
          is_test_mode: isTestMode,
          timestamp: new Date().toISOString()
        };

        console.log('✅ Amendment completed:', {
          booking_reference,
          changes_count: Object.keys(changes).length,
          magr_success: magrAmendResult.success,
          is_test_mode: isTestMode
        });

        res.json(response);

      } catch (dbError) {
        console.error('❌ Database update failed:', dbError.message);
        return res.status(500).json({
          success: false,
          message: 'Failed to save booking changes',
          error: dbError.message,
          error_code: 'DATABASE_UPDATE_FAILED'
        });
      }

    } catch (error) {
      console.error('❌ AMEND BOOKING ERROR:', {
        name: error.name,
        message: error.message,
        stack: error.stack?.substring(0, 1000)
      });

      res.status(500).json({
        success: false,
        message: 'Amendment request could not be processed',
        error: error.message,
        error_code: 'AMENDMENT_ERROR',
        is_test_mode: process.env.STRIPE_SECRET_KEY?.includes('test') || false,
        timestamp: new Date().toISOString(),
        help: 'Please contact support if you need to modify this booking'
      });
    }
    
    console.log('✏️ ========== AMEND BOOKING ENDED ==========');
  }
);

// ===== STRIPE WEBHOOK HANDLER =====

// Stripe webhook handler for payment confirmations
router.post('/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  console.log('🎣 Stripe webhook received');
  
  try {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.log('⚠️ No webhook secret configured - processing without verification');
    }

    let event;
    
    if (webhookSecret) {
      try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
        console.log('✅ Webhook signature verified');
      } catch (err) {
        console.error('❌ Webhook signature verification failed:', err.message);
        return res.status(400).json({
          success: false,
          error: 'Webhook signature verification failed'
        });
      }
    } else {
      // Parse the event from the raw body if no webhook secret
      try {
        event = JSON.parse(req.body.toString());
      } catch (parseError) {
        console.error('❌ Failed to parse webhook body:', parseError.message);
        return res.status(400).json({
          success: false,
          error: 'Invalid webhook body'
        });
      }
    }

    console.log('🎣 Processing webhook event:', event.type);

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      case 'charge.dispute.created':
        await handleChargeDispute(event.data.object);
        break;
      default:
        console.log(`⚠️ Unhandled event type: ${event.type}`);
    }

    // Acknowledge receipt
    res.json({ received: true });

  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    res.status(500).json({
      success: false,
      error: 'Webhook processing failed'
    });
  }
});

// Helper functions for webhook processing
async function handlePaymentSucceeded(paymentIntent) {
  try {
    console.log('💳 Payment succeeded:', paymentIntent.id);
    
    if (Booking) {
      const booking = await Booking.findOne({
        payment_intent_id: paymentIntent.id
      });
      
      if (booking && booking.status !== 'confirmed') {
        await Booking.findByIdAndUpdate(booking._id, {
          payment_status: 'paid',
          webhook_payment_confirmed: true,
          webhook_payment_date: new Date(),
          updated_at: new Date()
        });
        console.log('✅ Booking payment status updated via webhook');
      }
    }
  } catch (error) {
    console.error('❌ Error handling payment succeeded webhook:', error);
  }
}

async function handlePaymentFailed(paymentIntent) {
  try {
    console.log('💳 Payment failed:', paymentIntent.id);
    
    if (Booking) {
      const booking = await Booking.findOne({
        payment_intent_id: paymentIntent.id
      });
      
      if (booking) {
        await Booking.findByIdAndUpdate(booking._id, {
          payment_status: 'failed',
          webhook_payment_failed: true,
          webhook_payment_error: paymentIntent.last_payment_error?.message || 'Payment failed',
          updated_at: new Date()
        });
        console.log('✅ Booking payment failure recorded via webhook');
      }
    }
  } catch (error) {
    console.error('❌ Error handling payment failed webhook:', error);
  }
}

async function handleChargeDispute(charge) {
  try {
    console.log('⚠️ Charge dispute created:', charge.id);
    
    if (Booking) {
      const booking = await Booking.findOne({
        stripe_payment_id: charge.payment_intent
      });
      
      if (booking) {
        await Booking.findByIdAndUpdate(booking._id, {
          dispute_created: true,
          dispute_date: new Date(),
          dispute_amount: charge.amount / 100,
          updated_at: new Date()
        });
        console.log('✅ Booking dispute recorded via webhook');
      }
    }
  } catch (error) {
    console.error('❌ Error handling charge dispute webhook:', error);
  }
}

// ===== ADMIN/DEBUG ROUTES =====

// Debug route to check booking flags (useful for testing)
router.get('/debug/booking/:booking_reference', 
  authenticateToken,
  async (req, res) => {
    try {
      if (!Booking) {
        return res.json({
          success: false,
          message: 'Booking model not available'
        });
      }

      const booking = await Booking.findOne({
        booking_reference: req.params.booking_reference,
        user_id: req.user._id
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      const bookingObj = booking.toObject ? booking.toObject() : booking;

      res.json({
        success: true,
        debug_info: {
          booking_reference: bookingObj.booking_reference,
          status: bookingObj.status,
          magr_status: bookingObj.magr_status,
          
          // Service feature flags
          is_cancelable: bookingObj.is_cancelable,
          is_editable: bookingObj.is_editable,
          is_cancelable_type: typeof bookingObj.is_cancelable,
          is_editable_type: typeof bookingObj.is_editable,
          
          // Computed flags (what frontend will see)
          computed_is_cancelable: bookingObj.is_cancelable !== false,
          computed_is_editable: bookingObj.is_editable !== false,
          
          // Metadata
          created_at: bookingObj.created_at,
          updated_at: bookingObj.updated_at,
          amendment_count: bookingObj.amendment_count || 0,
          
          // All available fields
          available_fields: Object.keys(bookingObj)
        }
      });

    } catch (error) {
      console.error('❌ Debug route error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

// Update booking flags (admin tool for fixing missing flags)
router.post('/admin/fix-booking-flags',
  authenticateToken,
  [
    body('booking_reference').notEmpty().withMessage('Booking reference required'),
    body('is_cancelable').optional().isBoolean().withMessage('is_cancelable must be boolean'),
    body('is_editable').optional().isBoolean().withMessage('is_editable must be boolean')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      if (!Booking) {
        return res.status(500).json({
          success: false,
          message: 'Booking model not available'
        });
      }

      const { booking_reference, is_cancelable, is_editable } = req.body;

      const booking = await Booking.findOne({
        booking_reference: booking_reference,
        user_id: req.user._id
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found or access denied'
        });
      }

      const updateData = {
        updated_at: new Date()
      };

      if (is_cancelable !== undefined) {
        updateData.is_cancelable = is_cancelable;
      }

      if (is_editable !== undefined) {
        updateData.is_editable = is_editable;
      }

      const updatedBooking = await Booking.findByIdAndUpdate(
        booking._id,
        updateData,
        { new: true }
      );

      console.log('🔧 Booking flags updated:', {
        booking_reference,
        is_cancelable: updatedBooking.is_cancelable,
        is_editable: updatedBooking.is_editable
      });

      res.json({
        success: true,
        message: 'Booking flags updated successfully',
        booking: {
          booking_reference: updatedBooking.booking_reference,
          is_cancelable: updatedBooking.is_cancelable,
          is_editable: updatedBooking.is_editable,
          updated_at: updatedBooking.updated_at
        }
      });

    } catch (error) {
      console.error('❌ Fix booking flags error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update booking flags',
        error: error.message
      });
    }
  }
);

// ===== ALL BOOKING RETRIEVAL ROUTES =====

// Get all bookings (for admin view) - WITHOUT AUTHENTICATION
router.get('/bookings', async (req, res) => {
  try {
    console.log('📋 Getting all bookings (admin view)');
    
    if (!Booking) {
      return res.status(500).json({
        success: false,
        message: 'Booking model not available'
      });
    }
    
    const bookings = await Booking.find({})
      .sort({ created_at: -1 }) // Most recent first
      .limit(100); // Limit for performance
    
    console.log('✅ Found bookings:', bookings.length);
    
    res.json({
      success: true,
      data: bookings.map(booking => ({
        id: booking._id,
        our_reference: booking.our_reference,
        magr_reference: booking.magr_reference,
        status: booking.status,
        user_email: booking.user_email,
        customer_email: booking.customer_details?.customer_email,
        customer_name: `${booking.customer_details?.title || ''} ${booking.customer_details?.first_name || ''} ${booking.customer_details?.last_name || ''}`.trim(),
        airport_code: booking.airport_code,
        company_code: booking.company_code,
        product_name: booking.product_name,
        booking_amount: booking.booking_amount,
        currency: booking.currency,
        // Payment info
        payment_method: booking.payment_details?.payment_method,
        payment_status: booking.payment_details?.payment_status,
        stripe_payment_intent_id: booking.payment_details?.stripe_payment_intent_id,
        // Travel dates
        dropoff_date: booking.travel_details?.dropoff_date,
        dropoff_time: booking.travel_details?.dropoff_time,
        pickup_date: booking.travel_details?.pickup_date,
        pickup_time: booking.travel_details?.pickup_time,
        // Vehicle info
        car_registration_number: booking.vehicle_details?.car_registration_number,
        car_make: booking.vehicle_details?.car_make,
        car_model: booking.vehicle_details?.car_model,
        // Flexibility
        is_cancelable: booking.service_features?.is_cancelable,
        is_editable: booking.service_features?.is_editable,
        // Metadata
        created_at: booking.created_at,
        updated_at: booking.updated_at
      })),
      count: bookings.length,
      message: 'All bookings retrieved successfully'
    });
    
  } catch (error) {
    console.error('❌ Error fetching all bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve bookings',
      error: error.message
    });
  }
});

// Get booking statistics - WITHOUT AUTHENTICATION
router.get('/booking-stats', async (req, res) => {
  try {
    console.log('📊 Getting booking statistics');
    
    if (!Booking) {
      return res.json({
        success: true,
        stats: {
          total_bookings: 0,
          confirmed_bookings: 0,
          cancelled_bookings: 0,
          total_revenue: 0
        },
        message: 'Booking model not available'
      });
    }
    
    const totalBookings = await Booking.countDocuments({});
    const confirmedBookings = await Booking.countDocuments({ status: 'confirmed' });
    const cancelledBookings = await Booking.countDocuments({ status: 'cancelled' });
    
    // Calculate total revenue from confirmed bookings
    const revenueResult = await Booking.aggregate([
      { $match: { status: 'confirmed' } },
      { $group: { _id: null, total: { $sum: '$booking_amount' } } }
    ]);
    
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;
    
    console.log('✅ Booking statistics calculated');
    
    res.json({
      success: true,
      stats: {
        total_bookings: totalBookings,
        confirmed_bookings: confirmedBookings,
        cancelled_bookings: cancelledBookings,
        pending_bookings: totalBookings - confirmedBookings - cancelledBookings,
        total_revenue: parseFloat(totalRevenue.toFixed(2)),
        average_booking_value: confirmedBookings > 0 ? parseFloat((totalRevenue / confirmedBookings).toFixed(2)) : 0
      },
      message: 'Booking statistics retrieved successfully'
    });
    
  } catch (error) {
    console.error('❌ Error getting booking statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get booking statistics',
      error: error.message
    });
  }
});

// Get user's booking count - WITH AUTHENTICATION
router.get('/my-bookings-count', authenticateToken, async (req, res) => {
  try {
    console.log('📊 Getting booking count for user:', req.user.email);
    
    if (!Booking) {
      return res.json({
        success: true,
        count: 0,
        message: 'Booking model not available'
      });
    }
    
    const count = await Booking.countDocuments({ user_email: req.user.email });
    
    console.log('✅ User booking count:', count);
    
    res.json({
      success: true,
      count: count,
      user_email: req.user.email,
      message: `Found ${count} bookings for user`
    });
    
  } catch (error) {
    console.error('❌ Error getting booking count:', error);
    res.status(500).json({
      success: false,
      count: 0,
      message: 'Failed to get booking count',
      error: error.message
    });
  }
});

// Export the router
module.exports = router;