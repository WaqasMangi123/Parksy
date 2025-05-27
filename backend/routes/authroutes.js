const express = require("express");
const router = express.Router();
const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
require("dotenv").config();

// Environment Variables
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// Nodemailer Setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { 
    user: EMAIL_USER, 
    pass: EMAIL_PASS 
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Helper Functions
const generateVerificationCode = () => Math.floor(100000 + Math.random() * 900000).toString();

const sendVerificationEmail = async (email, verificationCode) => {
  try {
    await transporter.sendMail({
      from: `"Scholarship Portal" <${EMAIL_USER}>`,
      to: email,
      subject: "Verify Your Email Address",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Email Verification</h2>
          <p>Your verification code is: <strong>${verificationCode}</strong></p>
          <p>This code will expire in 10 minutes.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("Email sending error:", err);
    throw new Error("Failed to send verification email");
  }
};

// Middleware to update lastActive timestamp
router.use(async (req, res, next) => {
  if (req.user) { // Assuming you have user data from JWT
    try {
      await User.findByIdAndUpdate(req.user.id, { lastActive: new Date() });
    } catch (err) {
      console.error("Error updating lastActive:", err);
    }
  }
  next();
});

// Input Validation Middleware
const validateRegisterInput = (req, res, next) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ 
      success: false,
      message: "All fields are required" 
    });
  }
  next();
};

const validateLoginInput = (req, res, next) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ 
      success: false,
      message: "Email is required" 
    });
  }
  next();
};

// 🔹 User Registration
router.post("/register", validateRegisterInput, async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    // Check if user exists
    const existingUser = await User.findOne({ email: trimmedEmail });
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        message: "Email is already registered" 
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(trimmedPassword, salt);
    const verificationCode = generateVerificationCode();

    const newUser = new User({
      username: username.trim(),
      email: trimmedEmail,
      password: hashedPassword,
      verified: false,
      verificationCode,
      verificationCodeExpires: Date.now() + 10 * 60 * 1000, // 10 minutes
      role: 'user'
    });

    await newUser.save();
    await sendVerificationEmail(newUser.email, verificationCode);

    res.status(201).json({ 
      success: true,
      message: "Registration successful! Please check your email for verification code.",
      userId: newUser._id 
    });

  } catch (err) {
    console.error("Registration Error:", err);
    res.status(500).json({ 
      success: false,
      message: "Server error during registration",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// 🔹 Email Verification
router.post("/verify", async (req, res) => {
  try {
    const { email, verificationCode } = req.body;
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !verificationCode || !/^\d{6}$/.test(verificationCode)) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid verification code format" 
      });
    }

    const user = await User.findOne({
      email: trimmedEmail,
      verificationCode,
      verificationCodeExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid or expired verification code" 
      });
    }

    // Mark as verified
    user.verified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user._id,
        email: user.email,
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.status(200).json({ 
      success: true,
      message: "Email successfully verified!",
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role
      }
    });

  } catch (err) {
    console.error("Verification Error:", err);
    res.status(500).json({ 
      success: false,
      message: "Server error during verification"
    });
  }
});

// 🔹 User Login
router.post("/login", validateLoginInput, async (req, res) => {
  try {
    const { email } = req.body;
    const trimmedEmail = email.trim().toLowerCase();

    const user = await User.findOne({ email: trimmedEmail });
    
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: "Account not found" 
      });
    }

    if (!user.verified) {
      return res.status(403).json({ 
        success: false,
        isVerified: false,
        message: "Please verify your email first" 
      });
    }

    // Generate token
    const token = jwt.sign(
      { 
        id: user._id,
        email: user.email,
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Return user data without password
    const userResponse = {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role
    };

    res.status(200).json({
      success: true,
      message: "Login successful!",
      token,
      user: userResponse
    });

  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ 
      success: false,
      message: "Server error during login"
    });
  }
});

