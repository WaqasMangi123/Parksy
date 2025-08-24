// routes/userparkingroutes.js - OPTIMIZED VERSION WITH CANCEL & AMEND APIs
const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');

// Import services and models with error handling
let MagrApiService;
let User;
let Booking;

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

// ===== AUTHENTICATION MIDDLEWARE =====

const authenticateToken = async (req, res, next) => {
  try {
    console.log('🔍 Authentication middleware started');
    
    // Get token from Authorization header FIRST
    let token = null;
    
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
      console.log('🔑 Token extracted from Authorization header');
    }
    
    // Fallback to body
    if (!token) {
      token = req.body.token || req.body.auth_token;
      if (token) {
        console.log('🔑 Token extracted from request body');
      }
    }

    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({
        success: false,
        message: 'Access token required. Please log in to make bookings.',
        requireAuth: true,
        error_code: 'NO_TOKEN'
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET not configured');
      return res.status(500).json({
        success: false,
        message: 'Server authentication configuration error',
        error_code: 'JWT_SECRET_MISSING'
      });
    }

    console.log('🔐 Verifying JWT token...');
    
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('✅ Token decoded successfully');
    } catch (jwtError) {
      console.error('❌ JWT verification failed:', jwtError.name);
      
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Your session has expired. Please log in again.',
          requireAuth: true,
          expired: true,
          error_code: 'TOKEN_EXPIRED'
        });
      }
      
      return res.status(403).json({
        success: false,
        message: 'Invalid session token. Please log in again.',
        requireAuth: true,
        invalid: true,
        error_code: 'INVALID_TOKEN'
      });
    }

    // Create user object from token
    console.log('👤 Creating user object from token...');
    
    req.user = {
      _id: decoded.id || decoded.user_id || decoded.sub || 'token_user_id',
      email: decoded.email || 'unknown@example.com',
      name: decoded.name || decoded.username || 'Token User',
      verified: true,
      role: decoded.role || 'user',
      tokenData: decoded
    };
    
    console.log('✅ User authenticated successfully:', req.user.email);

    // Optional database lookup
    if (User) {
      try {
        const dbUser = await User.findById(decoded.id);
        if (dbUser) {
          req.user = dbUser;
          console.log('✅ Database user found');
        }
      } catch (dbError) {
        console.log('⚠️ Database lookup failed, using token data');
      }
    }

    next();
    
  } catch (error) {
    console.error('❌ Authentication error:', error.message);
    
    return res.status(500).json({
      success: false,
      message: 'Authentication system error',
      error: error.message,
      error_code: 'AUTH_SYSTEM_ERROR'
    });
  }
};

// ===== PUBLIC ROUTES =====

// Health check
router.get('/health', async (req, res) => {
  console.log('🏥 Health check requested');
  
  const isTestMode = process.env.STRIPE_SECRET_KEY?.includes('test');
  
  const healthStatus = {
    success: true,
    message: 'Parking API is healthy',
    timestamp: new Date().toISOString(),
    stripe_mode: isTestMode ? 'TEST' : 'LIVE',
    services: {
      magr_api_service: !!MagrApiService ? 'loaded' : 'failed',
      user_model: !!User ? 'loaded' : 'failed',
      booking_model: !!Booking ? 'loaded' : 'optional',
      jwt_secret: !!process.env.JWT_SECRET ? 'configured' : 'missing'
    },
    environment: {
      magr_email: !!process.env.MAGR_USER_EMAIL ? 'set' : 'missing',
      magr_password: !!process.env.MAGR_PASSWORD ? 'set' : 'missing',
      magr_agent_code: !!process.env.MAGR_AGENT_CODE ? 'set' : 'missing',
      stripe_secret_key: !!process.env.STRIPE_SECRET_KEY ? 'set' : 'missing',
      stripe_publishable_key: !!process.env.STRIPE_PUBLISHABLE_KEY ? 'set' : 'missing'
    },
    warnings: isTestMode ? ['⚠️ STRIPE TEST MODE ACTIVE'] : ['🔴 STRIPE LIVE MODE']
  };
  
  console.log('📊 Health check result:', healthStatus.services);
  res.json(healthStatus);
});

