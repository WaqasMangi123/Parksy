const axios = require('axios');
const https = require('https');
const { v4: uuidv4 } = require('uuid');

class MagrApiService {
  constructor() {
    // Configuration
    this.config = {
      baseURL: 'https://api.magrgroup.com/api',
      timeout: 30000, // 30 seconds
      maxRedirects: 0,
      maxRetries: 3,
      retryDelay: 1000,
    };

    // Credentials from environment variables
    this.credentials = {
      user_email: process.env.MAGR_USER_EMAIL,
      password: process.env.MAGR_PASSWORD,
      agent_code: process.env.MAGR_AGENT_CODE,
    };

    // Statistics tracking
    this.stats = {
      requests_made: 0,
      successful_requests: 0,
      failed_requests: 0,
      bookings_created: 0,
      last_request_time: null,
      api_status: 'unknown'
    };
    
    // Create axios instance
    this.axiosInstance = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      httpsAgent: new https.Agent({
        rejectUnauthorized: true,
        keepAlive: true,
        maxSockets: 10,
      }),
      maxRedirects: this.config.maxRedirects,
    });

    this.initializeInterceptors();
    this.validateConfiguration();
  }

  initializeInterceptors() {
    // Request interceptor
    this.axiosInstance.interceptors.request.use((config) => {
      const requestId = uuidv4();
      config.headers['X-Request-ID'] = requestId;
      config.startTime = Date.now();
      
      this.stats.requests_made++;
      this.stats.last_request_time = new Date().toISOString();
      
      console.log(`[${requestId}] 🚀 MAGR API Request:`, {
        method: config.method.toUpperCase(),
        url: config.url,
        timestamp: this.stats.last_request_time
      });

      return config;
    }, (error) => {
      console.error('❌ Request Interceptor Error:', error);
      this.stats.failed_requests++;
      return Promise.reject(error);
    });

    // Response interceptor
    this.axiosInstance.interceptors.response.use((response) => {
      const requestId = response.config.headers['X-Request-ID'];
      const duration = Date.now() - response.config.startTime;
      
      this.stats.successful_requests++;
      this.stats.api_status = 'healthy';
      
      console.log(`[${requestId}] ✅ MAGR API Response (${duration}ms):`, {
        status: response.status,
        responseStatus: response.data?.status,
        duration: `${duration}ms`
      });

      // Track successful booking creation
      if (response.config.url === '/bookings' && response.data?.status === 'success') {
        this.stats.bookings_created++;
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
          data: error.response.data,
          url: error.config?.url
        });
      } else if (error.request) {
        console.error(`[${requestId}] ❌ MAGR API Network Error (${duration}ms):`, {
          message: error.message,
          code: error.code
        });
      }
      
      return Promise.reject(error);
    });
  }

  validateConfiguration() {
    const missing = [];
    if (!this.credentials.user_email) missing.push('MAGR_USER_EMAIL');
    if (!this.credentials.password) missing.push('MAGR_PASSWORD');
    if (!this.credentials.agent_code) missing.push('MAGR_AGENT_CODE');

    if (missing.length > 0) {
      throw new Error(`MAGR API credentials missing: ${missing.join(', ')}`);
    }

    console.log('✅ MAGR API Service initialized:', {
      baseURL: this.config.baseURL,
      user_email: this.credentials.user_email,
      agent_code: this.credentials.agent_code.substring(0, 8) + '...',
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
      success_rate: `${successRate}%`
    };
  }

  /**
   * Core request method with retry handling
   */
  async makeRequest(endpoint, data = {}, attempt = 1) {
    const requestId = uuidv4();
    
    // Always include credentials
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
          'Cache-Control': 'no-cache'
        },
      });

      // Validate response
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

        return response.data;
      }

      throw new Error(`HTTP ${response.status}: ${response.statusText}`);

    } catch (error) {
      console.error(`[${requestId}] ❌ Request failed (attempt ${attempt}/${this.config.maxRetries}):`, error.message);

      // Retry logic
      if (attempt < this.config.maxRetries && this.shouldRetry(error)) {
        const delayMs = this.config.retryDelay * Math.pow(2, attempt - 1);
        console.log(`[${requestId}] ⏳ Retrying in ${delayMs}ms...`);
        await this.delay(delayMs);
        return this.makeRequest(endpoint, data, attempt + 1);
      }

      throw this.formatError(error, endpoint);
    }
  }

  shouldRetry(error) {
    // Don't retry client errors (4xx)
    if (error.response && error.response.status >= 400 && error.response.status < 500) {
      return false;
    }
    
    // Retry on network errors or server errors
    return !error.response || 
           (error.response.status >= 500) ||
           ['ECONNABORTED', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNRESET', 'ECONNREFUSED'].includes(error.code);
  }

  formatError(error, endpoint = 'unknown') {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      if (data && data.message) {
        return new Error(`MAGR API Error (${status}) on ${endpoint}: ${data.message}`);
      }
      
      return new Error(`MAGR API HTTP Error ${status} on ${endpoint}: ${error.response.statusText}`);
    } else if (error.request) {
      return new Error(`No response from MAGR API on ${endpoint} - network connection failed`);
    }
    
    return new Error(`MAGR API Error on ${endpoint}: ${error.message}`);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Test MAGR API connection
   */
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
        stats: this.getStats()
      };
    } catch (error) {
      console.error('❌ MAGR API connection test failed:', error.message);
      throw new Error(`MAGR API connection failed: ${error.message}`);
    }
  }

  /**
   * Get parking quotes from MAGR API
   */
  async getParkingQuotes(params) {
    try {
      console.log('🔍 Getting parking quotes for:', params);
      
      // Validate parameters
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

      console.log('🚀 Fetching parking quotes...');
      const result = await this.makeRequest('/products', requestData);
      
      if (!result.products) {
        throw new Error('No products found in MAGR API response');
      }

      console.log(`✅ Found ${result.products.length} parking products`);

      // Process products
      const products = result.products.map((product, index) => {
        try {
          if (!product.name || product.price === undefined) {
            console.warn('⚠️ Invalid product data:', product);
            return null;
          }

          return {
            // Core identifiers
            id: product.id || `product_${index}`,
            name: product.name.trim(),
            companyID: product.companyID,
            product_code: product.product_code, // Important for bookings
            
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
            
            // Features
            special_features: product.special_features || '',
            facilities: product.facilities || '',
            features_array: product.special_features ? 
              product.special_features.split(',').map(f => f.trim()).filter(f => f) : [],
            
            // Availability
            available_spaces: product.available_spaces ? parseInt(product.available_spaces) : null,
            availability_status: product.available_spaces ? 
              `${product.available_spaces} spots available` : 'Available Now',
            
            // Metadata
            last_updated: new Date().toISOString(),
            source: 'magr_api'
          };
        } catch (productError) {
          console.error(`❌ Error processing product ${index}:`, productError.message);
          return null;
        }
      }).filter(Boolean);

      return {
        success: true,
        data: {
          products,
          search_params: params,
          summary: {
            total_products: products.length,
            company_codes: [...new Set(products.map(p => p.product_code || p.companyID).filter(Boolean))]
          },
          timestamp: new Date().toISOString()
        },
      };
    } catch (error) {
      console.error('❌ Error in getParkingQuotes:', error.message);
      throw new Error(`Failed to get parking quotes: ${error.message}`);
    }
  }

  /**
   * Create booking via MAGR API
   */
  async createBooking(bookingData) {
    try {
      console.log('🎫 Creating MAGR API booking...');
      
      // Validate booking data
      this.validateBookingData(bookingData);

      // Generate booking reference if not provided
      const ourReference = bookingData.bookreference || this.generateBookingReference();
      console.log('🔖 Using booking reference:', ourReference);

      // Prepare request data for MAGR API
      const requestData = {
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
        paymentgateway: bookingData.paymentgateway || 'Stripe',
        payment_token: bookingData.payment_token || `stripe_${Date.now()}`,
        booking_amount: parseFloat(bookingData.booking_amount).toFixed(2),
      };

      console.log('🚀 Sending booking to MAGR API:', {
        company_code: requestData.company_code,
        reference: requestData.bookreference,
        amount: requestData.booking_amount
      });

      const startTime = Date.now();
      const result = await this.makeRequest('/bookings', requestData);
      const duration = Date.now() - startTime;

      console.log('📋 MAGR API booking result:', {
        status: result?.status,
        reference: result?.reference,
        duration: `${duration}ms`
      });

      // Handle response
      if (!result) {
        throw new Error('Empty response from MAGR API');
      }

      // Success case
      if ((result.status === 'success' || result.status === 'Success') && result.reference) {
        console.log('✅ MAGR API booking successful:', result.reference);
        
        return {
          success: true,
          reference: result.reference,
          booking_id: result.booking_id || result.reference,
          status: 'confirmed',
          message: result.message || 'Booking created successfully',
          timestamp: new Date().toISOString(),
          data: {
            reference: result.reference,
            booking_id: result.booking_id
          }
        };
      }

      // Error case
      if (result.status === 'Error' || result.status === 'error') {
        const errorMsg = result.message || 'Unknown MAGR API error';
        console.error('❌ MAGR API booking error:', errorMsg);
        throw new Error(`MAGR booking failed: ${errorMsg}`);
      }

      // Handle implicit success (has reference but no explicit status)
      if (result.reference) {
        console.log('✅ MAGR API booking appears successful:', result.reference);
        return {
          success: true,
          reference: result.reference,
          status: 'confirmed',
          message: 'Booking created successfully',
          timestamp: new Date().toISOString()
        };
      }

      // Unexpected response
      throw new Error(`Unexpected response from MAGR API: ${JSON.stringify(result).substring(0, 200)}`);

    } catch (error) {
      console.error('❌ MAGR API booking creation failed:', error.message);
      throw new Error(`MAGR API booking failed: ${error.message}`);
    }
  }

  /**
   * Validation Methods
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

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(bookingData.customer_email)) {
      throw new Error('Invalid email address format');
    }

    // Validate booking amount
    const amount = parseFloat(bookingData.booking_amount);
    if (isNaN(amount) || amount <= 0) {
      throw new Error('Invalid booking amount - must be positive');
    }

    this.validateBookingTimes(
      bookingData.dropoff_date,
      bookingData.dropoff_time,
      bookingData.pickup_date,
      bookingData.pickup_time
    );
  }

  validateBookingTimes(dropoffDate, dropoffTime, pickupDate, pickupTime) {
    // Validate formats
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dropoffDate)) {
      throw new Error('Invalid dropoff date format - use YYYY-MM-DD');
    }
    if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(dropoffTime)) {
      throw new Error('Invalid dropoff time format - use HH:MM');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(pickupDate)) {
      throw new Error('Invalid pickup date format - use YYYY-MM-DD');
    }
    if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(pickupTime)) {
      throw new Error('Invalid pickup time format - use HH:MM');
    }

    const dropoffDateTime = new Date(`${dropoffDate}T${dropoffTime}:00`);
    const pickupDateTime = new Date(`${pickupDate}T${pickupTime}:00`);
    const now = new Date();

    if (dropoffDateTime <= now) {
      throw new Error('Dropoff time must be in the future');
    }

    if (pickupDateTime <= dropoffDateTime) {
      throw new Error('Pickup time must be after dropoff time');
    }

    // Minimum 2 hours advance booking
    const hoursDiff = (dropoffDateTime - now) / (1000 * 60 * 60);
    if (hoursDiff < 2) {
      throw new Error('Booking must be made at least 2 hours in advance');
    }
  }

  /**
   * Utility Methods
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

  /**
   * Get available airports
   */
  getAvailableAirports() {
    return [
      { code: 'LHR', name: 'London Heathrow' },
      { code: 'LGW', name: 'London Gatwick' },
      { code: 'STN', name: 'London Stansted' },
      { code: 'LTN', name: 'London Luton' },
      { code: 'MAN', name: 'Manchester' },
      { code: 'BHX', name: 'Birmingham' },
      { code: 'EDI', name: 'Edinburgh' },
      { code: 'GLA', name: 'Glasgow' },
    ];
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const healthData = {
        service: 'MAGR API Service',
        status: this.stats.api_status,
        timestamp: new Date().toISOString(),
        stats: this.getStats(),
        configuration: {
          baseURL: this.config.baseURL,
          timeout: this.config.timeout,
          has_credentials: !!(this.credentials.user_email && this.credentials.password && this.credentials.agent_code)
        }
      };

      // Test connection if no recent requests
      if (!this.stats.last_request_time || 
          (Date.now() - new Date(this.stats.last_request_time).getTime()) > 300000) {
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
      return {
        service: 'MAGR API Service',
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }
}

// Export singleton instance
module.exports = new MagrApiService();