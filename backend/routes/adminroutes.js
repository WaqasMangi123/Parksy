const express = require('express');
const router = express.Router();
const { 
  loginAdmin, 
  getDashboard, 
  logoutAdmin, 
  changePassword,
  loginLimiter 
} = require('../controllers/admincontroller');
const authMiddleware = require('../middleware/AuthMiddleware');
const Admin = require('../models/admin'); // Add this import for profile route

// Apply rate limiting to login route
router.post('/login', loginLimiter, loginAdmin);

// Protected routes (require authentication)
router.use(authMiddleware); // Apply auth middleware to all routes below

// Dashboard route
router.get('/dashboard', getDashboard);

// Logout route  
router.post('/logout', logoutAdmin);

// Change password route
router.put('/change-password', changePassword);

// Admin profile route
router.get('/profile', async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id).select('-password');
    res.json({
      success: true,
      admin
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

module.exports = router;