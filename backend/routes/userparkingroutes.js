// routes/userparkingroutes.js - COMPLETE WORKING VERSION WITH CANCEL & AMEND APIs
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

// Search parking - extract company codes from API response
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
          // Add cancelable and editable flags
          is_cancelable: product.cancelable === 'Yes',
          is_editable: product.editable === 'Yes'
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

// ===== BOOKING RETRIEVAL ROUTES =====

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

// Admin: Cancel any booking by ID - WITHOUT AUTHENTICATION
router.post('/admin/bookings/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    console.log('🔨 Admin cancellation request for booking ID:', id);

    if (!Booking) {
      return res.status(500).json({
        success: false,
        message: 'Booking model not available'
      });
    }

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Booking is already cancelled'
      });
    }

    // Cancel with MAGR API if possible
    let magrCancelResult = null;
    if (MagrApiService && booking.magr_reference) {
      try {
        magrCancelResult = await MagrApiService.cancelBooking(booking.magr_reference);
        console.log('✅ MAGR cancellation result:', magrCancelResult);
      } catch (magrError) {
        console.error('⚠️ MAGR cancellation failed:', magrError.message);
        // Continue with local cancellation
      }
    }

    // Process refund if payment was made via Stripe
    let refundResult = null;
    if (booking.payment_details?.stripe_payment_intent_id) {
      try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        const refund = await stripe.refunds.create({
          payment_intent: booking.payment_details.stripe_payment_intent_id,
          reason: 'requested_by_customer',
          metadata: {
            reason: reason || 'admin_cancellation',
            booking_reference: booking.our_reference
          }
        });
        
        refundResult = {
          refund_id: refund.id,
          amount: refund.amount / 100,
          status: refund.status,
          reason: refund.reason
        };
        
        console.log('💰 Admin refund processed:', refundResult.refund_id);
      } catch (refundError) {
        console.error('❌ Admin refund failed:', refundError.message);
        // Continue with cancellation even if refund fails
      }
    }

    // Update booking status
    booking.status = 'cancelled';
    booking.cancelled_at = new Date();
    booking.notes = `${booking.notes || ''}\nAdmin cancelled: ${reason || 'No reason provided'}`;
    
    if (refundResult) {
      booking.payment_details.refund_amount = refundResult.amount;
      booking.payment_details.refund_date = new Date();
      booking.payment_details.payment_status = 'refunded';
    }

    await booking.save();

    res.json({
      success: true,
      message: 'Booking cancelled successfully by admin',
      booking_id: booking._id,
      our_reference: booking.our_reference,
      magr_reference: booking.magr_reference,
      refund: refundResult,
      magr_cancellation: magrCancelResult,
      booking_status: 'cancelled'
    });

  } catch (error) {
    console.error('❌ Admin booking cancellation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel booking',
      error: error.message
    });
  }
});

