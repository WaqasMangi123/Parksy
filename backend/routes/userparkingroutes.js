// routes/parkingRoutes.js - FIXED: Corrected parameter names for path-to-regexp
const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');

// Import services
const MagrApiService = require('../services/magrApiService');

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

// ===== PUBLIC ROUTES =====

// Health check endpoint
router.get('/health', (req, res) => {
  console.log('🏥 Health check requested');
  res.json({
    success: true,
    message: 'Parking API is healthy',
    timestamp: new Date().toISOString(),
    services: {
      magr_api: 'connected'
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

// MAIN SEARCH ENDPOINT - NO AUTHENTICATION
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
      try {
        MagrApiService.validateBookingTimes(dropoff_date, dropoff_time, pickup_date, pickup_time);
      } catch (validationError) {
        console.error('❌ Time validation failed:', validationError.message);
        return res.status(400).json({
          success: false,
          message: 'Invalid booking times',
          error: validationError.message
        });
      }

      // Format dates for MAGR API (ensure correct format)
      const formatDateForMagr = (dateString) => {
        const date = new Date(dateString);
        return date.toISOString().split('T')[0]; // YYYY-MM-DD format
      };

      // Ensure times are in HH:MM format
      const formatTimeForMagr = (timeString) => {
        if (timeString && timeString.match(/^\d{2}:\d{2}$/)) {
          return timeString;
        }
        // If time doesn't match HH:MM, try to format it
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
      
      // Call MAGR API
      const result = await MagrApiService.getParkingQuotes(searchParams);
      
      console.log('✅ MAGR API Response:', {
        success: result.success,
        productsCount: result.data?.products?.length || 0,
        timestamp: new Date().toISOString()
      });

      if (!result.success || !result.data || !result.data.products) {
        throw new Error('Invalid response from MAGR API');
      }

      // Return the result
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
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to search parking options',
        error: error.message,
        details: 'Check MAGR API credentials and connection',
        timestamp: new Date().toISOString()
      });
    }
  }
);

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

// Create booking - NO AUTHENTICATION FOR DEMO
router.post('/bookings', 
  validateCreateBooking, 
  handleValidationErrors, 
  async (req, res) => {
    try {
      const bookingData = req.body;

      console.log('🎫 BOOKING REQUEST received:', {
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
      
      console.log('✅ MAGR Booking Result:', magrResult);

      if (magrResult.success) {
        res.json({
          success: true,
          message: 'Real-time booking created successfully via MAGR API!',
          data: {
            booking_id: magrResult.booking_id,
            our_reference: magrResult.our_reference,
            magr_reference: magrResult.magr_reference,
            status: magrResult.status
          }
        });
      } else {
        throw new Error('MAGR API booking failed');
      }

    } catch (error) {
      console.error('❌ BOOKING ERROR:', {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to create real-time booking',
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

// FIXED: Changed parameter name from :airportCode to :airport_code (snake_case, no camelCase)
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

module.exports = router;