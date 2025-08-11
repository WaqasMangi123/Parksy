const express = require('express');
const router = express.Router();
const { query, validationResult } = require('express-validator');

// Safe import of EV service with proper error handling
let EvChargingService = null;
let serviceReady = false;

try {
  const EvChargingServiceModule = require('../services/evchargingservices');
  // Handle both class and instance exports
  if (typeof EvChargingServiceModule === 'function') {
    EvChargingService = new EvChargingServiceModule();
  } else if (EvChargingServiceModule && typeof EvChargingServiceModule === 'object') {
    EvChargingService = EvChargingServiceModule;
  } else {
    throw new Error('Invalid EV service export');
  }
  serviceReady = true;
  console.log('✅ EV Charging Service loaded successfully');
} catch (error) {
  console.error('❌ Failed to load EvChargingService:', error.message);
  serviceReady = false;
  
  // Create a complete fallback service
  EvChargingService = {
    searchByLocation: async () => ({ 
      success: false, 
      data: [], 
      error: 'EV Service not available' 
    }),
    searchByArea: async () => ({ 
      success: false, 
      data: [], 
      error: 'EV Service not available' 
    }),
    getOperators: async () => ({ 
      success: false, 
      data: [], 
      error: 'EV Service not available' 
    }),
    getConnectionTypes: async () => ({ 
      success: false, 
      data: [], 
      error: 'EV Service not available' 
    }),
    getStationById: async () => ({ 
      success: false, 
      data: null, 
      error: 'EV Service not available' 
    }),
    testConnection: async () => ({ 
      success: false, 
      message: 'EV Service not available' 
    }),
    isReady: () => false
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

// Helper function to check service status
const checkServiceStatus = () => {
  if (!serviceReady) {
    return {
      available: false,
      message: 'EV Charging Service is not available - check service configuration'
    };
  }
  
  if (EvChargingService && typeof EvChargingService.isReady === 'function') {
    const ready = EvChargingService.isReady();
    return {
      available: ready,
      message: ready ? 'Service ready' : 'Service not ready - check API configuration'
    };
  }
  
  return {
    available: true,
    message: 'Service available'
  };
};

// ===== EV CHARGING ENDPOINTS =====

// Health check for EV API
router.get('/health', (req, res) => {
  console.log('🔌 EV Charging API health check');
  
  const serviceStatus = checkServiceStatus();
  
  res.json({
    success: serviceStatus.available,
    message: 'EV Charging API Health Check',
    service_status: serviceStatus.message,
    service_ready: serviceReady,
    timestamp: new Date().toISOString(),
    services: {
      open_charge_map: serviceStatus.available ? 'connected' : 'unavailable',
      axios: serviceReady ? 'loaded' : 'not loaded'
    }
  });
});

// Validation arrays - defined separately to avoid path-to-regexp issues
const locationValidation = [
  query('latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  query('longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
  query('distance').optional().isInt({ min: 1, max: 100 }).withMessage('Distance must be 1-100 km'),
  query('maxresults').optional().isInt({ min: 1, max: 100 }).withMessage('Max results must be 1-100'),
  query('countrycode').optional().isLength({ min: 2, max: 2 }).withMessage('Country code must be 2 characters'),
  query('levelid').optional().isIn(['1', '2', '3']).withMessage('Level ID must be 1, 2, or 3'),
  query('operatorid').optional().isInt().withMessage('Operator ID must be a number')
];

const areaValidation = [
  query('area').notEmpty().withMessage('Area name is required'),
  query('maxresults').optional().isInt({ min: 1, max: 100 }).withMessage('Max results must be 1-100'),
  query('levelid').optional().isIn(['1', '2', '3']).withMessage('Level ID must be 1, 2, or 3'),
  query('operatorid').optional().isInt().withMessage('Operator ID must be a number')
];

// Search charging stations by coordinates - FIXED route pattern
router.get('/search-by-location', locationValidation, handleValidationErrors, async (req, res) => {
  try {
    // Check service status first
    const serviceStatus = checkServiceStatus();
    if (!serviceStatus.available) {
      return res.status(503).json({
        success: false,
        message: 'EV Charging service temporarily unavailable',
        error: serviceStatus.message,
        data: [],
        timestamp: new Date().toISOString()
      });
    }

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
      success: result.success || false,
      data: result.data || [],
      count: result.data?.length || 0,
      search_params: searchParams,
      message: result.success 
        ? `Found ${result.data?.length || 0} charging stations`
        : result.error || 'Search failed',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ EV LOCATION SEARCH ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search charging stations by location',
      error: error.message,
      data: [],
      timestamp: new Date().toISOString()
    });
  }
});

// Search charging stations by city/area name - FIXED route pattern
router.get('/search-by-area', areaValidation, handleValidationErrors, async (req, res) => {
  try {
    // Check service status first
    const serviceStatus = checkServiceStatus();
    if (!serviceStatus.available) {
      return res.status(503).json({
        success: false,
        message: 'EV Charging service temporarily unavailable',
        error: serviceStatus.message,
        data: [],
        timestamp: new Date().toISOString()
      });
    }

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
      success: result.success || false,
      data: result.data || [],
      count: result.data?.length || 0,
      search_params: searchParams,
      message: result.success 
        ? `Found ${result.data?.length || 0} charging stations in ${area}`
        : result.error || 'Search failed',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ EV AREA SEARCH ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search charging stations by area',
      error: error.message,
      data: [],
      timestamp: new Date().toISOString()
    });
  }
});

