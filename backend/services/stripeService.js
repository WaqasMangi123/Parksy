// services/stripeService.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

class StripeService {
  constructor() {
    console.log('✅ Stripe Service initialized');
    this.stripe = stripe;
    
    // Detect test/live mode
    this.isTestMode = this.detectTestMode();
    
    // Validate Stripe configuration on initialization
    this.validateConfiguration();
  }

  /**
   * Detect if we're in test mode based on the secret key
   */
  detectTestMode() {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) return false;
    
    const isTest = secretKey.includes('test');
    console.log(`🔧 Stripe Mode: ${isTest ? 'TEST' : 'LIVE'}`);
    
    if (isTest) {
      console.log('⚠️ STRIPE TEST MODE ACTIVE - Use test card numbers for payments');
      console.log('💳 Test Cards:');
      console.log('   - Visa Success: 4242 4242 4242 4242');
      console.log('   - Visa Declined: 4000 0000 0000 0002');
      console.log('   - Mastercard: 5555 5555 5555 4444');
      console.log('   - Visa Debit: 4000 0566 5566 5556');
      console.log('   - Use any future expiry date, any 3-digit CVC, and any postal code');
    } else {
      console.log('🔴 STRIPE LIVE MODE - Real payments will be processed!');
    }
    
    return isTest;
  }

  /**
   * Validate Stripe configuration
   */
  validateConfiguration() {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    
    if (!process.env.STRIPE_PUBLISHABLE_KEY) {
      console.warn('⚠️ STRIPE_PUBLISHABLE_KEY is not configured');
    }
    
    // Validate that publishable and secret keys match (test/live)
    const secretKeyMode = process.env.STRIPE_SECRET_KEY?.includes('test') ? 'test' : 'live';
    const publishableKeyMode = process.env.STRIPE_PUBLISHABLE_KEY?.includes('test') ? 'test' : 'live';
    
    if (secretKeyMode !== publishableKeyMode) {
      console.error('❌ STRIPE KEY MISMATCH:', {
        secret_key_mode: secretKeyMode,
        publishable_key_mode: publishableKeyMode
      });
      throw new Error('Stripe key mismatch: Secret and Publishable keys must both be test or both be live');
    }
    
    console.log(`✅ Stripe configuration validated (${secretKeyMode.toUpperCase()} mode)`);
  }

  /**
   * Create a payment intent for booking - UPDATED to match your routes
   */
  async createPaymentIntent(paymentData) {
    try {
      console.log(`💳 Creating Stripe payment intent (${this.isTestMode ? 'TEST' : 'LIVE'} mode):`, {
        amount: paymentData.amount,
        currency: paymentData.currency || 'gbp',
        customer_email: paymentData.customer_email,
        service: paymentData.service_name,
        mode: this.isTestMode ? 'TEST' : 'LIVE'
      });

      // Validate required fields
      if (!paymentData.amount || paymentData.amount <= 0) {
        throw new Error('Invalid payment amount');
      }

      if (!paymentData.customer_email) {
        throw new Error('Customer email is required');
      }

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(parseFloat(paymentData.amount) * 100), // Convert to pence
        currency: paymentData.currency || 'gbp',
        description: `${this.isTestMode ? '[TEST] ' : ''}Parking booking for ${paymentData.airport_code} - ${paymentData.service_name}`,
        metadata: {
          // Enhanced metadata matching your booking structure
          booking_reference: paymentData.our_reference || 'TBA',
          temp_booking_reference: paymentData.temp_booking_reference || '',
          airport_code: paymentData.airport_code,
          company_code: paymentData.company_code,
          customer_email: paymentData.customer_email,
          service_name: paymentData.service_name || 'Airport Parking',
          dropoff_date: paymentData.dropoff_date,
          pickup_date: paymentData.pickup_date,
          booking_amount: paymentData.amount.toString(),
          created_by: 'parksy_api',
          stripe_mode: this.isTestMode ? 'test' : 'live'
        },
        receipt_email: paymentData.customer_email,
        automatic_payment_methods: {
          enabled: true,
        },
        // Add payment method configuration for better UX
        payment_method_options: {
          card: {
            request_three_d_secure: this.isTestMode ? 'if_required' : 'automatic',
            setup_future_usage: 'off_session' // For potential future bookings
          }
        }
      });

      console.log(`✅ Payment intent created (${this.isTestMode ? 'TEST' : 'LIVE'}):`, {
        id: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        mode: this.isTestMode ? 'TEST' : 'LIVE'
      });

      return {
        success: true,
        payment_intent: paymentIntent,
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        temp_booking_reference: paymentData.temp_booking_reference,
        is_test_mode: this.isTestMode
      };
    } catch (error) {
      console.error(`❌ Stripe payment intent creation failed (${this.isTestMode ? 'TEST' : 'LIVE'} mode):`, error);
      throw new Error(`Payment processing failed: ${error.message}`);
    }
  }

  /**
   * Get payment details - ENHANCED for your verify-payment route
   */
  async getPaymentDetails(paymentIntentId) {
    try {
      if (!paymentIntentId) {
        throw new Error('Payment intent ID is required');
      }

      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      
      console.log(`🔍 Retrieved payment details (${this.isTestMode ? 'TEST' : 'LIVE'} mode):`, {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        mode: this.isTestMode ? 'TEST' : 'LIVE'
      });

      return {
        success: true,
        payment_intent: paymentIntent,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        created: new Date(paymentIntent.created * 1000),
        metadata: paymentIntent.metadata,
        // Add specific fields your routes expect
        is_paid: paymentIntent.status === 'succeeded',
        payment_method: paymentIntent.payment_method,
        last_payment_error: paymentIntent.last_payment_error,
        is_test_mode: this.isTestMode
      };
    } catch (error) {
      console.error(`❌ Failed to get payment details (${this.isTestMode ? 'TEST' : 'LIVE'} mode):`, error);
      throw new Error(`Failed to retrieve payment: ${error.message}`);
    }
  }

  /**
   * Confirm a payment intent - LEGACY support
   */
  async confirmPayment(paymentIntentId) {
    try {
      const paymentDetails = await this.getPaymentDetails(paymentIntentId);
      
      console.log(`✅ Payment confirmation check (${this.isTestMode ? 'TEST' : 'LIVE'} mode):`, {
        id: paymentIntentId,
        status: paymentDetails.status,
        amount: paymentDetails.amount,
        mode: this.isTestMode ? 'TEST' : 'LIVE'
      });

      return {
        success: true,
        payment_intent: paymentDetails.payment_intent,
        status: paymentDetails.status,
        amount: paymentDetails.amount,
        is_confirmed: paymentDetails.status === 'succeeded',
        is_test_mode: this.isTestMode
      };
    } catch (error) {
      console.error(`❌ Payment confirmation failed (${this.isTestMode ? 'TEST' : 'LIVE'} mode):`, error);
      throw new Error(`Payment confirmation failed: ${error.message}`);
    }
  }

  /**
   * Create a refund - ENHANCED with better error handling
   */
  async createRefund(paymentIntentId, amount = null, reason = 'requested_by_customer') {
    try {
      if (!paymentIntentId) {
        throw new Error('Payment intent ID is required for refund');
      }

      console.log(`💰 Creating refund (${this.isTestMode ? 'TEST' : 'LIVE'} mode):`, {
        payment_intent: paymentIntentId,
        amount: amount,
        reason: reason,
        mode: this.isTestMode ? 'TEST' : 'LIVE'
      });

      const refundData = {
        payment_intent: paymentIntentId,
        reason: reason,
        metadata: {
          refunded_by: 'parksy_api',
          refund_date: new Date().toISOString(),
          stripe_mode: this.isTestMode ? 'test' : 'live'
        }
      };

      if (amount && amount > 0) {
        refundData.amount = Math.round(parseFloat(amount) * 100); // Convert to pence
      }

      const refund = await this.stripe.refunds.create(refundData);

      console.log(`✅ Refund created successfully (${this.isTestMode ? 'TEST' : 'LIVE'} mode):`, {
        id: refund.id,
        amount: refund.amount / 100,
        status: refund.status,
        payment_intent: refund.payment_intent,
        mode: this.isTestMode ? 'TEST' : 'LIVE'
      });

      return {
        success: true,
        refund: refund,
        refund_id: refund.id,
        amount: refund.amount / 100,
        status: refund.status,
        payment_intent: refund.payment_intent,
        reason: refund.reason,
        is_test_mode: this.isTestMode
      };
    } catch (error) {
      console.error(`❌ Refund creation failed (${this.isTestMode ? 'TEST' : 'LIVE'} mode):`, error);
      throw new Error(`Refund processing failed: ${error.message}`);
    }
  }

  /**
   * List refunds for a payment intent
   */
  async getRefunds(paymentIntentId) {
    try {
      const refunds = await this.stripe.refunds.list({
        payment_intent: paymentIntentId,
        limit: 10
      });

      return {
        success: true,
        refunds: refunds.data,
        total_refunded: refunds.data.reduce((sum, refund) => sum + (refund.amount / 100), 0),
        is_test_mode: this.isTestMode
      };
    } catch (error) {
      console.error(`❌ Failed to get refunds (${this.isTestMode ? 'TEST' : 'LIVE'} mode):`, error);
      throw new Error(`Failed to retrieve refunds: ${error.message}`);
    }
  }

  /**
   * Handle webhook events - ENHANCED
   */
  async handleWebhook(event) {
    try {
      console.log(`🔔 Stripe webhook received (${this.isTestMode ? 'TEST' : 'LIVE'} mode):`, {
        type: event.type,
        id: event.id,
        object: event.data.object.id,
        mode: this.isTestMode ? 'TEST' : 'LIVE'
      });

      switch (event.type) {
        case 'payment_intent.succeeded':
          return await this.handlePaymentSuccess(event.data.object);
        
        case 'payment_intent.payment_failed':
          return await this.handlePaymentFailure(event.data.object);
        
        case 'payment_intent.canceled':
          return await this.handlePaymentCanceled(event.data.object);
        
        case 'refund.created':
          return await this.handleRefundCreated(event.data.object);
        
        case 'refund.updated':
          return await this.handleRefundUpdated(event.data.object);
        
        case 'payment_method.attached':
          return await this.handlePaymentMethodAttached(event.data.object);
        
        default:
          console.log(`ℹ️ Unhandled webhook event (${this.isTestMode ? 'TEST' : 'LIVE'} mode):`, event.type);
          return { 
            success: true, 
            message: 'Event logged but not processed',
            event_type: event.type,
            is_test_mode: this.isTestMode
          };
      }
    } catch (error) {
      console.error(`❌ Webhook handling failed (${this.isTestMode ? 'TEST' : 'LIVE'} mode):`, error);
      throw new Error(`Webhook processing failed: ${error.message}`);
    }
  }

  // ENHANCED WEBHOOK HANDLERS

  async handlePaymentSuccess(paymentIntent) {
    console.log(`✅ Payment succeeded webhook (${this.isTestMode ? 'TEST' : 'LIVE'} mode):`, {
      id: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      customer_email: paymentIntent.metadata?.customer_email,
      mode: this.isTestMode ? 'TEST' : 'LIVE'
    });
    
    // TODO: Update booking status in database
    // Example: await Booking.updateOne(
    //   { 'payment_details.stripe_payment_intent_id': paymentIntent.id },
    //   { 'payment_details.payment_status': 'paid' }
    // );
    
    return { 
      success: true, 
      action: 'payment_confirmed',
      payment_intent_id: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      is_test_mode: this.isTestMode
    };
  }

  async handlePaymentFailure(paymentIntent) {
    console.log(`❌ Payment failed webhook (${this.isTestMode ? 'TEST' : 'LIVE'} mode):`, {
      id: paymentIntent.id,
      last_payment_error: paymentIntent.last_payment_error?.message,
      mode: this.isTestMode ? 'TEST' : 'LIVE'
    });
    
    // TODO: Update booking status and notify user
    
    return { 
      success: true, 
      action: 'payment_failed',
      payment_intent_id: paymentIntent.id,
      error: paymentIntent.last_payment_error?.message,
      is_test_mode: this.isTestMode
    };
  }

  async handlePaymentCanceled(paymentIntent) {
    console.log(`❌ Payment canceled webhook (${this.isTestMode ? 'TEST' : 'LIVE'} mode):`, paymentIntent.id);
    
    return { 
      success: true, 
      action: 'payment_canceled',
      payment_intent_id: paymentIntent.id,
      is_test_mode: this.isTestMode
    };
  }

  async handleRefundCreated(refund) {
    console.log(`💰 Refund created webhook (${this.isTestMode ? 'TEST' : 'LIVE'} mode):`, {
      id: refund.id,
      amount: refund.amount / 100,
      status: refund.status,
      payment_intent: refund.payment_intent,
      mode: this.isTestMode ? 'TEST' : 'LIVE'
    });
    
    // TODO: Update booking status to refunded
    
    return { 
      success: true, 
      action: 'refund_processed',
      refund_id: refund.id,
      amount: refund.amount / 100,
      is_test_mode: this.isTestMode
    };
  }

  async handleRefundUpdated(refund) {
    console.log(`💰 Refund updated webhook (${this.isTestMode ? 'TEST' : 'LIVE'} mode):`, {
      id: refund.id,
      status: refund.status,
      mode: this.isTestMode ? 'TEST' : 'LIVE'
    });
    
    return { 
      success: true, 
      action: 'refund_updated',
      refund_id: refund.id,
      status: refund.status,
      is_test_mode: this.isTestMode
    };
  }

  async handlePaymentMethodAttached(paymentMethod) {
    console.log(`💳 Payment method attached (${this.isTestMode ? 'TEST' : 'LIVE'} mode):`, {
      id: paymentMethod.id,
      mode: this.isTestMode ? 'TEST' : 'LIVE'
    });
    
    return { 
      success: true, 
      action: 'payment_method_attached',
      payment_method_id: paymentMethod.id,
      is_test_mode: this.isTestMode
    };
  }

  /**
   * Create customer (for future use)
   */
  async createCustomer(customerData) {
    try {
      const customer = await this.stripe.customers.create({
        email: customerData.email,
        name: `${customerData.first_name} ${customerData.last_name}`,
        phone: customerData.phone_number,
        metadata: {
          created_by: 'parksy_api',
          user_id: customerData.user_id || '',
          stripe_mode: this.isTestMode ? 'test' : 'live'
        }
      });

      console.log(`✅ Customer created (${this.isTestMode ? 'TEST' : 'LIVE'} mode):`, customer.id);

      return {
        success: true,
        customer: customer,
        customer_id: customer.id,
        is_test_mode: this.isTestMode
      };
    } catch (error) {
      console.error(`❌ Customer creation failed (${this.isTestMode ? 'TEST' : 'LIVE'} mode):`, error);
      throw new Error(`Customer creation failed: ${error.message}`);
    }
  }

  /**
   * Get Stripe configuration for frontend
   */
  getPublicConfig() {
    return {
      publishable_key: process.env.STRIPE_PUBLISHABLE_KEY,
      currency: 'gbp',
      country: 'GB',
      is_test_mode: this.isTestMode,
      stripe_mode: this.isTestMode ? 'test' : 'live'
    };
  }

  /**
   * Health check for Stripe service
   */
  async healthCheck() {
    try {
      // Test Stripe connection by retrieving account info
      const account = await this.stripe.accounts.retrieve();
      
      return {
        success: true,
        stripe_connected: true,
        account_id: account.id,
        country: account.country,
        currency: account.default_currency,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        is_test_mode: this.isTestMode,
        stripe_mode: this.isTestMode ? 'test' : 'live'
      };
    } catch (error) {
      console.error(`❌ Stripe health check failed (${this.isTestMode ? 'TEST' : 'LIVE'} mode):`, error);
      return {
        success: false,
        stripe_connected: false,
        error: error.message,
        is_test_mode: this.isTestMode,
        stripe_mode: this.isTestMode ? 'test' : 'live'
      };
    }
  }
}

module.exports = new StripeService();