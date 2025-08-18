// routes/parkingRoutes.js - Complete with Authentication and Booking Flow
const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');

// Import services and models
const MagrApiService = require('../services/magrApiService');
const User = require('../models/user');
const Booking = require('../models/booking');

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

// Authentication middleware - Gets token from request body (browser memory)
const authenticateToken = async (req, res, next) => {
  try {
    // Get token from multiple sources
    let token = null;
    
    // 1. Try Authorization header first (standard)
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.split(' ')[1]) {
      token = authHeader.split(' ')[1];
    }
    
    // 2. Try request body (from browser memory)
    if (!token && req.body.token) {
      token = req.body.token;
    }
    
    // 3. Try request body auth_token field
    if (!token && req.body.auth_token) {
      token = req.body.auth_token;
    }
    
    // 4. Try cookies if available
    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    console.log('🔍 Token search result:', {
      fromHeader: !!authHeader,
      fromBody: !!req.body.token,
      fromAuthToken: !!req.body.auth_token,
      fromCookies: !!(req.cookies && req.cookies.token),
      tokenFound: !!token
    });

    if (!token) {
      console.log('❌ No token provided from any source');
      return res.status(401).json({
        success: false,
        message: 'Access token required. Please log in to make bookings.',
        requireAuth: true,
        hint: 'Make sure you are logged in and your session is active'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('🔐 Token decoded for user:', decoded.email || decoded.id);

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
    
    return res.status(403).json({
      success: false,
      message: 'Authentication failed. Please log in again.',
      requireAuth: true,
      error: error.message
    });
  }
};

// ===== PUBLIC ROUTES (NO AUTHENTICATION REQUIRED) =====

// Health check endpoint
router.get('/health', (req, res) => {
  console.log('🏥 Health check requested');
  res.json({
    success: true,
    message: 'Parking API is healthy',
    timestamp: new Date().toISOString(),
    services: {
      magr_api: 'connected',
      database: 'connected',
      authentication: 'enabled'
    }
  });
});

// Get available airports
router.get('/airports', (req, res) => {
  try {
    console.log('✈️ Airports requested');
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

// Search parking products validation
const validateSearchParking = [
  body('airport_code')
    .isIn(['LHR', 'LGW', 'STN', 'LTN', 'MAN', 'BHX', 'EDI', 'GLA'])
    .withMessage('Invalid airport code'),
  body('dropoff_date')
    .isISO8601()
    .toDate()
    .custom((value) => {
      if (value < new Date()) {
        throw new Error('Dropoff date cannot be in the past');
      }
      return true;
    }),
  body('dropoff_time')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Invalid dropoff time format (HH:MM)'),
  body('pickup_date')
    .isISO8601()
    .toDate(),
  body('pickup_time')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Invalid pickup time format (HH:MM)'),
  body('pickup_date').custom((pickupDate, { req }) => {
    const dropoffDateTime = new Date(`${req.body.dropoff_date}T${req.body.dropoff_time}`);
    const pickupDateTime = new Date(`${pickupDate}T${req.body.pickup_time}`);
    
    if (pickupDateTime <= dropoffDateTime) {
      throw new Error('Pickup date/time must be after dropoff date/time');
    }
    return true;
  })
];

// Search parking - PUBLIC (No authentication required)
router.post('/search-parking', 
  validateSearchParking, 
  handleValidationErrors, 
  async (req, res) => {
    try {
      const { airport_code, dropoff_date, dropoff_time, pickup_date, pickup_time } = req.body;

      console.log('🔍 SEARCH REQUEST received:', {
        airport_code,
        dropoff_date,
        dropoff_time,
        pickup_date,
        pickup_time,
        timestamp: new Date().toISOString()
      });

      // Validate times
      MagrApiService.validateBookingTimes(dropoff_date, dropoff_time, pickup_date, pickup_time);

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

      console.log('🚀 Calling MAGR API with params:', searchParams);
      
      // Call MAGR API
      const result = await MagrApiService.getParkingQuotes(searchParams);
      
      console.log('✅ MAGR API Response:', {
        success: result.success,
        productsCount: result.data?.products?.length || 0
      });

      if (!result.success || !result.data || !result.data.products) {
        throw new Error('Invalid response from MAGR API');
      }

      res.json({
        success: true,
        data: result.data,
        search_params: searchParams,
        message: `Found ${result.data.products.length} parking options`,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ SEARCH ERROR:', {
        message: error.message,
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

// Test MAGR API connection - PUBLIC
router.get('/test-magr', async (req, res) => {
  try {
    console.log('🧪 Testing MAGR API connection...');
    const result = await MagrApiService.testConnection();
    
    console.log('✅ MAGR Test Result:', result);
    
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
      details: 'Check your MAGR API credentials in environment variables',
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

// Create booking validation
const validateCreateBooking = [
  body('company_code').notEmpty().withMessage('Company code is required'),
  body('airport_code').isIn(['LHR', 'LGW', 'STN', 'LTN', 'MAN', 'BHX', 'EDI', 'GLA']).withMessage('Invalid airport code'),
  body('dropoff_date').isISO8601().toDate(),
  body('dropoff_time').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid dropoff time format'),
  body('pickup_date').isISO8601().toDate(),
  body('pickup_time').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid pickup time format'),
  body('title').isIn(['Mr', 'Mrs', 'Miss', 'Ms', 'Dr']).withMessage('Invalid title'),
  body('first_name').trim().isLength({ min: 1, max: 50 }).withMessage('First name must be 1-50 characters'),
  body('last_name').trim().isLength({ min: 1, max: 50 }).withMessage('Last name must be 1-50 characters'),
  body('customer_email').isEmail().normalizeEmail().withMessage('Invalid email address'),
  body('phone_number').notEmpty().withMessage('Phone number is required'),
  body('departure_terminal').notEmpty().withMessage('Departure terminal is required'),
  body('arrival_terminal').notEmpty().withMessage('Arrival terminal is required'),
  body('passenger').isInt({ min: 1, max: 8 }).withMessage('Number of passengers must be between 1 and 8'),
  body('car_registration_number').trim().isLength({ min: 2, max: 10 }).withMessage('Car registration must be 2-10 characters'),
  body('car_make').trim().isLength({ min: 1, max: 30 }).withMessage('Car make must be 1-30 characters'),
  body('car_model').trim().isLength({ min: 1, max: 30 }).withMessage('Car model must be 1-30 characters'),
  body('car_color').trim().isLength({ min: 1, max: 20 }).withMessage('Car color must be 1-20 characters'),
  body('booking_amount').isFloat({ min: 0 }).withMessage('Booking amount must be a positive number'),
  body('paymentgateway').isIn(['Invoice', 'Card', 'PayPal']).withMessage('Invalid payment gateway'),
  body('payment_token').notEmpty().withMessage('Payment token is required')
];

// Create booking - REQUIRES AUTHENTICATION
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

      // Validate booking times
      MagrApiService.validateBookingTimes(
        bookingData.dropoff_date, 
        bookingData.dropoff_time, 
        bookingData.pickup_date, 
        bookingData.pickup_time
      );

      console.log('🚀 Creating booking with MAGR API...');

      // Create booking with MAGR API
      const magrResult = await MagrApiService.createBooking(bookingData);
      
      console.log('📋 MAGR API Result:', magrResult);

      if (magrResult.success) {
        // Save booking to database
        console.log('💾 Saving booking to database...');
        
        const newBooking = new Booking({
          // References
          our_reference: magrResult.our_reference,
          magr_reference: magrResult.magr_reference,
          booking_id: magrResult.booking_id,
          
          // User info
          user_id: req.user._id,
          user_email: req.user.email,
          
          // Service details
          company_code: bookingData.company_code,
          product_name: bookingData.product_name || 'Parking Service',
          airport_code: bookingData.airport_code,
          parking_type: bookingData.parking_type || 'Standard',
          
          // Financial
          booking_amount: parseFloat(bookingData.booking_amount),
          commission_percentage: parseFloat(bookingData.commission_percentage || 0),
          commission_amount: (parseFloat(bookingData.booking_amount) * parseFloat(bookingData.commission_percentage || 0) / 100),
          
          // Customer details
          customer_details: {
            title: bookingData.title,
            first_name: bookingData.first_name,
            last_name: bookingData.last_name,
            customer_email: bookingData.customer_email,
            phone_number: bookingData.phone_number
          },
          
          // Travel details
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
          
          // Vehicle details
          vehicle_details: {
            car_registration_number: bookingData.car_registration_number.toUpperCase(),
            car_make: bookingData.car_make,
            car_model: bookingData.car_model,
            car_color: bookingData.car_color
          },
          
          // Payment details
          payment_details: {
            payment_method: bookingData.paymentgateway || 'Invoice',
            payment_token: bookingData.payment_token,
            payment_status: 'pending'
          },
          
          // Service features
          service_features: {
            is_cancelable: bookingData.is_cancelable || false,
            is_editable: bookingData.is_editable || false,
            special_features: bookingData.special_features || []
          },
          
          // Status
          status: 'confirmed',
          
          // Store MAGR response for debugging
          magr_response: magrResult
        });

        const savedBooking = await newBooking.save();
        console.log('✅ Booking saved to database:', savedBooking._id);

        // Return success response
        res.json({
          success: true,
          message: 'Booking created successfully and saved to database!',
          data: {
            // MAGR API data
            booking_id: magrResult.booking_id,
            our_reference: magrResult.our_reference,
            magr_reference: magrResult.magr_reference,
            status: magrResult.status,
            
            // Database data
            database_id: savedBooking._id,
            user_email: req.user.email,
            created_at: savedBooking.created_at,
            
            // Summary
            customer_name: savedBooking.customer_full_name,
            service: savedBooking.product_name,
            airport: savedBooking.airport_code,
            total_amount: savedBooking.booking_amount,
            commission: savedBooking.commission_amount
          }
        });

      } else {
        throw new Error(magrResult.message || 'MAGR API booking failed');
      }

    } catch (error) {
      console.error('❌ BOOKING ERROR:', {
        message: error.message,
        user: req.user?.email,
        timestamp: new Date().toISOString()
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to create booking',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

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
      user_email: req.user.email // Ensure user can only see their own bookings
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

module.exports = router;