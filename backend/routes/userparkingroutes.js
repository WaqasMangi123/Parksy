// routes/parkingRoutes.js - UPDATED VERSION WITH COMPANY CODE FIX
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

// ===== PUBLIC ROUTES (NO AUTHENTICATION REQUIRED) =====

// Health check endpoint
router.get('/health', (req, res) => {
  console.log('🏥 Parking API health check requested');
  
  const healthStatus = {
    success: true,
    message: 'Parking API is healthy',
    timestamp: new Date().toISOString(),
    services: {
      magr_api_service: !!MagrApiService ? 'loaded' : 'failed',
      user_model: !!User ? 'loaded' : 'failed',
      booking_model: !!Booking ? 'loaded' : 'optional',
      jwt_secret: !!process.env.JWT_SECRET ? 'configured' : 'missing'
    },
    environment: {
      magr_email: !!process.env.MAGR_USER_EMAIL ? 'set' : 'missing',
      magr_password: !!process.env.MAGR_PASSWORD ? 'set' : 'missing',
      magr_agent_code: !!process.env.MAGR_AGENT_CODE ? 'set' : 'missing'
    }
  };
  
  console.log('📊 Health check result:', healthStatus);
  res.json(healthStatus);
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

// NEW: Get valid company codes - PUBLIC
router.get('/company-codes', (req, res) => {
  try {
    console.log('🏢 Company codes requested');
    
    if (!MagrApiService) {
      throw new Error('MagrApiService not available');
    }
    
    const companyCodes = MagrApiService.getValidCompanyCodes();
    
    console.log('✅ Returning company codes:', companyCodes.length);
    res.json({
      success: true,
      data: companyCodes,
      count: companyCodes.length,
      message: 'Use one of these company codes when making bookings'
    });
  } catch (error) {
    console.error('❌ Error fetching company codes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch company codes',
      error: error.message
    });
  }
});

// SIMPLIFIED Search parking validation - removed complex custom validators
const validateSearchParking = [
  body('airport_code')
    .isIn(['LHR', 'LGW', 'STN', 'LTN', 'MAN', 'BHX', 'EDI', 'GLA'])
    .withMessage('Invalid airport code'),
  body('dropoff_date')
    .notEmpty()
    .withMessage('Dropoff date is required'),
  body('dropoff_time')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Invalid dropoff time format (HH:MM)'),
  body('pickup_date')
    .notEmpty()
    .withMessage('Pickup date is required'),
  body('pickup_time')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Invalid pickup time format (HH:MM)')
];

// UPDATED: Search parking - now includes company codes in response
router.post('/search-parking', 
  validateSearchParking, 
  handleValidationErrors, 
  async (req, res) => {
    try {
      console.log('🔍 SEARCH REQUEST received:', req.body);

      // Check if MagrApiService is available
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

      // SIMPLIFIED time validation - just check basic format
      try {
        // Basic validation without complex date parsing
        const dropoffDateTime = new Date(`${dropoff_date}T${dropoff_time}`);
        const pickupDateTime = new Date(`${pickup_date}T${pickup_time}`);
        
        if (isNaN(dropoffDateTime.getTime()) || isNaN(pickupDateTime.getTime())) {
          throw new Error('Invalid date/time format');
        }
        
        if (pickupDateTime <= dropoffDateTime) {
          throw new Error('Pickup time must be after dropoff time');
        }
        
        console.log('✅ Basic time validation passed');
      } catch (timeError) {
        console.error('❌ Time validation failed:', timeError.message);
        return res.status(400).json({
          success: false,
          message: 'Invalid booking times',
          error: timeError.message
        });
      }

      // Format dates and times for MAGR API
      const formatDateForMagr = (dateString) => {
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
      };

      const formatTimeForMagr = (timeString) => {
        if (timeString && timeString.match(/^\d{2}:\d{2}$/)) {
          return timeString;
        }
        const timeParts = timeString.split(':');
        if (timeParts.length >= 2) {
          const hours = timeParts[0].padStart(2, '0');
          const minutes = timeParts[1].padStart(2, '0');
          return `${hours}:${minutes}`;
        }
        return timeString;
      };

      const searchParams = {
        airport_code,
        dropoff_date: formatDateForMagr(dropoff_date),
        dropoff_time: formatTimeForMagr(dropoff_time),
        pickup_date: formatDateForMagr(pickup_date),
        pickup_time: formatTimeForMagr(pickup_time)
      };

      console.log('🚀 Calling MAGR API with formatted params:', searchParams);
      
      // Call MAGR API with error handling
      let result;
      try {
        result = await MagrApiService.getParkingQuotes(searchParams);
        console.log('📋 MAGR API raw result:', result);
      } catch (magrError) {
        console.error('❌ MAGR API call failed:', magrError.message);
        return res.status(500).json({
          success: false,
          message: 'Failed to get parking data from MAGR API',
          error: magrError.message,
          details: 'Check MAGR API credentials and connection'
        });
      }
      
      console.log('✅ MAGR API Response:', {
        success: result?.success,
        productsCount: result?.data?.products?.length || 0
      });

      if (!result || !result.success || !result.data || !result.data.products) {
        console.error('❌ Invalid MAGR API response:', result);
        return res.status(500).json({
          success: false,
          message: 'Invalid response from MAGR API',
          error: 'No parking products returned',
          debug_info: result
        });
      }

      // ENHANCED: Add company codes to each product and get valid company codes
      const validCompanyCodes = MagrApiService.getValidCompanyCodes();
      const enhancedProducts = result.data.products.map(product => ({
        ...product,
        // Use the companyID from the product if available, otherwise use first valid code
        company_code: product.companyID || validCompanyCodes[0],
        available_company_codes: validCompanyCodes
      }));

      // Return successful response with enhanced data
      res.json({
        success: true,
        data: {
          ...result.data,
          products: enhancedProducts
        },
        search_params: searchParams,
        valid_company_codes: validCompanyCodes,
        message: `Found ${result.data.products.length} parking options`,
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
        stack: error.stack?.substring(0, 200),
        timestamp: new Date().toISOString()
      });
    }
  }
);

// Test MAGR API connection - PUBLIC
router.get('/test-magr', async (req, res) => {
  try {
    console.log('🧪 Testing MAGR API connection...');
    
    if (!MagrApiService) {
      throw new Error('MagrApiService not loaded');
    }
    
    const result = await MagrApiService.testConnection();
    
    console.log('✅ MAGR Test Result:', result);
    
    res.json({
      success: true,
      message: 'MAGR API connection successful',
      data: result,
      valid_company_codes: MagrApiService.getValidCompanyCodes(),
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

// Get terminals for airport - PUBLIC
router.get('/terminals/:airport_code', 
  [
    param('airport_code').isIn(['LHR', 'LGW', 'STN', 'LTN', 'MAN', 'BHX', 'EDI', 'GLA']).withMessage('Invalid airport code')
  ],
  handleValidationErrors,
  (req, res) => {
    try {
      const { airport_code } = req.params;
      console.log('🏢 Terminals requested for airport:', airport_code);
      
      if (!MagrApiService) {
        throw new Error('MagrApiService not available');
      }
      
      const terminals = MagrApiService.getTerminalsForAirport(airport_code);
      
      res.json({
        success: true,
        data: terminals,
        airport_code: airport_code,
        count: terminals.length
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

// Authentication middleware - SIMPLIFIED
const authenticateToken = async (req, res, next) => {
  try {
    // Get token from request body (browser memory)
    let token = req.body.token || req.body.auth_token;
    
    // Also try header as fallback
    const authHeader = req.headers['authorization'];
    if (!token && authHeader && authHeader.split(' ')[1]) {
      token = authHeader.split(' ')[1];
    }

    console.log('🔍 Token search result:', {
      fromBody: !!req.body.token,
      fromAuthToken: !!req.body.auth_token,
      fromHeader: !!authHeader,
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

    // Check if JWT_SECRET exists
    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET not configured');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error: JWT_SECRET missing'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('🔐 Token decoded for user:', decoded.email || decoded.id);

    // Check if User model is available
    if (!User) {
      console.error('❌ User model not available');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error: User model not available'
      });
    }

    // Find user in database
    const user = await User.findById(decoded.id);
    if (!user) {
      console.log('❌ User not found for token');
      return res.status(401).json({
        success: false,
        message: 'User not found. Please log in again.',
        requireAuth: true
      });
    }

    // Check if user is verified
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

// ENHANCED booking validation with dynamic company code validation
const validateCreateBooking = [
  body('company_code')
    .custom(async (value) => {
      if (!MagrApiService) {
        throw new Error('MAGR API Service not available');
      }
      if (!MagrApiService.isValidCompanyCode(value)) {
        const validCodes = MagrApiService.getValidCompanyCodes();
        throw new Error(`Invalid company code. Valid codes are: ${validCodes.join(', ')}`);
      }
      return true;
    }),
  body('airport_code').isIn(['LHR', 'LGW', 'STN', 'LTN', 'MAN', 'BHX', 'EDI', 'GLA']).withMessage('Invalid airport code'),
  body('title').isIn(['Mr', 'Mrs', 'Miss', 'Ms', 'Dr']).withMessage('Invalid title'),
  body('first_name').trim().isLength({ min: 1, max: 50 }).withMessage('First name must be 1-50 characters'),
  body('last_name').trim().isLength({ min: 1, max: 50 }).withMessage('Last name must be 1-50 characters'),
  body('customer_email').isEmail().withMessage('Invalid email address'),
  body('phone_number').notEmpty().withMessage('Phone number is required'),
  body('car_registration_number').trim().isLength({ min: 1, max: 15 }).withMessage('Car registration required'),
  body('car_make').trim().isLength({ min: 1, max: 30 }).withMessage('Car make required'),
  body('car_model').trim().isLength({ min: 1, max: 30 }).withMessage('Car model required'),
  body('car_color').trim().isLength({ min: 1, max: 20 }).withMessage('Car color required'),
  body('booking_amount').isFloat({ min: 0 }).withMessage('Booking amount must be a positive number')
];

// UPDATED: Create booking with enhanced company code handling
router.post('/bookings', 
  authenticateToken,  // Authentication required
  validateCreateBooking, 
  handleValidationErrors, 
  async (req, res) => {
    try {
      const bookingData = req.body;

      console.log('🎫 AUTHENTICATED BOOKING REQUEST:', {
        user: req.user.email,
        company_code: bookingData.company_code,
        airport_code: bookingData.airport_code,
        customer_email: bookingData.customer_email,
        timestamp: new Date().toISOString()
      });

      // Check if MagrApiService is available
      if (!MagrApiService) {
        throw new Error('MAGR API Service is not available');
      }

      // ENHANCED: Validate company code before proceeding
      if (!MagrApiService.isValidCompanyCode(bookingData.company_code)) {
        const validCodes = MagrApiService.getValidCompanyCodes();
        console.error('❌ Invalid company code provided:', bookingData.company_code);
        return res.status(400).json({
          success: false,
          message: 'Invalid company code provided',
          error: `Company code '${bookingData.company_code}' is not valid`,
          valid_company_codes: validCodes,
          suggestion: `Please use one of these valid codes: ${validCodes.join(', ')}`
        });
      }

      console.log('✅ Company code validation passed:', bookingData.company_code);
      console.log('🚀 Creating booking with MAGR API...');

      // ENHANCED: Log the exact data being sent to MAGR API
      console.log('📋 Booking data being sent to MAGR:', {
        company_code: bookingData.company_code,
        airport_code: bookingData.airport_code,
        customer_email: bookingData.customer_email,
        booking_amount: bookingData.booking_amount,
        dropoff_date: bookingData.dropoff_date,
        pickup_date: bookingData.pickup_date
      });

      // Create booking with MAGR API
      const magrResult = await MagrApiService.createBooking(bookingData);
      
      console.log('📋 MAGR API Result:', magrResult);

      if (magrResult.success) {
        // Try to save booking to database if Booking model is available
        let savedBooking = null;
        if (Booking) {
          try {
            console.log('💾 Saving booking to database...');
            
            savedBooking = new Booking({
              our_reference: magrResult.our_reference,
              magr_reference: magrResult.magr_reference,
              booking_id: magrResult.booking_id,
              user_id: req.user._id,
              user_email: req.user.email,
              company_code: bookingData.company_code,
              product_name: bookingData.product_name || 'Parking Service',
              airport_code: bookingData.airport_code,
              parking_type: bookingData.parking_type || 'Standard',
              booking_amount: parseFloat(bookingData.booking_amount),
              commission_percentage: parseFloat(bookingData.commission_percentage || 0),
              commission_amount: (parseFloat(bookingData.booking_amount) * parseFloat(bookingData.commission_percentage || 0) / 100),
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
                departure_terminal: bookingData.departure_terminal || 'Terminal 1',
                arrival_terminal: bookingData.arrival_terminal || 'Terminal 1',
                passenger_count: parseInt(bookingData.passenger) || 1
              },
              vehicle_details: {
                car_registration_number: bookingData.car_registration_number.toUpperCase(),
                car_make: bookingData.car_make,
                car_model: bookingData.car_model,
                car_color: bookingData.car_color
              },
              payment_details: {
                payment_method: bookingData.paymentgateway || 'Invoice',
                payment_token: bookingData.payment_token,
                payment_status: 'pending'
              },
              service_features: {
                is_cancelable: bookingData.is_cancelable || false,
                is_editable: bookingData.is_editable || false,
                special_features: bookingData.special_features || []
              },
              status: 'confirmed',
              magr_response: magrResult
            });

            await savedBooking.save();
            console.log('✅ Booking saved to database:', savedBooking._id);
          } catch (dbError) {
            console.error('⚠️ Database save failed (continuing anyway):', dbError.message);
          }
        } else {
          console.log('⚠️ Booking model not available, skipping database save');
        }

        // Return success response
        res.json({
          success: true,
          message: 'Booking created successfully!',
          data: {
            booking_id: magrResult.booking_id,
            our_reference: magrResult.our_reference,
            magr_reference: magrResult.magr_reference,
            status: magrResult.status,
            database_id: savedBooking?._id,
            user_email: req.user.email,
            created_at: savedBooking?.created_at || new Date().toISOString(),
            customer_name: `${bookingData.title} ${bookingData.first_name} ${bookingData.last_name}`,
            service: bookingData.product_name || 'Parking Service',
            airport: bookingData.airport_code,
            company_code: bookingData.company_code,
            total_amount: parseFloat(bookingData.booking_amount),
            commission: (parseFloat(bookingData.booking_amount) * parseFloat(bookingData.commission_percentage || 0) / 100)
          }
        });

      } else {
        throw new Error(magrResult.message || 'MAGR API booking failed');
      }

    } catch (error) {
      console.error('❌ BOOKING ERROR:', {
        message: error.message,
        user: req.user?.email,
        company_code: req.body?.company_code,
        stack: error.stack?.substring(0, 300),
        timestamp: new Date().toISOString()
      });
      
      // Enhanced error response with company code guidance
      const errorResponse = {
        success: false,
        message: 'Failed to create booking',
        error: error.message,
        timestamp: new Date().toISOString()
      };

      // Add company code guidance if it's a company code error
      if (error.message.includes('company code') || error.message.includes('Company Code')) {
        try {
          errorResponse.valid_company_codes = MagrApiService.getValidCompanyCodes();
          errorResponse.guidance = 'Please use one of the valid company codes provided';
        } catch (e) {
          console.error('Failed to get valid company codes:', e.message);
        }
      }
      
      res.status(500).json(errorResponse);
    }
  }
);

// Optional routes that require Booking model
if (Booking) {
  // Get user's bookings - REQUIRES AUTHENTICATION
  router.get('/my-bookings', authenticateToken, async (req, res) => {
    try {
      console.log('📋 Getting bookings for user:', req.user.email);
      
      const bookings = await Booking.findByEmail(req.user.email);
      
      console.log('✅ Found bookings:', bookings.length);
      
      res.json({
        success: true,
        data: bookings.map(booking => booking.toDisplayFormat()),
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

  // Get specific booking details - REQUIRES AUTHENTICATION
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
      
      res.json({
        success: true,
        data: booking,
        can_cancel: booking.canBeCancelled()
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
}

module.exports = router;