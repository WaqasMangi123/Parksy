import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Lock, Mail, Shield, Car, ArrowRight, Zap, Database, BarChart3 } from 'lucide-react';
import './adminlogin.css'; // Import the CSS file

const AdminLogin = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // API Configuration with render URL
  const API_BASE_URL = 'https://parksy-backend.onrender.com';
  const API_ENDPOINT = `${API_BASE_URL}/api/admin/login`;

  // Mouse tracking for 3D effects
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: (e.clientY / window.innerHeight) * 2 - 1
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Login endpoint not found. Please check if backend is running.');
        } else if (response.status === 500) {
          throw new Error('Server error. Please try again later.');
        } else if (response.status === 401) {
          throw new Error('Invalid credentials. Please check your email and password.');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.token) {
        localStorage.setItem('adminToken', data.token);
        if (rememberMe) {
          localStorage.setItem('rememberAdmin', 'true');
        }
        
        setIsTransitioning(true);
        
        setTimeout(() => {
          window.location.href = '#/admin/dashboard';
        }, 2000);
      } else {
        setError(data.message || 'Login failed. Please check your credentials.');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Login error:', error);
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        setError(`Cannot connect to server. Please check if backend is running.`);
      } else if (error.message.includes('JSON')) {
        setError('Invalid response from server. Please try again.');
      } else {
        setError(error.message || 'Network error. Please check your connection and try again.');
      }
      setIsLoading(false);
    }
  };

  const handleTestLogin = () => {
    if (process.env.NODE_ENV === 'development') {
      setFormData({
        email: 'waqasahmedd78676@gmail.com',
        password: 'yourpassword'
      });
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      try {
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Date.now() / 1000;
        
        if (tokenPayload.exp > currentTime) {
          window.location.href = '#/admin/dashboard';
          return;
        } else {
          localStorage.removeItem('adminToken');
          localStorage.removeItem('rememberAdmin');
        }
      } catch (error) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('rememberAdmin');
      }
    }

    // Add body class for styling
    document.body.classList.add('admin-login-page');
    
    return () => {
      document.body.classList.remove('admin-login-page');
    };
  }, []);

  if (isTransitioning) {
    return (
      <div className="transition-overlay">
        <div className="transition-content">
          <div className="transition-spinner">
            <div className="spinner-ring"></div>
            <div className="spinner-inner">
              <Car className="spinner-car" size={32} />
            </div>
          </div>
          <div className="transition-dots">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="transition-dot"></div>
            ))}
          </div>
          <h2 className="transition-title">Welcome Back!</h2>
          <p className="transition-subtitle">Accessing your admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-login-container">
      {/* Animated Background */}
      <div className="background-gradient"></div>

      {/* Floating Particles */}
      <div className="particles">
        {[...Array(20)].map((_, i) => (
          <div key={i} className={`particle particle-${i + 1}`}></div>
        ))}
      </div>

      {/* Main Container */}
      <div className="main-grid">
        
        {/* Left Side - 3D Visual Section */}
        <div className="visual-section">
          
          {/* Brand Header */}
          <div className="brand-header">
            <div className="brand-icon">
              <Shield className="text-white" size={24} />
            </div>
            <h1 className="brand-title">
              Park<span className="brand-accent">sy</span>
            </h1>
            <p className="brand-subtitle">
              Advanced Parking Management System
            </p>
          </div>

          {/* 3D Car Animation */}
          <div className="car-animation-container perspective-container">
            <div 
              className="car-3d-wrapper transform-3d"
              style={{
                transform: `rotateX(${mousePosition.y * 10}deg) rotateY(${mousePosition.x * 10}deg)`
              }}
            >
              {/* Car Shadow */}
              <div className="car-shadow"></div>
              
              {/* Main Car */}
              <div className="car-main">
                <Car className="text-white" size={64} />
                <div className="car-glow"></div>
              </div>
            </div>
          </div>

          {/* Feature Grid */}
          <div className="features-grid">
            {[
              { icon: Zap, title: "Real-time", desc: "Live monitoring" },
              { icon: Database, title: "Secure", desc: "Enterprise grade" },
              { icon: BarChart3, title: "Analytics", desc: "Smart insights" }
            ].map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="feature-icon">
                  <feature.icon className="text-white" size={24} />
                </div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="form-section">
          <div className="form-container">
            
            {/* Form Header */}
            <div className="form-header">
              <div className="form-logo">
                <div className="form-logo-icon">
                  <Shield className="text-white" size={20} />
                </div>
                <h2 className="form-title">Admin Portal</h2>
              </div>
              <p className="form-subtitle">Access your administrative dashboard</p>
            </div>

            {/* Development Helper */}
            {process.env.NODE_ENV === 'development' && (
              <div className="dev-helper">
                <button 
                  type="button"
                  onClick={handleTestLogin}
                  className="dev-button"
                >
                  Fill Test Credentials
                </button>
                <p className="dev-info">API: {API_ENDPOINT}</p>
              </div>
            )}

            {/* Login Form */}
            <div className="login-form">
              
              {/* Email Field */}
              <div className="input-group">
                <label className="input-label">Email Address</label>
                <div className="input-container">
                  <Mail className="input-icon" size={20} />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="admin@parksy.com"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="input-group">
                <label className="input-label">Password</label>
                <div className="input-container">
                  <Lock className="input-icon" size={20} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Enter your secure password"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Options */}
              <div className="form-options">
                <label className="checkbox-container">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`custom-checkbox ${rememberMe ? 'checked' : ''}`}></div>
                  <span className="checkbox-label">Remember me</span>
                </label>
                <a href="#/admin/forgot-password" className="forgot-link">
                  Forgot password?
                </a>
              </div>

              {/* Error Message */}
              {error && (
                <div className="error-message">
                  <div className="error-icon">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="error-text">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={isLoading}
                className="submit-button"
              >
                {isLoading ? (
                  <>
                    <div className="loading-spinner"></div>
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Dashboard</span>
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
            </div>

            {/* Footer */}
            <div className="form-footer">
              <p className="footer-text">Protected by enterprise-grade security</p>
              <div className="security-badges">
                {[
                  { icon: "🔒", label: "SSL" },
                  { icon: "🛡️", label: "2FA" },
                  { icon: "⚡", label: "Encrypted" }
                ].map((badge, index) => (
                  <div key={index} className="security-badge">
                    <span>{badge.icon}</span>
                    <span>{badge.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;