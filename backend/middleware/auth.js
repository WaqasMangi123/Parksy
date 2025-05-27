const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { TokenExpiredError, JsonWebTokenError } = jwt;

// Cache for token blacklisting (consider using Redis in production)
const tokenBlacklist = new Set();

const auth = async (req, res, next) => {
  try {
    // 1. Token Extraction
    const authHeader = req.header('Authorization');
    if (!authHeader) {
      return res.status(401).json({ 
        success: false,
        message: 'Authorization header missing',
        code: 'MISSING_AUTH_HEADER'
      });
    }

    // Support both "Bearer <token>" and direct token
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.replace('Bearer ', '').trim()
      : authHeader.trim();

    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'Authentication token missing',
        code: 'MISSING_TOKEN'
      });
    }

    // 2. Check Token Blacklist
    if (tokenBlacklist.has(token)) {
      return res.status(401).json({ 
        success: false,
        message: 'Token has been invalidated',
        code: 'TOKEN_INVALIDATED'
      });
    }

    // 3. Token Verification
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET, {
        algorithms: ['HS256'], // Specify allowed algorithms
        ignoreExpiration: false // Explicitly check expiration
      });
    } catch (verifyError) {
      if (verifyError instanceof TokenExpiredError) {
        return res.status(401).json({ 
          success: false,
          message: 'Token has expired',
          code: 'TOKEN_EXPIRED',
          expiredAt: verifyError.expiredAt
        });
      }
      if (verifyError instanceof JsonWebTokenError) {
        return res.status(401).json({ 
          success: false,
          message: 'Invalid token',
          code: 'INVALID_TOKEN'
        });
      }
      throw verifyError;
    }

    // 4. User Verification
    const user = await User.findById(decoded.id)
      .select('-password -__v -verificationCode -resetPasswordToken')
      .lean();

    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    if (user.accountLocked) {
      return res.status(403).json({ 
        success: false,
        message: 'Account is locked',
        code: 'ACCOUNT_LOCKED'
      });
    }

    // 5. Attach User and Token to Request
    req.user = user;
    req.token = token;

    // 6. Proceed to Next Middleware
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    // Handle specific database errors
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid user ID format',
        code: 'INVALID_USER_ID'
      });
    }

    // Generic server error
    res.status(500).json({ 
      success: false,
      message: 'Authentication failed',
      code: 'AUTH_FAILURE',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Helper function to invalidate tokens (for logout functionality)
auth.invalidateToken = (token) => {
  tokenBlacklist.add(token);
};

// Helper function to clear expired tokens from blacklist
auth.cleanBlacklist = () => {
  // In a production environment, you would implement TTL with Redis
  // This is a simple in-memory implementation for demonstration
  const now = Date.now();
  // Assuming tokens are JWT and we can extract expiration
  for (const token of tokenBlacklist) {
    try {
      const decoded = jwt.decode(token);
      if (decoded && decoded.exp * 1000 < now) {
        tokenBlacklist.delete(token);
      }
    } catch {
      tokenBlacklist.delete(token);
    }
  }
};

// Periodically clean the blacklist (every hour)
setInterval(auth.cleanBlacklist, 3600000);

module.exports = auth;