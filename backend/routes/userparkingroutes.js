// routes/userparkingroutes.js - OPTIMIZED VERSION WITH ALL FIXES
const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');

// Import services and models with error handling
let MagrApiService, User, Booking, StripeService;

try { MagrApiService = require('../services/magrApiService'); } catch (e) { console.error('❌ MagrApiService:', e.message); }
try { User = require('../models/user'); } catch (e) { console.error('❌ User model:', e.message); }
try { Booking = require('../models/booking'); } catch (e) { console.error('❌ Booking model:', e.message); }
try { StripeService = require('../services/stripeService'); } catch (e) { console.error('❌ StripeService:', e.message); }

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Authentication middleware - FIXED
const authenticateToken = async (req, res, next) => {
  try {
    let token = null;
    const authHeader = req.headers['authorization'];
    
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      token = req.body.token || req.body.auth_token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required. Please log in.',
        requireAuth: true,
        error_code: 'NO_TOKEN'
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: 'JWT configuration error',
        error_code: 'JWT_SECRET_MISSING'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      _id: decoded.id || decoded.user_id || decoded.sub,
      email: decoded.email || 'unknown@example.com',
      name: decoded.name || decoded.username || 'Token User',
      verified: true,
      role: decoded.role || 'user'
    };

    // Optional database lookup
    if (User) {
      try {
        const dbUser = await User.findById(decoded.id);
        if (dbUser) req.user = dbUser;
      } catch (e) { /* Continue with token data */ }
    }

    next();
  } catch (error) {
    const statusCode = error.name === 'TokenExpiredError' ? 401 : 403;
    res.status(statusCode).json({
      success: false,
      message: error.name === 'TokenExpiredError' ? 'Session expired' : 'Invalid token',
      requireAuth: true,
      error_code: error.name
    });
  }
};

// ===== PUBLIC ROUTES =====

// Health check
router.get('/health', async (req, res) => {
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
      stripe_service: !!StripeService ? 'loaded' : 'failed'
    }
  };

  if (StripeService) {
    try {
      healthStatus.stripe_connection = await StripeService.healthCheck();
    } catch (error) {
      healthStatus.stripe_connection = { success: false, error: error.message };
    }
  }
  
  res.json(healthStatus);
});

// Stripe config
router.get('/stripe-config', (req, res) => {
  try {
    if (!process.env.STRIPE_PUBLISHABLE_KEY) {
      throw new Error('Stripe not configured');
    }

    const isTestMode = process.env.STRIPE_SECRET_KEY?.includes('test');
    res.json({
      success: true,
      publishable_key: process.env.STRIPE_PUBLISHABLE_KEY,
      stripe_mode: isTestMode ? 'test' : 'live',
      is_test_mode: isTestMode,
      test_card_info: isTestMode ? {
        visa_success: '4242 4242 4242 4242',
        note: 'Use any future date, any 3-digit CVC'
      } : null
    });
  } catch (error) {
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
    if (!MagrApiService) throw new Error('MagrApiService not available');
    const airports = MagrApiService.getAvailableAirports();
    res.json({ success: true, data: airports, count: airports.length });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch airports', error: error.message });
  }
});

// Search parking
const validateSearchParking = [
  body('airport_code').isIn(['LHR', 'LGW', 'STN', 'LTN', 'MAN', 'BHX', 'EDI', 'GLA']),
  body('dropoff_date').isISO8601(),
  body('dropoff_time').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('pickup_date').isISO8601(),
  body('pickup_time').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
];

router.post('/search-parking', validateSearchParking, handleValidationErrors, async (req, res) => {
  try {
    if (!MagrApiService) throw new Error('MAGR API not available');

    const { airport_code, dropoff_date, dropoff_time, pickup_date, pickup_time } = req.body;
    
    // Time validation
    const dropoffDateTime = new Date(`${dropoff_date}T${dropoff_time}`);
    const pickupDateTime = new Date(`${pickup_date}T${pickup_time}`);
    
    if (isNaN(dropoffDateTime.getTime()) || isNaN(pickupDateTime.getTime())) {
      throw new Error('Invalid date/time format');
    }
    if (pickupDateTime <= dropoffDateTime) {
      throw new Error('Pickup time must be after dropoff time');
    }
    if (dropoffDateTime < new Date()) {
      throw new Error('Dropoff time cannot be in the past');
    }

    const result = await MagrApiService.getParkingQuotes({ airport_code, dropoff_date, dropoff_time, pickup_date, pickup_time });
    
    if (!result?.success || !result?.data?.products) {
      throw new Error('No parking products found');
    }

    const enhancedProducts = result.data.products.map((product, index) => ({
      ...product,
      company_code: product.product_code || product.companyID || `COMPANY-${index + 1}`,
      id: product.id || index,
      price: parseFloat(product.price) || 0,
      is_cancelable: product.cancelable !== 'No',
      is_editable: product.editable !== 'No'
    }));

    res.json({
      success: true,
      data: { products: enhancedProducts },
      message: `Found ${enhancedProducts.length} parking options`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to search parking options',
      error: error.message
    });
  }
});

