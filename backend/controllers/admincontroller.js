const jwt = require('jsonwebtoken');

exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Hardcode credentials temporarily (remove in production)
    const ADMIN_EMAIL = "waqasahmedd78676@gmail.com";
    const ADMIN_PASSWORD = "yourpassword";

    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ 
        success: false,
        message: "Invalid credentials" 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { email, role: 'admin' },
      "your_jwt_secret_here", // Use a simple secret for development
      { expiresIn: '1h' }
    );

    res.json({ 
      success: true,
      token
    });

  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
};

exports.getDashboard = (req, res) => {
  res.json({ 
    success: true,
    message: "Welcome to Admin Dashboard" 
  });
};