// 🔹 Forgot Password
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      return res.status(400).json({ 
        success: false,
        message: "Email is required" 
      });
    }

    const user = await User.findOne({ email: trimmedEmail });
    if (!user) {
      // Return generic success to prevent email enumeration
      return res.status(200).json({ 
        success: true,
        message: "If an account exists, a reset link has been sent" 
      });
    }

    // Generate reset token
    const resetToken = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "1h" });
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Send email with reset link
    const resetUrl = `${FRONTEND_URL}/reset-password/${resetToken}`;
    await transporter.sendMail({
      from: `"Scholarship Portal" <${EMAIL_USER}>`,
      to: user.email,
      subject: "Password Reset Request",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Password Reset</h2>
          <p>Click below to reset your password:</p>
          <a href="${resetUrl}" 
             style="display: inline-block; padding: 10px 20px; 
                    background-color: #2563eb; color: white; 
                    text-decoration: none; border-radius: 5px; 
                    margin: 20px 0;">
            Reset Password
          </a>
          <p>This link expires in 1 hour.</p>
        </div>
      `,
    });

    res.status(200).json({ 
      success: true,
      message: "Password reset link sent to your email" 
    });

  } catch (err) {
    console.error("Forgot Password Error:", err);
    res.status(500).json({ 
      success: false,
      message: "Server error processing your request"
    });
  }
});

// 🔹 Validate Reset Token
router.post("/validate-reset-token", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ 
        valid: false,
        message: "Token is required" 
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Find user with matching token
    const user = await User.findOne({
      _id: decoded.id,
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(200).json({ 
        valid: false,
        message: "Invalid or expired token" 
      });
    }

    res.status(200).json({ 
      valid: true,
      message: "Token is valid",
      email: user.email
    });

  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(200).json({ 
        valid: false,
        message: "Token has expired" 
      });
    }
    if (err.name === "JsonWebTokenError") {
      return res.status(200).json({ 
        valid: false,
        message: "Invalid token" 
      });
    }
    console.error("Token validation error:", err);
    res.status(500).json({ 
      valid: false,
      message: "Server error during token validation" 
    });
  }
});

// 🔹 Reset Password
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ 
        success: false,
        message: "Token and new password are required" 
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ 
        success: false,
        message: "Password must be at least 8 characters" 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Find user with matching token
    const user = await User.findOne({
      _id: decoded.id,
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    }).select('+password');

    if (!user) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid or expired token" 
      });
    }

    // Check if new password is same as old
    const isSamePassword = await bcrypt.compare(newPassword.trim(), user.password);
    if (isSamePassword) {
      return res.status(400).json({ 
        success: false,
        message: "New password must be different" 
      });
    }

    // Update password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword.trim(), salt);
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    // Send confirmation email
    await transporter.sendMail({
      from: `"Scholarship Portal" <${EMAIL_USER}>`,
      to: user.email,
      subject: "Password Changed",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Password Updated</h2>
          <p>Your password was successfully changed.</p>
        </div>
      `,
    });

    res.status(200).json({ 
      success: true,
      message: "Password updated successfully!" 
    });

  } catch (err) {
    console.error("Reset Password Error:", err);
    res.status(500).json({ 
      success: false,
      message: "Server error processing your request"
    });
  }
});

// 🔹 Get All Users (New Endpoint)
router.get("/users", async (req, res) => {
  try {
    const users = await User.find({}, 'username email role createdAt lastActive verified')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      users: users.map(user => ({
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        lastActive: user.lastActive,
        verified: user.verified
      }))
    });
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({
      success: false,
      message: "Server error fetching users",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// 🔹 Get Active Users (New Endpoint)
router.get("/active-users", async (req, res) => {
  try {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    
    const activeUsers = await User.find(
      { lastActive: { $gte: fifteenMinutesAgo } },
      'username email role lastActive'
    ).sort({ lastActive: -1 });

    res.status(200).json({
      success: true,
      activeUsers,
      count: activeUsers.length,
      lastUpdated: new Date()
    });
  } catch (err) {
    console.error("Error fetching active users:", err);
    res.status(500).json({
      success: false,
      message: "Server error fetching active users"
    });
  }
});
// ... (All your existing code remains exactly the same until the end)

// 🔹 Delete User (New Endpoint - Add this just before module.exports)
router.delete("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Delete the user
    await User.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
      deletedUser: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });

  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({
      success: false,
      message: "Server error while deleting user",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;
module.exports = router;