// Get terminals
router.get('/terminals/:airport_code', [param('airport_code').isIn(['LHR', 'LGW', 'STN', 'LTN', 'MAN', 'BHX', 'EDI', 'GLA'])], handleValidationErrors, (req, res) => {
  const terminals = {
    'LHR': ['Terminal 1', 'Terminal 2', 'Terminal 3', 'Terminal 4', 'Terminal 5'],
    'LGW': ['North Terminal', 'South Terminal'],
    'STN': ['Terminal 1'], 'LTN': ['Terminal 1'], 'EDI': ['Terminal 1'], 'GLA': ['Terminal 1'],
    'MAN': ['Terminal 1', 'Terminal 2', 'Terminal 3'],
    'BHX': ['Terminal 1', 'Terminal 2']
  };
  
  const airportTerminals = terminals[req.params.airport_code] || ['Terminal 1'];
  res.json({ success: true, data: airportTerminals, count: airportTerminals.length });
});

// ===== STRIPE PAYMENT ROUTES =====

// Create payment intent
const createPaymentValidation = [
  body('amount').isFloat({ min: 0.01 }),
  body('service_name').notEmpty(),
  body('airport_code').isIn(['LHR', 'LGW', 'STN', 'LTN', 'MAN', 'BHX', 'EDI', 'GLA']),
  body('company_code').notEmpty()
];

router.post('/create-payment-intent', authenticateToken, createPaymentValidation, handleValidationErrors, async (req, res) => {
  try {
    const isTestMode = process.env.STRIPE_SECRET_KEY?.includes('test');
    const { amount, currency = 'gbp', service_name, airport_code, company_code } = req.body;

    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('Stripe not configured');
    }

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(parseFloat(amount) * 100),
      currency: currency.toLowerCase(),
      description: `${isTestMode ? '[TEST] ' : ''}Parking ${airport_code} - ${service_name}`,
      metadata: {
        service_name, airport_code, company_code,
        user_email: req.user.email,
        is_test_mode: isTestMode.toString()
      },
      automatic_payment_methods: { enabled: true }
    });

    res.json({
      success: true,
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      amount: parseFloat(amount),
      currency,
      is_test_mode: isTestMode,
      test_cards: isTestMode ? { visa_success: '4242 4242 4242 4242' } : null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create payment intent',
      error: error.message
    });
  }
});

// Verify payment
router.get('/verify-payment/:payment_intent_id', authenticateToken, async (req, res) => {
  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const paymentIntent = await stripe.paymentIntents.retrieve(req.params.payment_intent_id);
    
    res.json({
      success: true,
      payment_status: paymentIntent.status,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      is_paid: paymentIntent.status === 'succeeded'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment',
      error: error.message
    });
  }
});

// Create booking with payment
const bookingValidation = [
  body('company_code').notEmpty(),
  body('airport_code').isIn(['LHR', 'LGW', 'STN', 'LTN', 'MAN', 'BHX', 'EDI', 'GLA']),
  body('dropoff_date').isISO8601(),
  body('dropoff_time').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('pickup_date').isISO8601(),
  body('pickup_time').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('service_name').notEmpty(),
  body('price').isFloat({ min: 0 }),
  body('payment_intent_id').notEmpty(),
  body('customer_name').notEmpty(),
  body('customer_email').isEmail(),
  body('customer_phone').notEmpty(),
  body('vehicle_registration').notEmpty(),
  body('vehicle_make').notEmpty(),
  body('vehicle_model').notEmpty(),
  body('vehicle_color').notEmpty()
];

