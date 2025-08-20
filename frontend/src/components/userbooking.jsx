import React, { useState, useEffect } from 'react';
import { 
  Calendar, User, Car, CreditCard, MapPin, Clock, Phone, Mail, 
  Plane, AlertCircle, CheckCircle, XCircle, RefreshCw, Trash2,
  Eye, Download, Filter, Search, Star, Shield, Navigation,
  ArrowLeft, Home, LogOut, Bell, Settings, Plus, Edit
} from 'lucide-react';
import './userbooking.css';

const UserBooking = () => {
  // API Configuration
  const API_BASE_URL = "https://parksy-backend.onrender.com";

  // State Management
  const [userBookings, setUserBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('view'); // 'view', 'cancel', 'delete'
  const [cancelReason, setCancelReason] = useState('');
  const [processingAction, setProcessingAction] = useState(false);
  const [authStatus, setAuthStatus] = useState({ isLoggedIn: false, user: null });

  // Airport mapping for better display
  const airportNames = {
    'LHR': 'London Heathrow',
    'LGW': 'London Gatwick', 
    'STN': 'London Stansted',
    'LTN': 'London Luton',
    'MAN': 'Manchester',
    'BHX': 'Birmingham',
    'EDI': 'Edinburgh',
    'GLA': 'Glasgow'
  };

  // FIXED: Enhanced Authentication functions with comprehensive token detection
  const getAuthToken = () => {
    try {
      // Check localStorage first (most common)
      const localStorageKeys = [
        'token', 'authToken', 'jwt', 'access_token', 
        'auth_token', 'userToken', 'accessToken',
        'parksy_token', 'user_token', 'Authorization'
      ];
      
      console.log('🔍 UserBooking: Checking localStorage for tokens...');
      for (const key of localStorageKeys) {
        const token = localStorage.getItem(key);
        if (token && token !== 'null' && token !== 'undefined' && token.length > 10) {
          console.log(`✅ UserBooking: Found valid token in localStorage[${key}]`, {
            length: token.length,
            isJWT: token.includes('.') && token.split('.').length === 3,
            preview: token.substring(0, 30) + '...'
          });
          return token;
        }
      }

      // Check sessionStorage
      const sessionStorageKeys = [
        'token', 'authToken', 'jwt', 'access_token',
        'auth_token', 'userToken', 'accessToken'
      ];
      
      console.log('🔍 UserBooking: Checking sessionStorage for tokens...');
      for (const key of sessionStorageKeys) {
        const token = sessionStorage.getItem(key);
        if (token && token !== 'null' && token !== 'undefined' && token.length > 10) {
          console.log(`✅ UserBooking: Found valid token in sessionStorage[${key}]`);
          return token;
        }
      }

      // Check cookies as fallback
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (['token', 'authToken', 'jwt', 'access_token'].includes(name) && value && value.length > 10) {
          console.log(`✅ UserBooking: Found token in cookie[${name}]`);
          return decodeURIComponent(value);
        }
      }

      console.log('❌ UserBooking: No valid authentication token found anywhere');
      
      // Debug: Log what's actually in storage
      console.log('📋 UserBooking: Current localStorage contents:');
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);
        console.log(`  ${key}: ${value ? (value.length > 50 ? value.substring(0, 50) + '...' : value) : 'null'}`);
      }

      return null;
    } catch (error) {
      console.error('❌ UserBooking: Error accessing browser storage:', error);
      return null;
    }
  };

  const getUserInfoFromToken = () => {
    const token = getAuthToken();
    if (!token) {
      console.log('❌ UserBooking: No token available for decoding');
      return null;
    }
    
    try {
      let payload;
      
      // Handle JWT format
      if (token.includes('.') && token.split('.').length === 3) {
        const parts = token.split('.');
        const base64Url = parts[1];
        
        if (!base64Url) {
          throw new Error('Invalid JWT format - no payload section');
        }
        
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        payload = JSON.parse(jsonPayload);
        console.log('✅ UserBooking: JWT token decoded successfully:', {
          id: payload.id || payload.user_id || payload.sub,
          email: payload.email,
          role: payload.role,
          exp: payload.exp ? new Date(payload.exp * 1000) : 'no expiry'
        });
      } else {
        // Try parsing as base64 encoded JSON (fallback)
        try {
          payload = JSON.parse(atob(token));
          console.log('✅ UserBooking: Base64 token decoded successfully');
        } catch (base64Error) {
          // Maybe it's already a JSON string?
          try {
            payload = JSON.parse(token);
            console.log('✅ UserBooking: JSON token parsed successfully');
          } catch (jsonError) {
            throw new Error('Token is not in JWT, Base64, or JSON format');
          }
        }
      }
      
      return payload;
    } catch (error) {
      console.error('❌ UserBooking: Error decoding token:', {
        message: error.message,
        tokenLength: token ? token.length : 0,
        tokenStart: token ? token.substring(0, 20) : 'none',
        hasDotsInToken: token ? token.includes('.') : false
      });
      return null;
    }
  };

  // Check authentication status with enhanced debugging
  useEffect(() => {
    const checkAuth = () => {
      console.log('🔐 UserBooking: Checking authentication status...');
      
      const token = getAuthToken();
      const userInfo = getUserInfoFromToken();
      
      console.log('🔐 UserBooking: Authentication check result:', {
        hasToken: !!token,
        hasUserInfo: !!userInfo,
        tokenLength: token ? token.length : 0,
        userEmail: userInfo?.email || 'none',
        userId: userInfo?.id || userInfo?.user_id || userInfo?.sub || 'none'
      });
      
      const isLoggedIn = !!(token && userInfo);
      
      setAuthStatus({
        isLoggedIn: isLoggedIn,
        user: userInfo
      });

      if (!isLoggedIn) {
        setError('Please log in to view your bookings. No valid authentication token found.');
        setLoading(false);
      }
    };

    checkAuth();
    
    // Listen for storage changes (login/logout in other tabs)
    const handleStorageChange = (e) => {
      console.log('💾 UserBooking: Storage changed:', e.key, 'New value exists:', !!e.newValue);
      if (e.key && ['token', 'authToken', 'jwt', 'access_token'].includes(e.key)) {
        checkAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // ENHANCED Fetch user's bookings with better debugging and error handling
  const fetchUserBookings = async () => {
    if (!authStatus.isLoggedIn) {
      console.log('❌ UserBookings: Cannot fetch bookings - user not logged in');
      return;
    }

    try {
      setLoading(true);
      setError(null); // Clear previous errors
      
      const authToken = getAuthToken();
      
      console.log('🚀 UserBookings: Starting fetchUserBookings with enhanced debug:', {
        tokenExists: !!authToken,
        tokenLength: authToken ? authToken.length : 0,
        isValidJWT: authToken ? (authToken.includes('.') && authToken.split('.').length === 3) : false,
        tokenPreview: authToken ? authToken.substring(0, 30) + '...' : 'none',
        userEmail: authStatus.user?.email,
        apiUrl: `${API_BASE_URL}/api/parking/my-bookings`
      });
      
      if (!authToken) {
        throw new Error('No authentication token found in storage');
      }

      console.log('🌐 UserBookings: Making API request...');

      const response = await fetch(`${API_BASE_URL}/api/parking/my-bookings`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          // Add additional headers for debugging
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'application/json'
        }
      });

      console.log('📡 UserBookings: API Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        let errorDetails = null;
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
          errorDetails = errorData;
          console.error('❌ UserBookings: API Error Details:', errorData);
        } catch (parseError) {
          console.error('❌ UserBookings: Could not parse error response:', parseError);
          try {
            const errorText = await response.text();
            console.error('❌ UserBookings: Error response text:', errorText);
            errorMessage = errorText || errorMessage;
          } catch (textError) {
            console.error('❌ UserBookings: Could not get error text:', textError);
          }
        }
        
        // Handle specific error cases
        if (response.status === 401) {
          // Clear potentially invalid tokens
          const keysToRemove = ['token', 'authToken', 'jwt', 'access_token', 'auth_token'];
          keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
          });
          
          setAuthStatus({ isLoggedIn: false, user: null });
          throw new Error('Your session has expired. Please log in again.');
        }
        
        if (response.status === 403) {
          throw new Error('Access denied. Please check your permissions.');
        }
        
        if (response.status === 404) {
          throw new Error('Bookings API endpoint not found. Please contact support.');
        }
        
        throw new Error(errorMessage);
      }

      // Parse successful response
      const data = await response.json();
      
      console.log('✅ UserBookings: API Response data:', {
        success: data.success,
        dataExists: !!data.data,
        dataType: Array.isArray(data.data) ? 'array' : typeof data.data,
        dataCount: Array.isArray(data.data) ? data.data.length : 'not array',
        message: data.message
      });
      
      if (data.success && data.data) {
        // Ensure data.data is an array
        const bookingsArray = Array.isArray(data.data) ? data.data : [];
        
        setUserBookings(bookingsArray);
        setFilteredBookings(bookingsArray);
        setError(null);
        
        console.log('✅ UserBookings: Bookings loaded successfully:', bookingsArray.length);
      } else {
        console.warn('⚠️ UserBookings: API returned success=false or no data:', data);
        throw new Error(data.message || 'No booking data received from server');
      }
    } catch (error) {
      console.error('❌ UserBookings: Complete error in fetchUserBookings:', {
        name: error.name,
        message: error.message,
        stack: error.stack?.substring(0, 300),
        authStatus: authStatus.isLoggedIn,
        hasToken: !!getAuthToken()
      });
      
      setError(`Failed to load bookings: ${error.message}`);
      
      // If it's an auth error, clear the bookings
      if (error.message.includes('session') || error.message.includes('token')) {
        setUserBookings([]);
        setFilteredBookings([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Cancel booking
  const cancelBooking = async (bookingReference, reason) => {
    try {
      setProcessingAction(true);
      const authToken = getAuthToken();

      if (!authToken) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${API_BASE_URL}/api/parking/bookings/${bookingReference}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ reason: reason || 'User cancellation' })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Cancellation failed');
      }

      const result = await response.json();
      
      if (result.success) {
        // Update local state
        setUserBookings(prevBookings => 
          prevBookings.map(booking => 
            booking.our_reference === bookingReference 
              ? { ...booking, status: 'cancelled' }
              : booking
          )
        );
        
        // Refresh data
        await fetchUserBookings();
        
        setShowModal(false);
        setSelectedBooking(null);
        setCancelReason('');
        
        alert('Your booking has been cancelled successfully! Any refund will be processed within 3-5 business days.');
      } else {
        throw new Error(result.message || 'Cancellation failed');
      }
    } catch (error) {
      console.error('❌ Error cancelling booking:', error);
      alert(`Failed to cancel booking: ${error.message}`);
    } finally {
      setProcessingAction(false);
    }
  };

  // Delete booking (only cancelled ones)
  const deleteBooking = async (bookingReference, reason) => {
    try {
      setProcessingAction(true);
      const authToken = getAuthToken();

      if (!authToken) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${API_BASE_URL}/api/parking/my-bookings/${bookingReference}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ reason: reason || 'User deletion' })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Deletion failed');
      }

      const result = await response.json();
      
      if (result.success) {
        // Remove from local state
        setUserBookings(prevBookings => 
          prevBookings.filter(booking => booking.our_reference !== bookingReference)
        );
        
        // Refresh data
        await fetchUserBookings();
        
        setShowModal(false);
        setSelectedBooking(null);
        setCancelReason('');
        
        alert('Booking deleted successfully!');
      } else {
        throw new Error(result.message || 'Deletion failed');
      }
    } catch (error) {
      console.error('❌ Error deleting booking:', error);
      alert(`Failed to delete booking: ${error.message}`);
    } finally {
      setProcessingAction(false);
    }
  };

  // Filter and search bookings
  useEffect(() => {
    let filtered = [...userBookings];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(booking =>
        booking.our_reference?.toLowerCase().includes(query) ||
        booking.magr_reference?.toLowerCase().includes(query) ||
        booking.product_name?.toLowerCase().includes(query) ||
        booking.vehicle_registration?.toLowerCase().includes(query) ||
        booking.airport_code?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }

    // Sort by date (most recent first)
    filtered.sort((a, b) => {
      if (sortBy === 'created_at') {
        return new Date(b.created_at) - new Date(a.created_at);
      } else if (sortBy === 'dropoff_date') {
        return new Date(b.dropoff_date) - new Date(a.dropoff_date);
      } else if (sortBy === 'booking_amount') {
        return (b.booking_amount || 0) - (a.booking_amount || 0);
      }
      return 0;
    });

    setFilteredBookings(filtered);
  }, [userBookings, searchQuery, statusFilter, sortBy]);

  // Load data on component mount with debugging
  useEffect(() => {
    console.log('🔄 UserBookings: useEffect triggered for data loading:', {
      isLoggedIn: authStatus.isLoggedIn,
      userEmail: authStatus.user?.email,
      userId: authStatus.user?.id || authStatus.user?.user_id
    });
    
    if (authStatus.isLoggedIn) {
      fetchUserBookings();
    }
  }, [authStatus.isLoggedIn]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount || 0);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format date only (no time)
  const formatDateOnly = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get status badge class
  const getStatusBadge = (status) => {
    const statusClasses = {
      'confirmed': 'ub-status-badge ub-confirmed',
      'cancelled': 'ub-status-badge ub-cancelled',
      'pending': 'ub-status-badge ub-pending',
      'refunded': 'ub-status-badge ub-refunded',
      'payment_failed': 'ub-status-badge ub-failed'
    };
    return statusClasses[status] || 'ub-status-badge ub-unknown';
  };

  // Get payment status badge
  const getPaymentStatusBadge = (paymentStatus) => {
    const statusClasses = {
      'paid': 'ub-payment-badge ub-paid',
      'refunded': 'ub-payment-badge ub-refunded',
      'failed': 'ub-payment-badge ub-failed',
      'pending': 'ub-payment-badge ub-pending',
      'partially_refunded': 'ub-payment-badge ub-partial'
    };
    return statusClasses[paymentStatus] || 'ub-payment-badge ub-unknown';
  };

  // Navigation functions
  const goToHome = () => {
    window.location.href = '/';
  };

  const goToNewBooking = () => {
    window.location.href = '/#/parking';
  };

  // Debug button to check token manually
  const debugToken = () => {
    console.log('🔧 UserBookings: Manual token debug triggered');
    const token = getAuthToken();
    const userInfo = getUserInfoFromToken();
    
    alert(`UserBookings Token Debug:
Token exists: ${!!token}
Token length: ${token ? token.length : 0}
Is JWT: ${token ? (token.includes('.') && token.split('.').length === 3) : false}
User info: ${userInfo ? JSON.stringify(userInfo, null, 2) : 'none'}
Auth status: ${authStatus.isLoggedIn}
`);
  };

  // If not logged in
  if (!authStatus.isLoggedIn) {
    return (
      <div className="ub-user-bookings">
        <div className="ub-auth-required">
          <div className="ub-auth-message">
            <AlertCircle size={64} />
            <h2>Authentication Required</h2>
            <p>Please log in to view your booking history</p>
            <div className="ub-auth-actions">
              <button className="ub-login-btn" onClick={() => window.location.href = '/#/login'}>
                <User size={16} />
                Go to Login
              </button>
              <button className="ub-home-btn" onClick={goToHome}>
                <Home size={16} />
                Back to Home
              </button>
            </div>
            {/* Debug section */}
            <div className="ub-debug-section">
              <button 
                onClick={debugToken}
                className="ub-debug-btn"
              >
                🔧 Debug Token
              </button>
              <small>Click to check authentication status</small>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="ub-user-bookings">
        <div className="ub-loading-container">
          <RefreshCw className="ub-loading-spinner" size={48} />
          <h2>Loading Your Bookings...</h2>
          <p>Fetching your travel history from secure servers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ub-user-bookings">
        <div className="ub-error-container">
          <AlertCircle size={48} />
          <h2>Unable to Load Bookings</h2>
          <p className="ub-error-message">{error}</p>
          <div className="ub-error-actions">
            <button className="ub-retry-btn" onClick={fetchUserBookings}>
              <RefreshCw size={16} />
              Try Again
            </button>
            <button className="ub-home-btn" onClick={goToHome}>
              <Home size={16} />
              Go Home
            </button>
            <button 
              onClick={debugToken}
              className="ub-debug-btn"
            >
              🔧 Debug
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ub-user-bookings">
      {/* Header */}
      <div className="ub-user-header">
        <div className="ub-header-content">
          <div className="ub-header-left">
            <button className="ub-back-btn" onClick={goToHome}>
              <ArrowLeft size={20} />
            </button>
            <div className="ub-header-title">
              <h1>My Bookings</h1>
              <p>Welcome back, {authStatus.user?.email || authStatus.user?.username || 'User'}!</p>
            </div>
          </div>
          <div className="ub-header-actions">
            <button className="ub-new-booking-btn" onClick={goToNewBooking}>
              <Plus size={16} />
              New Booking
            </button>
            <button className="ub-refresh-btn" onClick={fetchUserBookings} disabled={loading}>
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="ub-user-stats">
        <div className="ub-stat-item">
          <div className="ub-stat-number">{userBookings.length}</div>
          <div className="ub-stat-label">Total Bookings</div>
        </div>
        <div className="ub-stat-item">
          <div className="ub-stat-number">{userBookings.filter(b => b.status === 'confirmed').length}</div>
          <div className="ub-stat-label">Active</div>
        </div>
        <div className="ub-stat-item">
          <div className="ub-stat-number">{userBookings.filter(b => b.status === 'cancelled').length}</div>
          <div className="ub-stat-label">Cancelled</div>
        </div>
        <div className="ub-stat-item">
          <div className="ub-stat-number">
            {formatCurrency(userBookings.reduce((sum, booking) => sum + (booking.booking_amount || 0), 0))}
          </div>
          <div className="ub-stat-label">Total Spent</div>
        </div>
      </div>

      {/* Controls */}
      <div className="ub-booking-controls">
        <div className="ub-search-section">
          <div className="ub-search-input-container">
            <Search size={20} />
            <input
              type="text"
              placeholder="Search your bookings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ub-search-input"
            />
          </div>
        </div>

        <div className="ub-filter-section">
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="ub-filter-select"
          >
            <option value="all">All Bookings</option>
            <option value="confirmed">Active Bookings</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
          </select>

          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="ub-filter-select"
          >
            <option value="created_at">Recent First</option>
            <option value="dropoff_date">By Travel Date</option>
            <option value="booking_amount">By Amount</option>
          </select>
        </div>
      </div>

      {/* Bookings List */}
      <div className="ub-bookings-container">
        {filteredBookings.length === 0 ? (
          <div className="ub-no-bookings">
            <div className="ub-no-bookings-icon">
              <Plane size={64} />
            </div>
            <h3>No Bookings Found</h3>
            <p>
              {userBookings.length === 0 
                ? "You haven't made any bookings yet. Start your journey with us!"
                : "No bookings match your current search criteria."
              }
            </p>
            {userBookings.length === 0 && (
              <button className="ub-new-booking-btn ub-primary" onClick={goToNewBooking}>
                <Plus size={16} />
                Make Your First Booking
              </button>
            )}
          </div>
        ) : (
          <div className="ub-bookings-grid">
            {filteredBookings.map((booking) => (
              <div key={booking.id} className="ub-booking-card">
                <div className="ub-card-header">
                  <div className="ub-booking-reference">
                    <strong>#{booking.our_reference}</strong>
                    <span className={getStatusBadge(booking.status)}>
                      {booking.status}
                    </span>
                  </div>
                  <div className="ub-booking-actions">
                    <button
                      className="ub-action-btn ub-view"
                      onClick={() => {
                        setSelectedBooking(booking);
                        setModalType('view');
                        setShowModal(true);
                      }}
                      title="View Details"
                    >
                      <Eye size={14} />
                    </button>
                    {booking.can_cancel && booking.status === 'confirmed' && (
                      <button
                        className="ub-action-btn ub-cancel"
                        onClick={() => {
                          setSelectedBooking(booking);
                          setModalType('cancel');
                          setShowModal(true);
                        }}
                        title="Cancel Booking"
                      >
                        <XCircle size={14} />
                      </button>
                    )}
                    {booking.status === 'cancelled' && (
                      <button
                        className="ub-action-btn ub-delete"
                        onClick={() => {
                          setSelectedBooking(booking);
                          setModalType('delete');
                          setShowModal(true);
                        }}
                        title="Delete Booking"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="ub-card-content">
                  <div className="ub-service-info">
                    <div className="ub-service-header">
                      <h3>{booking.product_name || 'Airport Parking'}</h3>
                      <div className="ub-airport-info">
                        <Plane size={16} />
                        <span>{airportNames[booking.airport_code] || booking.airport_code}</span>
                      </div>
                    </div>
                    
                    <div className="ub-booking-details">
                      <div className="ub-detail-row">
                        <Calendar size={14} />
                        <span>Drop-off: {formatDateOnly(booking.dropoff_date)} at {booking.dropoff_time}</span>
                      </div>
                      <div className="ub-detail-row">
                        <Calendar size={14} />
                        <span>Pick-up: {formatDateOnly(booking.pickup_date)} at {booking.pickup_time}</span>
                      </div>
                      {booking.vehicle_registration && (
                        <div className="ub-detail-row">
                          <Car size={14} />
                          <span>{booking.vehicle_registration}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="ub-payment-info">
                    <div className="ub-amount">
                      {formatCurrency(booking.booking_amount)}
                    </div>
                    <div className="ub-payment-status">
                      <span className={getPaymentStatusBadge(booking.payment_status)}>
                        {booking.payment_status || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="ub-card-footer">
                  <div className="ub-booking-date">
                    <small>Booked on {formatDate(booking.created_at)}</small>
                  </div>
                  {booking.magr_reference && (
                    <div className="ub-provider-ref">
                      <small>Ref: {booking.magr_reference}</small>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && selectedBooking && (
        <div className="ub-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="ub-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="ub-modal-header">
              <h2>
                {modalType === 'view' && 'Booking Details'}
                {modalType === 'cancel' && 'Cancel Booking'}
                {modalType === 'delete' && 'Delete Booking'}
              </h2>
              <button 
                className="ub-modal-close-btn"
                onClick={() => setShowModal(false)}
              >
                <XCircle size={20} />
              </button>
            </div>

            <div className="ub-modal-body">
              {modalType === 'view' ? (
                <div className="ub-booking-details-modal">
                  {/* Booking Status */}
                  <div className="ub-detail-section">
                    <h3>Booking Status</h3>
                    <div className="ub-status-display">
                      <span className={getStatusBadge(selectedBooking.status)}>
                        {selectedBooking.status}
                      </span>
                      <span className={getPaymentStatusBadge(selectedBooking.payment_status)}>
                        Payment: {selectedBooking.payment_status || 'Unknown'}
                      </span>
                    </div>
                  </div>

                  {/* Service Information */}
                  <div className="ub-detail-section">
                    <h3>Service Information</h3>
                    <div className="ub-detail-grid">
                      <div className="ub-detail-item">
                        <label>Service</label>
                        <span>{selectedBooking.product_name}</span>
                      </div>
                      <div className="ub-detail-item">
                        <label>Airport</label>
                        <span>{airportNames[selectedBooking.airport_code] || selectedBooking.airport_code}</span>
                      </div>
                      <div className="ub-detail-item">
                        <label>Reference</label>
                        <span>{selectedBooking.our_reference}</span>
                      </div>
                      {selectedBooking.magr_reference && (
                        <div className="ub-detail-item">
                          <label>Provider Reference</label>
                          <span>{selectedBooking.magr_reference}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Travel Information */}
                  <div className="ub-detail-section">
                    <h3>Travel Information</h3>
                    <div className="ub-detail-grid">
                      <div className="ub-detail-item">
                        <label>Drop-off</label>
                        <span>{formatDateOnly(selectedBooking.dropoff_date)} at {selectedBooking.dropoff_time}</span>
                      </div>
                      <div className="ub-detail-item">
                        <label>Pick-up</label>
                        <span>{formatDateOnly(selectedBooking.pickup_date)} at {selectedBooking.pickup_time}</span>
                      </div>
                    </div>
                  </div>

                  {/* Vehicle Information */}
                  {selectedBooking.vehicle_registration && (
                    <div className="ub-detail-section">
                      <h3>Vehicle Information</h3>
                      <div className="ub-detail-grid">
                        <div className="ub-detail-item">
                          <label>Registration</label>
                          <span>{selectedBooking.vehicle_registration}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Payment Information */}
                  <div className="ub-detail-section">
                    <h3>Payment Information</h3>
                    <div className="ub-detail-grid">
                      <div className="ub-detail-item">
                        <label>Total Amount</label>
                        <span className="ub-amount-highlight">{formatCurrency(selectedBooking.booking_amount)}</span>
                      </div>
                      <div className="ub-detail-item">
                        <label>Payment Method</label>
                        <span>{selectedBooking.payment_method || 'Card Payment'}</span>
                      </div>
                      <div className="ub-detail-item">
                        <label>Currency</label>
                        <span>{selectedBooking.currency || 'GBP'}</span>
                      </div>
                      {selectedBooking.refund_amount > 0 && (
                        <div className="ub-detail-item">
                          <label>Refund Amount</label>
                          <span className="ub-refund-highlight">{formatCurrency(selectedBooking.refund_amount)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Booking Date */}
                  <div className="ub-detail-section">
                    <div className="ub-detail-item">
                      <label>Booking Created</label>
                      <span>{formatDate(selectedBooking.created_at)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="ub-action-form">
                  <div className="ub-warning-message">
                    <AlertCircle size={24} />
                    <div>
                      <h4>
                        {modalType === 'cancel' ? 'Cancel Your Booking' : 'Delete Booking Record'}
                      </h4>
                      <p>
                        {modalType === 'cancel' 
                          ? 'Cancelling your booking will process a refund according to the cancellation policy. This action cannot be undone.'
                          : 'This will permanently remove this booking from your history. Only cancelled bookings can be deleted.'
                        }
                      </p>
                    </div>
                  </div>

                  <div className="ub-form-group">
                    <label>Reason (Optional)</label>
                    <textarea
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder={`Why are you ${modalType === 'cancel' ? 'cancelling' : 'deleting'} this booking?`}
                      rows={3}
                      className="ub-reason-textarea"
                    />
                  </div>

                  <div className="ub-modal-actions">
                    <button 
                      className="ub-btn-secondary"
                      onClick={() => setShowModal(false)}
                      disabled={processingAction}
                    >
                      Keep Booking
                    </button>
                    <button 
                      className={`ub-btn-primary ${modalType === 'delete' ? 'ub-btn-danger' : 'ub-btn-warning'}`}
                      onClick={() => {
                        if (modalType === 'cancel') {
                          cancelBooking(selectedBooking.our_reference, cancelReason);
                        } else {
                          deleteBooking(selectedBooking.our_reference, cancelReason);
                        }
                      }}
                      disabled={processingAction}
                    >
                      {processingAction ? (
                        <>
                          <RefreshCw className="ub-spinning" size={16} />
                          Processing...
                        </>
                      ) : (
                        <>
                          {modalType === 'cancel' ? <XCircle size={16} /> : <Trash2 size={16} />}
                          {modalType === 'cancel' ? 'Cancel Booking' : 'Delete Record'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserBooking;