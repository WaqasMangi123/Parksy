require('dotenv').config();
const axios = require('axios');

class AwinService {
  static async generateTrackingLink(userId, ypsListingUrl, listingId) {
    try {
      const response = await axios.post(
        `https://api.awin.com/publishers/${process.env.AWIN_PUBLISHER_ID}/linkbuilder/generate`,
        {
          advertiserId: process.env.AWIN_ADVERTISER_ID,
          destinationUrl: ypsListingUrl,
          parameters: {
            clickref: userId,
            clickref2: listingId,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.AWIN_API_TOKEN}`,
          },
        }
      );
      return response.data.url;
    } catch (error) {
      console.error('Awin API error:', error.response?.data || error.message);
      throw new Error('Failed to generate tracking link');
    }
  }

  static handleWebhook(req) {
    try {
      // Verify webhook secret
      const signature = req.headers['x-awin-signature'];
      if (signature !== process.env.AWIN_WEBHOOK_SECRET) {
        throw new Error('Invalid webhook signature');
      }

      // Extract transaction data
      const { transId, commission, clickref } = req.body;
      if (!transId || !clickref) {
        throw new Error('Missing required webhook parameters');
      }

      // Here you would typically save to database
      console.log('Valid webhook received:', { transId, commission, clickref });
      
      return { success: true, transId };
    } catch (error) {
      console.error('Webhook processing error:', error);
      throw error;
    }
  }
}

module.exports = AwinService;