router.post('/bookings-with-payment', authenticateToken, bookingValidation, handleValidationErrors, async (req, res) => {
  try {
    const isTestMode = process.env.STRIPE_SECRET_KEY?.includes('test');
    const { payment_intent_id } = req.body;

    // Verify payment
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);
    
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        message: 'Payment not confirmed',
        payment_status: paymentIntent.status
      });
    }

    // Prepare booking data
    const bookingData = {
      ...req.body,
      price: parseFloat(req.body.price),
      payment_amount: paymentIntent.amount / 100,
      payment_currency: paymentIntent.currency,
      payment_method: 'stripe',
      payment_status: 'paid',
      user_id: req.user._id,
      user_email: req.user.email,
      created_by: req.user.email,
      is_test_booking: isTestMode
    };

    // Try MAGR API
    let magrResult = { success: false, error: 'Not attempted' };
    if (MagrApiService) {
      try {
        magrResult = await MagrApiService.createBooking(bookingData);
      } catch (e) {
        magrResult = { success: false, error: e.message };
      }
    }

    const bookingReference = magrResult.booking_reference || 
      `${isTestMode ? 'TEST-' : ''}${bookingData.company_code}-${Date.now()}`;

    const finalBooking = {
      ...bookingData,
      booking_reference: bookingReference,
      our_reference: bookingReference, // For database compatibility
      magr_booking_id: magrResult.magr_booking_id,
      status: magrResult.success ? 'confirmed' : 'payment_received',
      magr_status: magrResult.success ? 'confirmed' : 'failed',
      booking_date: new Date(),
      is_cancelable: true,
      is_editable: true,
      created_at: new Date(),
      updated_at: new Date()
    };

    // Save to database
    if (Booking) {
      try {
        const savedBooking = new Booking(finalBooking);
        await savedBooking.save();
      } catch (e) { /* Continue even if DB save fails */ }
    }

    res.status(201).json({
      success: true,
      message: magrResult.success ? 'Booking created successfully' : 'Payment processed, confirmation pending',
      booking: {
        booking_reference: bookingReference,
        our_reference: bookingReference,
        status: finalBooking.status,
        ...bookingData,
        is_cancelable: true,
        is_editable: true
      },
      is_test_mode: isTestMode
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create booking',
      error: error.message
    });
  }
});

// ===== USER BOOKING MANAGEMENT =====

// Helper functions
const getDisplayStatus = (status, magrStatus) => {
  if (status === 'confirmed' && magrStatus === 'confirmed') return 'Confirmed';
  if (status === 'payment_received') return 'Payment Received';
  if (status === 'cancelled') return 'Cancelled';
  if (status === 'amended') return 'Modified';
  return 'Processing';
};

const formatDateTime = (date, time) => {
  try {
    return new Date(`${date}T${time}`).toLocaleString('en-GB', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch (e) {
    return `${date} ${time}`;
  }
};

const findUserBooking = async (bookingRef, userEmail) => {
  const queries = [
    { our_reference: bookingRef, user_email: userEmail },
    { booking_reference: bookingRef, user_email: userEmail },
    { our_reference: bookingRef, created_by: userEmail },
    { booking_reference: bookingRef, created_by: userEmail }
  ];

  for (const query of queries) {
    try {
      const booking = await Booking.findOne(query);
      if (booking) return booking;
    } catch (e) { /* Continue to next query */ }
  }
  return null;
};

// Get user bookings
router.get('/my-bookings', authenticateToken, async (req, res) => {
  try {
    if (!Booking) {
      return res.json({ success: true, bookings: [], count: 0, message: 'No booking system configured' });
    }

    // Try different lookup strategies
    let bookings = [];
    const queries = [
      { user_email: req.user.email },
      { created_by: req.user.email },
      { 'customer_details.customer_email': req.user.email }
    ];

    for (const query of queries) {
      try {
        bookings = await Booking.find(query).sort({ created_at: -1 });
        if (bookings.length > 0) break;
      } catch (e) { /* Continue to next query */ }
    }

    const enhancedBookings = bookings.map(booking => {
      const bookingObj = booking.toObject?.() || booking;
      return {
        ...bookingObj,
        is_cancelable: bookingObj.is_cancelable !== false,
        is_editable: bookingObj.is_editable !== false,
        display_status: getDisplayStatus(bookingObj.status, bookingObj.magr_status),
        is_test_booking: bookingObj.is_test_booking || false,
        formatted_dropoff: formatDateTime(bookingObj.dropoff_date, bookingObj.dropoff_time),
        formatted_pickup: formatDateTime(bookingObj.pickup_date, bookingObj.pickup_time)
      };
    });

    res.json({
      success: true,
      bookings: enhancedBookings,
      count: enhancedBookings.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings',
      error: error.message
    });
  }
});

// Get single booking
router.get('/booking/:booking_reference', authenticateToken, [param('booking_reference').notEmpty()], handleValidationErrors, async (req, res) => {
  try {
    if (!Booking) {
      return res.status(404).json({ success: false, message: 'Booking system not available' });
    }

    const booking = await findUserBooking(req.params.booking_reference, req.user.email);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found or access denied'
      });
    }

    const bookingObj = booking.toObject?.() || booking;
    const enhancedBooking = {
      ...bookingObj,
      is_cancelable: bookingObj.is_cancelable !== false,
      is_editable: bookingObj.is_editable !== false,
      display_status: getDisplayStatus(bookingObj.status, bookingObj.magr_status),
      formatted_dropoff: formatDateTime(bookingObj.dropoff_date, bookingObj.dropoff_time),
      formatted_pickup: formatDateTime(bookingObj.pickup_date, bookingObj.pickup_time)
    };

    res.json({ success: true, booking: enhancedBooking });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking details',
      error: error.message
    });
  }
});

