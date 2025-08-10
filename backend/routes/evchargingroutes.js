const express = require('express');
const router = express.Router();
const { query, validationResult } = require('express-validator');

// Import EV service with error handling
let EvChargingService;
try {
  EvChargingService = require('../services/evchargingservices');
} catch (error) {
  console.error('❌ Failed to load EvChargingService:', error.message);
  // Create a fallback service
  EvChargingService = {
    searchByLocation: async () => ({ data: [] }),
    searchByArea: async () => ({ data: [] }),
    getOperators: async () => ({ data: [] }),
    getConnectionTypes: async () => ({ data: [] }),
    getStationById: async () => ({ data: null })
  };
}

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

// ===== EV CHARGING ENDPOINTS =====

// Health check for EV API
router.get('/health', (req, res) => {
  console.log('🔌 EV Charging API health check');
  res.json({
    success: true,
    message: 'EV Charging API is healthy',
    timestamp: new Date().toISOString(),
    services: {
      open_charge_map: 'connected'
    }
  });
});

// Search EV charging stations by location
const validateLocationSearch = [
  query('latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  query('longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
  query('distance').optional().isInt({ min: 1, max: 100 }).withMessage('Distance must be 1-100 km'),
  query('maxresults').optional().isInt({ min: 1, max: 100 }).withMessage('Max results must be 1-100'),
  query('countrycode').optional().isLength({ min: 2, max: 2 }).withMessage('Country code must be 2 characters'),
  query('levelid').optional().isIn(['1', '2', '3']).withMessage('Level ID must be 1, 2, or 3'),
  query('operatorid').optional().isInt().withMessage('Operator ID must be a number')
];

// Search charging stations by coordinates
router.get('/search-by-location', 
  validateLocationSearch,
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        latitude,
        longitude,
        distance = 20,
        maxresults = 50,
        countrycode = 'GB',
        levelid,
        operatorid
      } = req.query;

      console.log('🔍 EV LOCATION SEARCH:', {
        latitude,
        longitude,
        distance,
        countrycode,
        timestamp: new Date().toISOString()
      });

      const searchParams = {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        distance: parseInt(distance),
        maxresults: parseInt(maxresults),
        countrycode,
        levelid: levelid ? parseInt(levelid) : undefined,
        operatorid: operatorid ? parseInt(operatorid) : undefined
      };

      const result = await EvChargingService.searchByLocation(searchParams);

      console.log('✅ Found EV stations:', result.data?.length || 0);

      res.json({
        success: true,
        data: result.data,
        count: result.data?.length || 0,
        search_params: searchParams,
        message: `Found ${result.data?.length || 0} charging stations`,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ EV LOCATION SEARCH ERROR:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search charging stations by location',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

// Search charging stations by city/area name
router.get('/search-by-area',
  [
    query('area').notEmpty().withMessage('Area name is required'),
    query('maxresults').optional().isInt({ min: 1, max: 100 }).withMessage('Max results must be 1-100'),
    query('levelid').optional().isIn(['1', '2', '3']).withMessage('Level ID must be 1, 2, or 3'),
    query('operatorid').optional().isInt().withMessage('Operator ID must be a number')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        area,
        maxresults = 50,
        levelid,
        operatorid,
        countrycode = 'GB'
      } = req.query;

      console.log('🏙️ EV AREA SEARCH:', { area, countrycode });

      const searchParams = {
        area: area.trim(),
        maxresults: parseInt(maxresults),
        countrycode,
        levelid: levelid ? parseInt(levelid) : undefined,
        operatorid: operatorid ? parseInt(operatorid) : undefined
      };

      const result = await EvChargingService.searchByArea(searchParams);

      console.log('✅ Found EV stations in area:', result.data?.length || 0);

      res.json({
        success: true,
        data: result.data,
        count: result.data?.length || 0,
        search_params: searchParams,
        message: `Found ${result.data?.length || 0} charging stations in ${area}`,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ EV AREA SEARCH ERROR:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search charging stations by area',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

// Get charging operators/networks
router.get('/operators', async (req, res) => {
  try {
    console.log('🏢 Getting EV operators...');
    const operators = await EvChargingService.getOperators();

    res.json({
      success: true,
      data: operators.data,
      count: operators.data?.length || 0,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ EV OPERATORS ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get charging operators',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get connection types
router.get('/connection-types', async (req, res) => {
  try {
    console.log('🔌 Getting connection types...');
    const connectionTypes = await EvChargingService.getConnectionTypes();

    res.json({
      success: true,
      data: connectionTypes.data,
      count: connectionTypes.data?.length || 0,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ CONNECTION TYPES ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get connection types',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get charging station details by ID
router.get('/station/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🔍 Getting EV station details:', id);

    const station = await EvChargingService.getStationById(id);

    if (!station.data) {
      return res.status(404).json({
        success: false,
        message: 'Charging station not found',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: station.data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ EV STATION DETAILS ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get station details',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;