// Get charging operators/networks
router.get('/operators', async (req, res) => {
  try {
    console.log('🏢 Getting EV operators...');
    
    // Check service status first
    const serviceStatus = checkServiceStatus();
    if (!serviceStatus.available) {
      return res.status(503).json({
        success: false,
        message: 'EV Charging service temporarily unavailable',
        error: serviceStatus.message,
        data: [],
        timestamp: new Date().toISOString()
      });
    }

    const operators = await EvChargingService.getOperators();

    res.json({
      success: operators.success || false,
      data: operators.data || [],
      count: operators.data?.length || 0,
      message: operators.success ? 'Operators retrieved successfully' : operators.error || 'Failed to get operators',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ EV OPERATORS ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get charging operators',
      error: error.message,
      data: [],
      timestamp: new Date().toISOString()
    });
  }
});

// Get connection types
router.get('/connection-types', async (req, res) => {
  try {
    console.log('🔌 Getting connection types...');
    
    // Check service status first
    const serviceStatus = checkServiceStatus();
    if (!serviceStatus.available) {
      return res.status(503).json({
        success: false,
        message: 'EV Charging service temporarily unavailable',
        error: serviceStatus.message,
        data: [],
        timestamp: new Date().toISOString()
      });
    }

    const connectionTypes = await EvChargingService.getConnectionTypes();

    res.json({
      success: connectionTypes.success || false,
      data: connectionTypes.data || [],
      count: connectionTypes.data?.length || 0,
      message: connectionTypes.success ? 'Connection types retrieved successfully' : connectionTypes.error || 'Failed to get connection types',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ CONNECTION TYPES ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get connection types',
      error: error.message,
      data: [],
      timestamp: new Date().toISOString()
    });
  }
});

// Get charging station details by ID - SAFE parameter pattern
router.get('/station/:stationId', async (req, res) => {
  try {
    const { stationId } = req.params;
    console.log('🔍 Getting EV station details:', stationId);

    // Validate station ID
    if (!stationId || isNaN(parseInt(stationId))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid station ID',
        error: 'Station ID must be a number',
        timestamp: new Date().toISOString()
      });
    }

    // Check service status first
    const serviceStatus = checkServiceStatus();
    if (!serviceStatus.available) {
      return res.status(503).json({
        success: false,
        message: 'EV Charging service temporarily unavailable',
        error: serviceStatus.message,
        data: null,
        timestamp: new Date().toISOString()
      });
    }

    const station = await EvChargingService.getStationById(stationId);

    if (!station.success || !station.data) {
      return res.status(404).json({
        success: false,
        message: 'Charging station not found',
        error: station.error || 'Station not found',
        data: null,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: station.data,
      message: 'Station details retrieved successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ EV STATION DETAILS ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get station details',
      error: error.message,
      data: null,
      timestamp: new Date().toISOString()
    });
  }
});

// Test connection endpoint
router.get('/test-connection', async (req, res) => {
  try {
    console.log('🧪 Testing EV API connection...');
    
    const serviceStatus = checkServiceStatus();
    if (!serviceStatus.available) {
      return res.json({
        success: false,
        message: 'EV Charging service not available',
        error: serviceStatus.message,
        timestamp: new Date().toISOString()
      });
    }

    let testResult;
    if (typeof EvChargingService.testConnection === 'function') {
      testResult = await EvChargingService.testConnection();
    } else {
      testResult = {
        success: false,
        message: 'Test connection method not available'
      };
    }

    res.json({
      success: testResult.success,
      message: testResult.message || 'Connection test completed',
      service_ready: serviceReady,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ EV CONNECTION TEST ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Connection test failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Catch-all route for any unmatched EV endpoints - SAFE pattern
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'EV endpoint not found',
    error: `Route ${req.originalUrl} not found`,
    available_endpoints: [
      '/health',
      '/search-by-location',
      '/search-by-area', 
      '/operators',
      '/connection-types',
      '/station/:stationId',
      '/test-connection'
    ],
    timestamp: new Date().toISOString()
  });
});

module.exports = router;