const express = require('express');
const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'EV Charging API Health Check',
    timestamp: new Date().toISOString()
  });
});

// Search by location
router.get('/search-by-location', (req, res) => {
  res.json({
    success: false,
    message: 'EV service temporarily unavailable',
    data: [],
    timestamp: new Date().toISOString()
  });
});

// Search by area
router.get('/search-by-area', (req, res) => {
  res.json({
    success: false,
    message: 'EV service temporarily unavailable', 
    data: [],
    timestamp: new Date().toISOString()
  });
});

// Get operators
router.get('/operators', (req, res) => {
  res.json({
    success: false,
    message: 'EV service temporarily unavailable',
    data: [],
    timestamp: new Date().toISOString()
  });
});

// Get connection types
router.get('/connection-types', (req, res) => {
  res.json({
    success: false,
    message: 'EV service temporarily unavailable',
    data: [],
    timestamp: new Date().toISOString()
  });
});

// Get station by ID - SAFE pattern
router.get('/station/:stationId', (req, res) => {
  res.json({
    success: false,
    message: 'EV service temporarily unavailable',
    data: null,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;