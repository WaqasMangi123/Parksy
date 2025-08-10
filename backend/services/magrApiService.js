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
      
      console.log(`[${requestId}] Outgoing Request:`, {
        method: config.method.toUpperCase(),
        url: config.url,
        headers: config.headers,
        data: config.data ? JSON.parse(JSON.stringify(config.data)) : null,
      });

      return config;
    }, (error) => {
      console.error('Request Interceptor Error:', error);
      return Promise.reject(error);
    });

    // Response interceptor for logging
    this.axiosInstance.interceptors.response.use((response) => {
      console.log(`[${response.config.headers['X-Request-ID']}] Response:`, {
        status: response.status,
        headers: response.headers,
        data: response.data,
      });
      return response;
    }, (error) => {
      if (error.response) {
        console.error(`[${error.config.headers['X-Request-ID']}] Error Response:`, {
          status: error.response.status,
          headers: error.response.headers,
          data: error.response.data,
        });
      } else {
        console.error('Response Error:', error);
      }
      return Promise.reject(error);
    });
  }

  validateConfiguration() {
    if (!this.credentials.user_email || !this.credentials.password || !this.credentials.agent_code) {
      throw new Error('MAGR API credentials are not properly configured');
    }

    console.log('✅ MAGR API Service initialized with configuration:', {
      baseURL: this.config.baseURL,
      user_email: this.credentials.user_email,
      agent_code: this.credentials.agent_code,
    });
  }

  /**
   * Core request method with retry and redirect handling
   */
  async makeRequest(endpoint, data = {}, attempt = 1) {
    const requestId = uuidv4();
    const requestData = {
      ...this.credentials,
      ...data,
    };

    try {
      console.log(`[${requestId}] Attempt ${attempt}: Making request to ${endpoint}`);

      const response = await this.axiosInstance({
        method: 'POST',
        url: endpoint,
        data: requestData,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'ParkSy-Backend/1.0',
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

        // Parse new endpoint from location
        const newEndpoint = new URL(location).pathname;
        console.log(`[${requestId}] Following redirect to: ${newEndpoint}`);
        
        // Add delay before retry
        await this.delay(this.config.retryDelay * attempt);
        return this.makeRequest(newEndpoint, data, attempt + 1);
      }

      // Validate successful response
      if (response.status >= 200 && response.status < 300) {
        if (!response.data) {
          throw new Error('Empty response from server');
        }

        // Check for API-level errors
        if (response.data.status === 'Error') {
          throw new Error(response.data.message || 'API returned error status');
        }

        return response.data;
      }

      throw new Error(`Unexpected status code: ${response.status}`);

    } catch (error) {
      console.error(`[${requestId}] Request failed (attempt ${attempt}):`, error.message);

      // Retry logic for certain errors
      if (attempt < this.config.maxRetries && this.shouldRetry(error)) {
        const delayMs = this.config.retryDelay * attempt;
        console.log(`[${requestId}] Retrying in ${delayMs}ms...`);
        await this.delay(delayMs);
        return this.makeRequest(endpoint, data, attempt + 1);
      }

      // Format the error for the caller
      throw this.formatError(error);
    }
  }

  shouldRetry(error) {
    // Retry on network errors or server errors
    return !error.response || 
           (error.response.status >= 500 && error.response.status < 600) ||
           ['ECONNABORTED', 'ETIMEDOUT'].includes(error.code);
  }

  formatError(error) {
    if (error.response) {
      return new Error(`API Error ${error.response.status}: ${
        error.response.data?.message || 
        error.response.statusText || 
        'Unknown server error'
      }`);
    } else if (error.request) {
      return new Error('No response received from MAGR API - network error');
    }
    return error;
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
      console.log('🧪 Testing MAGR API connection with real request...');
      
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
      console.error('Connection test failed:', error);
      throw new Error(`MAGR API connection failed: ${error.message}`);
    }
  }

  // Get parking quotes with full validation
  async getParkingQuotes(params) {
    try {
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

      console.log('Fetching parking quotes with params:', requestData);
      const result = await this.makeRequest('/products', requestData);
      
      if (!result.products) {
        throw new Error('No products in response');
      }

      // Transform and validate products
      const products = result.products.map(product => {
        if (!product.id || !product.name || !product.price) {
          console.warn('Invalid product data:', product);
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
      console.error('Error in getParkingQuotes:', error);
      throw new Error(`Failed to get parking quotes: ${error.message}`);
    }
  }

  // Create a booking
  async createBooking(bookingData) {
    try {
      // Validate booking data
      this.validateBookingData(bookingData);

      const requestData = {
        company_code: bookingData.company_code,
        bookreference: this.generateBookingReference(),
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
        departure_terminal: bookingData.departure_terminal,
        arrival_terminal: bookingData.arrival_terminal,
        car_registration_number: bookingData.car_registration_number,
        car_make: bookingData.car_make,
        car_model: bookingData.car_model,
        car_color: bookingData.car_color,
        park_api: 'b2b',
        passenger: bookingData.passenger || 1,
        paymentgateway: bookingData.paymentgateway || 'Invoice',
        payment_token: bookingData.payment_token || `pi_${uuidv4()}`,
        booking_amount: parseFloat(bookingData.booking_amount).toFixed(2),
      };

      console.log('Creating booking with data:', requestData);
      const result = await this.makeRequest('/bookings', requestData);

      if (!result || !result.reference) {
        throw new Error('Invalid booking response from MAGR API');
      }

      return {
        success: true,
        booking_id: result.booking_id,
        our_reference: requestData.bookreference,
        magr_reference: result.reference,
        status: 'confirmed',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error creating booking:', error);
      throw new Error(`Booking creation failed: ${error.message}`);
    }
  }

  // Amend a booking
  async amendBooking(bookingRef, amendData) {
    try {
      if (!bookingRef) {
        throw new Error('Booking reference is required');
      }

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

      console.log('Amending booking with data:', requestData);
      const result = await this.makeRequest('/amend', requestData);

      if (!result || !result.reference) {
        throw new Error('Invalid amend response from MAGR API');
      }

      return {
        success: true,
        reference: result.reference,
        status: 'amended',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error amending booking:', error);
      throw new Error(`Booking amendment failed: ${error.message}`);
    }
  }

  // Cancel a booking
  async cancelBooking(bookingRef, refundAmount = 0) {
    try {
      if (!bookingRef) {
        throw new Error('Booking reference is required');
      }

      const requestData = {
        booking_ref: bookingRef,
        refund: parseFloat(refundAmount).toFixed(2),
      };

      console.log('Cancelling booking with data:', requestData);
      const result = await this.makeRequest('/cancel', requestData);

      if (!result || !result.reference) {
        throw new Error('Invalid cancel response from MAGR API');
      }

      return {
        success: true,
        reference: result.reference,
        refund_amount: requestData.refund,
        status: 'cancelled',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error cancelling booking:', error);
      throw new Error(`Booking cancellation failed: ${error.message}`);
    }
  }

  /**
   * Validation Methods
   */
  validateBookingParams(params) {
    if (!params.airport_code || !params.dropoff_date || !params.dropoff_time || 
        !params.pickup_date || !params.pickup_time) {
      throw new Error('Missing required search parameters');
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

    this.validateBookingTimes(
      bookingData.dropoff_date,
      bookingData.dropoff_time,
      bookingData.pickup_date,
      bookingData.pickup_time
    );
  }

  validateBookingTimes(dropoffDate, dropoffTime, pickupDate, pickupTime) {
    const dropoffDateTime = new Date(`${dropoffDate}T${dropoffTime}`);
    const pickupDateTime = new Date(`${pickupDate}T${pickupTime}`);
    const now = new Date();

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
  }

  /**
   * Utility Methods
   */
  generateBookingReference() {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `PS-${timestamp}${random}`;
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

module.exports = new MagrApiService();