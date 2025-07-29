const express = require('express');
const router = express.Router();
const AwinService = require('../services/awin');

// Generate Awin link for frontend
router.get('/generate-link', async (req, res) => {
  try {
    const { userId, ypsUrl, listingId } = req.query;
    
    if (!userId || !ypsUrl || !listingId) {
      return res.status(400).json({ 
        error: 'Missing required parameters: userId, ypsUrl, listingId' 
      });
    }

    const link = await AwinService.generateTrackingLink(userId, ypsUrl, listingId);
    res.json({ url: link });
  } catch (error) {
    console.error('Error in /generate-link:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to generate tracking link' 
    });
  }
});

// Awin conversion webhook
router.post('/webhook', async (req, res) => {
  try {
    const result = await AwinService.handleWebhook(req);
    res.status(200).json({ 
      status: 'success',
      transactionId: result.transId 
    });
  } catch (error) {
    console.error('Error in /webhook:', error);
    res.status(400).json({ 
      error: error.message || 'Webhook processing failed' 
    });
  }
});

module.exports = router;