// Admin: Delete any booking by ID - WITHOUT AUTHENTICATION
router.delete('/admin/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    console.log('🗑️ Admin delete request for booking ID:', id);

    if (!Booking) {
      return res.status(500).json({
        success: false,
        message: 'Booking model not available'
      });
    }

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Store booking info before deletion
    const bookingInfo = {
      id: booking._id,
      our_reference: booking.our_reference,
      magr_reference: booking.magr_reference,
      customer_email: booking.customer_details?.customer_email,
      booking_amount: booking.booking_amount,
      status: booking.status
    };

    // Delete the booking
    await Booking.findByIdAndDelete(id);

    console.log('✅ Booking deleted by admin:', bookingInfo.our_reference);

    res.json({
      success: true,
      message: 'Booking deleted successfully by admin',
      deleted_booking: bookingInfo,
      reason: reason || 'Admin deletion',
      deleted_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Admin booking deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete booking',
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

// ===== NEW CANCEL BOOKING API =====

// Validation for cancel booking
const validateCancelBooking = [
  body('booking_reference')
    .notEmpty()
    .withMessage('Booking reference is required'),
  body('refund_amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Refund amount must be a positive number'),
  body('reason')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reason must be a string with max 500 characters')
];

// Cancel Booking API - WITH AUTHENTICATION
router.post('/cancel-booking', 
  authenticateToken,
  validateCancelBooking, 
  handleValidationErrors, 
  async (req, res) => {
    try {
      const { booking_reference, refund_amount, reason } = req.body;
      const isTestMode = process.env.STRIPE_SECRET_KEY?.includes('test');

      console.log(`🚫 CANCEL BOOKING REQUEST (${isTestMode ? 'TEST' : 'LIVE'} mode):`, {
        user: req.user.email,
        booking_reference: booking_reference,
        refund_amount: refund_amount,
        reason: reason || 'No reason provided',
        timestamp: new Date().toISOString()
      });

      if (!MagrApiService) {
        throw new Error('MAGR API Service is not available');
      }

      // Find the booking in our database
      let booking = null;
      if (Booking) {
        booking = await Booking.findOne({
          $or: [
            { our_reference: booking_reference },
            { magr_reference: booking_reference }
          ],
          user_email: req.user.email // Ensure user can only cancel their own bookings
        });

        if (!booking) {
          return res.status(404).json({
            success: false,
            message: 'Booking not found or not accessible by this user',
            error_code: 'BOOKING_NOT_FOUND'
          });
        }

        if (booking.status === 'cancelled') {
          return res.status(400).json({
            success: false,
            message: 'Booking is already cancelled',
            error_code: 'ALREADY_CANCELLED'
          });
        }

        // Check if booking is cancellable
        if (booking.service_features && booking.service_features.is_cancelable === false) {
          return res.status(400).json({
            success: false,
            message: 'This booking is non-cancellable',
            error_code: 'NON_CANCELLABLE'
          });
        }

        // Check 48 hours rule
        const dropoffDateTime = new Date(`${booking.travel_details?.dropoff_date}T${booking.travel_details?.dropoff_time}`);
        const now = new Date();
        const hoursUntilDropoff = (dropoffDateTime - now) / (1000 * 60 * 60);
        
        if (hoursUntilDropoff < 48) {
          return res.status(400).json({
            success: false,
            message: 'Booking cannot be cancelled within 48 hours of departure',
            error_code: 'WITHIN_48_HOURS',
            hours_until_dropoff: hoursUntilDropoff.toFixed(1)
          });
        }
      }

      // Prepare cancellation data for MAGR API
      const cancelData = {
        booking_ref: booking ? booking.magr_reference : booking_reference,
        refund: refund_amount || (booking ? booking.booking_amount : 0),
        agent_code: process.env.MAGR_AGENT_CODE,
        user_email: process.env.MAGR_USER_EMAIL,
        password: process.env.MAGR_PASSWORD
      };

      console.log(`🚀 Sending cancellation to MAGR API (${isTestMode ? 'TEST' : 'LIVE'} mode):`, {
        booking_ref: cancelData.booking_ref,
        refund: cancelData.refund
      });

      // Cancel with MAGR API
      const magrResult = await MagrApiService.cancelBooking(cancelData);

      if (magrResult.success) {
        // Process Stripe refund if payment was made via Stripe
        let refundResult = null;
        if (booking && booking.payment_details?.stripe_payment_intent_id) {
          try {
            console.log(`💰 Processing Stripe refund (${isTestMode ? 'TEST' : 'LIVE'} mode)...`);
            
            const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
            const refundAmountInCents = refund_amount 
              ? Math.round(parseFloat(refund_amount) * 100) 
              : undefined; // Full refund if not specified

            const refund = await stripe.refunds.create({
              payment_intent: booking.payment_details.stripe_payment_intent_id,
              amount: refundAmountInCents,
              reason: 'requested_by_customer',
              metadata: {
                reason: reason || 'booking_cancellation',
                booking_reference: booking.our_reference,
                user_email: req.user.email,
                cancelled_by: 'user',
                is_test_mode: isTestMode.toString()
              }
            });
            
            refundResult = {
              refund_id: refund.id,
              amount: refund.amount / 100,
              currency: refund.currency,
              status: refund.status,
              reason: refund.reason,
              is_test_mode: isTestMode
            };
            
            console.log(`✅ Stripe refund processed (${isTestMode ? 'TEST' : 'LIVE'} mode):`, refundResult.refund_id);
          } catch (refundError) {
            console.error(`❌ Stripe refund failed (${isTestMode ? 'TEST' : 'LIVE'} mode):`, refundError.message);
            // Don't fail the entire cancellation if refund fails
            refundResult = {
              error: refundError.message,
              status: 'failed'
            };
          }
        }

        // Update our database
        if (booking) {
          booking.status = 'cancelled';
          booking.cancelled_at = new Date();
          booking.notes = `${booking.notes || ''}\nCancelled by user: ${reason || 'No reason provided'}`;
          
          if (refundResult && refundResult.status !== 'failed') {
            booking.payment_details.refund_amount = refundResult.amount;
            booking.payment_details.refund_date = new Date();
            booking.payment_details.payment_status = 'refunded';
          }

          await booking.save();
          console.log(`✅ Booking updated in database (${isTestMode ? 'TEST' : 'LIVE'} mode):`, booking.our_reference);
        }

        // Return success response
        const responseData = {
          our_reference: booking ? booking.our_reference : booking_reference,
          magr_reference: magrResult.booking_ref || magrResult.reference,
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          refund: refundResult,
          magr_response: {
            status: magrResult.status,
            message: magrResult.message
          },
          user_email: req.user.email,
          reason: reason || 'No reason provided',
          is_test_mode: isTestMode,
          stripe_mode: isTestMode ? 'test' : 'live'
        };

        res.json({
          success: true,
          message: `Booking cancelled successfully! (${isTestMode ? 'TEST' : 'LIVE'} mode)`,
          data: responseData
        });

      } else {
        // MAGR cancellation failed
        console.error(`❌ MAGR cancellation failed (${isTestMode ? 'TEST' : 'LIVE'} mode):`, magrResult);
        
        res.status(400).json({
          success: false,
          message: `Cancellation failed: ${magrResult.message || 'Unknown error'}`,
          error: magrResult.message,
          error_code: 'MAGR_CANCELLATION_FAILED',
          is_test_mode: isTestMode
        });
      }

    } catch (error) {
      const isTestMode = process.env.STRIPE_SECRET_KEY?.includes('test');
      console.error(`❌ CANCEL BOOKING ERROR (${isTestMode ? 'TEST' : 'LIVE'} mode):`, {
        message: error.message,
        user: req.user?.email,
        booking_reference: req.body?.booking_reference,
        timestamp: new Date().toISOString()
      });
      
      res.status(500).json({
        success: false,
        message: `Failed to cancel booking (${isTestMode ? 'TEST' : 'LIVE'} mode)`,
        error: error.message,
        error_code: 'CANCELLATION_ERROR',
        is_test_mode: isTestMode,
        timestamp: new Date().toISOString()
      });
    }
  }
);

// ===== NEW AMEND BOOKING API =====

// Validation for amend booking
const validateAmendBooking = [
  body('booking_reference')
    .notEmpty()
    .withMessage('Booking reference is required'),
  body('dropoff_time')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Invalid dropoff time format (use HH:MM)'),
  body('pickup_time')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Invalid pickup time format (use HH:MM)'),
  body('title')
    .optional()
    .isIn(['Mr', 'Mrs', 'Miss', 'Ms', 'Dr'])
    .withMessage('Invalid title'),
  body('first_name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be 1-50 characters'),
  body('last_name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be 1-50 characters'),
  body('customer_email')
    .optional()
    .isEmail()
    .withMessage('Invalid email address'),
  body('phone_number')
    .optional()
    .notEmpty()
    .withMessage('Phone number cannot be empty if provided'),
  body('departure_flight_number')
    .optional()
    .isString(),
  body('arrival_flight_number')
    .optional()
    .isString(),
  body('departure_terminal')
    .optional()
    .notEmpty()
    .withMessage('Departure terminal cannot be empty if provided'),
  body('arrival_terminal')
    .optional()
    .notEmpty()
    .withMessage('Arrival terminal cannot be empty if provided'),
  body('car_registration_number')
    .optional()
    .trim()
    .isLength({ min: 1, max: 15 })
    .withMessage('Car registration must be 1-15 characters'),
  body('car_make')
    .optional()
    .trim()
    .isLength({ min: 1, max: 30 })
    .withMessage('Car make must be 1-30 characters'),
  body('car_model')
    .optional()
    .trim()
    .isLength({ min: 1, max: 30 })
    .withMessage('Car model must be 1-30 characters'),
  body('car_color')
    .optional()
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('Car color must be 1-20 characters')
];

// Amend Booking API - WITH AUTHENTICATION
router.post('/amend-booking', 
  authenticateToken,
  validateAmendBooking, 
  handleValidationErrors, 
  async (req, res) => {
    try {
      const amendData = req.body;
      const { booking_reference } = amendData;
      const isTestMode = process.env.STRIPE_SECRET_KEY?.includes('test');

      console.log(`✏️ AMEND BOOKING REQUEST (${isTestMode ? 'TEST' : 'LIVE'} mode):`, {
        user: req.user.email,
        booking_reference: booking_reference,
        amendments: Object.keys(amendData).filter(key => key !== 'booking_reference'),
        timestamp: new Date().toISOString()
      });

      if (!MagrApiService) {
        throw new Error('MAGR API Service is not available');
      }

      // Find the booking in our database
      let booking = null;
      if (Booking) {
        booking = await Booking.findOne({
          $or: [
            { our_reference: booking_reference },
            { magr_reference: booking_reference }
          ],
          user_email: req.user.email // Ensure user can only amend their own bookings
        });

        if (!booking) {
          return res.status(404).json({
            success: false,
            message: 'Booking not found or not accessible by this user',
            error_code: 'BOOKING_NOT_FOUND'
          });
        }

        if (booking.status === 'cancelled') {
          return res.status(400).json({
            success: false,
            message: 'Cannot amend a cancelled booking',
            error_code: 'BOOKING_CANCELLED'
          });
        }

        // Check if booking is editable
        if (booking.service_features && booking.service_features.is_editable === false) {
          return res.status(400).json({
            success: false,
            message: 'This booking is non-editable',
            error_code: 'NON_EDITABLE'
          });
        }

        // Check 48 hours rule
        const dropoffDateTime = new Date(`${booking.travel_details?.dropoff_date}T${booking.travel_details?.dropoff_time}`);
        const now = new Date();
        const hoursUntilDropoff = (dropoffDateTime - now) / (1000 * 60 * 60);
        
        if (hoursUntilDropoff < 48) {
          return res.status(400).json({
            success: false,
            message: 'Booking cannot be amended within 48 hours of departure',
            error_code: 'WITHIN_48_HOURS',
            hours_until_dropoff: hoursUntilDropoff.toFixed(1)
          });
        }
      }

      // Prepare amendment data for MAGR API
      // Note: According to API docs, dates cannot be changed in amend
      const magrAmendData = {
        agent_code: process.env.MAGR_AGENT_CODE,
        user_email: process.env.MAGR_USER_EMAIL,
        password: process.env.MAGR_PASSWORD,
        company_code: booking ? booking.company_code : amendData.company_code,
        bookreference: booking ? booking.magr_reference : booking_reference,
        amend_booking: "amend_booking",
        // Times can be changed
        dropoff_time: amendData.dropoff_time || (booking ? booking.travel_details?.dropoff_time : undefined),
        pickup_time: amendData.pickup_time || (booking ? booking.travel_details?.pickup_time : undefined),
        // Dates cannot be changed according to API docs
        dropoff_date: booking ? booking.travel_details?.dropoff_date : undefined,
        pickup_date: booking ? booking.travel_details?.pickup_date : undefined,
        // Customer details
        title: amendData.title || (booking ? booking.customer_details?.title : undefined),
        first_name: amendData.first_name || (booking ? booking.customer_details?.first_name : undefined),
        last_name: amendData.last_name || (booking ? booking.customer_details?.last_name : undefined),
        customer_email: amendData.customer_email || (booking ? booking.customer_details?.customer_email : undefined),
        phone_number: amendData.phone_number || (booking ? booking.customer_details?.phone_number : undefined),
        // Flight details
        departure_flight_number: amendData.departure_flight_number || (booking ? booking.travel_details?.departure_flight_number : 'TBA'),
        arrival_flight_number: amendData.arrival_flight_number || (booking ? booking.travel_details?.arrival_flight_number : 'TBA'),
        departure_terminal: amendData.departure_terminal || (booking ? booking.travel_details?.departure_terminal : undefined),
        arrival_terminal: amendData.arrival_terminal || (booking ? booking.travel_details?.arrival_terminal : undefined),
        // Vehicle details
        car_registration_number: amendData.car_registration_number?.toUpperCase() || (booking ? booking.vehicle_details?.car_registration_number : undefined),
        car_make: amendData.car_make || (booking ? booking.vehicle_details?.car_make : undefined),
        car_model: amendData.car_model || (booking ? booking.vehicle_details?.car_model : undefined),
        car_color: amendData.car_color || (booking ? booking.vehicle_details?.car_color : undefined),
        // Fixed values from original booking
        park_api: "b2b",
        passenger: booking ? booking.travel_details?.passenger_count || 1 : 1,
        paymentgateway: booking ? booking.payment_details?.payment_method || 'Stripe' : 'Stripe',
        payment_token: booking ? booking.payment_details?.payment_token : undefined,
        booking_amount: booking ? booking.booking_amount : undefined
      };

      console.log(`🚀 Sending amendment to MAGR API (${isTestMode ? 'TEST' : 'LIVE'} mode):`, {
        bookreference: magrAmendData.bookreference,
        company_code: magrAmendData.company_code,
        changes: Object.keys(amendData).filter(key => key !== 'booking_reference')
      });

      // Amend with MAGR API
      const magrResult = await MagrApiService.amendBooking(magrAmendData);

      if (magrResult.success) {
        // Update our database
        if (booking) {
          // Update customer details if provided
          if (amendData.title) booking.customer_details.title = amendData.title;
          if (amendData.first_name) booking.customer_details.first_name = amendData.first_name;
          if (amendData.last_name) booking.customer_details.last_name = amendData.last_name;
          if (amendData.customer_email) booking.customer_details.customer_email = amendData.customer_email;
          if (amendData.phone_number) booking.customer_details.phone_number = amendData.phone_number;

          // Update travel details if provided
          if (amendData.dropoff_time) booking.travel_details.dropoff_time = amendData.dropoff_time;
          if (amendData.pickup_time) booking.travel_details.pickup_time = amendData.pickup_time;
          if (amendData.departure_flight_number) booking.travel_details.departure_flight_number = amendData.departure_flight_number;
          if (amendData.arrival_flight_number) booking.travel_details.arrival_flight_number = amendData.arrival_flight_number;
          if (amendData.departure_terminal) booking.travel_details.departure_terminal = amendData.departure_terminal;
          if (amendData.arrival_terminal) booking.travel_details.arrival_terminal = amendData.arrival_terminal;

          // Update vehicle details if provided
          if (amendData.car_registration_number) booking.vehicle_details.car_registration_number = amendData.car_registration_number.toUpperCase();
          if (amendData.car_make) booking.vehicle_details.car_make = amendData.car_make;
          if (amendData.car_model) booking.vehicle_details.car_model = amendData.car_model;
          if (amendData.car_color) booking.vehicle_details.car_color = amendData.car_color;

          // Update metadata
          booking.updated_at = new Date();
          booking.notes = `${booking.notes || ''}\nAmended by user: ${Object.keys(amendData).filter(key => key !== 'booking_reference').join(', ')}`;

          await booking.save();
          console.log(`✅ Booking updated in database (${isTestMode ? 'TEST' : 'LIVE'} mode):`, booking.our_reference);
        }

        // Return success response
        const responseData = {
          our_reference: booking ? booking.our_reference : booking_reference,
          magr_reference: magrResult.reference || magrResult.booking_ref,
          status: 'amended',
          amended_at: new Date().toISOString(),
          magr_response: {
            status: magrResult.status,
            message: magrResult.message
          },
          user_email: req.user.email,
          amended_fields: Object.keys(amendData).filter(key => key !== 'booking_reference'),
          is_test_mode: isTestMode,
          stripe_mode: isTestMode ? 'test' : 'live',
          // Include updated booking data
          updated_booking: booking ? {
            customer_details: booking.customer_details,
            travel_details: booking.travel_details,
            vehicle_details: booking.vehicle_details
          } : null
        };

        res.json({
          success: true,
          message: `Booking amended successfully! (${isTestMode ? 'TEST' : 'LIVE'} mode)`,
          data: responseData
        });

      } else {
        // MAGR amendment failed
        console.error(`❌ MAGR amendment failed (${isTestMode ? 'TEST' : 'LIVE'} mode):`, magrResult);
        
        res.status(400).json({
          success: false,
          message: `Amendment failed: ${magrResult.message || 'Unknown error'}`,
          error: magrResult.message,
          error_code: 'MAGR_AMENDMENT_FAILED',
          is_test_mode: isTestMode
        });
      }

    } catch (error) {
      const isTestMode = process.env.STRIPE_SECRET_KEY?.includes('test');
      console.error(`❌ AMEND BOOKING ERROR (${isTestMode ? 'TEST' : 'LIVE'} mode):`, {
        message: error.message,
        user: req.user?.email,
        booking_reference: req.body?.booking_reference,
        timestamp: new Date().toISOString()
      });
      
      res.status(500).json({
        success: false,
        message: `Failed to amend booking (${isTestMode ? 'TEST' : 'LIVE'} mode)`,
        error: error.message,
        error_code: 'AMENDMENT_ERROR',
        is_test_mode: isTestMode,
        timestamp: new Date().toISOString()
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

      // ✅ THE ONLY FIX YOU NEED: Add try-catch around Stripe API call
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
    body('booking_amount').isFloat({ min: 0 }).withMessage('Booking amount must be a positive number'),
    body('payment_intent_id').notEmpty().withMessage('Payment intent ID is required')
  ],
  handleValidationErrors, 
  async (req, res) => {
    try {
      const bookingData = req.body;
      const { payment_intent_id } = bookingData;
      const isTestMode = process.env.STRIPE_SECRET_KEY?.includes('test');

      console.log(`🎫 BOOKING WITH PAYMENT REQUEST (${isTestMode ? 'TEST' : 'LIVE'} mode):`, {
        user: req.user.email,
        company_code: bookingData.company_code,
        payment_intent_id: payment_intent_id,
        amount: bookingData.booking_amount,
        mode: isTestMode ? 'TEST' : 'LIVE',
        timestamp: new Date().toISOString()
      });

      // Check services availability
      if (!MagrApiService) {
        throw new Error('MAGR API Service is not available');
      }

      // Step 1: Verify payment FIRST using direct Stripe API
      let paymentDetails = null;
      try {
        console.log(`💳 Verifying Stripe payment before booking (${isTestMode ? 'TEST' : 'LIVE'} mode)...`);
        
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);
        
        paymentDetails = {
          status: paymentIntent.status,
          amount: paymentIntent.amount / 100, // Convert from cents
          currency: paymentIntent.currency,
          metadata: paymentIntent.metadata,
          is_paid: paymentIntent.status === 'succeeded',
          created: new Date(paymentIntent.created * 1000),
          customer_id: paymentIntent.customer
        };
        
        console.log(`💳 Payment verification result (${isTestMode ? 'TEST' : 'LIVE'} mode):`, {
          status: paymentDetails.status,
          amount: paymentDetails.amount,
          currency: paymentDetails.currency,
          is_paid: paymentDetails.is_paid,
          mode: isTestMode ? 'TEST' : 'LIVE'
        });
        
        if (!paymentDetails.is_paid) {
          throw new Error(`Payment not completed. Status: ${paymentDetails.status}. Please complete payment first.`);
        }

        // Verify payment amount matches booking amount
        const paidAmount = paymentDetails.amount;
        const bookingAmount = parseFloat(bookingData.booking_amount);
        
        if (Math.abs(paidAmount - bookingAmount) > 0.01) { // Allow for small rounding differences
          throw new Error(`Payment amount mismatch. Paid: £${paidAmount}, Required: £${bookingAmount}`);
        }

        console.log(`✅ Payment verified successfully (${isTestMode ? 'TEST' : 'LIVE'} mode)`);
        
      } catch (paymentError) {
        console.error(`❌ Payment verification failed (${isTestMode ? 'TEST' : 'LIVE'} mode):`, paymentError.message);
        return res.status(400).json({
          success: false,
          message: 'Payment verification failed',
          error: paymentError.message,
          payment_required: true,
          is_test_mode: isTestMode,
          error_code: 'PAYMENT_VERIFICATION_FAILED'
        });
      }

      // Step 2: Generate booking reference
      const ourBookingRef = `${isTestMode ? 'TEST-' : ''}PKY-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      // Step 3: Prepare booking data for MAGR API
      const magrBookingData = {
        agent_code: process.env.MAGR_AGENT_CODE,
        user_email: process.env.MAGR_USER_EMAIL || bookingData.customer_email,
        password: process.env.MAGR_PASSWORD,
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

      console.log(`🚀 Sending PAID booking to MAGR API (${isTestMode ? 'TEST' : 'LIVE'} mode):`, {
        company_code: magrBookingData.company_code,
        bookreference: magrBookingData.bookreference,
        customer_email: magrBookingData.customer_email,
        booking_amount: magrBookingData.booking_amount,
        payment_method: 'Stripe',
        mode: isTestMode ? 'TEST' : 'LIVE'
      });

      // Step 4: Create booking with MAGR API
      const magrResult = await MagrApiService.createBooking(magrBookingData);

      if (magrResult.success) {
        // Step 5: Save booking to OUR database with payment information
        let savedBooking = null;
        let databaseSaveSuccess = false;
        
        if (Booking) {
          console.log(`💾 Saving PAID booking to database (${isTestMode ? 'TEST' : 'LIVE'} mode)...`);
          
          try {
            savedBooking = new Booking({
              // Booking References
              our_reference: ourBookingRef,
              magr_reference: magrResult.data?.reference || magrResult.reference,
              booking_id: magrResult.data?.booking_id,
              
              // User Information
              user_id: req.user._id,
              user_email: req.user.email,
              
              // Service Details
              company_code: bookingData.company_code,
              product_name: bookingData.product_name || 'Airport Parking Service',
              product_code: bookingData.product_code || bookingData.company_code,
              airport_code: bookingData.airport_code,
              parking_type: bookingData.parking_type || 'Meet & Greet',
              
              // Financial Details
              booking_amount: parseFloat(bookingData.booking_amount),
              commission_percentage: parseFloat(bookingData.commission_percentage || 0),
              currency: paymentDetails?.currency?.toUpperCase() || 'GBP',
              
              // Customer Details
              customer_details: {
                title: bookingData.title,
                first_name: bookingData.first_name,
                last_name: bookingData.last_name,
                customer_email: bookingData.customer_email,
                phone_number: bookingData.phone_number
              },
              
              // Travel Details
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
              
              // Vehicle Details
              vehicle_details: {
                car_registration_number: bookingData.car_registration_number.toUpperCase(),
                car_make: bookingData.car_make,
                car_model: bookingData.car_model,
                car_color: bookingData.car_color
              },
              
              // Payment Details
              payment_details: {
                payment_method: 'Stripe',
                payment_token: payment_intent_id,
                payment_status: 'paid', // Payment is already confirmed
                payment_reference: payment_intent_id,
                stripe_payment_intent_id: payment_intent_id,
                stripe_amount: paymentDetails?.amount,
                stripe_currency: paymentDetails?.currency,
                stripe_customer_id: paymentDetails?.customer_id || null,
                payment_date: paymentDetails?.created,
                payment_confirmed_at: new Date(),
                is_test_payment: isTestMode // Track if this was a test payment
              },
              
              // Service Features
              service_features: {
                is_cancelable: bookingData.is_cancelable !== false,
                is_editable: bookingData.is_editable !== false,
                special_features: bookingData.special_features || []
              },
              
              // Status and Response
              status: 'confirmed',
              magr_response: magrResult,
              notes: `${isTestMode ? '[TEST] ' : ''}Paid booking created via Stripe by ${req.user.email}. Payment ID: ${payment_intent_id}`
            });

            await savedBooking.save();
            databaseSaveSuccess = true;
            
            console.log(`✅ PAID booking saved to database (${isTestMode ? 'TEST' : 'LIVE'} mode):`, {
              bookingId: savedBooking._id,
              ourReference: savedBooking.our_reference,
              magrReference: savedBooking.magr_reference,
              paymentIntentId: payment_intent_id,
              amount: savedBooking.booking_amount,
              paymentStatus: 'paid',
              isTestPayment: isTestMode
            });
            
          } catch (dbError) {
            console.error(`❌ Database save failed for PAID booking (${isTestMode ? 'TEST' : 'LIVE'} mode):`, {
              error: dbError.message,
              name: dbError.name,
              payment_intent_id: payment_intent_id,
              magr_reference: magrResult.reference
            });
          }
        }

        // Step 6: Return success response
        const responseData = {
          our_reference: ourBookingRef,
          magr_reference: magrResult.data?.reference || magrResult.reference,
          booking_id: magrResult.data?.booking_id,
          payment_intent_id: payment_intent_id,
          payment_status: 'paid',
          payment_amount: paymentDetails?.amount,
          payment_currency: paymentDetails?.currency,
          status: 'confirmed',
          database_saved: databaseSaveSuccess,
          database_id: savedBooking?._id,
          user_email: req.user.email,
          created_at: savedBooking?.created_at || new Date().toISOString(),
          customer_name: `${bookingData.title} ${bookingData.first_name} ${bookingData.last_name}`,
          service: bookingData.product_name || 'Airport Parking Service',
          airport: bookingData.airport_code,
          company_code: bookingData.company_code,
          total_amount: parseFloat(bookingData.booking_amount),
          commission: savedBooking?.commission_amount || 0,
          travel_details: {
            dropoff_date: bookingData.dropoff_date,
            dropoff_time: bookingData.dropoff_time,
            pickup_date: bookingData.pickup_date,
            pickup_time: bookingData.pickup_time,
            departure_terminal: bookingData.departure_terminal,
            arrival_terminal: bookingData.arrival_terminal
          },
          vehicle_details: {
            registration: bookingData.car_registration_number.toUpperCase(),
            make_model: `${bookingData.car_make} ${bookingData.car_model}`,
            color: bookingData.car_color
          },
          payment_metadata: paymentDetails?.metadata || {},
          is_test_mode: isTestMode,
          stripe_mode: isTestMode ? 'test' : 'live'
        };

        res.json({
          success: true,
          message: `Booking created successfully with payment! (${isTestMode ? 'TEST' : 'LIVE'} mode)`,
          data: responseData
        });

      } else {
        // MAGR booking failed - REFUND the payment automatically
        console.error(`❌ MAGR booking failed (${isTestMode ? 'TEST' : 'LIVE'} mode), initiating refund...`);
        
        try {
          const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
          const refund = await stripe.refunds.create({
            payment_intent: payment_intent_id,
            reason: 'requested_by_customer',
            metadata: {
              reason: 'booking_failed',
              original_booking_ref: ourBookingRef
            }
          });
          
          console.log(`💰 Payment refunded due to booking failure (${isTestMode ? 'TEST' : 'LIVE'} mode):`, refund.id);
          
          return res.status(500).json({
            success: false,
            message: `Booking failed: ${magrResult.message}. Your payment has been automatically refunded. (${isTestMode ? 'TEST' : 'LIVE'} mode)`,
            refund_id: refund.id,
            refund_status: refund.status,
            refund_amount: refund.amount / 100,
            is_test_mode: isTestMode,
            error_code: 'BOOKING_FAILED_REFUNDED'
          });
        } catch (refundError) {
          console.error(`❌ CRITICAL: Booking failed AND refund failed! (${isTestMode ? 'TEST' : 'LIVE'} mode)`, refundError.message);
          
          return res.status(500).json({
            success: false,
            message: `Booking failed: ${magrResult.message}. CRITICAL: Automatic refund failed. Please contact support immediately. (${isTestMode ? 'TEST' : 'LIVE'} mode)`,
            payment_intent_id: payment_intent_id,
            refund_error: refundError.message,
            requires_manual_refund: true,
            is_test_mode: isTestMode,
            error_code: 'BOOKING_FAILED_REFUND_FAILED'
          });
        }
      }

    } catch (error) {
      const isTestMode = process.env.STRIPE_SECRET_KEY?.includes('test');
      console.error(`❌ BOOKING WITH PAYMENT ERROR (${isTestMode ? 'TEST' : 'LIVE'} mode):`, {
        message: error.message,
        user: req.user?.email,
        payment_intent_id: req.body?.payment_intent_id,
        mode: isTestMode ? 'TEST' : 'LIVE',
        timestamp: new Date().toISOString()
      });
      
      res.status(500).json({
        success: false,
        message: `Failed to create booking with payment (${isTestMode ? 'TEST' : 'LIVE'} mode)`,
        error: error.message,
        is_test_mode: isTestMode,
        timestamp: new Date().toISOString(),
        error_code: 'BOOKING_CREATION_FAILED'
      });
    }
  }
);

// ===== STRIPE WEBHOOK - ENHANCED WITH TEST MODE =====

// Stripe webhook handler
router.post('/stripe-webhook', 
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    try {
      const signature = req.headers['stripe-signature'];
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
      const isTestMode = process.env.STRIPE_SECRET_KEY?.includes('test');

      if (!endpointSecret) {
        console.error(`❌ Stripe webhook secret not configured (${isTestMode ? 'TEST' : 'LIVE'} mode)`);
        return res.status(500).json({ error: 'Webhook secret not configured' });
      }

      let event;
      try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        event = stripe.webhooks.constructEvent(req.body, signature, endpointSecret);
        console.log(`✅ Webhook signature verified (${isTestMode ? 'TEST' : 'LIVE'} mode)`);
      } catch (err) {
        console.error(`❌ Webhook signature verification failed (${isTestMode ? 'TEST' : 'LIVE'} mode):`, err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      console.log(`🔔 Stripe webhook received (${isTestMode ? 'TEST' : 'LIVE'} mode):`, {
        type: event.type,
        id: event.id,
        object_id: event.data.object.id,
        mode: isTestMode ? 'TEST' : 'LIVE'
      });

      // Handle the event
      let result = { received: true, processed: false };
      
      // If booking model is available, update booking statuses based on webhook
      if (Booking && event.data.object.metadata) {
        try {
          await updateBookingFromWebhook(event, result, isTestMode);
          result.processed = true;
        } catch (dbError) {
          console.error(`❌ Failed to update booking from webhook (${isTestMode ? 'TEST' : 'LIVE'} mode):`, dbError.message);
          // Don't fail the webhook response for database errors
        }
      }
      
      res.json({ 
        received: true, 
        result: result,
        event_type: event.type,
        is_test_mode: isTestMode,
        stripe_mode: isTestMode ? 'test' : 'live',
        processed_at: new Date().toISOString()
      });
    } catch (error) {
      const isTestMode = process.env.STRIPE_SECRET_KEY?.includes('test');
      console.error(`❌ Webhook handling error (${isTestMode ? 'TEST' : 'LIVE'} mode):`, error);
      res.status(500).json({
        success: false,
        error: error.message,
        is_test_mode: isTestMode
      });
    }
  }
);

// Enhanced helper function to update bookings from webhooks
const updateBookingFromWebhook = async (event, webhookResult, isTestMode) => {
  const paymentIntentId = event.data.object.id;
  
  if (event.type === 'payment_intent.succeeded') {
    await Booking.updateOne(
      { 'payment_details.stripe_payment_intent_id': paymentIntentId },
      { 
        'payment_details.payment_status': 'paid',
        'payment_details.payment_confirmed_at': new Date(),
        'payment_details.is_test_payment': isTestMode,
        'status': 'confirmed',
        'notes': `${isTestMode ? '[TEST] ' : ''}Payment confirmed via webhook`
      }
    );
    console.log(`✅ Booking payment status updated to paid (${isTestMode ? 'TEST' : 'LIVE'} mode)`);
    
  } else if (event.type === 'payment_intent.payment_failed') {
    await Booking.updateOne(
      { 'payment_details.stripe_payment_intent_id': paymentIntentId },
      { 
        'payment_details.payment_status': 'failed',
        'payment_details.is_test_payment': isTestMode,
        'status': 'payment_failed',
        'notes': `${isTestMode ? '[TEST] ' : ''}Payment failed via webhook`
      }
    );
    console.log(`❌ Booking payment status updated to failed (${isTestMode ? 'TEST' : 'LIVE'} mode)`);
    
  } else if (event.type === 'refund.created') {
    const refund = event.data.object;
    await Booking.updateOne(
      { 'payment_details.stripe_payment_intent_id': refund.payment_intent },
      { 
        'payment_details.payment_status': 'refunded',
        'payment_details.refund_amount': refund.amount / 100,
        'payment_details.refund_date': new Date(),
        'payment_details.is_test_payment': isTestMode,
        'status': 'refunded',
        'notes': `${isTestMode ? '[TEST] ' : ''}Refund processed via webhook`
      }
    );
    console.log(`💰 Booking refund status updated (${isTestMode ? 'TEST' : 'LIVE'} mode)`);
  }
};

// ===== USER BOOKING MANAGEMENT ROUTES - ENHANCED =====

// Get user's bookings with enhanced payment information
if (Booking) {
  router.get('/my-bookings', authenticateToken, async (req, res) => {
    try {
      console.log('📋 Getting bookings for user:', req.user.email);
      
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
          company_code: booking.company_code,
          product_name: booking.product_name,
          customer_name: booking.customer_full_name,
          customer_email: booking.customer_details?.customer_email,
          booking_amount: booking.booking_amount,
          commission_amount: booking.commission_amount,
          currency: booking.currency,
          // Enhanced payment information
          payment_method: booking.payment_details?.payment_method,
          payment_status: booking.payment_details?.payment_status,
          stripe_payment_intent_id: booking.payment_details?.stripe_payment_intent_id,
          stripe_customer_id: booking.payment_details?.stripe_customer_id,
          refund_amount: booking.payment_details?.refund_amount || 0,
          payment_date: booking.payment_details?.payment_date,
          is_test_payment: booking.payment_details?.is_test_payment || false,
          // Travel details
          dropoff_date: booking.travel_details?.dropoff_date,
          dropoff_time: booking.travel_details?.dropoff_time,
          pickup_date: booking.travel_details?.pickup_date,
          pickup_time: booking.travel_details?.pickup_time,
          // Vehicle details
          vehicle_registration: booking.vehicle_details?.car_registration_number,
          // Service features
          is_cancelable: booking.service_features?.is_cancelable,
          is_editable: booking.service_features?.is_editable,
          // Metadata
          created_at: booking.created_at,
          can_cancel: booking.canBeCancelled && booking.canBeCancelled(),
          can_edit: booking.canBeAmended && booking.canBeAmended(),
          can_refund: booking.canBeRefunded && booking.canBeRefunded(),
          is_paid: booking.payment_details?.payment_status === 'paid',
          is_refunded: booking.payment_details?.payment_status === 'refunded'
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

  // Get specific booking details with enhanced payment information
  router.get('/bookings/:reference', authenticateToken, async (req, res) => {
    try {
      const { reference } = req.params;
      console.log('📋 Getting booking details for:', reference);
      
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
      
      // Get enhanced payment details if available
      let stripePaymentDetails = null;
      if (booking.payment_details?.stripe_payment_intent_id) {
        try {
          const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
          const paymentIntent = await stripe.paymentIntents.retrieve(booking.payment_details.stripe_payment_intent_id);
          
          stripePaymentDetails = {
            status: paymentIntent.status,
            amount: paymentIntent.amount / 100,
            currency: paymentIntent.currency,
            created: new Date(paymentIntent.created * 1000),
            last_payment_error: paymentIntent.last_payment_error
          };
        } catch (error) {
          console.warn('⚠️ Could not fetch Stripe payment details:', error.message);
        }
      }
      
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
          service_features: booking.service_features, // Include cancelable/editable flags
          booking_amount: booking.booking_amount,
          currency: booking.currency,
          created_at: booking.created_at,
          updated_at: booking.updated_at
        },
        payment_details: {
          method: booking.payment_details?.payment_method,
          status: booking.payment_details?.payment_status,
          stripe_payment_intent_id: booking.payment_details?.stripe_payment_intent_id,
          amount: booking.payment_details?.stripe_amount,
          currency: booking.payment_details?.stripe_currency,
          refund_amount: booking.payment_details?.refund_amount,
          payment_date: booking.payment_details?.payment_date,
          is_test_payment: booking.payment_details?.is_test_payment || false
        },
        stripe_details: stripePaymentDetails,
        can_cancel: booking.canBeCancelled && booking.canBeCancelled(),
        can_edit: booking.canBeAmended && booking.canBeAmended(),
        can_refund: booking.canBeRefunded && booking.canBeRefunded(),
        raw_data: booking
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

  // Cancel booking with enhanced refund handling (LEGACY - kept for backward compatibility)
  router.post('/bookings/:reference/cancel', authenticateToken, async (req, res) => {
    try {
      const { reference } = req.params;
      const { reason } = req.body;

      console.log('❌ Legacy cancellation request for booking:', reference);

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

      if (booking.status === 'cancelled') {
        return res.status(400).json({
          success: false,
          message: 'Booking is already cancelled'
        });
      }

      // Cancel with MAGR API
      const cancelResult = await MagrApiService.cancelBooking(booking.magr_reference);

      if (cancelResult.success) {
        // Process refund if payment was made via Stripe
        let refundResult = null;
        if (booking.payment_details?.stripe_payment_intent_id) {
          try {
            const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
            const refund = await stripe.refunds.create({
              payment_intent: booking.payment_details.stripe_payment_intent_id,
              reason: 'requested_by_customer',
              metadata: {
                booking_reference: booking.our_reference,
                reason: reason || 'cancelled_by_customer'
              }
            });
            
            refundResult = {
              refund_id: refund.id,
              amount: refund.amount / 100,
              status: refund.status,
              reason: refund.reason,
              is_test_mode: process.env.STRIPE_SECRET_KEY?.includes('test') || false
            };
            
            console.log('💰 Refund processed:', refundResult.refund_id);
          } catch (refundError) {
            console.error('❌ Refund failed:', refundError.message);
            // Don't fail the entire cancellation if refund fails
          }
        }

        // Update booking status
        booking.status = 'cancelled';
        booking.cancelled_at = new Date();
        booking.notes = `${booking.notes || ''}\nCancelled by user: ${reason || 'No reason provided'}`;
        
        if (refundResult) {
          booking.payment_details.refund_amount = refundResult.amount;
          booking.payment_details.refund_date = new Date();
          booking.payment_details.payment_status = 'refunded';
        }

        await booking.save();

        res.json({
          success: true,
          message: 'Booking cancelled successfully',
          refund: refundResult,
          booking_status: 'cancelled'
        });
      } else {
        throw new Error(cancelResult.message || 'Cancellation failed');
      }

    } catch (error) {
      console.error('❌ Error cancelling booking:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cancel booking',
        error: error.message
      });
    }
  });

  // User: Delete their own booking
  router.delete('/my-bookings/:reference', authenticateToken, async (req, res) => {
    try {
      const { reference } = req.params;
      const { reason } = req.body;

      console.log('🗑️ User delete request for booking:', reference, 'by user:', req.user.email);

      const booking = await Booking.findOne({
        $or: [
          { our_reference: reference },
          { magr_reference: reference }
        ],
        user_email: req.user.email // Only allow users to delete their own bookings
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found or not accessible'
        });
      }

      // Store booking info before deletion
      const bookingInfo = {
        id: booking._id,
        our_reference: booking.our_reference,
        magr_reference: booking.magr_reference,
        customer_email: booking.customer_details?.customer_email,
        booking_amount: booking.booking_amount,
        status: booking.status,
        user_email: booking.user_email,
        is_test_payment: booking.payment_details?.is_test_payment || false
      };

      // Only allow deletion of cancelled bookings to prevent data loss
      if (booking.status !== 'cancelled') {
        return res.status(400).json({
          success: false,
          message: 'Only cancelled bookings can be deleted. Please cancel the booking first.',
          current_status: booking.status,
          booking_reference: booking.our_reference
        });
      }

      // Delete the booking
      await Booking.findByIdAndDelete(booking._id);

      console.log('✅ Booking deleted by user:', bookingInfo.our_reference);

      res.json({
        success: true,
        message: 'Booking deleted successfully',
        deleted_booking: bookingInfo,
        reason: reason || 'User deletion',
        deleted_at: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ User booking deletion error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete booking',
        error: error.message
      });
    }
  });

  // Manual refund endpoint for user bookings
  router.post('/bookings/:reference/refund', authenticateToken, async (req, res) => {
    try {
      const { reference } = req.params;
      const { amount, reason } = req.body;

      console.log('💰 Manual refund request for booking:', reference);

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

      if (booking.payment_details?.payment_status === 'refunded') {
        return res.status(400).json({
          success: false,
          message: 'Booking has already been refunded'
        });
      }

      if (!booking.payment_details?.stripe_payment_intent_id) {
        return res.status(400).json({
          success: false,
          message: 'No Stripe payment found for this booking'
        });
      }

      // Process refund
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      const refundAmount = amount ? Math.round(parseFloat(amount) * 100) : undefined; // Convert to cents or full refund
      
      const refund = await stripe.refunds.create({
        payment_intent: booking.payment_details.stripe_payment_intent_id,
        amount: refundAmount,
        reason: 'requested_by_customer',
        metadata: {
          booking_reference: booking.our_reference,
          reason: reason || 'customer_request'
        }
      });

      // Update booking
      const refundAmountInPounds = refund.amount / 100;
      booking.payment_details.refund_amount = (booking.payment_details.refund_amount || 0) + refundAmountInPounds;
      booking.payment_details.refund_date = new Date();
      booking.payment_details.payment_status = booking.payment_details.refund_amount >= booking.booking_amount ? 'refunded' : 'partially_refunded';
      booking.notes = `${booking.notes || ''}\nRefund processed: £${refundAmountInPounds} - ${reason || 'No reason provided'}`;

      await booking.save();

      res.json({
        success: true,
        message: 'Refund processed successfully',
        refund: {
          refund_id: refund.id,
          amount: refundAmountInPounds,
          status: refund.status,
          total_refunded: booking.payment_details.refund_amount,
          is_test_mode: process.env.STRIPE_SECRET_KEY?.includes('test') || false
        }
      });

    } catch (error) {
      console.error('❌ Error processing refund:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process refund',
        error: error.message
      });
    }
  });
}

module.exports = router;