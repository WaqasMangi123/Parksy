// routes/parkingRoutes.js - UPDATED WITH PROPER DATABASE SAVING
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
  body('passenger').optional().isInt({ min: 1, max: 10 }).withMessage('Invalid passenger count')
];

// UPDATED: Create booking with proper database saving
router.post('/bookings', 
  authenticateToken,
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
        booking_amount: bookingData.booking_amount,
        timestamp: new Date().toISOString()
      });

      if (!MagrApiService) {
        throw new Error('MAGR API Service is not available');
      }

      // Generate unique booking reference for our system
      const ourBookingRef = `PKY-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      // Prepare booking data for MAGR API
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
        paymentgateway: bookingData.paymentgateway || 'Invoice',
        payment_token: bookingData.payment_token || `token_${Date.now()}`,
        booking_amount: parseFloat(bookingData.booking_amount)
      };

      console.log('🚀 Sending booking to MAGR API:', {
        company_code: magrBookingData.company_code,
        bookreference: magrBookingData.bookreference,
        customer_email: magrBookingData.customer_email,
        booking_amount: magrBookingData.booking_amount
      });

      // Create booking with MAGR API FIRST
      const magrResult = await MagrApiService.createBooking(magrBookingData);
      
      console.log('📋 MAGR API booking result:', magrResult);

      if (magrResult.success) {
        // UPDATED: Save booking to OUR database with proper error handling
        let savedBooking = null;
        let databaseSaveSuccess = false;
        
        if (Booking) {
          console.log('💾 Saving booking to OUR database...');
          console.log('🔍 Debug Info:', {
            hasBookingModel: !!Booking,
            userExists: !!req.user,
            userId: req.user?._id,
            userEmail: req.user?.email,
            bookingReference: ourBookingRef,
            magrReference: magrResult.data?.reference || magrResult.reference
          });
          
          try {
            savedBooking = new Booking({
              // Booking References
              our_reference: ourBookingRef,
              magr_reference: magrResult.data?.reference || magrResult.reference,
              booking_id: magrResult.data?.booking_id,
              
              // User Information
              user_id: req.user._id,
              user_email: req.user.email,
              
              // Service Details - ALL from bookingData
              company_code: bookingData.company_code,
              product_name: bookingData.product_name || 'Airport Parking Service',
              product_code: bookingData.product_code || bookingData.company_code,
              airport_code: bookingData.airport_code,
              parking_type: bookingData.parking_type || 'Meet & Greet',
              
              // Financial Details
              booking_amount: parseFloat(bookingData.booking_amount),
              commission_percentage: parseFloat(bookingData.commission_percentage || 0),
              currency: 'GBP',
              
              // Customer Details - NESTED OBJECT
              customer_details: {
                title: bookingData.title,
                first_name: bookingData.first_name,
                last_name: bookingData.last_name,
                customer_email: bookingData.customer_email,
                phone_number: bookingData.phone_number
              },
              
              // Travel Details - NESTED OBJECT
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
              
              // Vehicle Details - NESTED OBJECT
              vehicle_details: {
                car_registration_number: bookingData.car_registration_number.toUpperCase(),
                car_make: bookingData.car_make,
                car_model: bookingData.car_model,
                car_color: bookingData.car_color
              },
              
              // Payment Details - SIMPLIFIED
              payment_details: {
                payment_method: bookingData.paymentgateway || 'Invoice',
                payment_token: magrBookingData.payment_token,
                payment_status: 'confirmed'
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
              notes: `Booking created via Parksy dashboard by ${req.user.email}`
            });

            // SAVE to database
            await savedBooking.save();
            databaseSaveSuccess = true;
            
            console.log('✅ Booking successfully saved to OUR database:', {
              bookingId: savedBooking._id,
              ourReference: savedBooking.our_reference,
              magrReference: savedBooking.magr_reference,
              customerEmail: savedBooking.customer_details.customer_email,
              amount: savedBooking.booking_amount
            });
            
          } catch (dbError) {
            console.error('❌ Database save failed:', {
              error: dbError.message,
              name: dbError.name,
              code: dbError.code,
              validationErrors: dbError.errors ? Object.keys(dbError.errors) : [],
              stack: dbError.stack?.substring(0, 500)
            });
            
            // Log full validation errors for debugging
            if (dbError.errors) {
              console.error('🔍 Detailed validation errors:');
              Object.keys(dbError.errors).forEach(field => {
                console.error(`  - ${field}: ${dbError.errors[field].message}`);
              });
            }
            
            console.error('⚠️ BOOKING CONFIRMED WITH MAGR BUT DATABASE SAVE FAILED!');
            console.error('📋 MAGR booking still successful with reference:', magrResult.reference);
          }
        } else {
          console.log('⚠️ Booking model not available - MAGR booking successful but not saved locally');
        }

        // ALWAYS return success if MAGR booking succeeded
        // Even if database save failed, the customer has a valid booking
        const responseData = {
          our_reference: ourBookingRef,
          magr_reference: magrResult.data?.reference || magrResult.reference,
          booking_id: magrResult.data?.booking_id,
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
          commission: savedBooking?.commission_amount || (parseFloat(bookingData.booking_amount) * parseFloat(bookingData.commission_percentage || 0) / 100),
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
          }
        };

        // Success response
        res.json({
          success: true,
          message: databaseSaveSuccess 
            ? 'Booking created successfully and saved to our database!' 
            : 'Booking created successfully with MAGR (database save failed but booking is valid)',
          data: responseData
        });

      } else {
        // MAGR API booking failed
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
      
      res.status(500).json({
        success: false,
        message: 'Failed to create booking',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

// UPDATED: Get user's bookings with better error handling
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
          dropoff_date: booking.travel_details?.dropoff_date,
          dropoff_time: booking.travel_details?.dropoff_time,
          pickup_date: booking.travel_details?.pickup_date,
          pickup_time: booking.travel_details?.pickup_time,
          vehicle_registration: booking.vehicle_details?.car_registration_number,
          created_at: booking.created_at,
          can_cancel: booking.canBeCancelled(),
          can_edit: booking.canBeAmended()
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
        data: booking.toDisplayFormat(),
        can_cancel: booking.canBeCancelled(),
        can_edit: booking.canBeAmended(),
        raw_data: booking // Include full booking data for debugging
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