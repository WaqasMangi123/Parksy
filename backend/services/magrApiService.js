const axios = require('axios');
const https = require('https');
const { v4: uuidv4 } = require('uuid');

class MagrApiService {
  constructor() {
    // Configuration
    this.config = {
      baseURL: 'https://api.magrgroup.com/api', // Updated to match API docs
      timeout: 30000, // 30 seconds
      maxRedirects: 0, // Handle redirects manually
      maxRetries: 3,
      retryDelay: 1000, // 1 second initial delay
    };

    // Credentials - should come from environment variables
    this.credentials = {
      user_email: process.env.MAGR_USER_EMAIL || 'demob2b@gmail.com',
      password: process.env.MAGR_PASSWORD || 'P8aD#VD%sCH?lm~9',
      agent_code: process.env.MAGR_AGENT_CODE || '6vW2Ug0rUMAQAcPLmNfBSAVYPENg',
    };

    // Statistics tracking
    this.stats = {
      requests_made: 0,
      successful_requests: 0,
      failed_requests: 0,
      bookings_created: 0,
      bookings_cancelled: 0,
      bookings_amended: 0,
      last_request_time: null,
      api_status: 'unknown'
    };
    
    // Create axios instance with custom HTTPS agent
    this.axiosInstance = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      httpsAgent: new https.Agent({
        rejectUnauthorized: true,
        keepAlive: true,
        maxSockets: 10, // Limit concurrent connections
      }),
      maxRedirects: this.config.maxRedirects,
    });

    // Initialize interceptors
    this.initializeInterceptors();
    this.validateConfiguration();
  }

  initializeInterceptors() {
    // Request interceptor for logging and tracking
    this.axiosInstance.interceptors.request.use((config) => {
      const requestId = uuidv4();
      config.headers['X-Request-ID'] = requestId;
      config.startTime = Date.now(); // Track request timing
      
      this.stats.requests_made++;
      this.stats.last_request_time = new Date().toISOString();
      
      console.log(`[${requestId}] 🚀 MAGR API Request:`, {
        method: config.method.toUpperCase(),
        url: config.url,
        endpoint: config.url,
        hasCredentials: !!(config.data?.user_email && config.data?.agent_code),
        dataKeys: config.data ? Object.keys(config.data) : [],
        timestamp: this.stats.last_request_time
      });

      // Log detailed data for booking requests (but hide sensitive info)
      if (config.url === '/bookings' || config.url === '/cancel' || config.url === '/amend') {
        const safeData = { ...config.data };
        if (safeData.password) safeData.password = '[HIDDEN]';
        console.log(`[${requestId}] 🎫 ${config.url.replace('/', '').toUpperCase()} Request Data:`, JSON.stringify(safeData, null, 2));
      }

      return config;
    }, (error) => {
      console.error('❌ Request Interceptor Error:', error);
      this.stats.failed_requests++;
      return Promise.reject(error);
    });

    // Response interceptor for logging and tracking
    this.axiosInstance.interceptors.response.use((response) => {
      const requestId = response.config.headers['X-Request-ID'];
      const duration = Date.now() - response.config.startTime;
      
      this.stats.successful_requests++;
      this.stats.api_status = 'healthy';
      
      console.log(`[${requestId}] ✅ MAGR API Response (${duration}ms):`, {
        status: response.status,
        statusText: response.statusText,
        dataType: typeof response.data,
        hasData: !!response.data,
        responseStatus: response.data?.status,
        responseMessage: response.data?.message?.substring(0, 100),
        duration: `${duration}ms`
      });

      // Log full response for booking endpoints and track operation success
      if (['/bookings', '/cancel', '/amend'].includes(response.config.url)) {
        console.log(`[${requestId}] 📋 ${response.config.url.replace('/', '').toUpperCase()} Response:`, JSON.stringify(response.data, null, 2));
        
        // Track successful operations
        if (response.data?.status === 'success' || response.data?.status === 'Success') {
          if (response.config.url === '/bookings') {
            this.stats.bookings_created++;
          } else if (response.config.url === '/cancel') {
            this.stats.bookings_cancelled++;
          } else if (response.config.url === '/amend') {
            this.stats.bookings_amended++;
          }
        }
      }

      return response;
    }, (error) => {
      const requestId = error.config?.headers?.['X-Request-ID'];
      const duration = error.config?.startTime ? Date.now() - error.config.startTime : 0;
      
      this.stats.failed_requests++;
      this.stats.api_status = 'error';
      
      if (error.response) {
        console.error(`[${requestId}] ❌ MAGR API Error Response (${duration}ms):`, {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          url: error.config?.url,
          duration: `${duration}ms`
        });
      } else if (error.request) {
        console.error(`[${requestId}] ❌ MAGR API Network Error (${duration}ms):`, {
          message: error.message,
          code: error.code,
          url: error.config?.url,
          duration: `${duration}ms`
        });
      } else {
        console.error('❌ MAGR API Setup Error:', error.message);
      }
      
      return Promise.reject(error);
    });
  }

  validateConfiguration() {
    const missing = [];
    if (!this.credentials.user_email) missing.push('user_email');
    if (!this.credentials.password) missing.push('password');
    if (!this.credentials.agent_code) missing.push('agent_code');

    if (missing.length > 0) {
      throw new Error(`MAGR API credentials missing: ${missing.join(', ')}`);
    }

    console.log('✅ MAGR API Service initialized:', {
      baseURL: this.config.baseURL,
      user_email: this.credentials.user_email,
      agent_code: this.credentials.agent_code.substring(0, 8) + '...',
      password_set: !!this.credentials.password,
      max_retries: this.config.maxRetries,
      timeout: `${this.config.timeout / 1000}s`
    });
  }

  /**
   * Get service statistics
   */
  getStats() {
    const successRate = this.stats.requests_made > 0 
      ? ((this.stats.successful_requests / this.stats.requests_made) * 100).toFixed(2)
      : '0.00';

    return {
      ...this.stats,
      success_rate: `${successRate}%`,
      uptime: this.stats.last_request_time ? 
        `${Math.floor((Date.now() - new Date(this.stats.last_request_time).getTime()) / 1000)}s ago` : 
        'No requests yet'
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      requests_made: 0,
      successful_requests: 0,
      failed_requests: 0,
      bookings_created: 0,
      bookings_cancelled: 0,
      bookings_amended: 0,
      last_request_time: null,
      api_status: 'unknown'
    };
    console.log('📊 MAGR API statistics reset');
  }

  /**
   * Core request method with retry and redirect handling
   */
  async makeRequest(endpoint, data = {}, attempt = 1) {
    const requestId = uuidv4();
    
    // Always include credentials in the request
    const requestData = {
      user_email: this.credentials.user_email,
      password: this.credentials.password,
      agent_code: this.credentials.agent_code,
      ...data,
    };

    try {
      console.log(`[${requestId}] 🔄 Attempt ${attempt}/${this.config.maxRetries}: ${endpoint}`);

      const response = await this.axiosInstance({
        method: 'POST',
        url: endpoint,
        data: requestData,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Parksy-Backend/1.0',
          'X-API-Version': '1.0',
          'X-Client-Type': 'nodejs',
          'Cache-Control': 'no-cache'
        },
      });

      // Handle redirects
      if ([301, 302, 307, 308].includes(response.status)) {
        if (attempt >= this.config.maxRetries) {
          throw new Error(`Maximum redirect attempts (${this.config.maxRetries}) reached`);
        }

        const location = response.headers.location;
        if (!location) {
          throw new Error('Redirect response missing Location header');
        }

        const newEndpoint = new URL(location).pathname;
        console.log(`[${requestId}] 🔄 Following redirect to: ${newEndpoint}`);
        
        await this.delay(this.config.retryDelay * attempt);
        return this.makeRequest(newEndpoint, data, attempt + 1);
      }

      // Validate successful HTTP response
      if (response.status >= 200 && response.status < 300) {
        if (!response.data) {
          throw new Error('Empty response from MAGR API server');
        }

        // Check for API-level errors
        if (response.data.status === 'Error' || response.data.status === 'error') {
          const errorMsg = response.data.message || 'API returned error status';
          console.error(`[${requestId}] ❌ MAGR API Error:`, errorMsg);
          throw new Error(errorMsg);
        }

        console.log(`[${requestId}] ✅ Request successful`);
        return response.data;
      }

      throw new Error(`Unexpected HTTP status: ${response.status} ${response.statusText}`);

    } catch (error) {
      console.error(`[${requestId}] ❌ Request failed (attempt ${attempt}/${this.config.maxRetries}):`, {
        message: error.message,
        status: error.response?.status,
        hasResponse: !!error.response,
        hasRequest: !!error.request,
        endpoint: endpoint
      });

      // Retry logic for certain errors
      if (attempt < this.config.maxRetries && this.shouldRetry(error)) {
        const delayMs = this.config.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
        console.log(`[${requestId}] ⏳ Retrying in ${delayMs}ms...`);
        await this.delay(delayMs);
        return this.makeRequest(endpoint, data, attempt + 1);
      }

      // Format and throw the error
      throw this.formatError(error, endpoint);
    }
  }

  shouldRetry(error) {
    // Don't retry client errors (4xx) as they won't change
    if (error.response && error.response.status >= 400 && error.response.status < 500) {
      return false;
    }
    
    // Retry on network errors or server errors
    return !error.response || 
           (error.response.status >= 500 && error.response.status < 600) ||
           ['ECONNABORTED', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNRESET', 'ECONNREFUSED'].includes(error.code);
  }

  formatError(error, endpoint = 'unknown') {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      // Handle specific MAGR API error responses
      if (data && data.message) {
        return new Error(`MAGR API Error (${status}) on ${endpoint}: ${data.message}`);
      }
      
      return new Error(`MAGR API HTTP Error ${status} on ${endpoint}: ${error.response.statusText || 'Unknown server error'}`);
    } else if (error.request) {
      return new Error(`No response from MAGR API on ${endpoint} - network connection failed`);
    }
    
    return new Error(`MAGR API Error on ${endpoint}: ${error.message}`);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * API Methods
   */

  // Enhanced connection test with more detailed reporting
  async testConnection() {
    try {
      console.log('🧪 Testing MAGR API connection...');
      
      const testParams = {
        quote: {
          airport_code: 'LHR',
          dropoff_date: this.formatDate(new Date(Date.now() + 86400000)), // Tomorrow
          dropoff_time: '10:00',
          pickup_date: this.formatDate(new Date(Date.now() + 86400000 * 7)), // 7 days later
          pickup_time: '18:00',
        },
      };

      const startTime = Date.now();
      const result = await this.makeRequest('/products', testParams);
      const duration = Date.now() - startTime;
      
      if (!result || !result.products) {
        throw new Error('Invalid response format from MAGR API');
      }
      
      console.log('✅ MAGR API connection test successful');
      
      return {
        success: true,
        message: 'MAGR API connection successful',
        response_time: `${duration}ms`,
        productsCount: result.products.length,
        api_status: this.stats.api_status,
        sampleProduct: result.products[0] ? {
          name: result.products[0].name,
          price: result.products[0].price,
          product_code: result.products[0].product_code,
          company_id: result.products[0].companyID
        } : null,
        stats: this.getStats()
      };
    } catch (error) {
      console.error('❌ MAGR API connection test failed:', error.message);
      throw new Error(`MAGR API connection failed: ${error.message}`);
    }
  }

  // Enhanced getParkingQuotes with better error handling and data processing
  async getParkingQuotes(params) {
    try {
      console.log('🔍 Getting parking quotes for:', params);
      
      // Validate input parameters
      this.validateBookingParams(params);

      const requestData = {
        quote: {
          airport_code: params.airport_code,
          dropoff_date: params.dropoff_date,
          dropoff_time: params.dropoff_time,
          pickup_date: params.pickup_date,
          pickup_time: params.pickup_time,
        },
      };

      console.log('🚀 Fetching parking quotes with params:', requestData);
      const result = await this.makeRequest('/products', requestData);
      
      if (!result.products) {
        throw new Error('No products found in MAGR API response');
      }

      console.log(`✅ Found ${result.products.length} parking products`);

      // Enhanced product transformation with better error handling
      const products = result.products.map((product, index) => {
        try {
          if (!product.name || product.price === undefined) {
            console.warn('⚠️ Invalid product data:', product);
            return null;
          }

          const processedProduct = {
            // Core identifiers
            id: product.id || `product_${index}`,
            name: product.name.trim(),
            companyID: product.companyID,
            product_code: product.product_code, // KEY field for company_code
            
            // Service details
            parking_type: product.parking_type || 'Meet & Greet',
            
            // Pricing
            price: parseFloat(product.price) || 0,
            formatted_price: (parseFloat(product.price) || 0).toFixed(2),
            share_percentage: parseFloat(product.share_percentage || 0),
            commission_amount: parseFloat(((parseFloat(product.price) || 0) * (parseFloat(product.share_percentage || 0)) / 100).toFixed(2)),
            
            // Duration
            duration_days: this.calculateDurationDays(params.dropoff_date, params.pickup_date),
            
            // Availability and policies
            cancelable: product.cancelable === 'Yes' || product.cancelable === true,
            editable: product.editable === 'Yes' || product.editable === true,
            processtime: parseInt(product.processtime) || 2,
            
            // Operating hours
            opening_time: product.opening_time || '00:00',
            closing_time: product.closing_time || '23:59',
            
            // Features and facilities
            special_features: product.special_features || '',
            facilities: product.facilities || '',
            features_array: product.special_features ? 
              product.special_features.split(',').map(f => f.trim()).filter(f => f) : [],
            facilities_array: product.facilities ? 
              product.facilities.split(',').map(f => f.trim()).filter(f => f) : [],
            
            // Availability
            available_spaces: product.available_spaces ? parseInt(product.available_spaces) : null,
            availability_status: product.available_spaces ? 
              `${product.available_spaces} spots available` : 'Available Now',
            
            // Metadata
            last_updated: new Date().toISOString(),
            source: 'magr_api',
            
            // Include all original product fields for debugging (but clean it up)
            _raw_product: {
              ...product,
              // Remove potentially large or irrelevant fields
              description: product.description ? product.description.substring(0, 200) : null
            }
          };

          return processedProduct;
        } catch (productError) {
          console.error(`❌ Error processing product ${index}:`, productError.message);
          return null;
        }
      }).filter(Boolean); // Remove any null entries from invalid products

      const summary = {
        total_products: products.length,
        price_range: products.length > 0 ? {
          min: Math.min(...products.map(p => p.price)),
          max: Math.max(...products.map(p => p.price)),
          average: (products.reduce((sum, p) => sum + p.price, 0) / products.length).toFixed(2)
        } : null,
        cancelable_count: products.filter(p => p.cancelable).length,
        company_codes: [...new Set(products.map(p => p.product_code || p.companyID).filter(Boolean))]
      };

      console.log('📊 Products summary:', summary);

      return {
        success: true,
        data: {
          products,
          search_params: params,
          summary,
          timestamp: new Date().toISOString(),
          api_stats: this.getStats()
        },
      };
    } catch (error) {
      console.error('❌ Error in getParkingQuotes:', error.message);
      throw new Error(`Failed to get parking quotes: ${error.message}`);
    }
  }

  // Enhanced createBooking with better validation and error handling
  async createBooking(bookingData) {
    try {
      console.log('🎫 Creating MAGR API booking...');
      console.log('🔍 Booking data received:', {
        company_code: bookingData.company_code,
        customer_email: bookingData.customer_email,
        booking_amount: bookingData.booking_amount,
        car_registration: bookingData.car_registration_number,
        reference: bookingData.bookreference
      });
      
      // Enhanced validation
      this.validateBookingData(bookingData);

      // Use the booking reference passed from routes, or generate our own
      const ourReference = bookingData.bookreference || this.generateBookingReference();
      console.log('🔖 Using booking reference:', ourReference);

      // Prepare request data in EXACT format MAGR API expects
      const requestData = {
        // API credentials are added automatically by makeRequest
        company_code: bookingData.company_code,
        bookreference: ourReference,
        
        // Travel details
        dropoff_date: bookingData.dropoff_date,
        dropoff_time: bookingData.dropoff_time,
        pickup_date: bookingData.pickup_date,
        pickup_time: bookingData.pickup_time,
        
        // Customer details
        title: bookingData.title,
        first_name: bookingData.first_name.trim(),
        last_name: bookingData.last_name.trim(),
        customer_email: bookingData.customer_email.toLowerCase().trim(),
        phone_number: bookingData.phone_number.trim(),
        
        // Flight details
        departure_flight_number: (bookingData.departure_flight_number || 'TBA').trim().toUpperCase(),
        arrival_flight_number: (bookingData.arrival_flight_number || 'TBA').trim().toUpperCase(),
        departure_terminal: bookingData.departure_terminal || 'Terminal 1',
        arrival_terminal: bookingData.arrival_terminal || 'Terminal 1',
        
        // Vehicle details
        car_registration_number: bookingData.car_registration_number.toUpperCase().trim(),
        car_make: bookingData.car_make.trim(),
        car_model: bookingData.car_model.trim(),
        car_color: bookingData.car_color.trim(),
        
        // Booking details
        park_api: 'b2b',
        passenger: parseInt(bookingData.passenger) || 1,
        paymentgateway: bookingData.paymentgateway || 'Invoice',
        payment_token: bookingData.payment_token || `pi_${uuidv4()}`,
        booking_amount: parseFloat(bookingData.booking_amount).toFixed(2),
      };

      console.log('🚀 Sending booking request to MAGR API:', {
        company_code: requestData.company_code,
        bookreference: requestData.bookreference,
        customer_email: requestData.customer_email,
        booking_amount: requestData.booking_amount,
        vehicle: `${requestData.car_make} ${requestData.car_model} (${requestData.car_registration_number})`
      });

      const startTime = Date.now();
      const result = await this.makeRequest('/bookings', requestData);
      const duration = Date.now() - startTime;

      console.log('📋 MAGR API booking result:', {
        hasResult: !!result,
        status: result?.status,
        hasReference: !!result?.reference,
        reference: result?.reference,
        message: result?.message,
        duration: `${duration}ms`
      });

      // Handle different response scenarios
      if (!result) {
        throw new Error('Empty response from MAGR API');
      }

      // Success case - handle various success response formats
      if ((result.status === 'success' || result.status === 'Success') && result.reference) {
        console.log('✅ MAGR API booking successful:', result.reference);
        
        return {
          success: true,
          booking_id: result.booking_id || result.reference,
          reference: result.reference, // MAGR's reference
          our_reference: ourReference, // Our reference
          status: 'confirmed',
          message: result.message || 'Booking created successfully',
          timestamp: new Date().toISOString(),
          response_time: `${duration}ms`,
          data: {
            reference: result.reference,
            booking_id: result.booking_id,
            magr_response: result
          }
        };
      }

      // Error case
      if (result.status === 'Error' || result.status === 'error') {
        const errorMsg = result.message || 'Unknown MAGR API error';
        console.error('❌ MAGR API booking error:', errorMsg);
        throw new Error(`MAGR booking failed: ${errorMsg}`);
      }

      // Handle case where booking might be successful but status is different
      if (result.reference && !result.status) {
        console.log('✅ MAGR API booking appears successful (no explicit status):', result.reference);
        return {
          success: true,
          reference: result.reference,
          our_reference: ourReference,
          status: 'confirmed',
          message: 'Booking created successfully',
          timestamp: new Date().toISOString(),
          response_time: `${duration}ms`,
          data: {
            reference: result.reference,
            magr_response: result
          }
        };
      }

      // Unexpected response format
      console.error('❌ Unexpected MAGR API response:', result);
      throw new Error(`Unexpected response from MAGR API: ${JSON.stringify(result).substring(0, 200)}`);

    } catch (error) {
      console.error('❌ MAGR API booking creation failed:', {
        message: error.message,
        name: error.name,
        stack: error.stack?.substring(0, 200)
      });
      
      // Return error in consistent format
      throw new Error(`MAGR API booking failed: ${error.message}`);
    }
  }

  // ===== NEW CANCEL BOOKING METHOD =====
  
  /**
   * Cancel a booking via MAGR API
   * @param {string|Object} bookingRefOrData - Booking reference string or full cancel data object
   * @param {number} refundAmount - Optional refund amount (if bookingRefOrData is string)
   * @returns {Promise<Object>} Cancel result
   */
  async cancelBooking(bookingRefOrData, refundAmount = null) {
    try {
      console.log('🚫 MAGR API - Cancelling booking...');
      
      let cancelData;
      
      // Handle both old method signature (bookingRef, refundAmount) and new object format
      if (typeof bookingRefOrData === 'string') {
        // Legacy method signature - convert to object format
        cancelData = {
          booking_ref: bookingRefOrData,
          refund: refundAmount || 0
        };
        console.log('🔄 Converting legacy cancel request format');
      } else if (typeof bookingRefOrData === 'object' && bookingRefOrData !== null) {
        // New object format from routes
        cancelData = bookingRefOrData;
      } else {
        throw new Error('Invalid cancel booking data - must provide booking reference or cancel data object');
      }

      // Validate required fields
      if (!cancelData.booking_ref) {
        throw new Error('Booking reference is required for cancellation');
      }

      // Ensure refund amount is properly formatted
      const refund = parseFloat(cancelData.refund || 0);
      if (isNaN(refund) || refund < 0) {
        throw new Error('Invalid refund amount - must be a positive number');
      }

      // Prepare request data matching API documentation format
      const requestData = {
        // Credentials added automatically by makeRequest
        booking_ref: cancelData.booking_ref,
        refund: refund.toFixed(2)
      };

      console.log('🚀 Sending cancel request to MAGR API:', {
        booking_ref: requestData.booking_ref,
        refund_amount: requestData.refund
      });

      const startTime = Date.now();
      const result = await this.makeRequest('/cancel', requestData);
      const duration = Date.now() - startTime;

      console.log('📋 MAGR API cancel result:', {
        hasResult: !!result,
        status: result?.status,
        message: result?.message,
        duration: `${duration}ms`
      });

      // Handle different response scenarios
      if (!result) {
        throw new Error('Empty response from MAGR API cancel endpoint');
      }

      // Success case
      if (result.status === 'success' || result.status === 'Success') {
        console.log('✅ MAGR API booking cancellation successful');
        
        return {
          success: true,
          status: 'success',
          message: result.message || 'Booking cancelled successfully',
          booking_ref: result.booking_ref || cancelData.booking_ref,
          reference: result.reference || result.booking_ref || cancelData.booking_ref,
          refund_amount: refund,
          timestamp: new Date().toISOString(),
          response_time: `${duration}ms`,
          magr_response: result
        };
      }

      // Error case
      if (result.status === 'Error' || result.status === 'error') {
        const errorMsg = result.message || 'Unknown MAGR API cancellation error';
        console.error('❌ MAGR API cancellation error:', errorMsg);
        
        // Return error in consistent format for routes to handle
        return {
          success: false,
          status: 'error',
          message: errorMsg,
          booking_ref: cancelData.booking_ref,
          error_code: this.mapCancelErrorCode(errorMsg),
          timestamp: new Date().toISOString(),
          magr_response: result
        };
      }

      // Unexpected response format
      console.error('❌ Unexpected MAGR API cancel response:', result);
      return {
        success: false,
        status: 'error',
        message: `Unexpected response from MAGR API: ${JSON.stringify(result).substring(0, 100)}`,
        booking_ref: cancelData.booking_ref,
        error_code: 'UNEXPECTED_RESPONSE',
        timestamp: new Date().toISOString(),
        magr_response: result
      };

    } catch (error) {
      console.error('❌ MAGR API cancellation failed:', {
        message: error.message,
        name: error.name
      });
      
      // Return error in consistent format
      return {
        success: false,
        status: 'error',
        message: error.message,
        booking_ref: typeof bookingRefOrData === 'string' ? bookingRefOrData : bookingRefOrData?.booking_ref,
        error_code: 'CANCEL_REQUEST_FAILED',
        timestamp: new Date().toISOString()
      };
    }
  }

  // ===== NEW AMEND BOOKING METHOD =====
  
  /**
   * Amend a booking via MAGR API
   * @param {Object} amendData - Full amend data object from routes
   * @returns {Promise<Object>} Amend result
   */
  async amendBooking(amendData) {
    try {
      console.log('✏️ MAGR API - Amending booking...');
      
      if (!amendData || typeof amendData !== 'object') {
        throw new Error('Invalid amend booking data - must provide amend data object');
      }

      // Validate required fields
      if (!amendData.bookreference) {
        throw new Error('Booking reference is required for amendment');
      }

      if (!amendData.company_code) {
        throw new Error('Company code is required for amendment');
      }

      // Prepare request data matching API documentation format
      const requestData = {
        // Credentials added automatically by makeRequest
        company_code: amendData.company_code,
        bookreference: amendData.bookreference,
        amend_booking: "amend_booking", // Required flag per API docs
        
        // Travel details (times can be changed, dates cannot)
        dropoff_time: amendData.dropoff_time,
        dropoff_date: amendData.dropoff_date, // Cannot be changed but must be included
        pickup_time: amendData.pickup_time,
        pickup_date: amendData.pickup_date, // Cannot be changed but must be included
        
        // Customer details (can be changed)
        title: amendData.title,
        first_name: amendData.first_name?.trim(),
        last_name: amendData.last_name?.trim(),
        customer_email: amendData.customer_email?.toLowerCase().trim(),
        phone_number: amendData.phone_number?.trim(),
        
        // Flight details (can be changed)
        departure_flight_number: amendData.departure_flight_number?.trim().toUpperCase(),
        arrival_flight_number: amendData.arrival_flight_number?.trim().toUpperCase(),
        departure_terminal: amendData.departure_terminal,
        arrival_terminal: amendData.arrival_terminal,
        
        // Vehicle details (can be changed)
        car_registration_number: amendData.car_registration_number?.toUpperCase().trim(),
        car_make: amendData.car_make?.trim(),
        car_model: amendData.car_model?.trim(),
        car_color: amendData.car_color?.trim(),
        
        // Fixed booking details (cannot be changed)
        park_api: amendData.park_api || "b2b",
        passenger: amendData.passenger || 1,
        paymentgateway: amendData.paymentgateway,
        payment_token: amendData.payment_token,
        booking_amount: amendData.booking_amount
      };

      // Remove undefined/null values to avoid API issues
      Object.keys(requestData).forEach(key => {
        if (requestData[key] === undefined || requestData[key] === null || requestData[key] === '') {
          delete requestData[key];
        }
      });

      console.log('🚀 Sending amend request to MAGR API:', {
        bookreference: requestData.bookreference,
        company_code: requestData.company_code,
        changed_fields: Object.keys(amendData).filter(key => 
          !['bookreference', 'company_code', 'amend_booking', 'user_email', 'password', 'agent_code'].includes(key)
        )
      });

      const startTime = Date.now();
      const result = await this.makeRequest('/amend', requestData);
      const duration = Date.now() - startTime;

      console.log('📋 MAGR API amend result:', {
        hasResult: !!result,
        status: result?.status,
        hasReference: !!result?.reference,
        message: result?.message,
        duration: `${duration}ms`
      });

      // Handle different response scenarios
      if (!result) {
        throw new Error('Empty response from MAGR API amend endpoint');
      }

      // Success case
      if (result.status === 'success' || result.status === 'Success') {
        console.log('✅ MAGR API booking amendment successful');
        
        return {
          success: true,
          status: 'success',
          message: result.message || 'Booking amended successfully',
          reference: result.reference || amendData.bookreference,
          booking_ref: result.booking_ref || result.reference || amendData.bookreference,
          timestamp: new Date().toISOString(),
          response_time: `${duration}ms`,
          magr_response: result
        };
      }

      // Error case
      if (result.status === 'Error' || result.status === 'error') {
        const errorMsg = result.message || 'Unknown MAGR API amendment error';
        console.error('❌ MAGR API amendment error:', errorMsg);
        
        // Return error in consistent format for routes to handle
        return {
          success: false,
          status: 'error',
          message: errorMsg,
          reference: amendData.bookreference,
          error_code: this.mapAmendErrorCode(errorMsg),
          timestamp: new Date().toISOString(),
          magr_response: result
        };
      }

      // Unexpected response format
      console.error('❌ Unexpected MAGR API amend response:', result);
      return {
        success: false,
        status: 'error',
        message: `Unexpected response from MAGR API: ${JSON.stringify(result).substring(0, 100)}`,
        reference: amendData.bookreference,
        error_code: 'UNEXPECTED_RESPONSE',
        timestamp: new Date().toISOString(),
        magr_response: result
      };

    } catch (error) {
      console.error('❌ MAGR API amendment failed:', {
        message: error.message,
        name: error.name
      });
      
      // Return error in consistent format
      return {
        success: false,
        status: 'error',
        message: error.message,
        reference: amendData?.bookreference,
        error_code: 'AMEND_REQUEST_FAILED',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Map MAGR API error messages to standardized error codes for cancel operations
   */
  mapCancelErrorCode(errorMessage) {
    const message = errorMessage.toLowerCase();
    
    if (message.includes('user not found') || message.includes('invalid api credentials')) {
      return 'INVALID_CREDENTIALS';
    }
    if (message.includes('within 48 hours') || message.includes('48 hours')) {
      return 'WITHIN_48_HOURS';
    }
    if (message.includes('non-flex') || message.includes('must be flex')) {
      return 'NON_CANCELLABLE';
    }
    if (message.includes('booking not found')) {
      return 'BOOKING_NOT_FOUND';
    }
    
    return 'UNKNOWN_ERROR';
  }

  /**
   * Map MAGR API error messages to standardized error codes for amend operations
   */
  mapAmendErrorCode(errorMessage) {
    const message = errorMessage.toLowerCase();
    
    if (message.includes('user not found') || message.includes('invalid api credentials')) {
      return 'INVALID_CREDENTIALS';
    }
    if (message.includes('within 48 hours') || message.includes('48 hours')) {
      return 'WITHIN_48_HOURS';
    }
    if (message.includes('non-flex') || message.includes('must be flex')) {
      return 'NON_EDITABLE';
    }
    if (message.includes('booking not found')) {
      return 'BOOKING_NOT_FOUND';
    }
    
    return 'UNKNOWN_ERROR';
  }

  /**
   * Enhanced Validation Methods
   */
  validateBookingParams(params) {
    const required = ['airport_code', 'dropoff_date', 'dropoff_time', 'pickup_date', 'pickup_time'];
    const missing = required.filter(field => !params[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required search parameters: ${missing.join(', ')}`);
    }

    // Validate airport code
    const validAirports = ['LHR', 'LGW', 'STN', 'LTN', 'MAN', 'BHX', 'EDI', 'GLA'];
    if (!validAirports.includes(params.airport_code)) {
      throw new Error(`Invalid airport code: ${params.airport_code}`);
    }

    this.validateBookingTimes(
      params.dropoff_date,
      params.dropoff_time,
      params.pickup_date,
      params.pickup_time
    );
  }

  // Enhanced booking data validation
  validateBookingData(bookingData) {
    const requiredFields = [
      'company_code', 'dropoff_date', 'dropoff_time', 
      'pickup_date', 'pickup_time', 'title',
      'first_name', 'last_name', 'customer_email',
      'phone_number', 'car_registration_number',
      'car_make', 'car_model', 'car_color',
      'booking_amount'
    ];

    const missingFields = requiredFields.filter(field => {
      const value = bookingData[field];
      return !value || (typeof value === 'string' && value.trim() === '');
    });
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required booking fields: ${missingFields.join(', ')}`);
    }

    // Validate company_code format
    if (!bookingData.company_code || typeof bookingData.company_code !== 'string') {
      throw new Error('Company code must be a valid string');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(bookingData.customer_email)) {
      throw new Error('Invalid email address format');
    }

    // Validate phone number
    if (bookingData.phone_number.length < 8) {
      throw new Error('Phone number too short');
    }

    // Validate booking amount
    const amount = parseFloat(bookingData.booking_amount);
    if (isNaN(amount) || amount <= 0) {
      throw new Error('Invalid booking amount - must be a positive number');
    }
    if (amount > 10000) {
      throw new Error('Booking amount too large - maximum £10,000');
    }

    // Validate car registration
    if (bookingData.car_registration_number.length < 2) {
      throw new Error('Car registration number too short');
    }

    // Validate title
    const validTitles = ['Mr', 'Mrs', 'Miss', 'Ms', 'Dr'];
    if (!validTitles.includes(bookingData.title)) {
      throw new Error('Invalid title - must be one of: ' + validTitles.join(', '));
    }

    this.validateBookingTimes(
      bookingData.dropoff_date,
      bookingData.dropoff_time,
      bookingData.pickup_date,
      bookingData.pickup_time
    );
  }

  validateBookingTimes(dropoffDate, dropoffTime, pickupDate, pickupTime) {
    try {
      // Validate date formats
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dropoffDate)) {
        throw new Error('Invalid dropoff date format - use YYYY-MM-DD');
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(pickupDate)) {
        throw new Error('Invalid pickup date format - use YYYY-MM-DD');
      }
      if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(dropoffTime)) {
        throw new Error('Invalid dropoff time format - use HH:MM');
      }
      if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(pickupTime)) {
        throw new Error('Invalid pickup time format - use HH:MM');
      }

      const dropoffDateTime = new Date(`${dropoffDate}T${dropoffTime}:00`);
      const pickupDateTime = new Date(`${pickupDate}T${pickupTime}:00`);
      const now = new Date();

      if (isNaN(dropoffDateTime.getTime())) {
        throw new Error('Invalid dropoff date/time');
      }

      if (isNaN(pickupDateTime.getTime())) {
        throw new Error('Invalid pickup date/time');
      }

      if (dropoffDateTime <= now) {
        throw new Error('Dropoff time must be in the future');
      }

      if (pickupDateTime <= dropoffDateTime) {
        throw new Error('Pickup time must be after dropoff time');
      }

      // Check minimum advance booking time
      const minAdvanceHours = 2;
      const hoursDiff = (dropoffDateTime - now) / (1000 * 60 * 60);
      if (hoursDiff < minAdvanceHours) {
        throw new Error(`Booking must be made at least ${minAdvanceHours} hours in advance`);
      }

      // Check maximum booking period (1 year)
      const maxDays = 365;
      const daysDiff = (pickupDateTime - dropoffDateTime) / (1000 * 60 * 60 * 24);
      if (daysDiff > maxDays) {
        throw new Error(`Maximum booking period is ${maxDays} days`);
      }

      console.log('✅ Booking times validated successfully');
    } catch (error) {
      console.error('❌ Time validation failed:', error.message);
      throw error;
    }
  }

  /**
   * Enhanced Utility Methods
   */
  generateBookingReference() {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `PARKSY-${timestamp}-${random}`;
  }

  calculateDurationDays(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  formatDate(date) {
    return new Date(date).toISOString().split('T')[0];
  }

  formatTime(date) {
    return new Date(date).toTimeString().split(' ')[0].substring(0, 5);
  }

  // Enhanced airport data with more details
  getAvailableAirports() {
    return [
      { 
        code: 'LHR', 
        name: 'London Heathrow', 
        city: 'London', 
        country: 'UK',
        timezone: 'Europe/London',
        coordinates: { lat: 51.4700, lng: -0.4543 }
      },
      { 
        code: 'LGW', 
        name: 'London Gatwick', 
        city: 'London', 
        country: 'UK',
        timezone: 'Europe/London',
        coordinates: { lat: 51.1537, lng: -0.1821 }
      },
      { 
        code: 'STN', 
        name: 'London Stansted', 
        city: 'London', 
        country: 'UK',
        timezone: 'Europe/London',
        coordinates: { lat: 51.8860, lng: 0.2389 }
      },
      { 
        code: 'LTN', 
        name: 'London Luton', 
        city: 'London', 
        country: 'UK',
        timezone: 'Europe/London',
        coordinates: { lat: 51.8763, lng: -0.3717 }
      },
      { 
        code: 'MAN', 
        name: 'Manchester', 
        city: 'Manchester', 
        country: 'UK',
        timezone: 'Europe/London',
        coordinates: { lat: 53.3537, lng: -2.2750 }
      },
      { 
        code: 'BHX', 
        name: 'Birmingham', 
        city: 'Birmingham', 
        country: 'UK',
        timezone: 'Europe/London',
        coordinates: { lat: 52.4539, lng: -1.7481 }
      },
      { 
        code: 'EDI', 
        name: 'Edinburgh', 
        city: 'Edinburgh', 
        country: 'UK',
        timezone: 'Europe/London',
        coordinates: { lat: 55.9500, lng: -3.3725 }
      },
      { 
        code: 'GLA', 
        name: 'Glasgow', 
        city: 'Glasgow', 
        country: 'UK',
        timezone: 'Europe/London',
        coordinates: { lat: 55.8719, lng: -4.4331 }
      },
    ];
  }

  getTerminalsForAirport(airportCode) {
    const terminalMap = {
      'LHR': ['Terminal 1', 'Terminal 2', 'Terminal 3', 'Terminal 4', 'Terminal 5'],
      'LGW': ['North Terminal', 'South Terminal'],
      'STN': ['Terminal 1'],
      'LTN': ['Terminal 1'],
      'MAN': ['Terminal 1', 'Terminal 2', 'Terminal 3'],
      'BHX': ['Terminal 1', 'Terminal 2'],
      'EDI': ['Terminal 1'],
      'GLA': ['Terminal 1']
    };
    
    return terminalMap[airportCode] || ['Terminal 1'];
  }

  // Get airport details by code
  getAirportDetails(airportCode) {
    return this.getAvailableAirports().find(airport => airport.code === airportCode);
  }

  // Health check method
  async healthCheck() {
    try {
      console.log('🏥 Performing MAGR API health check...');
      
      const healthData = {
        service: 'MAGR API Service',
        status: this.stats.api_status,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        stats: this.getStats(),
        configuration: {
          baseURL: this.config.baseURL,
          timeout: this.config.timeout,
          maxRetries: this.config.maxRetries,
          user_email: this.credentials.user_email,
          has_credentials: !!(this.credentials.user_email && this.credentials.password && this.credentials.agent_code)
        }
      };

      // Try a quick connection test if we haven't made a request recently
      if (!this.stats.last_request_time || 
          (Date.now() - new Date(this.stats.last_request_time).getTime()) > 300000) { // 5 minutes
        try {
          await this.testConnection();
          healthData.connection_test = 'passed';
        } catch (error) {
          healthData.connection_test = 'failed';
          healthData.connection_error = error.message;
        }
      } else {
        healthData.connection_test = 'skipped - recent request exists';
      }

      return healthData;
    } catch (error) {
      console.error('❌ Health check failed:', error);
      return {
        service: 'MAGR API Service',
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message,
        stats: this.getStats()
      };
    }
  }
}

// Export singleton instance
module.exports = new MagrApiService();