// Cancel booking - FIXED
router.post('/cancel-booking', authenticateToken, [
  body('booking_reference').notEmpty(),
  body('cancellation_reason').optional().isLength({ max: 500 })
], handleValidationErrors, async (req, res) => {
  try {
    const { booking_reference, cancellation_reason } = req.body;
    const isTestMode = process.env.STRIPE_SECRET_KEY?.includes('test');

    if (!Booking) {
      return res.status(500).json({ success: false, message: 'Booking system not available' });
    }

    // FIXED: Use correct field lookup
    const booking = await findUserBooking(booking_reference, req.user.email);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.status === 'cancelled') {
      return res.json({
        success: true,
        message: 'Booking already cancelled',
        booking: { booking_reference, status: 'cancelled' }
      });
    }

    // Process cancellation operations
    const operations = {
      magr_api: { success: false, error: 'Not attempted' },
      stripe_refund: { success: false, error: 'Not attempted' }
    };

    // Try MAGR API cancellation
    if (MagrApiService && booking.magr_booking_id) {
      try {
        const result = await MagrApiService.cancelBooking({
          booking_reference,
          magr_booking_id: booking.magr_booking_id,
          cancellation_reason: cancellation_reason || 'User requested'
        });
        operations.magr_api = { success: result.success, error: result.error };
      } catch (e) {
        operations.magr_api = { success: false, error: e.message };
      }
    }

    // Try Stripe refund
    if (booking.payment_intent_id && booking.payment_amount > 0) {
      try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        const refund = await stripe.refunds.create({
          payment_intent: booking.payment_intent_id,
          amount: Math.round(booking.payment_amount * 100),
          reason: 'requested_by_customer'
        });
        operations.stripe_refund = {
          success: true,
          refund_id: refund.id,
          amount: refund.amount / 100
        };
      } catch (e) {
        operations.stripe_refund = { success: false, error: e.message };
      }
    }

    // Update database
    await Booking.findByIdAndUpdate(booking._id, {
      status: 'cancelled',
      cancellation_date: new Date(),
      cancellation_reason: cancellation_reason || 'User requested',
      cancelled_by: req.user.email,
      updated_at: new Date()
    });

    res.json({
      success: true,
      message: 'Booking cancellation processed',
      booking: { booking_reference, status: 'cancelled' },
      operations,
      is_test_mode: isTestMode
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Cancellation failed',
      error: error.message
    });
  }
});

