const axios = require('axios');
const https = require('https');
const { v4: uuidv4 } = require('uuid');

class MagrApiService {
  constructor() {
    // Configuration
    this.config = {
      baseURL: 'https://api.magrgroup.com/public/api',
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

    // Valid company codes that MAGR API accepts - UPDATE THESE WITH ACTUAL VALID CODES
    this.validCompanyCodes = [
      'MAGR001',  // Primary MAGR company code
      'AIRPORT1', // Airport parking provider
      'PARKPRO',  // Professional parking services
      // Add more valid codes as provided by MAGR API documentation
    ];

    // Create axios instance with custom HTTPS agent
    this.axiosInstance = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      httpsAgent: new https.Agent({
        rejectUnauthorized: true,
        keepAlive: true,
      }),
      maxRedirects: this.config.maxRedirects,
    });

    // Initialize interceptors
    this.initializeInterceptors();
    this.validateConfiguration();
  }

  initializeInterceptors() {
    // Request interceptor for logging
    this.axiosInstance.interceptors.request.use((config) => {
      const requestId = uuidv4();
      config.headers['X-Request-ID'] = requestId;
      
      console.log(`[${requestId}] 🚀 MAGR API Request:`, {
        method: config.method.toUpperCase(),
        url: config.url,
        endpoint: config.url,
        hasCredentials: !!(config.data?.user_email && config.data?.agent_code),
        dataKeys: config.data ? Object.keys(config.data) : []
      });

      // Log detailed data for booking requests (but hide sensitive info)
      if (config.url === '/bookings') {
        const safeData = { ...config.data };
        if (safeData.password) safeData.password = '[HIDDEN]';
        console.log(`[${requestId}] 🎫 Booking Request Data:`, JSON.stringify(safeData, null, 2));
      }

      return config;
    }, (error) => {
      console.error('❌ Request Interceptor Error:', error);
      return Promise.reject(error);
    });

    // Response interceptor for logging
    this.axiosInstance.interceptors.response.use((response) => {
      const requestId = response.config.headers['X-Request-ID'];
      console.log(`[${requestId}] ✅ MAGR API Response:`, {
        status: response.status,
        statusText: response.statusText,
        dataType: typeof response.data,
        hasData: !!response.data,
        responseStatus: response.data?.status,
        responseMessage: response.data?.message?.substring(0, 100)
      });

      // Log full response for booking endpoints
      if (response.config.url === '/bookings') {
        console.log(`[${requestId}] 📋 Booking Response:`, JSON.stringify(response.data, null, 2));
      }

      return response;
    }, (error) => {
      const requestId = error.config?.headers?.['X-Request-ID'];
      
      if (error.response) {
        console.error(`[${requestId}] ❌ MAGR API Error Response:`, {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          url: error.config?.url
        });
      } else if (error.request) {
        console.error(`[${requestId}] ❌ MAGR API Network Error:`, {
          message: error.message,
          code: error.code,
          url: error.config?.url
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
      valid_company_codes: this.validCompanyCodes
    });
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
      console.log(`[${requestId}] 🔄 Attempt ${attempt}: ${endpoint}`);

      const response = await this.axiosInstance({
        method: 'POST',
        url: endpoint,
        data: requestData,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Parksy-Backend/1.0',
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
        if (response.data.status === 'Error') {
          const errorMsg = response.data.message || 'API returned error status';
          console.error(`[${requestId}] ❌ MAGR API Error:`, errorMsg);
          throw new Error(errorMsg);
        }

        console.log(`[${requestId}] ✅ Request successful`);
        return response.data;
      }

      throw new Error(`Unexpected HTTP status: ${response.status}`);

    } catch (error) {
      console.error(`[${requestId}] ❌ Request failed (attempt ${attempt}):`, {
        message: error.message,
        status: error.response?.status,
        hasResponse: !!error.response,
        hasRequest: !!error.request
      });

      // Retry logic for certain errors
      if (attempt < this.config.maxRetries && this.shouldRetry(error)) {
        const delayMs = this.config.retryDelay * attempt;
        console.log(`[${requestId}] ⏳ Retrying in ${delayMs}ms...`);
        await this.delay(delayMs);
        return this.makeRequest(endpoint, data, attempt + 1);
      }

      // Format and throw the error
      throw this.formatError(error);
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
           ['ECONNABORTED', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNRESET'].includes(error.code);
  }

  formatError(error) {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      // Handle specific MAGR API error responses
      if (data && data.message) {
        return new Error(`MAGR API Error (${status}): ${data.message}`);
      }
      
      return new Error(`MAGR API HTTP Error ${status}: ${error.response.statusText || 'Unknown server error'}`);
    } else if (error.request) {
      return new Error('No response from MAGR API - network connection failed');
    }
    
    return new Error(`MAGR API Error: ${error.message}`);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * API Methods
   */

  // Test API connection with a real request
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

      const result = await this.makeRequest('/products', testParams);
      
      if (!result || !result.products) {
        throw new Error('Invalid response format from MAGR API');
      }
      
      console.log('✅ MAGR API connection test successful');
      
      return {
        success: true,
        message: 'MAGR API connection successful',
        productsCount: result.products.length,
        sampleProduct: result.products[0] ? {
          name: result.products[0].name,
          price: result.products[0].price,
        } : null,
      };
    } catch (error) {
      console.error('❌ MAGR API connection test failed:', error.message);
      throw new Error(`MAGR API connection failed: ${error.message}`);
    }
  }

  // Get parking quotes with full validation
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

      // Transform and validate products
      const products = result.products.map(product => {
        if (!product.name || !product.price) {
          console.warn('⚠️ Invalid product data:', product);
          return null;
        }

        return {
          id: product.id,
          name: product.name,
          companyID: product.companyID,
          product_code: product.product_code,
          parking_type: product.parking_type,
          price: parseFloat(product.price).toFixed(2),
          share_percentage: parseFloat(product.share_percentage || 0).toFixed(2),
          commission_amount: (parseFloat(product.price) * parseFloat(product.share_percentage || 0) / 100).toFixed(2),
          duration_days: this.calculateDurationDays(params.dropoff_date, params.pickup_date),
          cancelable: product.cancelable === 'Yes',
          editable: product.editable === 'Yes',
          processtime: product.processtime || 2,
          opening_time: product.opening_time || '00:00',
          closing_time: product.closing_time || '23:59',
          features_array: product.special_features ? 
            product.special_features.split(',').map(f => f.trim()) : [],
          available_spaces: product.available_spaces,
          last_updated: new Date().toISOString(),
        };
      }).filter(Boolean); // Remove any null entries from invalid products

      return {
        success: true,
        data: {
          products,
          search_params: params,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error('❌ Error in getParkingQuotes:', error.message);
      throw new Error(`Failed to get parking quotes: ${error.message}`);
    }
  }

  // Create a booking - ENHANCED WITH COMPANY CODE VALIDATION
  async createBooking(bookingData) {
    try {
      console.log('🎫 Creating MAGR API booking...');
      
      // Validate company code first
      if (!this.validCompanyCodes.includes(bookingData.company_code)) {
        throw new Error(`Invalid company code: ${bookingData.company_code}. Valid codes are: ${this.validCompanyCodes.join(', ')}`);
      }
      
      // Validate booking data
      this.validateBookingData(bookingData);

      // Generate our booking reference
      const ourReference = this.generateBookingReference();
      console.log('🔖 Generated booking reference:', ourReference);

      // Prepare request data in EXACT format MAGR API expects
      const requestData = {
        company_code: bookingData.company_code,
        bookreference: ourReference,
        dropoff_date: bookingData.dropoff_date,
        dropoff_time: bookingData.dropoff_time,
        pickup_date: bookingData.pickup_date,
        pickup_time: bookingData.pickup_time,
        title: bookingData.title,
        first_name: bookingData.first_name,
        last_name: bookingData.last_name,
        customer_email: bookingData.customer_email,
        phone_number: bookingData.phone_number,
        departure_flight_number: bookingData.departure_flight_number || 'TBA',
        arrival_flight_number: bookingData.arrival_flight_number || 'TBA',
        departure_terminal: bookingData.departure_terminal || 'Terminal 1',
        arrival_terminal: bookingData.arrival_terminal || 'Terminal 1',
        car_registration_number: bookingData.car_registration_number,
        car_make: bookingData.car_make,
        car_model: bookingData.car_model,
        car_color: bookingData.car_color,
        park_api: 'b2b',
        passenger: parseInt(bookingData.passenger) || 1,
        paymentgateway: bookingData.paymentgateway || 'Invoice',
        payment_token: bookingData.payment_token || `pi_${uuidv4()}`,
        booking_amount: parseFloat(bookingData.booking_amount).toFixed(2),
      };

      console.log('🚀 Sending booking request to MAGR API...');
      const result = await this.makeRequest('/bookings', requestData);

      console.log('📋 MAGR API booking response received:', {
        hasResult: !!result,
        status: result?.status,
        hasReference: !!result?.reference,
        reference: result?.reference
      });

      // Handle different response scenarios
      if (!result) {
        throw new Error('Empty response from MAGR API');
      }

      // Success case
      if (result.status === 'success' && result.reference) {
        console.log('✅ MAGR API booking successful:', result.reference);
        
        return {
          success: true,
          booking_id: result.booking_id || result.reference,
          our_reference: ourReference,
          magr_reference: result.reference,
          status: 'confirmed',
          timestamp: new Date().toISOString(),
          raw_response: result
        };
      }

      // Error case
      if (result.status === 'Error') {
        const errorMsg = result.message || 'Unknown MAGR API error';
        console.error('❌ MAGR API booking error:', errorMsg);
        throw new Error(errorMsg);
      }

      // Unexpected response format
      console.error('❌ Unexpected MAGR API response:', result);
      throw new Error('Unexpected response format from MAGR API');

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

  // Amend a booking
  async amendBooking(bookingRef, amendData) {
    try {
      if (!bookingRef) {
        throw new Error('Booking reference is required');
      }

      console.log('✏️ Amending booking:', bookingRef);

      const requestData = {
        bookreference: bookingRef,
        amend_booking: 'amend_booking',
        park_api: 'b2b',
        ...amendData,
      };

      // Clean undefined values
      Object.keys(requestData).forEach(key => {
        if (requestData[key] === undefined) {
          delete requestData[key];
        }
      });

      console.log('🚀 Sending amend request to MAGR API...');
      const result = await this.makeRequest('/amend', requestData);

      if (!result || !result.reference) {
        throw new Error('Invalid amend response from MAGR API');
      }

      console.log('✅ Booking amended successfully:', result.reference);

      return {
        success: true,
        reference: result.reference,
        status: 'amended',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('❌ Error amending booking:', error.message);
      throw new Error(`Booking amendment failed: ${error.message}`);
    }
  }

  // Cancel a booking
  async cancelBooking(bookingRef, refundAmount = 0) {
    try {
      if (!bookingRef) {
        throw new Error('Booking reference is required');
      }

      console.log('❌ Cancelling booking:', bookingRef);

      const requestData = {
        booking_ref: bookingRef,
        refund: parseFloat(refundAmount).toFixed(2),
      };

      console.log('🚀 Sending cancel request to MAGR API...');
      const result = await this.makeRequest('/cancel', requestData);

      if (!result || !result.reference) {
        throw new Error('Invalid cancel response from MAGR API');
      }

      console.log('✅ Booking cancelled successfully:', result.reference);

      return {
        success: true,
        reference: result.reference,
        refund_amount: requestData.refund,
        status: 'cancelled',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('❌ Error cancelling booking:', error.message);
      throw new Error(`Booking cancellation failed: ${error.message}`);
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

    const missingFields = requiredFields.filter(field => !bookingData[field]);
    if (missingFields.length > 0) {
      throw new Error(`Missing required booking fields: ${missingFields.join(', ')}`);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(bookingData.customer_email)) {
      throw new Error('Invalid email address format');
    }

    // Validate booking amount
    if (isNaN(bookingData.booking_amount) || bookingData.booking_amount <= 0) {
      throw new Error('Invalid booking amount');
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
      const dropoffDateTime = new Date(`${dropoffDate}T${dropoffTime}:00.000Z`);
      const pickupDateTime = new Date(`${pickupDate}T${pickupTime}:00.000Z`);
      const now = new Date();

      if (isNaN(dropoffDateTime.getTime())) {
        throw new Error('Invalid dropoff date/time format');
      }

      if (isNaN(pickupDateTime.getTime())) {
        throw new Error('Invalid pickup date/time format');
      }

      if (dropoffDateTime <= now) {
        throw new Error('Dropoff time must be in the future');
      }

      if (pickupDateTime <= dropoffDateTime) {
        throw new Error('Pickup time must be after dropoff time');
      }

      const minAdvanceHours = 2;
      const hoursDiff = (dropoffDateTime - now) / (1000 * 60 * 60);
      if (hoursDiff < minAdvanceHours) {
        throw new Error(`Booking must be made at least ${minAdvanceHours} hours in advance`);
      }

      console.log('✅ Booking times validated successfully');
    } catch (error) {
      console.error('❌ Time validation failed:', error.message);
      throw error;
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

  // NEW METHOD: Get valid company codes for frontend validation
  getValidCompanyCodes() {
    return this.validCompanyCodes;
  }

  // NEW METHOD: Validate company code
  isValidCompanyCode(companyCode) {
    return this.validCompanyCodes.includes(companyCode);
  }

  getAvailableAirports() {
    return [
      { code: 'LHR', name: 'London Heathrow', city: 'London' },
      { code: 'LGW', name: 'London Gatwick', city: 'London' },
      { code: 'STN', name: 'London Stansted', city: 'London' },
      { code: 'LTN', name: 'London Luton', city: 'London' },
      { code: 'MAN', name: 'Manchester', city: 'Manchester' },
      { code: 'BHX', name: 'Birmingham', city: 'Birmingham' },
      { code: 'EDI', name: 'Edinburgh', city: 'Edinburgh' },
      { code: 'GLA', name: 'Glasgow', city: 'Glasgow' },
    ];
  }

  getTerminalsForAirport(airportCode) {
    const airport = this.getAvailableAirports().find(a => a.code === airportCode);
    if (!airport) return ['Terminal 1'];
    
    switch (airportCode) {
      case 'LHR': return ['Terminal 1', 'Terminal 2', 'Terminal 3', 'Terminal 4', 'Terminal 5'];
      case 'LGW': return ['North Terminal', 'South Terminal'];
      case 'MAN': return ['Terminal 1', 'Terminal 2', 'Terminal 3'];
      default: return ['Terminal 1'];
    }
  }
}

// Export singleton instance
module.exports = new MagrApiService();