// Get Stripe config
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
      warning: isTestMode ? 'TEST MODE ACTIVE' : 'LIVE MODE - Real payments will be processed'
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

// Get airports
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

// Search parking
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

      // Time validation
      const dropoffDateTime = new Date(`${dropoff_date}T${dropoff_time}`);
      const pickupDateTime = new Date(`${pickup_date}T${pickup_time}`);
      const now = new Date();

      if (isNaN(dropoffDateTime.getTime()) || isNaN(pickupDateTime.getTime())) {
        throw new Error('Invalid date/time format');
      }
      
      if (pickupDateTime <= dropoffDateTime) {
        throw new Error('Pickup time must be after dropoff time');
      }
      
      if (dropoffDateTime < now) {
        throw new Error('Dropoff time cannot be in the past');
      }

      const searchParams = {
        airport_code,
        dropoff_date,
        dropoff_time,
        pickup_date,
        pickup_time
      };

      console.log('🚀 Calling MAGR API...');
      const result = await MagrApiService.getParkingQuotes(searchParams);
      
      if (!result || !result.success || !result.data || !result.data.products) {
        return res.status(500).json({
          success: false,
          message: 'No parking products found',
          search_params: searchParams
        });
      }

      // Enhance products
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
          is_cancelable: product.cancelable !== 'No',
          is_editable: product.editable !== 'No'
        };
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
        message: `Found ${enhancedProducts.length} parking options`,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ SEARCH ERROR:', error.message);
      
      res.status(500).json({
        success: false,
        message: 'Failed to search parking options',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

// Test MAGR connection
router.get('/test-magr', async (req, res) => {
  try {
    console.log('🧪 Testing MAGR API connection...');
    
    if (!MagrApiService) {
      throw new Error('MagrApiService not loaded');
    }
    
    const result = await MagrApiService.testConnection();
    
    console.log('✅ MAGR Test successful');
    
    res.json({
      success: true,
      message: 'MAGR API connection successful',
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ MAGR Test Failed:', error);
    res.status(500).json({
      success: false,
      message: 'MAGR API connection failed',
      error: error.message,
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
      console.log('🏢 Terminals requested for:', airport_code);
      
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

// ===== BOOKING MANAGEMENT ROUTES =====

// Get all bookings (admin)
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
      .sort({ created_at: -1 })
      .limit(100);
    
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
        payment_method: booking.payment_details?.payment_method,
        payment_status: booking.payment_details?.payment_status,
        is_cancelable: booking.service_features?.is_cancelable,
        is_editable: booking.service_features?.is_editable,
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

// Get booking statistics
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
    
    const [totalBookings, confirmedBookings, cancelledBookings, revenueResult] = await Promise.all([
      Booking.countDocuments({}),
      Booking.countDocuments({ status: 'confirmed' }),
      Booking.countDocuments({ status: 'cancelled' }),
      Booking.aggregate([
        { $match: { status: 'confirmed' } },
        { $group: { _id: null, total: { $sum: '$booking_amount' } } }
      ])
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

// Get user's booking count
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

// ===== STRIPE PAYMENT ROUTES =====

// Create payment intent
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
    try {
      const isTestMode = process.env.STRIPE_SECRET_KEY?.includes('test');
      console.log(`💳 Creating payment intent (${isTestMode ? 'TEST' : 'LIVE'} mode)`);

      if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(500).json({
          success: false,
          message: 'Stripe not configured',
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

      const tempBookingRef = `${isTestMode ? 'TEST-' : ''}TEMP-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      const paymentAmount = parseFloat(amount);

      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(paymentAmount * 100),
        currency: currency.toLowerCase(),
        description: `${isTestMode ? '[TEST] ' : ''}Parking booking for ${airport_code} - ${service_name}`,
        metadata: {
          our_reference: tempBookingRef,
          service_name: service_name,
          airport_code: airport_code,
          company_code: company_code,
          dropoff_date: dropoff_date,
          pickup_date: pickup_date,
          user_email: req.user.email,
          is_test_mode: isTestMode.toString()
        },
        automatic_payment_methods: {
          enabled: true,
        },
        payment_method_options: {
          card: {
            request_three_d_secure: 'automatic'
          }
        }
      });

      console.log(`✅ Payment intent created (${isTestMode ? 'TEST' : 'LIVE'} mode)`);

      res.json({
        success: true,
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
        amount: paymentAmount,
        currency: currency.toLowerCase(),
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
        warning: isTestMode ? '⚠️ TEST MODE' : '🔴 LIVE MODE',
        message: `Payment intent created successfully`,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Payment intent creation error:', error.message);
      
      res.status(500).json({
        success: false,
        message: 'Failed to create payment intent',
        error: error.message,
        is_test_mode: process.env.STRIPE_SECRET_KEY?.includes('test') || false
      });
    }
  }
);

// Verify payment
router.get('/verify-payment/:payment_intent_id', 
  authenticateToken,
  async (req, res) => {
    try {
      const { payment_intent_id } = req.params;
      const isTestMode = process.env.STRIPE_SECRET_KEY?.includes('test');
      
      console.log(`🔍 Verifying payment (${isTestMode ? 'TEST' : 'LIVE'} mode)`);

      if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(500).json({
          success: false,
          message: 'Stripe not configured',
          error_code: 'STRIPE_NOT_CONFIGURED'
        });
      }

      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);
      
      res.json({
        success: true,
        payment_intent_id: payment_intent_id,
        payment_status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        metadata: paymentIntent.metadata,
        is_paid: paymentIntent.status === 'succeeded',
        created: new Date(paymentIntent.created * 1000),
        is_test_mode: isTestMode,
        stripe_mode: isTestMode ? 'test' : 'live'
      });

    } catch (error) {
      console.error('❌ Payment verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify payment',
        error: error.message,
        is_test_mode: process.env.STRIPE_SECRET_KEY?.includes('test') || false
      });
    }
  }
);

// Create booking with payment
router.post('/bookings-with-payment', 
  authenticateToken,
  [
    body('company_code').notEmpty().withMessage('Company code is required'),
    body('airport_code').isIn(['LHR', 'LGW', 'STN', 'LTN', 'MAN', 'BHX', 'EDI', 'GLA']).withMessage('Invalid airport code'),
    body('dropoff_date').isISO8601().withMessage('Invalid dropoff date format'),
    body('dropoff_time').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid dropoff time format'),
    body('pickup_date').isISO8601().withMessage('Invalid pickup date format'),
    body('pickup_time').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid pickup time format'),
    body('title').isIn(['Mr', 'Mrs', 'Miss', 'Ms', 'Dr']).withMessage('Invalid title'),
    body('first_name').trim().isLength({ min: 1, max: 50 }).withMessage('First name must be 1-50 characters'),
    body('last_name').trim().isLength({ min: 1, max: 50 }).withMessage('Last name must be 1-50 characters'),
    body('customer_email').isEmail().withMessage('Invalid email address'),
    body('phone_number').notEmpty().withMessage('Phone number is required'),
    body('departure_terminal').notEmpty().withMessage('Departure terminal is required'),
    body('arrival_terminal').notEmpty().withMessage('Arrival terminal is required'),
    body('car_registration_number').trim().isLength({ min: 1, max: 15 }).withMessage('Car registration required'),
    body('car_make').trim().isLength({ min: 1, max: 30 }).withMessage('Car make required'),
    body('car_model').trim().isLength({ min: 1, max: 30 }).withMessage('Car model required'),
    body('car_color').trim().isLength({ min: 1, max: 20 }).withMessage('Car color required'),
    body('booking_amount').isFloat({ min: 0 }).withMessage('Booking amount must be positive'),
    body('payment_intent_id').notEmpty().withMessage('Payment intent ID is required')
  ],
  handleValidationErrors, 
  async (req, res) => {
    try {
      const bookingData = req.body;
      const { payment_intent_id } = bookingData;
      const isTestMode = process.env.STRIPE_SECRET_KEY?.includes('test');

      console.log(`🎫 BOOKING WITH PAYMENT (${isTestMode ? 'TEST' : 'LIVE'} mode)`);

      if (!MagrApiService) {
        throw new Error('MAGR API Service is not available');
      }

      // Verify payment
      let paymentDetails = null;
      try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);
        
        paymentDetails = {
          status: paymentIntent.status,
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency,
          is_paid: paymentIntent.status === 'succeeded',
          created: new Date(paymentIntent.created * 1000)
        };
        
        if (!paymentDetails.is_paid) {
          throw new Error(`Payment not completed. Status: ${paymentDetails.status}`);
        }

        // Verify amounts match
        const paidAmount = paymentDetails.amount;
        const bookingAmount = parseFloat(bookingData.booking_amount);
        
        if (Math.abs(paidAmount - bookingAmount) > 0.01) {
          throw new Error(`Payment amount mismatch. Paid: £${paidAmount}, Required: £${bookingAmount}`);
        }

        console.log(`✅ Payment verified (${isTestMode ? 'TEST' : 'LIVE'} mode)`);
        
      } catch (paymentError) {
        console.error(`❌ Payment verification failed:`, paymentError.message);
        return res.status(400).json({
          success: false,
          message: 'Payment verification failed',
          error: paymentError.message,
          is_test_mode: isTestMode
        });
      }

      // Generate booking reference
      const ourBookingRef = `${isTestMode ? 'TEST-' : ''}PKY-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      // Prepare MAGR booking data
      const magrBookingData = {
        company_code: bookingData.company_code,
        bookreference: ourBookingRef,
        dropoff_time: bookingData.dropoff_time,
        dropoff_date: bookingData.dropoff_date,
        pickup_time: bookingData.pickup_time,
        pickup_date: bookingData.pickup_date,
        title: bookingData.title,
        first_name: bookingData.first_name,
        last_name: bookingData.last_name,
        customer_email: bookingData.customer_email,
        phone_number: bookingData.phone_number,
        departure_flight_number: bookingData.departure_flight_number || 'TBA',
        arrival_flight_number: bookingData.arrival_flight_number || 'TBA',
        departure_terminal: bookingData.departure_terminal,
        arrival_terminal: bookingData.arrival_terminal,
        car_registration_number: bookingData.car_registration_number.toUpperCase(),
        car_make: bookingData.car_make,
        car_model: bookingData.car_model,
        car_color: bookingData.car_color,
        park_api: 'b2b',
        passenger: parseInt(bookingData.passenger) || 1,
        paymentgateway: 'Stripe',
        payment_token: payment_intent_id,
        booking_amount: parseFloat(bookingData.booking_amount)
      };

      console.log(`🚀 Sending booking to MAGR API (${isTestMode ? 'TEST' : 'LIVE'} mode)`);

      // Create booking with MAGR
      const magrResult = await MagrApiService.createBooking(magrBookingData);

      if (magrResult.success) {
        // Save to database if available
        let savedBooking = null;
        let databaseSaveSuccess = false;
        
        if (Booking) {
          try {
            savedBooking = new Booking({
              our_reference: ourBookingRef,
              magr_reference: magrResult.reference,
              booking_id: magrResult.booking_id,
              user_id: req.user._id,
              user_email: req.user.email,
              company_code: bookingData.company_code,
              product_name: bookingData.product_name || 'Airport Parking Service',
              airport_code: bookingData.airport_code,
              booking_amount: parseFloat(bookingData.booking_amount),
              currency: paymentDetails?.currency?.toUpperCase() || 'GBP',
              customer_details: {
                title: bookingData.title,
                first_name: bookingData.first_name,
                last_name: bookingData.last_name,
                customer_email: bookingData.customer_email,
                phone_number: bookingData.phone_number
              },
              travel_details: {
                dropoff_date: bookingData.dropoff_date,
                dropoff_time: bookingData.dropoff_time,
                pickup_date: bookingData.pickup_date,
                pickup_time: bookingData.pickup_time,
                departure_flight_number: bookingData.departure_flight_number || 'TBA',
                arrival_flight_number: bookingData.arrival_flight_number || 'TBA',
                departure_terminal: bookingData.departure_terminal,
                arrival_terminal: bookingData.arrival_terminal,
                passenger_count: parseInt(bookingData.passenger) || 1
              },
              vehicle_details: {
                car_registration_number: bookingData.car_registration_number.toUpperCase(),
                car_make: bookingData.car_make,
                car_model: bookingData.car_model,
                car_color: bookingData.car_color
              },
              payment_details: {
                payment_method: 'Stripe',
                payment_status: 'paid',
                stripe_payment_intent_id: payment_intent_id,
                stripe_amount: paymentDetails?.amount,
                stripe_currency: paymentDetails?.currency,
                payment_date: paymentDetails?.created,
                is_test_payment: isTestMode
              },
              service_features: {
                is_cancelable: bookingData.is_cancelable !== false,
                is_editable: bookingData.is_editable !== false
              },
              status: 'confirmed',
              notes: `${isTestMode ? '[TEST] ' : ''}Paid booking created via Stripe`
            });

            await savedBooking.save();
            databaseSaveSuccess = true;
            
            console.log(`✅ Booking saved to database (${isTestMode ? 'TEST' : 'LIVE'} mode)`);
            
          } catch (dbError) {
            console.error(`❌ Database save failed:`, dbError.message);
          }
        }

        // Success response
        res.json({
          success: true,
          message: `Booking created successfully! (${isTestMode ? 'TEST' : 'LIVE'} mode)`,
          data: {
            our_reference: ourBookingRef,
            magr_reference: magrResult.reference,
            booking_id: magrResult.booking_id,
            payment_intent_id: payment_intent_id,
            payment_status: 'paid',
            status: 'confirmed',
            database_saved: databaseSaveSuccess,
            is_test_mode: isTestMode
          }
        });

      } else {
        // MAGR booking failed - refund payment
        try {
          const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
          const refund = await stripe.refunds.create({
            payment_intent: payment_intent_id,
            reason: 'requested_by_customer',
            metadata: {
              reason: 'booking_failed'
            }
          });
          
          return res.status(500).json({
            success: false,
            message: `Booking failed. Payment refunded automatically.`,
            refund_id: refund.id,
            is_test_mode: isTestMode
          });
        } catch (refundError) {
          return res.status(500).json({
            success: false,
            message: `Booking failed. CRITICAL: Refund failed. Contact support.`,
            payment_intent_id: payment_intent_id,
            is_test_mode: isTestMode
          });
        }
      }

    } catch (error) {
      const isTestMode = process.env.STRIPE_SECRET_KEY?.includes('test');
      console.error(`❌ Booking error:`, error.message);
      
      res.status(500).json({
        success: false,
        message: `Failed to create booking`,
        error: error.message,
        is_test_mode: isTestMode
      });
    }
  }
);

// ===== USER BOOKING MANAGEMENT =====

// Get user's bookings
router.get('/my-bookings', authenticateToken, async (req, res) => {
  try {
    console.log('📋 Getting bookings for user:', req.user.email);
    
    if (!Booking) {
      return res.json({
        success: true,
        data: [],
        count: 0,
        message: 'Booking model not available'
      });
    }
    
    const bookings = await Booking.find({ user_email: req.user.email })
      .sort({ created_at: -1 })
      .limit(50);
    
    console.log('✅ Found bookings:', bookings.length);
    
    res.json({
      success: true,
      data: bookings.map(booking => ({
        id: booking._id,
        our_reference: booking.our_reference,
        magr_reference: booking.magr_reference,
        status: booking.status,
        airport_code: booking.airport_code,
        product_name: booking.product_name,
        booking_amount: booking.booking_amount,
        currency: booking.currency,
        payment_status: booking.payment_details?.payment_status,
        is_test_payment: booking.payment_details?.is_test_payment || false,
        travel_details: booking.travel_details,
        created_at: booking.created_at,
        can_cancel: booking.service_features?.is_cancelable !== false && booking.status === 'confirmed',
        can_amend: booking.service_features?.is_editable !== false && booking.status === 'confirmed'
      })),
      count: bookings.length,
      user: req.user.email
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

// Get specific booking details
router.get('/bookings/:reference', authenticateToken, async (req, res) => {
  try {
    const { reference } = req.params;
    console.log('📋 Getting booking details for:', reference);
    
    if (!Booking) {
      return res.status(500).json({
        success: false,
        message: 'Booking model not available'
      });
    }
    
    const booking = await Booking.findOne({
      $or: [
        { our_reference: reference },
        { magr_reference: reference }
      ],
      user_email: req.user.email
    });
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found or not accessible'
      });
    }
    
    console.log('✅ Booking found:', booking.our_reference);
    
    res.json({
      success: true,
      data: {
        id: booking._id,
        our_reference: booking.our_reference,
        magr_reference: booking.magr_reference,
        status: booking.status,
        airport_code: booking.airport_code,
        company_code: booking.company_code,
        product_name: booking.product_name,
        customer_details: booking.customer_details,
        travel_details: booking.travel_details,
        vehicle_details: booking.vehicle_details,
        booking_amount: booking.booking_amount,
        currency: booking.currency,
        created_at: booking.created_at,
        updated_at: booking.updated_at,
        is_cancelable: booking.service_features?.is_cancelable !== false,
        is_editable: booking.service_features?.is_editable !== false
      },
      payment_details: {
        method: booking.payment_details?.payment_method,
        status: booking.payment_details?.payment_status,
        amount: booking.payment_details?.stripe_amount,
        currency: booking.payment_details?.stripe_currency,
        is_test_payment: booking.payment_details?.is_test_payment || false
      },
      can_cancel: booking.service_features?.is_cancelable !== false && booking.status === 'confirmed',
      can_amend: booking.service_features?.is_editable !== false && booking.status === 'confirmed'
    });
    
  } catch (error) {
    console.error('❌ Error fetching booking details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking details',
      error: error.message
    });
  }
});

// ===== CANCEL BOOKING =====

router.post('/cancel-booking',
  authenticateToken,
  [
    body('booking_reference').notEmpty().withMessage('Booking reference is required'),
    body('refund_amount').optional().isFloat({ min: 0 }).withMessage('Invalid refund amount'),
    body('reason').optional().isLength({ max: 500 }).withMessage('Reason too long')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { booking_reference, refund_amount, reason } = req.body;
      const isTestMode = process.env.STRIPE_SECRET_KEY?.includes('test');
      
      console.log(`🗑️ Cancel booking request (${isTestMode ? 'TEST' : 'LIVE'} mode)`);

      if (!Booking) {
        return res.status(500).json({
          success: false,
          message: 'Booking system not available'
        });
      }

      // Find booking
      const booking = await Booking.findOne({
        our_reference: booking_reference,
        user_email: req.user.email
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found or access denied'
        });
      }

      if (booking.status === 'cancelled') {
        return res.json({
          success: true,
          message: 'Booking is already cancelled'
        });
      }

      // Try MAGR cancellation (optional)
      let magrCancelResult = { success: false };
      if (MagrApiService && booking.magr_reference) {
        try {
          magrCancelResult = await MagrApiService.cancelBooking(booking.magr_reference, refund_amount || booking.booking_amount);
        } catch (magrError) {
          console.log('⚠️ MAGR cancellation failed:', magrError.message);
        }
      }

      // Process Stripe refund (optional)
      let refundResult = { success: false };
      const refundAmountToProcess = refund_amount || booking.booking_amount;
      
      if (booking.payment_details?.stripe_payment_intent_id && refundAmountToProcess > 0) {
        try {
          const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
          
          const refund = await stripe.refunds.create({
            payment_intent: booking.payment_details.stripe_payment_intent_id,
            amount: Math.round(refundAmountToProcess * 100),
            reason: 'requested_by_customer',
            metadata: {
              booking_reference: booking_reference,
              reason: reason || 'User requested'
            }
          });

          refundResult = {
            success: true,
            refund_id: refund.id,
            amount: refund.amount / 100,
            status: refund.status
          };

          console.log('✅ Stripe refund created');

        } catch (stripeError) {
          console.log('⚠️ Stripe refund failed:', stripeError.message);
        }
      }

      // Update booking in database
      booking.status = 'cancelled';
      booking.cancelled_at = new Date();
      booking.notes = `${booking.notes || ''}\nCancelled: ${reason || 'User requested'}`;
      
      if (refundResult.success && booking.payment_details) {
        booking.payment_details.refund_amount = refundResult.amount;
        booking.payment_details.refund_date = new Date();
        booking.payment_details.payment_status = 'refunded';
      }

      await booking.save();

      // Success response
      res.json({
        success: true,
        message: 'Booking cancelled successfully',
        data: {
          our_reference: booking_reference,
          status: 'cancelled',
          cancellation_date: new Date(),
          refund: refundResult.success ? {
            refund_id: refundResult.refund_id,
            amount: refundResult.amount,
            status: refundResult.status
          } : null,
          is_test_mode: isTestMode
        }
      });

    } catch (error) {
      console.error('❌ Cancel booking error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cancel booking',
        error: error.message
      });
    }
  }
);

// ===== AMEND BOOKING =====

router.post('/amend-booking',
  authenticateToken,
  [
    body('booking_reference').notEmpty().withMessage('Booking reference is required'),
    body('dropoff_time').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid dropoff time'),
    body('pickup_time').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid pickup time'),
    body('title').optional().isIn(['Mr', 'Mrs', 'Miss', 'Ms', 'Dr']).withMessage('Invalid title'),
    body('first_name').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Invalid first name'),
    body('last_name').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Invalid last name'),
    body('customer_email').optional().isEmail().withMessage('Invalid email'),
    body('phone_number').optional().notEmpty().withMessage('Invalid phone number'),
    body('car_registration_number').optional().trim().isLength({ min: 1, max: 15 }).withMessage('Invalid registration')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const isTestMode = process.env.STRIPE_SECRET_KEY?.includes('test');
      const { booking_reference } = req.body;
      
      console.log(`✏️ Amend booking request (${isTestMode ? 'TEST' : 'LIVE'} mode)`);

      if (!Booking) {
        return res.status(500).json({
          success: false,
          message: 'Booking system not available'
        });
      }

      // Find booking
      const amendBooking = await Booking.findOne({
        our_reference: booking_reference,
        user_email: req.user.email
      });

      if (!amendBooking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found or access denied'
        });
      }

      if (amendBooking.status === 'cancelled') {
        return res.status(400).json({
          success: false,
          message: 'Cannot amend a cancelled booking'
        });
      }

      // Collect changes
      const changes = {};
      const changeLog = [];
      
      // Travel times
      if (req.body.dropoff_time && req.body.dropoff_time !== amendBooking.travel_details?.dropoff_time) {
        changes['travel_details.dropoff_time'] = req.body.dropoff_time;
        changeLog.push(`Dropoff time changed`);
      }
      
      if (req.body.pickup_time && req.body.pickup_time !== amendBooking.travel_details?.pickup_time) {
        changes['travel_details.pickup_time'] = req.body.pickup_time;
        changeLog.push(`Pickup time changed`);
      }

      // Customer details
      const customerFields = ['title', 'first_name', 'last_name', 'customer_email', 'phone_number'];
      customerFields.forEach(field => {
        if (req.body[field] && req.body[field] !== amendBooking.customer_details?.[field]) {
          changes[`customer_details.${field}`] = req.body[field];
          changeLog.push(`${field} changed`);
        }
      });

      // Vehicle details
      const vehicleFields = ['car_registration_number', 'car_make', 'car_model', 'car_color'];
      vehicleFields.forEach(field => {
        if (req.body[field] && req.body[field] !== amendBooking.vehicle_details?.[field]) {
          changes[`vehicle_details.${field}`] = req.body[field];
          changeLog.push(`${field} changed`);
        }
      });

      if (Object.keys(changes).length === 0) {
        return res.json({
          success: true,
          message: 'No changes detected'
        });
      }

      // Try MAGR amendment (optional)
      let magrAmendResult = { success: false };
      if (MagrApiService && amendBooking.magr_reference) {
        try {
          magrAmendResult = await MagrApiService.amendBooking({
            bookreference: amendBooking.magr_reference,
            company_code: amendBooking.company_code,
            ...req.body
          });
        } catch (magrError) {
          console.log('⚠️ MAGR amendment failed:', magrError.message);
        }
      }

      // Update booking in database
      const updateData = {
        ...changes,
        updated_at: new Date(),
        amendment_count: (amendBooking.amendment_count || 0) + 1
      };

      const updatedBooking = await Booking.findByIdAndUpdate(
        amendBooking._id,
        updateData,
        { new: true }
      );

      res.json({
        success: true,
        message: 'Booking amended successfully',
        data: {
          our_reference: updatedBooking.our_reference,
          amendment_count: updatedBooking.amendment_count,
          changes_applied: changeLog,
          is_test_mode: isTestMode
        }
      });

    } catch (error) {
      console.error('❌ Amend booking error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to amend booking',
        error: error.message
      });
    }
  }
);

// Stripe webhook
router.post('/stripe-webhook', 
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    try {
      const signature = req.headers['stripe-signature'];
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
      const isTestMode = process.env.STRIPE_SECRET_KEY?.includes('test');

      if (!endpointSecret) {
        return res.status(500).json({ error: 'Webhook secret not configured' });
      }

      let event;
      try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        event = stripe.webhooks.constructEvent(req.body, signature, endpointSecret);
      } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      console.log(`🔔 Webhook received (${isTestMode ? 'TEST' : 'LIVE'} mode):`, event.type);

      // Update booking statuses based on webhook
      if (Booking && event.data.object.metadata) {
        const paymentIntentId = event.data.object.id;
        
        if (event.type === 'payment_intent.succeeded') {
          await Booking.updateOne(
            { 'payment_details.stripe_payment_intent_id': paymentIntentId },
            { 
              'payment_details.payment_status': 'paid',
              'status': 'confirmed'
            }
          );
        } else if (event.type === 'payment_intent.payment_failed') {
          await Booking.updateOne(
            { 'payment_details.stripe_payment_intent_id': paymentIntentId },
            { 
              'payment_details.payment_status': 'failed',
              'status': 'payment_failed'
            }
          );
        } else if (event.type === 'refund.created') {
          const refund = event.data.object;
          await Booking.updateOne(
            { 'payment_details.stripe_payment_intent_id': refund.payment_intent },
            { 
              'payment_details.payment_status': 'refunded',
              'payment_details.refund_amount': refund.amount / 100,
              'status': 'refunded'
            }
          );
        }
      }
      
      res.json({ 
        received: true,
        event_type: event.type,
        is_test_mode: isTestMode
      });
    } catch (error) {
      console.error('❌ Webhook error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

module.exports = router;