// Amend booking - FIXED
router.post('/amend-booking', authenticateToken, [
  body('booking_reference').notEmpty(),
  body('new_dropoff_date').optional().isISO8601(),
  body('new_dropoff_time').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('new_pickup_date').optional().isISO8601(),
  body('new_pickup_time').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('new_customer_phone').optional(),
  body('new_special_requests').optional().isLength({ max: 500 })
], handleValidationErrors, async (req, res) => {
  try {
    const { booking_reference } = req.body;
    const isTestMode = process.env.STRIPE_SECRET_KEY?.includes('test');

    if (!Booking) {
      return res.status(500).json({ success: false, message: 'Booking system not available' });
    }

    // FIXED: Use correct field lookup
    const amendBooking = await findUserBooking(booking_reference, req.user.email);
    if (!amendBooking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (amendBooking.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot amend cancelled booking' });
    }

    // Collect changes
    const changes = {};
    const changeLog = [];
    const fields = [
      { key: 'dropoff_date', label: 'Dropoff date' },
      { key: 'dropoff_time', label: 'Dropoff time' },
      { key: 'pickup_date', label: 'Pickup date' },
      { key: 'pickup_time', label: 'Pickup time' },
      { key: 'customer_phone', label: 'Phone' },
      { key: 'special_requests', label: 'Special requests' }
    ];

    fields.forEach(({ key, label }) => {
      const newKey = `new_${key}`;
      if (req.body[newKey] !== undefined && req.body[newKey] !== amendBooking[key]) {
        changes[key] = req.body[newKey];
        changeLog.push(`${label} updated`);
      }
    });

    if (Object.keys(changes).length === 0) {
      return res.json({
        success: true,
        message: 'No changes detected',
        booking: amendBooking.toObject?.() || amendBooking
      });
    }

    // Try MAGR API amendment
    let magrResult = { success: false, error: 'Not attempted' };
    if (MagrApiService && amendBooking.magr_booking_id) {
      try {
        magrResult = await MagrApiService.amendBooking({
          booking_reference,
          magr_booking_id: amendBooking.magr_booking_id,
          ...changes
        });
      } catch (e) {
        magrResult = { success: false, error: e.message };
      }
    }

    // Update database
    const updatedBooking = await Booking.findByIdAndUpdate(amendBooking._id, {
      ...changes,
      status: 'amended',
      amendment_date: new Date(),
      amended_by: req.user.email,
      amendment_count: (amendBooking.amendment_count || 0) + 1,
      updated_at: new Date()
    }, { new: true });

    res.json({
      success: true,
      message: 'Booking amended successfully',
      booking: updatedBooking.toObject?.() || updatedBooking,
      changes: { applied: changeLog, count: Object.keys(changes).length },
      is_test_mode: isTestMode
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Amendment failed',
      error: error.message
    });
  }
});

// ===== ADMIN ROUTES =====

// Get all bookings (admin)
router.get('/bookings', async (req, res) => {
  try {
    if (!Booking) {
      return res.status(500).json({ success: false, message: 'Booking model not available' });
    }
    
    const bookings = await Booking.find({}).sort({ created_at: -1 }).limit(100);
    
    res.json({
      success: true,
      data: bookings.map(booking => ({
        id: booking._id,
        our_reference: booking.our_reference,
        status: booking.status,
        user_email: booking.user_email,
        customer_email: booking.customer_details?.customer_email,
        airport_code: booking.airport_code,
        created_at: booking.created_at
      })),
      count: bookings.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve bookings',
      error: error.message
    });
  }
});

// Booking statistics
router.get('/booking-stats', async (req, res) => {
  try {
    if (!Booking) {
      return res.json({
        success: true,
        stats: { total_bookings: 0, confirmed_bookings: 0, cancelled_bookings: 0, total_revenue: 0 }
      });
    }
    
    const [total, confirmed, cancelled] = await Promise.all([
      Booking.countDocuments({}),
      Booking.countDocuments({ status: 'confirmed' }),
      Booking.countDocuments({ status: 'cancelled' })
    ]);
    
    const revenueResult = await Booking.aggregate([
      { $match: { status: 'confirmed' } },
      { $group: { _id: null, total: { $sum: '$booking_amount' } } }
    ]);
    
    const totalRevenue = revenueResult[0]?.total || 0;
    
    res.json({
      success: true,
      stats: {
        total_bookings: total,
        confirmed_bookings: confirmed,
        cancelled_bookings: cancelled,
        pending_bookings: total - confirmed - cancelled,
        total_revenue: parseFloat(totalRevenue.toFixed(2)),
        average_booking_value: confirmed > 0 ? parseFloat((totalRevenue / confirmed).toFixed(2)) : 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get statistics',
      error: error.message
    });
  }
});

module.exports = router;