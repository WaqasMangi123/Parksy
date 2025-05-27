const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false,
      message: "Authorization token required (Format: Bearer <token>)" 
    });
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
    req.admin = decoded;  // Store admin data in request
    next();
  } catch (error) {
    const message = error.name === "TokenExpiredError" 
      ? "Session expired. Please login again." 
      : "Invalid authentication token";
    res.status(401).json({ success: false, message });
  }
};