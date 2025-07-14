const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const Admin = require('../models/admin');

// Rate limiter for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    success: false,
    message: "Too many login attempts. Please try again later."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Input validation
const validateLoginInput = (email, password) => {
  const errors = [];
  
  if (!email || !email.trim()) {
    errors.push('Email is required');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Please enter a valid email address');
  }
  
  if (!password || !password.trim()) {
    errors.push('Password is required');
  }
  
  return errors;
};

// Secure login function
const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Input validation
    const validationErrors = validateLoginInput(email, password);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors
      });
    }

    // Check if admin exists in database
    let admin = await Admin.findOne({ email: email.toLowerCase().trim() });
    
    // If no admin found, create one with env credentials (first-time setup)
    if (!admin) {
      const envEmail = process.env.ADMIN_EMAIL;
      const envPassword = process.env.ADMIN_PASSWORD;
      
      if (email.toLowerCase().trim() === envEmail?.toLowerCase().trim()) {
        // Hash the password from environment
        const hashedPassword = await bcrypt.hash(envPassword, 12);
        
        admin = new Admin({
          email: envEmail.toLowerCase().trim(),
          password: hashedPassword,
          isVerified: true,
          lastLogin: new Date()
        });
        
        await admin.save();
      } else {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials"
        });
      }
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, admin.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    // Generate secure JWT token
    const token = jwt.sign(
      { 
        id: admin._id,
        email: admin.email,
        role: 'admin'
      },
      process.env.JWT_SECRET || process.env.ADMIN_JWT_SECRET,
      { 
        expiresIn: process.env.JWT_EXPIRES_IN || '1h',
        issuer: 'parking-admin-panel',
        audience: 'admin-users'
      }
    );

    // Set secure cookie
    res.cookie('adminToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600000 // 1 hour
    });

    res.json({
      success: true,
      message: "Login successful",
      token, // Also send in response for frontend storage
      admin: {
        id: admin._id,
        email: admin.email,
        lastLogin: admin.lastLogin
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later."
    });
  }
};

// Enhanced dashboard with user info
const getDashboard = async (req, res) => {
  try {
    const adminId = req.user.id;
    const admin = await Admin.findById(adminId).select('-password');
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found"
      });
    }

    // Get dashboard stats (you can expand this)
    const dashboardData = {
      admin: {
        email: admin.email,
        lastLogin: admin.lastLogin,
        accountCreated: admin.createdAt
      },
      stats: {
        totalUsers: 0, // Add your actual user count logic
        totalParkingSpots: 0, // Add your actual parking spots count
        activeReservations: 0, // Add your actual reservations count
        todayRevenue: 0 // Add your actual revenue calculation
      },
      recentActivity: [] // Add recent activity logs
    };

    res.json({
      success: true,
      message: "Dashboard data retrieved successfully",
      data: dashboardData
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// Logout function
const logoutAdmin = (req, res) => {
  res.clearCookie('adminToken');
  res.json({
    success: true,
    message: "Logged out successfully"
  });
};

// Change password function
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const adminId = req.user.id;

    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required"
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters long"
      });
    }

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found"
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, admin.password);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect"
      });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);
    admin.password = hashedNewPassword;
    await admin.save();

    res.json({
      success: true,
      message: "Password changed successfully"
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// Export all functions
module.exports = {
  loginAdmin,
  getDashboard,
  logoutAdmin,
  changePassword,
  loginLimiter
};