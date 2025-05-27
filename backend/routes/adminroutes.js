const express = require('express');
const router = express.Router();
const { loginAdmin, getDashboard } = require('../controllers/admincontroller');
const authMiddleware = require('../middleware/AuthMiddleware');

// Login route
router.post('/login', loginAdmin);

// Protected dashboard route
router.get('/dashboard', authMiddleware, getDashboard);

module.exports = router;