// services/stripeService.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

class StripeService {
  constructor() {
    console.log('✅ Stripe Service initialized');
    this.stripe = stripe;
  }

  /**
   * Create a payment intent for booking
   */
  async createPaymentIntent(bookingData) {
    try {
      console.log('💳 Creating Stripe payment intent:', {
        amount: bookingData.amount,
        currency: bookingData.currency || 'gbp',
        customer_email: bookingData.customer_email
      });

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(parseFloat(bookingData.amount) * 100), // Convert to pence
        currency: bookingData.currency || 'gbp',
        description: `Parking booking for ${bookingData.airport_code} - ${bookingData.service_name}`,
        metadata: {
          booking_reference: bookingData.our_reference,
          magr_reference: bookingData.magr_reference || '',
          airport_code: bookingData.airport_code,
          customer_email: bookingData.customer_email,
          service_name: bookingData.service_name || 'Airport Parking',
          dropoff_date: bookingData.dropoff_date,
          pickup_date: bookingData.pickup_date
        },
        receipt_email: bookingData.customer_email,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      console.log('✅ Payment intent created:', paymentIntent.id);

      return {
        success: true,
        payment_intent: paymentIntent,
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id
      };
    } catch (error) {
      console.error('❌ Stripe payment intent creation failed:', error);
      throw new Error(`Payment processing failed: ${error.message}`);
    }
  }

  /**
   * Confirm a payment intent
   */
  async confirmPayment(paymentIntentId) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      
      console.log('✅ Payment confirmed:', {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100
      });

      return {
        success: true,
        payment_intent: paymentIntent,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100
      };
    } catch (error) {
      console.error('❌ Payment confirmation failed:', error);
      throw new Error(`Payment confirmation failed: ${error.message}`);
    }
  }

  /**
   * Create a refund
   */
  async createRefund(paymentIntentId, amount = null, reason = 'requested_by_customer') {
    try {
      const refundData = {
        payment_intent: paymentIntentId,
        reason: reason
      };

      if (amount) {
        refundData.amount = Math.round(parseFloat(amount) * 100); // Convert to pence
      }

      const refund = await this.stripe.refunds.create(refundData);

      console.log('✅ Refund created:', {
        id: refund.id,
        amount: refund.amount / 100,
        status: refund.status
      });

      return {
        success: true,
        refund: refund,
        refund_id: refund.id,
        amount: refund.amount / 100,
        status: refund.status
      };
    } catch (error) {
      console.error('❌ Refund creation failed:', error);
      throw new Error(`Refund processing failed: ${error.message}`);
    }
  }

  /**
   * Get payment details
   */
  async getPaymentDetails(paymentIntentId) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      
      return {
        success: true,
        payment_intent: paymentIntent,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        created: new Date(paymentIntent.created * 1000),
        metadata: paymentIntent.metadata
      };
    } catch (error) {
      console.error('❌ Failed to get payment details:', error);
      throw new Error(`Failed to retrieve payment: ${error.message}`);
    }
  }

  /**
   * Handle webhook events
   */
  async handleWebhook(event) {
    try {
      console.log('🔔 Stripe webhook received:', event.type);

      switch (event.type) {
        case 'payment_intent.succeeded':
          return await this.handlePaymentSuccess(event.data.object);
        
        case 'payment_intent.payment_failed':
          return await this.handlePaymentFailure(event.data.object);
        
        case 'refund.created':
          return await this.handleRefundCreated(event.data.object);
        
        default:
          console.log('ℹ️ Unhandled webhook event:', event.type);
          return { success: true, message: 'Event logged' };
      }
    } catch (error) {
      console.error('❌ Webhook handling failed:', error);
      throw new Error(`Webhook processing failed: ${error.message}`);
    }
  }

  async handlePaymentSuccess(paymentIntent) {
    console.log('✅ Payment succeeded:', paymentIntent.id);
    // You can update booking status in database here
    return { success: true, action: 'payment_confirmed' };
  }

  async handlePaymentFailure(paymentIntent) {
    console.log('❌ Payment failed:', paymentIntent.id);
    // You can update booking status in database here
    return { success: true, action: 'payment_failed' };
  }

  async handleRefundCreated(refund) {
    console.log('💰 Refund created:', refund.id);
    // You can update booking status in database here
    return { success: true, action: 'refund_processed' };
  }
}

module.exports = new StripeService();