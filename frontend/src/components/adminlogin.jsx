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
  const [connectionStatus, setConnectionStatus] = useState('checking');

  // API Configuration with production URL
  const API_BASE_URL = 'https://parksy-backend.onrender.com';
  const API_ENDPOINT = `${API_BASE_URL}/api/admin/login`;
  const HEALTH_CHECK_ENDPOINT = `${API_BASE_URL}/api/health`;

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

  // Check backend connection on mount
  useEffect(() => {
    const checkBackendConnection = async () => {
      try {
        const response = await fetch(HEALTH_CHECK_ENDPOINT, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          credentials: 'include',
        });
        
        if (response.ok) {
          setConnectionStatus('connected');
          console.log('✅ Backend connection successful');
        } else {
          setConnectionStatus('error');
          console.warn('⚠️ Backend responded with error:', response.status);
        }
      } catch (error) {
        setConnectionStatus('error');
        console.error('❌ Backend connection failed:', error);
      }
    };

    checkBackendConnection();
  }, [HEALTH_CHECK_ENDPOINT]);

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

    // Validation
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    if (!formData.email.includes('@')) {
      setError('Please enter a valid email address');
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setIsLoading(false);
      return;
    }

    try {
      console.log('🔄 Attempting login...');
      console.log('📧 Email:', formData.email);
      console.log('🔗 Endpoint:', API_ENDPOINT);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password
        }),
        credentials: 'include',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log('📡 Response status:', response.status);
      console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()));

      // Handle different response statuses
      if (!response.ok) {
        let errorMessage;
        
        switch (response.status) {
          case 400:
            errorMessage = 'Invalid request. Please check your input.';
            break;
          case 401:
            errorMessage = 'Invalid email or password. Please try again.';
            break;
          case 403:
            errorMessage = 'Access forbidden. Please contact administrator.';
            break;
          case 404:
            errorMessage = 'Login service not found. Please try again later.';
            break;
          case 429:
            errorMessage = 'Too many login attempts. Please wait a moment and try again.';
            break;
          case 500:
            errorMessage = 'Server error. Please try again in a few minutes.';
            break;
          case 502:
          case 503:
          case 504:
            errorMessage = 'Service temporarily unavailable. Please try again later.';
            break;
          default:
            errorMessage = `Connection error (${response.status}). Please try again.`;
        }
        
        throw new Error(errorMessage);
      }

      // Parse response
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Invalid response format from server.');
      }

      const data = await response.json();
      console.log('✅ Login response:', { ...data, token: data.token ? '[HIDDEN]' : 'none' });

      // Validate response structure
      if (!data.success) {
        throw new Error(data.message || 'Login failed. Please check your credentials.');
      }

      if (!data.token) {
        throw new Error('No authentication token received. Please try again.');
      }

      // Success! Store token and redirect
      localStorage.setItem('adminToken', data.token);
      
      if (rememberMe) {
        localStorage.setItem('rememberAdmin', 'true');
        localStorage.setItem('adminEmail', formData.email.trim());
      }

      // Store user info if available
      if (data.user) {
        localStorage.setItem('adminUser', JSON.stringify(data.user));
      }
      
      console.log('🎉 Login successful! Redirecting...');
      setIsTransitioning(true);
      
      // Redirect after animation
      setTimeout(() => {
        // Try multiple navigation methods
        if (window.location.hash) {
          window.location.href = '#/admin/dashboard';
        } else {
          window.location.href = '/admin/dashboard';
        }
        
        // Fallback
        setTimeout(() => {
          window.location.replace(window.location.origin + '/admin/dashboard');
        }, 1000);
      }, 2000);

    } catch (error) {
      console.error('❌ Login error:', error);
      
      let errorMessage;
      
      if (error.name === 'AbortError') {
        errorMessage = 'Request timeout. Please check your connection and try again.';
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = 'Cannot connect to server. Please check your internet connection.';
      } else if (error.message.includes('JSON')) {
        errorMessage = 'Server response error. Please try again.';
      } else if (error.message.includes('CORS')) {
        errorMessage = 'Connection security error. Please refresh the page and try again.';
      } else {
        errorMessage = error.message || 'Login failed. Please try again.';
      }
      
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const handleTestLogin = () => {
    // Only show in development or when explicitly enabled
    const isDev = process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost';
    
    if (isDev) {
      setFormData({
        email: 'admin@parksy.com',
        password: 'admin123'
      });
    }
  };

  // Check for existing login on mount
  useEffect(() => {
    const checkExistingLogin = () => {
      const token = localStorage.getItem('adminToken');
      const rememberAdmin = localStorage.getItem('rememberAdmin');
      
      if (token) {
        try {
          // Basic JWT validation
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            const currentTime = Date.now() / 1000;
            
            if (payload.exp && payload.exp > currentTime) {
              console.log('🔑 Valid token found, redirecting...');
              window.location.href = '#/admin/dashboard';
              return;
            }
          }
          
          // Invalid or expired token
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminUser');
        } catch (error) {
          console.warn('⚠️ Invalid token format:', error);
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminUser');
        }
      }
      
      // Restore email if remembered
      if (rememberAdmin === 'true') {
        const savedEmail = localStorage.getItem('adminEmail');
        if (savedEmail) {
          setFormData(prev => ({ ...prev, email: savedEmail }));
          setRememberMe(true);
        }
      }
    };

    checkExistingLogin();

    // Add body class for styling
    document.body.classList.add('admin-login-page');
    
    return () => {
      document.body.classList.remove('admin-login-page');
    };
  }, []);

  // Show transition screen
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
              <Shield className="text-white" size={32} />
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
            
            {/* Connection Status Indicator */}
            {connectionStatus === 'error' && (
              <div className="connection-status error">
                <span>⚠️ Server connection issue detected</span>
              </div>
            )}
            
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
            {(process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost') && (
              <div className="dev-helper">
                <button 
                  type="button"
                  onClick={handleTestLogin}
                  className="dev-button"
                >
                  Fill Test Credentials
                </button>
                <p className="dev-info">
                  API: {API_ENDPOINT}
                  <br />
                  Status: <span className={`status-${connectionStatus}`}>{connectionStatus}</span>
                </p>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="login-form">
              
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
                    disabled={isLoading}
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
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
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
                    disabled={isLoading}
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
                disabled={isLoading || connectionStatus === 'error'}
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
            </form>

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