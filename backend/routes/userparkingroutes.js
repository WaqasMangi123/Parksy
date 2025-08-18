// routes/userparkingroutes.js - ENHANCED STRIPE INTEGRATION WITH PAYMENT BEFORE BOOKING
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

// ===== PUBLIC ROUTES (NO AUTHENTICATION REQUIRED) =====

// Health check endpoint - ENHANCED with Stripe health check
router.get('/health', async (req, res) => {
  console.log('🏥 Parking API health check requested');
  
  // Basic service status
  const healthStatus = {
    success: true,
    message: 'Parking API is healthy',
    timestamp: new Date().toISOString(),
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
    }
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

// Get Stripe publishable key for frontend - ENHANCED
router.get('/stripe-config', (req, res) => {
  try {
    if (!StripeService) {
      throw new Error('Stripe service not available');
    }

    if (!process.env.STRIPE_PUBLISHABLE_KEY) {
      throw new Error('Stripe publishable key not configured');
    }

    // Use the enhanced getPublicConfig method
    const config = StripeService.getPublicConfig();

    res.json({
      success: true,
      ...config,
      stripe_mode: process.env.STRIPE_SECRET_KEY?.includes('test') ? 'test' : 'live',
      features: {
        payment_intents: true,
        automatic_payment_methods: true,
        refunds: true,
        webhooks: !!process.env.STRIPE_WEBHOOK_SECRET
      }
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
          facilities_list: product.facilities ? product.facilities.split(',') : []
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

// ===== PROTECTED ROUTES (AUTHENTICATION REQUIRED) =====

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  try {
    let token = req.body.token || req.body.auth_token;
    
    const authHeader = req.headers['authorization'];
    if (!token && authHeader && authHeader.split(' ')[1]) {
      token = authHeader.split(' ')[1];
    }

    console.log('🔍 Authentication check:', {
      tokenFromBody: !!req.body.token,
      tokenFromAuthToken: !!req.body.auth_token,
      tokenFromHeader: !!authHeader,
      tokenFound: !!token
    });

    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({
        success: false,
        message: 'Access token required. Please log in to make bookings.',
        requireAuth: true
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET not configured');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error: JWT_SECRET missing'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('🔐 Token decoded for user:', decoded.email || decoded.id);

    if (!User) {
      console.error('❌ User model not available');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error: User model not available'
      });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      console.log('❌ User not found for token');
      return res.status(401).json({
        success: false,
        message: 'User not found. Please log in again.',
        requireAuth: true
      });
    }

    if (!user.verified) {
      console.log('❌ User email not verified');
      return res.status(403).json({
        success: false,
        message: 'Please verify your email address before making bookings.',
        requireVerification: true,
        user_email: user.email
      });
    }

    req.user = user;
    console.log('✅ User authenticated:', user.email);
    next();
  } catch (error) {
    console.error('❌ Auth error:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Your session has expired. Please log in again.',
        requireAuth: true,
        expired: true
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({
        success: false,
        message: 'Invalid session token. Please log in again.',
        requireAuth: true,
        invalid: true
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Authentication system error',
      error: error.message
    });
  }
};

// ===== STRIPE PAYMENT ROUTES =====

// Step 1: Create payment intent BEFORE booking form submission - ENHANCED
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
      console.log('💳 Creating payment intent for user:', req.user.email);

      if (!StripeService) {
        throw new Error('Stripe service not available');
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
      const tempBookingRef = `TEMP-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      // Prepare enhanced payment data for the updated service
      const paymentData = {
        amount: parseFloat(amount),
        currency: currency,
        customer_email: req.user.email,
        our_reference: tempBookingRef,
        temp_booking_reference: tempBookingRef, // Added for enhanced service
        service_name: service_name,
        airport_code: airport_code,
        company_code: company_code,
        dropoff_date: dropoff_date,
        pickup_date: pickup_date
      };

      console.log('🚀 Creating Stripe payment intent:', {
        amount: paymentData.amount,
        currency: paymentData.currency,
        user: req.user.email,
        service: service_name
      });

      // Create Stripe payment intent using enhanced service
      const paymentResult = await StripeService.createPaymentIntent(paymentData);

      res.json({
        success: true,
        client_secret: paymentResult.client_secret,
        payment_intent_id: paymentResult.payment_intent_id,
        amount: paymentData.amount,
        currency: paymentData.currency,
        temp_booking_reference: tempBookingRef,
        stripe_publishable_key: process.env.STRIPE_PUBLISHABLE_KEY, // For frontend convenience
        message: 'Payment intent created successfully'
      });

    } catch (error) {
      console.error('❌ Payment intent creation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create payment intent',
        error: error.message
      });
    }
  }
);

// Step 2: Verify payment status before proceeding with booking - ENHANCED
router.get('/verify-payment/:payment_intent_id', 
  authenticateToken,
  async (req, res) => {
    try {
      if (!StripeService) {
        throw new Error('Stripe service not available');
      }

      const { payment_intent_id } = req.params;
      
      console.log('🔍 Verifying payment for user:', req.user.email, 'Payment ID:', payment_intent_id);

      // Use enhanced getPaymentDetails method
      const paymentDetails = await StripeService.getPaymentDetails(payment_intent_id);

      res.json({
        success: true,
        payment_intent_id: payment_intent_id,
        payment_status: paymentDetails.status,
        amount: paymentDetails.amount,
        currency: paymentDetails.currency,
        metadata: paymentDetails.metadata,
        is_paid: paymentDetails.is_paid, // Enhanced field from updated service
        created: paymentDetails.created,
        last_payment_error: paymentDetails.last_payment_error
      });

    } catch (error) {
      console.error('❌ Payment verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify payment',
        error: error.message
      });
    }
  }
);

// ENHANCED: Get payment and refund details
router.get('/payment-details/:payment_intent_id', 
  authenticateToken,
  async (req, res) => {
    try {
      if (!StripeService) {
        throw new Error('Stripe service not available');
      }

      const { payment_intent_id } = req.params;
      
      console.log('🔍 Getting detailed payment info for:', payment_intent_id);

      // Get payment details
      const paymentDetails = await StripeService.getPaymentDetails(payment_intent_id);
      
      // Get refund information if any
      const refunds = await StripeService.getRefunds(payment_intent_id);

      res.json({
        success: true,
        payment: paymentDetails,
        refunds: refunds,
        summary: {
          original_amount: paymentDetails.amount,
          refunded_amount: refunds.total_refunded,
          net_amount: paymentDetails.amount - refunds.total_refunded,
          is_fully_refunded: refunds.total_refunded >= paymentDetails.amount
        }
      });

    } catch (error) {
      console.error('❌ Error getting payment details:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get payment details',
        error: error.message
      });
    }
  }
);

// Booking validation
const validateCreateBooking = [
  body('company_code')
    .notEmpty()
    .withMessage('Company code is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('Invalid company code format'),
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
  body('departure_flight_number').optional().isLength({ max: 20 }).withMessage('Flight number too long'),
  body('arrival_flight_number').optional().isLength({ max: 20 }).withMessage('Flight number too long'),
  body('departure_terminal').notEmpty().withMessage('Departure terminal is required'),
  body('arrival_terminal').notEmpty().withMessage('Arrival terminal is required'),
  body('car_registration_number').trim().isLength({ min: 1, max: 15 }).withMessage('Car registration required'),
  body('car_make').trim().isLength({ min: 1, max: 30 }).withMessage('Car make required'),
  body('car_model').trim().isLength({ min: 1, max: 30 }).withMessage('Car model required'),
  body('car_color').trim().isLength({ min: 1, max: 20 }).withMessage('Car color required'),
  body('booking_amount').isFloat({ min: 0 }).withMessage('Booking amount must be a positive number'),
  body('passenger').optional().isInt({ min: 1, max: 10 }).withMessage('Invalid passenger count'),
  body('payment_intent_id').notEmpty().withMessage('Payment intent ID is required')
];

// Step 3: Create booking AFTER payment is confirmed - ENHANCED
router.post('/bookings-with-payment', 
  authenticateToken,
  validateCreateBooking, 
  handleValidationErrors, 
  async (req, res) => {
    try {
      const bookingData = req.body;
      const { payment_intent_id } = bookingData;

      console.log('🎫 BOOKING WITH PAYMENT REQUEST:', {
        user: req.user.email,
        company_code: bookingData.company_code,
        payment_intent_id: payment_intent_id,
        amount: bookingData.booking_amount,
        timestamp: new Date().toISOString()
      });

      // Check services availability
      if (!MagrApiService) {
        throw new Error('MAGR API Service is not available');
      }

      if (!StripeService) {
        throw new Error('Stripe service is not available');
      }

      // Step 1: Verify payment with enhanced Stripe service FIRST
      let paymentDetails = null;
      try {
        console.log('💳 Verifying Stripe payment before booking...');
        paymentDetails = await StripeService.getPaymentDetails(payment_intent_id);
        console.log('💳 Payment verification result:', {
          status: paymentDetails.status,
          amount: paymentDetails.amount,
          currency: paymentDetails.currency,
          is_paid: paymentDetails.is_paid
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

        console.log('✅ Payment verified successfully');
        
      } catch (paymentError) {
        console.error('❌ Payment verification failed:', paymentError.message);
        return res.status(400).json({
          success: false,
          message: 'Payment verification failed',
          error: paymentError.message,
          payment_required: true
        });
      }

      // Step 2: Generate booking reference
      const ourBookingRef = `PKY-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

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

      console.log('🚀 Sending PAID booking to MAGR API:', {
        company_code: magrBookingData.company_code,
        bookreference: magrBookingData.bookreference,
        customer_email: magrBookingData.customer_email,
        booking_amount: magrBookingData.booking_amount,
        payment_method: 'Stripe'
      });

      // Step 4: Create booking with MAGR API
      const magrResult = await MagrApiService.createBooking(magrBookingData);

      if (magrResult.success) {
        // Step 5: Save booking to OUR database with enhanced payment information
        let savedBooking = null;
        let databaseSaveSuccess = false;
        
        if (Booking) {
          console.log('💾 Saving PAID booking to database...');
          
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
              
              // Enhanced Payment Details - WITH STRIPE INFORMATION
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
                payment_confirmed_at: new Date()
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
              notes: `Paid booking created via Stripe by ${req.user.email}. Payment ID: ${payment_intent_id}`
            });

            await savedBooking.save();
            databaseSaveSuccess = true;
            
            console.log('✅ PAID booking saved to database:', {
              bookingId: savedBooking._id,
              ourReference: savedBooking.our_reference,
              magrReference: savedBooking.magr_reference,
              paymentIntentId: payment_intent_id,
              amount: savedBooking.booking_amount,
              paymentStatus: 'paid'
            });
            
          } catch (dbError) {
            console.error('❌ Database save failed for PAID booking:', {
              error: dbError.message,
              name: dbError.name,
              payment_intent_id: payment_intent_id,
              magr_reference: magrResult.reference
            });
          }
        }

        // Step 6: Return enhanced success response
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
          // Enhanced response with payment metadata
          payment_metadata: paymentDetails?.metadata || {}
        };

        res.json({
          success: true,
          message: 'Booking created successfully with payment!',
          data: responseData
        });

      } else {
        // MAGR booking failed - REFUND the payment automatically using enhanced service
        console.error('❌ MAGR booking failed, initiating refund...');
        
        try {
          const refundResult = await StripeService.createRefund(payment_intent_id, null, 'booking_failed');
          console.log('💰 Payment refunded due to booking failure:', refundResult.refund_id);
          
          return res.status(500).json({
            success: false,
            message: `Booking failed: ${magrResult.message}. Your payment has been automatically refunded.`,
            refund_id: refundResult.refund_id,
            refund_status: refundResult.status,
            refund_amount: refundResult.amount
          });
        } catch (refundError) {
          console.error('❌ CRITICAL: Booking failed AND refund failed!', refundError.message);
          
          return res.status(500).json({
            success: false,
            message: `Booking failed: ${magrResult.message}. CRITICAL: Automatic refund failed. Please contact support immediately.`,
            payment_intent_id: payment_intent_id,
            refund_error: refundError.message,
            requires_manual_refund: true
          });
        }
      }

    } catch (error) {
      console.error('❌ BOOKING WITH PAYMENT ERROR:', {
        message: error.message,
        user: req.user?.email,
        payment_intent_id: req.body?.payment_intent_id,
        timestamp: new Date().toISOString()
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to create booking with payment',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

// ===== LEGACY BOOKING ROUTE (WITHOUT PAYMENT) - DEPRECATED =====

// Old booking route - now redirects to payment flow
router.post('/bookings', 
  authenticateToken,
  async (req, res) => {
    console.log('⚠️ Legacy booking endpoint accessed - redirecting to payment flow');
    
    res.status(400).json({
      success: false,
      message: 'This booking endpoint is deprecated. Please use the payment flow.',
      redirect_to: '/create-payment-intent',
      required_steps: [
        '1. Create payment intent with /create-payment-intent',
        '2. Process payment on frontend with Stripe Elements',
        '3. Create booking with /bookings-with-payment'
      ]
    });
  }
);

// ===== STRIPE WEBHOOK - ENHANCED =====

// Stripe webhook handler
router.post('/stripe-webhook', 
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    try {
      if (!StripeService) {
        throw new Error('Stripe service not available');
      }

      const signature = req.headers['stripe-signature'];
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!endpointSecret) {
        console.error('❌ Stripe webhook secret not configured');
        return res.status(500).json({ error: 'Webhook secret not configured' });
      }

      let event;
      try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        event = stripe.webhooks.constructEvent(req.body, signature, endpointSecret);
        console.log('✅ Webhook signature verified');
      } catch (err) {
        console.error('❌ Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      console.log('🔔 Stripe webhook received:', {
        type: event.type,
        id: event.id,
        object_id: event.data.object.id
      });

      // Handle the event using enhanced service
      const result = await StripeService.handleWebhook(event);
      
      // If booking model is available, update booking statuses based on webhook
      if (Booking && event.data.object.metadata) {
        try {
          await updateBookingFromWebhook(event, result);
        } catch (dbError) {
          console.error('❌ Failed to update booking from webhook:', dbError.message);
          // Don't fail the webhook response for database errors
        }
      }
      
      res.json({ 
        received: true, 
        result: result,
        event_type: event.type,
        processed_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Webhook handling error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

// Helper function to update bookings from webhooks
const updateBookingFromWebhook = async (event, webhookResult) => {
  const paymentIntentId = event.data.object.id;
  
  if (event.type === 'payment_intent.succeeded') {
    await Booking.updateOne(
      { 'payment_details.stripe_payment_intent_id': paymentIntentId },
      { 
        'payment_details.payment_status': 'paid',
        'payment_details.payment_confirmed_at': new Date(),
        'status': 'confirmed'
      }
    );
    console.log('✅ Booking payment status updated to paid');
    
  } else if (event.type === 'payment_intent.payment_failed') {
    await Booking.updateOne(
      { 'payment_details.stripe_payment_intent_id': paymentIntentId },
      { 
        'payment_details.payment_status': 'failed',
        'status': 'payment_failed'
      }
    );
    console.log('❌ Booking payment status updated to failed');
    
  } else if (event.type === 'refund.created') {
    const refund = event.data.object;
    await Booking.updateOne(
      { 'payment_details.stripe_payment_intent_id': refund.payment_intent },
      { 
        'payment_details.payment_status': 'refunded',
        'payment_details.refund_amount': refund.amount / 100,
        'payment_details.refund_date': new Date(),
        'status': 'refunded'
      }
    );
    console.log('💰 Booking refund status updated');
  }
};

// ===== BOOKING MANAGEMENT ROUTES - ENHANCED =====

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
          // Travel details
          dropoff_date: booking.travel_details?.dropoff_date,
          dropoff_time: booking.travel_details?.dropoff_time,
          pickup_date: booking.travel_details?.pickup_date,
          pickup_time: booking.travel_details?.pickup_time,
          // Vehicle details
          vehicle_registration: booking.vehicle_details?.car_registration_number,
          // Metadata
          created_at: booking.created_at,
          can_cancel: booking.canBeCancelled(),
          can_edit: booking.canBeAmended(),
          can_refund: booking.canBeRefunded(), // New method from updated model
          is_paid: booking.is_paid, // Virtual property
          is_refunded: booking.is_refunded // Virtual property
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
      if (booking.payment_details?.stripe_payment_intent_id && StripeService) {
        try {
          stripePaymentDetails = await StripeService.getPaymentDetails(
            booking.payment_details.stripe_payment_intent_id
          );
        } catch (error) {
          console.warn('⚠️ Could not fetch Stripe payment details:', error.message);
        }
      }
      
      res.json({
        success: true,
        data: booking.toDisplayFormat(),
        payment_details: {
          method: booking.payment_details?.payment_method,
          status: booking.payment_details?.payment_status,
          stripe_payment_intent_id: booking.payment_details?.stripe_payment_intent_id,
          amount: booking.payment_details?.stripe_amount,
          currency: booking.payment_details?.stripe_currency,
          refund_amount: booking.payment_details?.refund_amount,
          payment_date: booking.payment_details?.payment_date
        },
        stripe_details: stripePaymentDetails,
        can_cancel: booking.canBeCancelled(),
        can_edit: booking.canBeAmended(),
        can_refund: booking.canBeRefunded(),
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

  // Cancel booking with enhanced refund handling
  router.post('/bookings/:reference/cancel', authenticateToken, async (req, res) => {
    try {
      const { reference } = req.params;
      const { reason } = req.body;

      console.log('❌ Cancellation request for booking:', reference);

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

      if (!booking.canBeCancelled()) {
        return res.status(400).json({
          success: false,
          message: 'Booking cannot be cancelled at this time'
        });
      }

      // Cancel with MAGR API
      const cancelResult = await MagrApiService.cancelBooking(booking.magr_reference);

      if (cancelResult.success) {
        // Process refund if payment was made via Stripe using enhanced service
        let refundResult = null;
        if (booking.payment_details?.stripe_payment_intent_id && StripeService) {
          try {
            refundResult = await StripeService.createRefund(
              booking.payment_details.stripe_payment_intent_id,
              null, // Full refund
              reason || 'cancelled_by_customer'
            );
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
          refund: refundResult ? {
            refund_id: refundResult.refund_id,
            amount: refundResult.amount,
            status: refundResult.status,
            reason: refundResult.reason
          } : null,
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

  // NEW: Manual refund endpoint for admin/support use
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

      if (!booking.canBeRefunded()) {
        return res.status(400).json({
          success: false,
          message: 'Booking cannot be refunded'
        });
      }

      if (!booking.payment_details?.stripe_payment_intent_id) {
        return res.status(400).json({
          success: false,
          message: 'No Stripe payment found for this booking'
        });
      }

      // Process refund with enhanced service
      const refundResult = await StripeService.createRefund(
        booking.payment_details.stripe_payment_intent_id,
        amount, // Partial or full refund
        reason || 'customer_request'
      );

      // Update booking
      booking.payment_details.refund_amount = (booking.payment_details.refund_amount || 0) + refundResult.amount;
      booking.payment_details.refund_date = new Date();
      booking.payment_details.payment_status = booking.payment_details.refund_amount >= booking.booking_amount ? 'refunded' : 'partially_refunded';
      booking.notes = `${booking.notes || ''}\nRefund processed: £${refundResult.amount} - ${reason || 'No reason provided'}`;

      await booking.save();

      res.json({
        success: true,
        message: 'Refund processed successfully',
        refund: {
          refund_id: refundResult.refund_id,
          amount: refundResult.amount,
          status: refundResult.status,
          total_refunded: booking.payment_details.refund_amount
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