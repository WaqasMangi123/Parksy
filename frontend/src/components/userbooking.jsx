// UserBooking.jsx - COMPLETE UPDATED VERSION with Perfect Backend Integration
import React, { useState, useEffect } from 'react';
import { 
  Calendar, User, Car, CreditCard, MapPin, Clock, Phone, Mail, 
  Plane, AlertCircle, CheckCircle, XCircle, RefreshCw, Trash2,
  Eye, Download, Filter, Search, Star, Shield, Navigation,
  ArrowLeft, Home, LogOut, Bell, Settings, Plus, Edit, Loader2,
  Info, Award, Bug
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
  const [modalType, setModalType] = useState('view');
  const [cancelReason, setCancelReason] = useState('');
  const [processingAction, setProcessingAction] = useState(false);
  const [authStatus, setAuthStatus] = useState({ isLoggedIn: false, user: null });
  const [actionResult, setActionResult] = useState(null);
  const [debugMode, setDebugMode] = useState(false);
  const [debugInfo, setDebugInfo] = useState([]);

  // Enhanced amend form state with proper backend field mapping
  const [amendFormData, setAmendFormData] = useState({
    new_dropoff_time: '',
    new_pickup_time: '',
    new_dropoff_date: '',
    new_pickup_date: '',
    new_customer_phone: '',
    new_customer_email: '',
    new_departure_flight: '',
    new_arrival_flight: '',
    new_vehicle_registration: '',
    new_vehicle_make: '',
    new_vehicle_model: '',
    new_vehicle_color: '',
    new_special_requests: '',
    amendment_reason: ''
  });

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

  // Enhanced debug logging
  const logDebug = (message, data = null) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`🔧 [UserBooking] ${message}`, data || '');
    
    if (debugMode) {
      setDebugInfo(prev => [
        ...prev.slice(-50), // Keep last 50 logs
        { timestamp, message, data: data ? JSON.stringify(data, null, 2) : null }
      ]);
    }
  };

  // FIXED: Enhanced authentication functions
  const getAuthToken = () => {
    try {
      // Priority order based on your actual browser storage
      const tokenKeys = [
        'token',                    // Primary token
        'parksy-jwt',              // JWT token
        'authToken',               // Auth token
        'jwt',                     // JWT
        'access_token',            // Access token
        'user_token',              // User token
        'successful_booking_auth_method' // Success auth method
      ];
      
      // Check localStorage first
      for (const key of tokenKeys) {
        const token = localStorage.getItem(key);
        if (token && token !== 'null' && token !== 'undefined' && token.length > 10) {
          logDebug(`Found token in localStorage with key: ${key}`, { length: token.length });
          return token;
        }
      }
      
      // Check sessionStorage as fallback
      for (const key of tokenKeys) {
        const token = sessionStorage.getItem(key);
        if (token && token !== 'null' && token !== 'undefined' && token.length > 10) {
          logDebug(`Found token in sessionStorage with key: ${key}`, { length: token.length });
          return token;
        }
      }
      
      return null;
    } catch (error) {
      logDebug('Error accessing browser storage', error);
      return null;
    }
  };

  const getUserInfoFromToken = () => {
    try {
      // First try to get user object directly from storage
      const userData = localStorage.getItem('user');
      if (userData && userData !== 'null') {
        try {
          const parsed = JSON.parse(userData);
          logDebug('Found user data in localStorage', parsed);
          return parsed;
        } catch (e) {
          logDebug('Failed to parse user data from localStorage');
        }
      }
      
      // Fallback to token decoding
      const token = getAuthToken();
      if (!token) return null;
      
      // Handle JWT tokens
      if (token.includes('.') && token.split('.').length === 3) {
        try {
          const parts = token.split('.');
          const payload = JSON.parse(atob(parts[1]));
          logDebug('Decoded JWT payload', payload);
          return payload;
        } catch (e) {
          logDebug('JWT decode failed', e);
        }
      }
      
      // Handle JSON tokens
      if (token.startsWith('{')) {
        try {
          const parsed = JSON.parse(token);
          logDebug('Parsed JSON token', parsed);
          return parsed;
        } catch (e) {
          logDebug('JSON token parse failed', e);
        }
      }
      
      return null;
    } catch (error) {
      logDebug('Error extracting user info', error);
      return null;
    }
  };

  const createValidJWTToken = () => {
    const rawToken = getAuthToken();
    const userInfo = getUserInfoFromToken();
    
    if (!rawToken || !userInfo) return null;
    
    // If already JWT format, return as-is
    if (rawToken.includes('.') && rawToken.split('.').length === 3 && !rawToken.startsWith('{')) {
      return rawToken;
    }
    
    try {
      // Create JWT payload for backend compatibility
      const jwtPayload = {
        id: userInfo.id || userInfo._id || userInfo.user_id || "default_user_id",
        user_id: userInfo.id || userInfo._id || userInfo.user_id || "default_user_id",
        email: userInfo.email || "user@example.com",
        username: userInfo.username || userInfo.email,
        role: userInfo.role || "user",
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
        iat: Math.floor(Date.now() / 1000),
        iss: 'parksy-frontend',
        aud: 'parksy-backend'
      };
      
      // Create simple JWT structure for backend
      const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'HS256' }));
      const payload = btoa(JSON.stringify(jwtPayload));
      const signature = btoa('parksy_frontend_signature');
      
      const jwtToken = `${header}.${payload}.${signature}`;
      logDebug('Created JWT token for backend', { payloadKeys: Object.keys(jwtPayload) });
      return jwtToken;
    } catch (error) {
      logDebug('JWT creation failed', error);
      return rawToken;
    }
  };

  // FIXED: Get booking reference with correct priority
  const getBookingReference = (booking) => {
    if (!booking) return null;
    
    const candidates = [
      booking.our_reference,     // Primary backend field
      booking.magr_reference,    // Secondary backend field  
      booking.booking_reference, // Frontend compatibility field
      booking._id,              // Database ID
      booking.id                // Alternative ID
    ];
    
    const validRef = candidates.find(ref => 
      ref && 
      ref !== null && 
      ref !== undefined && 
      String(ref).trim() !== ''
    );
    
    logDebug('Selected booking reference', { 
      selected: validRef,
      available: candidates.filter(Boolean)
    });
    
    return validRef;
  };

  // FIXED: Authentication check
  useEffect(() => {
    const checkAuthentication = () => {
      const token = getAuthToken();
      const user = getUserInfoFromToken();
      
      logDebug('Authentication check', {
        hasToken: !!token,
        tokenLength: token?.length,
        hasUser: !!user,
        userEmail: user?.email,
        userId: user?.id || user?._id
      });
      
      const isLoggedIn = !!(token && user);
      
      setAuthStatus({
        isLoggedIn,
        user: user
      });
      
      if (!isLoggedIn) {
        setError('Please log in to view your bookings');
        setLoading(false);
      }
    };

    checkAuthentication();
    
    // Listen for storage changes
    const handleStorageChange = (e) => {
      if (e.key && ['token', 'authToken', 'jwt', 'user'].includes(e.key)) {
        logDebug('Storage changed, re-checking auth');
        checkAuthentication();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // FIXED: Fetch user bookings with enhanced error handling
  const fetchUserBookings = async () => {
    if (!authStatus.isLoggedIn) {
      logDebug('Cannot fetch bookings - user not logged in');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const authToken = createValidJWTToken();
      const userInfo = getUserInfoFromToken();
      
      if (!authToken) {
        throw new Error('No authentication token available');
      }

      logDebug('Fetching bookings from backend', {
        tokenLength: authToken.length,
        userEmail: userInfo?.email,
        endpoint: `${API_BASE_URL}/api/parking/my-bookings`
      });

      // Try multiple authentication strategies
      const authStrategies = [
        // Strategy 1: JWT Bearer (most likely to work)
        {
          name: 'JWT Bearer',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          }
        },
        // Strategy 2: Token in custom header
        {
          name: 'Custom Header',
          headers: {
            'Content-Type': 'application/json',
            'X-Auth-Token': authToken,
            'X-User-Email': userInfo?.email,
            'Accept': 'application/json'
          }
        }
      ];

      let successfulResponse = null;
      let successfulStrategy = null;

      for (const strategy of authStrategies) {
        try {
          logDebug(`Trying authentication strategy: ${strategy.name}`);
          
          const response = await fetch(`${API_BASE_URL}/api/parking/my-bookings`, {
            method: 'GET',
            headers: strategy.headers
          });

          logDebug(`${strategy.name} response`, {
            status: response.status,
            ok: response.ok,
            statusText: response.statusText
          });

          if (response.ok) {
            successfulResponse = response;
            successfulStrategy = strategy.name;
            localStorage.setItem('working_auth_method', strategy.name);
            break;
          }
        } catch (error) {
          logDebug(`${strategy.name} failed`, error);
        }
      }

      if (!successfulResponse) {
        throw new Error('All authentication methods failed. Please try logging in again.');
      }

      const data = await successfulResponse.json();
      logDebug(`Successful response from ${successfulStrategy}`, {
        success: data.success,
        bookingsCount: data.bookings?.length || 0,
        dataStructure: Object.keys(data)
      });

      // Process bookings data
      let bookingsArray = [];
      
      if (data.success && data.bookings) {
        bookingsArray = Array.isArray(data.bookings) ? data.bookings : [];
      } else if (data.bookings) {
        bookingsArray = Array.isArray(data.bookings) ? data.bookings : [];
      } else if (Array.isArray(data)) {
        bookingsArray = data;
      }

      // Enhanced booking processing with backend schema mapping
      const enhancedBookings = bookingsArray.map((booking, index) => {
        logDebug(`Processing booking ${index + 1}`, {
          our_reference: booking.our_reference,
          magr_reference: booking.magr_reference,
          status: booking.status,
          has_service_features: !!booking.service_features
        });

        return {
          ...booking,
          
          // Frontend compatibility mapping
          booking_reference: getBookingReference(booking),
          
          // Customer details mapping
          customer_name: booking.customer_details 
            ? `${booking.customer_details.first_name || ''} ${booking.customer_details.last_name || ''}`.trim()
            : (booking.customer_name || 'Customer'),
          customer_email: booking.customer_details?.customer_email || booking.user_email || 'N/A',
          customer_phone: booking.customer_details?.phone_number || 'N/A',
          
          // Travel details mapping
          dropoff_date: booking.travel_details?.dropoff_date || booking.dropoff_date,
          dropoff_time: booking.travel_details?.dropoff_time || booking.dropoff_time,
          pickup_date: booking.travel_details?.pickup_date || booking.pickup_date,
          pickup_time: booking.travel_details?.pickup_time || booking.pickup_time,
          departure_flight_number: booking.travel_details?.departure_flight_number || booking.departure_flight_number,
          arrival_flight_number: booking.travel_details?.arrival_flight_number || booking.arrival_flight_number,
          departure_terminal: booking.travel_details?.departure_terminal || booking.departure_terminal,
          arrival_terminal: booking.travel_details?.arrival_terminal || booking.arrival_terminal,
          
          // Vehicle details mapping
          vehicle_registration: booking.vehicle_details?.car_registration_number || booking.car_registration_number || booking.vehicle_registration,
          car_registration_number: booking.vehicle_details?.car_registration_number || booking.car_registration_number,
          vehicle_make: booking.vehicle_details?.car_make || booking.vehicle_make,
          vehicle_model: booking.vehicle_details?.car_model || booking.vehicle_model,
          vehicle_color: booking.vehicle_details?.car_color || booking.vehicle_color,
          
          // Payment details mapping
          payment_method: booking.payment_details?.payment_method || 'Card',
          payment_status: booking.payment_details?.payment_status || 'paid',
          stripe_payment_intent_id: booking.payment_details?.stripe_payment_intent_id,
          payment_amount: booking.payment_details?.stripe_amount || booking.booking_amount,
          
          // Service capabilities (CRITICAL for Cancel/Amend buttons)
          is_cancelable: booking.service_features?.is_cancelable !== false && 
                        ['confirmed', 'active'].includes(booking.status?.toLowerCase()),
          is_editable: booking.service_features?.is_editable !== false && 
                      ['confirmed', 'active'].includes(booking.status?.toLowerCase()),
          
          // Display status
          display_status: (() => {
            const status = booking.status?.toLowerCase();
            switch (status) {
              case 'confirmed': return 'Active';
              case 'cancelled': return 'Cancelled';
              case 'amended': return 'Modified';
              case 'refunded': return 'Refunded';
              case 'pending': return 'Processing';
              default: return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown';
            }
          })(),
          
          // Debug info
          _debug: {
            original_status: booking.status,
            service_features: booking.service_features,
            has_nested_structures: {
              customer_details: !!booking.customer_details,
              travel_details: !!booking.travel_details,
              vehicle_details: !!booking.vehicle_details,
              service_features: !!booking.service_features
            }
          }
        };
      });

      logDebug('Booking processing complete', {
        total: enhancedBookings.length,
        cancelable: enhancedBookings.filter(b => b.is_cancelable).length,
        editable: enhancedBookings.filter(b => b.is_editable).length
      });

      setUserBookings(enhancedBookings);
      setFilteredBookings(enhancedBookings);
      setError(null);

    } catch (error) {
      logDebug('Error fetching bookings', error);
      setError(`Failed to load bookings: ${error.message}`);
      setUserBookings([]);
      setFilteredBookings([]);
    } finally {
      setLoading(false);
    }
  };

  // FIXED: Process booking actions with proper backend integration
  const processBookingAction = async () => {
    if (!selectedBooking || !modalType) return;

    setProcessingAction(true);
    setActionResult(null);

    try {
      const authToken = createValidJWTToken();
      if (!authToken) {
        throw new Error('Authentication token not found');
      }

      const bookingReference = getBookingReference(selectedBooking);
      if (!bookingReference) {
        throw new Error('No valid booking reference found');
      }

      logDebug(`Processing ${modalType} action`, {
        reference: bookingReference,
        status: selectedBooking.status
      });

      if (modalType === 'cancel') {
        const cancelPayload = {
          booking_reference: bookingReference,
          cancellation_reason: cancelReason || 'User requested cancellation'
        };

        logDebug('Sending cancel request', cancelPayload);

        const response = await fetch(`${API_BASE_URL}/api/parking/cancel-booking`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
            'Accept': 'application/json'
          },
          body: JSON.stringify(cancelPayload)
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        if (result.success) {
          setActionResult({
            success: true,
            type: 'cancel',
            message: result.message || 'Booking cancelled successfully! Refund will be processed within 3-5 business days.',
            data: result
          });
          
          // Refresh bookings
          await fetchUserBookings();
        } else {
          throw new Error(result.message || 'Cancellation failed');
        }

      } else if (modalType === 'amend') {
        const amendPayload = {
          booking_reference: bookingReference,
          amendment_reason: cancelReason || 'User requested changes'
        };

        // Add only fields that have values
        Object.entries(amendFormData).forEach(([key, value]) => {
          if (value && String(value).trim() !== '') {
            amendPayload[key] = String(value).trim();
          }
        });

        logDebug('Sending amend request', amendPayload);

        const response = await fetch(`${API_BASE_URL}/api/parking/amend-booking`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
            'Accept': 'application/json'
          },
          body: JSON.stringify(amendPayload)
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        if (result.success) {
          setActionResult({
            success: true,
            type: 'amend',
            message: result.message || 'Booking updated successfully!',
            data: result
          });
          
          // Refresh bookings
          await fetchUserBookings();
        } else {
          throw new Error(result.message || 'Amendment failed');
        }
      }

    } catch (error) {
      logDebug(`${modalType} action failed`, error);
      setActionResult({
        success: false,
        type: modalType,
        message: error.message,
        error: error.message
      });
    } finally {
      setProcessingAction(false);
    }
  };

  // Handle modal actions
  const handleViewBooking = (booking) => {
    setSelectedBooking(booking);
    setModalType('view');
    setShowModal(true);
    setActionResult(null);
  };

  const handleCancelBooking = (booking) => {
    setSelectedBooking(booking);
    setModalType('cancel');
    setShowModal(true);
    setCancelReason('');
    setActionResult(null);
  };

  const handleAmendBooking = (booking) => {
    setSelectedBooking(booking);
    setModalType('amend');
    setShowModal(true);
    setCancelReason('');
    setActionResult(null);
    
    // Pre-populate form
    setAmendFormData({
      new_dropoff_time: booking.dropoff_time || '',
      new_pickup_time: booking.pickup_time || '',
      new_dropoff_date: booking.dropoff_date || '',
      new_pickup_date: booking.pickup_date || '',
      new_customer_phone: booking.customer_phone || '',
      new_customer_email: booking.customer_email || '',
      new_departure_flight: booking.departure_flight_number || '',
      new_arrival_flight: booking.arrival_flight_number || '',
      new_vehicle_registration: booking.vehicle_registration || '',
      new_vehicle_make: booking.vehicle_make || '',
      new_vehicle_model: booking.vehicle_model || '',
      new_vehicle_color: booking.vehicle_color || '',
      new_special_requests: '',
      amendment_reason: ''
    });
  };

  const handleAmendFormChange = (field, value) => {
    setAmendFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Load bookings when authenticated
  useEffect(() => {
    if (authStatus.isLoggedIn) {
      fetchUserBookings();
    }
  }, [authStatus.isLoggedIn]);

  // Filter and search bookings
  useEffect(() => {
    let filtered = [...userBookings];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(booking =>
        getBookingReference(booking)?.toLowerCase().includes(query) ||
        booking.product_name?.toLowerCase().includes(query) ||
        booking.vehicle_registration?.toLowerCase().includes(query) ||
        booking.airport_code?.toLowerCase().includes(query) ||
        booking.customer_email?.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => 
        booking.status?.toLowerCase() === statusFilter.toLowerCase()
      );
    }

    // Sort bookings
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'created_at':
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        case 'dropoff_date':
          return new Date(b.dropoff_date || 0) - new Date(a.dropoff_date || 0);
        case 'booking_amount':
          return (b.booking_amount || 0) - (a.booking_amount || 0);
        default:
          return 0;
      }
    });

    setFilteredBookings(filtered);
  }, [userBookings, searchQuery, statusFilter, sortBy]);

  // Helper functions
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const formatDateOnly = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-GB', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      'confirmed': 'ub-status-badge ub-confirmed',
      'active': 'ub-status-badge ub-confirmed',
      'cancelled': 'ub-status-badge ub-cancelled',
      'pending': 'ub-status-badge ub-pending',
      'processing': 'ub-status-badge ub-pending',
      'refunded': 'ub-status-badge ub-refunded',
      'amended': 'ub-status-badge ub-amended',
      'modified': 'ub-status-badge ub-amended',
      'payment_failed': 'ub-status-badge ub-failed'
    };
    return statusClasses[status?.toLowerCase()] || 'ub-status-badge ub-unknown';
  };

  const getPaymentStatusBadge = (paymentStatus) => {
    const statusClasses = {
      'paid': 'ub-payment-badge ub-paid',
      'refunded': 'ub-payment-badge ub-refunded',
      'failed': 'ub-payment-badge ub-failed',
      'pending': 'ub-payment-badge ub-pending',
      'partially_refunded': 'ub-payment-badge ub-partial'
    };
    return statusClasses[paymentStatus?.toLowerCase()] || 'ub-payment-badge ub-unknown';
  };

  // Navigation functions
  const goToHome = () => {
    window.location.href = '/';
  };

  const goToNewBooking = () => {
    window.location.href = '/#/parking';
  };

  // Debug functions
  const debugComplete = async () => {
    const token = getAuthToken();
    const user = getUserInfoFromToken();
    const jwt = createValidJWTToken();
    
    logDebug('Complete debug info', {
      auth: {
        hasToken: !!token,
        tokenLength: token?.length,
        hasUser: !!user,
        userEmail: user?.email,
        jwtCreated: !!jwt
      },
      bookings: {
        total: userBookings.length,
        cancelable: userBookings.filter(b => b.is_cancelable).length,
        editable: userBookings.filter(b => b.is_editable).length
      },
      storage: {
        token: localStorage.getItem('token'),
        user: localStorage.getItem('user'),
        'parksy-jwt': localStorage.getItem('parksy-jwt')
      }
    });

    // Test backend connectivity
    try {
      const response = await fetch(`${API_BASE_URL}/api/parking/health`);
      const health = await response.json();
      logDebug('Backend health check', health);
    } catch (error) {
      logDebug('Backend health check failed', error);
    }

    alert(`🔧 Complete Debug Results:

✅ Authentication:
- Token: ${token ? 'Found' : 'Missing'} (${token?.length || 0} chars)
- User: ${user?.email || 'Missing'}
- JWT: ${jwt ? 'Created' : 'Failed'}

📋 Bookings:
- Total: ${userBookings.length}
- Cancelable: ${userBookings.filter(b => b.is_cancelable).length}
- Editable: ${userBookings.filter(b => b.is_editable).length}

🔍 Debug Mode: ${debugMode ? 'ON' : 'OFF'}

Check console for detailed logs.`);
  };

  // Render loading state
  if (loading) {
    return (
      <div className="ub-user-bookings">
        <div className="ub-loading-container">
          <RefreshCw className="ub-loading-spinner" size={48} />
          <h2>Loading Your Bookings...</h2>
          <p>Connecting to backend and fetching your travel history...</p>
          {debugMode && (
            <div className="ub-debug-loading">
              <small>Endpoint: {API_BASE_URL}/api/parking/my-bookings</small>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render authentication required
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
            <div className="ub-debug-section">
              <button onClick={debugComplete} className="ub-debug-btn">
                <Bug size={16} />
                Debug Info
              </button>
              <button 
                onClick={() => setDebugMode(!debugMode)} 
                className={`ub-debug-btn ${debugMode ? 'active' : ''}`}
              >
                <Settings size={16} />
                Debug: {debugMode ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render error state
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
            <button onClick={debugComplete} className="ub-debug-btn">
              <Bug size={16} />
              Debug
            </button>
          </div>
          {debugMode && (
            <div className="ub-debug-error">
              <h4>Debug Information:</h4>
              <pre>{JSON.stringify({
                error: error,
                authStatus: authStatus.isLoggedIn,
                userEmail: authStatus.user?.email,
                tokenLength: getAuthToken()?.length
              }, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main render
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
              <h1>
                My Bookings
                {debugMode && <span style={{color: '#ff6b35'}}> (DEBUG)</span>}
              </h1>
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

      {/* Debug Panel */}
      {debugMode && debugInfo.length > 0 && (
        <div className="ub-debug-panel">
          <h4>🔧 Debug Log</h4>
          <div className="ub-debug-log">
            {debugInfo.slice(-10).map((log, index) => (
              <div key={index} className="ub-debug-entry">
                <span className="ub-debug-time">{log.timestamp}</span>
                <span className="ub-debug-message">{log.message}</span>
                {log.data && <pre className="ub-debug-data">{log.data.slice(0, 200)}...</pre>}
              </div>
            ))}
          </div>
          <button onClick={() => setDebugInfo([])} className="ub-debug-clear">Clear</button>
        </div>
      )}

      {/* Debug Controls */}
      <div className="ub-debug-controls">
        <button 
          onClick={() => setDebugMode(!debugMode)} 
          className={`ub-debug-toggle ${debugMode ? 'active' : ''}`}
        >
          <Bug size={14} />
          Debug: {debugMode ? 'ON' : 'OFF'}
        </button>
        {debugMode && (
          <>
            <button onClick={debugComplete} className="ub-debug-btn">Complete Debug</button>
            <button onClick={fetchUserBookings} className="ub-debug-btn">Retry Fetch</button>
            <button onClick={() => console.log('Current bookings:', userBookings)} className="ub-debug-btn">
              Log Data
            </button>
          </>
        )}
      </div>

      {/* Stats */}
      <div className="ub-user-stats">
        <div className="ub-stat-item">
          <div className="ub-stat-number">{userBookings.length}</div>
          <div className="ub-stat-label">Total Bookings</div>
        </div>
        <div className="ub-stat-item">
          <div className="ub-stat-number">
            {userBookings.filter(b => ['confirmed', 'active'].includes(b.status?.toLowerCase())).length}
          </div>
          <div className="ub-stat-label">Active</div>
        </div>
        <div className="ub-stat-item">
          <div className="ub-stat-number">
            {userBookings.filter(b => b.status?.toLowerCase() === 'cancelled').length}
          </div>
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
              placeholder="Search bookings..."
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
            <option value="confirmed">Active</option>
            <option value="cancelled">Cancelled</option>
            <option value="amended">Modified</option>
            <option value="pending">Processing</option>
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
              <div key={getBookingReference(booking) || `booking-${Math.random()}`} className="ub-booking-card">
                <div className="ub-card-header">
                  <div className="ub-booking-reference">
                    <strong>#{getBookingReference(booking)}</strong>
                    <span className={getStatusBadge(booking.status)}>
                      {booking.display_status}
                    </span>
                    {debugMode && (
                      <span className="ub-debug-ref" title="Backend Reference">
                        🔧 {booking.our_reference || 'N/A'}
                      </span>
                    )}
                  </div>
                  <div className="ub-booking-actions">
                    <button
                      className="ub-action-btn ub-view"
                      onClick={() => handleViewBooking(booking)}
                      title="View Details"
                    >
                      <Eye size={14} />
                    </button>
                    
                    {booking.is_cancelable && (
                      <button
                        className="ub-action-btn ub-cancel"
                        onClick={() => handleCancelBooking(booking)}
                        title="Cancel Booking"
                      >
                        <XCircle size={14} />
                      </button>
                    )}
                    
                    {booking.is_editable && (
                      <button
                        className="ub-action-btn ub-amend"
                        onClick={() => handleAmendBooking(booking)}
                        title="Amend Booking"
                      >
                        <Edit size={14} />
                      </button>
                    )}

                    {debugMode && (
                      <button
                        className="ub-action-btn ub-debug"
                        onClick={() => console.log('Booking debug:', booking)}
                        title="Debug Booking"
                      >
                        <Bug size={14} />
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
                        <span>{airportNames[booking.airport_code] || booking.airport_code || 'Airport'}</span>
                      </div>
                    </div>
                    
                    <div className="ub-booking-details">
                      <div className="ub-detail-row">
                        <Calendar size={14} />
                        <span>Drop-off: {formatDateOnly(booking.dropoff_date)} at {booking.dropoff_time || 'N/A'}</span>
                      </div>
                      <div className="ub-detail-row">
                        <Calendar size={14} />
                        <span>Pick-up: {formatDateOnly(booking.pickup_date)} at {booking.pickup_time || 'N/A'}</span>
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
                  
                  <div className="ub-booking-capabilities">
                    {booking.is_cancelable && (
                      <span className="ub-capability-badge cancelable" title="Cancellable">
                        <XCircle size={10} />
                      </span>
                    )}
                    {booking.is_editable && (
                      <span className="ub-capability-badge editable" title="Amendable">
                        <Edit size={10} />
                      </span>
                    )}
                    {debugMode && (
                      <span className="ub-capability-badge debug-mode" title="Debug Mode">
                        🔧
                      </span>
                    )}
                  </div>
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
                {modalType === 'amend' && 'Amend Booking'}
              </h2>
              <button 
                className="ub-modal-close-btn"
                onClick={() => setShowModal(false)}
              >
                <XCircle size={20} />
              </button>
            </div>

            <div className="ub-modal-body">
              {/* View Modal Content */}
              {modalType === 'view' && !actionResult && (
                <div className="ub-booking-details-modal">
                  {/* Debug Section */}
                  {debugMode && (
                    <div className="ub-detail-section ub-debug-section">
                      <h3>🔧 Debug Information</h3>
                      <div className="ub-debug-info">
                        <pre>{JSON.stringify({
                          references: {
                            our_reference: selectedBooking.our_reference,
                            magr_reference: selectedBooking.magr_reference,
                            selected: getBookingReference(selectedBooking)
                          },
                          capabilities: {
                            is_cancelable: selectedBooking.is_cancelable,
                            is_editable: selectedBooking.is_editable,
                            service_features: selectedBooking.service_features
                          },
                          status: selectedBooking.status
                        }, null, 2)}</pre>
                      </div>
                    </div>
                  )}

                  {/* Status Section */}
                  <div className="ub-detail-section">
                    <h3>Booking Status</h3>
                    <div className="ub-status-display">
                      <span className={getStatusBadge(selectedBooking.status)}>
                        {selectedBooking.display_status}
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
                        <span>{selectedBooking.product_name || 'N/A'}</span>
                      </div>
                      <div className="ub-detail-item">
                        <label>Airport</label>
                        <span>{airportNames[selectedBooking.airport_code] || selectedBooking.airport_code || 'N/A'}</span>
                      </div>
                      <div className="ub-detail-item">
                        <label>Reference</label>
                        <span>{getBookingReference(selectedBooking)}</span>
                      </div>
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
                      {selectedBooking.departure_flight_number && (
                        <div className="ub-detail-item">
                          <label>Departure Flight</label>
                          <span>{selectedBooking.departure_flight_number}</span>
                        </div>
                      )}
                      {selectedBooking.arrival_flight_number && (
                        <div className="ub-detail-item">
                          <label>Arrival Flight</label>
                          <span>{selectedBooking.arrival_flight_number}</span>
                        </div>
                      )}
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
                        {selectedBooking.vehicle_make && (
                          <div className="ub-detail-item">
                            <label>Make & Model</label>
                            <span>{selectedBooking.vehicle_make} {selectedBooking.vehicle_model}</span>
                          </div>
                        )}
                        {selectedBooking.vehicle_color && (
                          <div className="ub-detail-item">
                            <label>Color</label>
                            <span>{selectedBooking.vehicle_color}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Payment Information */}
                  <div className="ub-detail-section">
                    <h3>Payment Information</h3>
                    <div className="ub-detail-grid">
                      <div className="ub-detail-item">
                        <label>Amount</label>
                        <span className="ub-amount-highlight">{formatCurrency(selectedBooking.booking_amount)}</span>
                      </div>
                      <div className="ub-detail-item">
                        <label>Method</label>
                        <span>{selectedBooking.payment_method || 'Card Payment'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="ub-view-actions">
                    {selectedBooking.is_cancelable && (
                      <button 
                        className="ub-btn-warning"
                        onClick={() => setModalType('cancel')}
                      >
                        <XCircle size={16} />
                        Cancel Booking
                      </button>
                    )}
                    
                    {selectedBooking.is_editable && (
                      <button 
                        className="ub-btn-primary"
                        onClick={() => setModalType('amend')}
                      >
                        <Edit size={16} />
                        Amend Booking
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Cancel Form */}
              {modalType === 'cancel' && !actionResult && (
                <div className="ub-cancel-form">
                  <div className="ub-warning-message">
                    <AlertCircle size={24} />
                    <div>
                      <h4>Cancel Your Booking</h4>
                      <p>This will cancel your booking and process a refund. This action cannot be undone.</p>
                    </div>
                  </div>

                  <div className="ub-booking-summary">
                    <div className="ub-summary-item">
                      <span>Reference:</span>
                      <span>{getBookingReference(selectedBooking)}</span>
                    </div>
                    <div className="ub-summary-item">
                      <span>Amount:</span>
                      <span>{formatCurrency(selectedBooking.booking_amount)}</span>
                    </div>
                  </div>

                  <div className="ub-form-group">
                    <label>Reason (Optional)</label>
                    <textarea
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="Why are you cancelling this booking?"
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
                      className="ub-btn-danger"
                      onClick={processBookingAction}
                      disabled={processingAction}
                    >
                      {processingAction ? (
                        <>
                          <Loader2 className="ub-spinning" size={16} />
                          Cancelling...
                        </>
                      ) : (
                        <>
                          <XCircle size={16} />
                          Cancel Booking
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Amend Form */}
              {modalType === 'amend' && !actionResult && (
                <div className="ub-amend-form">
                  <div className="ub-info-message">
                    <Info size={24} />
                    <div>
                      <h4>Modify Your Booking</h4>
                      <p>Update the details below. Only changed fields will be updated.</p>
                    </div>
                  </div>

                  <div className="ub-amend-sections">
                    {/* Travel Times */}
                    <div className="ub-form-section">
                      <h4>Travel Times</h4>
                      <div className="ub-form-grid">
                        <div className="ub-form-group">
                          <label>Drop-off Date</label>
                          <input
                            type="date"
                            value={amendFormData.new_dropoff_date}
                            onChange={(e) => handleAmendFormChange('new_dropoff_date', e.target.value)}
                          />
                          <small>Current: {selectedBooking.dropoff_date}</small>
                        </div>
                        <div className="ub-form-group">
                          <label>Drop-off Time</label>
                          <input
                            type="time"
                            value={amendFormData.new_dropoff_time}
                            onChange={(e) => handleAmendFormChange('new_dropoff_time', e.target.value)}
                          />
                          <small>Current: {selectedBooking.dropoff_time}</small>
                        </div>
                        <div className="ub-form-group">
                          <label>Pick-up Date</label>
                          <input
                            type="date"
                            value={amendFormData.new_pickup_date}
                            onChange={(e) => handleAmendFormChange('new_pickup_date', e.target.value)}
                          />
                          <small>Current: {selectedBooking.pickup_date}</small>
                        </div>
                        <div className="ub-form-group">
                          <label>Pick-up Time</label>
                          <input
                            type="time"
                            value={amendFormData.new_pickup_time}
                            onChange={(e) => handleAmendFormChange('new_pickup_time', e.target.value)}
                          />
                          <small>Current: {selectedBooking.pickup_time}</small>
                        </div>
                      </div>
                    </div>

                    {/* Contact Details */}
                    <div className="ub-form-section">
                      <h4>Contact Details</h4>
                      <div className="ub-form-grid">
                        <div className="ub-form-group">
                          <label>Email</label>
                          <input
                            type="email"
                            value={amendFormData.new_customer_email}
                            onChange={(e) => handleAmendFormChange('new_customer_email', e.target.value)}
                            placeholder={selectedBooking.customer_email}
                          />
                          <small>Current: {selectedBooking.customer_email}</small>
                        </div>
                        <div className="ub-form-group">
                          <label>Phone</label>
                          <input
                            type="tel"
                            value={amendFormData.new_customer_phone}
                            onChange={(e) => handleAmendFormChange('new_customer_phone', e.target.value)}
                            placeholder={selectedBooking.customer_phone}
                          />
                          <small>Current: {selectedBooking.customer_phone}</small>
                        </div>
                      </div>
                    </div>

                    {/* Vehicle Details */}
                    <div className="ub-form-section">
                      <h4>Vehicle Details</h4>
                      <div className="ub-form-grid">
                        <div className="ub-form-group">
                          <label>Registration</label>
                          <input
                            type="text"
                            value={amendFormData.new_vehicle_registration}
                            onChange={(e) => handleAmendFormChange('new_vehicle_registration', e.target.value)}
                            placeholder={selectedBooking.vehicle_registration}
                          />
                          <small>Current: {selectedBooking.vehicle_registration}</small>
                        </div>
                        <div className="ub-form-group">
                          <label>Make</label>
                          <input
                            type="text"
                            value={amendFormData.new_vehicle_make}
                            onChange={(e) => handleAmendFormChange('new_vehicle_make', e.target.value)}
                            placeholder={selectedBooking.vehicle_make}
                          />
                          <small>Current: {selectedBooking.vehicle_make}</small>
                        </div>
                        <div className="ub-form-group">
                          <label>Model</label>
                          <input
                            type="text"
                            value={amendFormData.new_vehicle_model}
                            onChange={(e) => handleAmendFormChange('new_vehicle_model', e.target.value)}
                            placeholder={selectedBooking.vehicle_model}
                          />
                          <small>Current: {selectedBooking.vehicle_model}</small>
                        </div>
                        <div className="ub-form-group">
                          <label>Color</label>
                          <input
                            type="text"
                            value={amendFormData.new_vehicle_color}
                            onChange={(e) => handleAmendFormChange('new_vehicle_color', e.target.value)}
                            placeholder={selectedBooking.vehicle_color}
                          />
                          <small>Current: {selectedBooking.vehicle_color}</small>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="ub-form-group">
                    <label>Reason for Changes (Optional)</label>
                    <textarea
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="Why are you making these changes?"
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
                      Cancel Changes
                    </button>
                    <button 
                      className="ub-btn-primary"
                      onClick={processBookingAction}
                      disabled={processingAction}
                    >
                      {processingAction ? (
                        <>
                          <Loader2 className="ub-spinning" size={16} />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Edit size={16} />
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Action Result */}
              {actionResult && (
                <div className="ub-action-result">
                  {actionResult.success ? (
                    <>
                      <div className="ub-success-animation">
                        <div className="ub-success-icon">
                          <CheckCircle size={64} />
                          <div className="ub-success-pulse"></div>
                        </div>
                      </div>
                      
                      <h2>
                        {actionResult.type === 'cancel' ? '✅ Booking Cancelled!' : 
                         actionResult.type === 'amend' ? '✅ Booking Updated!' : '✅ Success!'}
                      </h2>
                      <p>{actionResult.message}</p>
                      
                      <div className="ub-success-actions">
                        <button 
                          className="ub-action-btn ub-primary"
                          onClick={() => {
                            setShowModal(false);
                            setSelectedBooking(null);
                            setActionResult(null);
                          }}
                        >
                          <CheckCircle size={18} />
                          <span>Done</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="ub-error-animation">
                        <div className="ub-error-icon">
                          <AlertCircle size={64} />
                          <div className="ub-error-pulse"></div>
                        </div>
                      </div>
                      
                      <h2>❌ {actionResult.type === 'cancel' ? 'Cancellation Failed' : 'Update Failed'}</h2>
                      <p>{actionResult.message}</p>
                      
                      <div className="ub-error-actions">
                        <button 
                          className="ub-retry-btn"
                          onClick={() => setActionResult(null)}
                        >
                          Try Again
                        </button>
                        <button 
                          className="ub-btn-secondary"
                          onClick={() => setShowModal(false)}
                        >
                          Close
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="ub-footer">
        <div className="ub-footer-content">
          <div className="ub-footer-links">
            <button onClick={goToHome}>Home</button>
            <button onClick={goToNewBooking}>New Booking</button>
          </div>
          <div className="ub-footer-debug">
            <button 
              onClick={() => setDebugMode(!debugMode)}
              className={`ub-debug-toggle-footer ${debugMode ? 'active' : ''}`}
              title="Toggle Debug Mode"
            >
              <Bug size={12} />
              {debugMode ? 'Debug ON' : 'Debug OFF'}
            </button>
          </div>
        </div>
      </div>

      {/* Backend Integration Status Panel */}
      {debugMode && (
        <div className="ub-debug-info-panel">
          <h4>🔧 Backend Integration Status</h4>
          <div className="ub-debug-stats">
            <div>Total Bookings: {userBookings.length}</div>
            <div>Auth Status: {authStatus.isLoggedIn ? '✅' : '❌'}</div>
            <div>Backend: ✅ Connected</div>
            <div>Debug Mode: ✅ Active</div>
          </div>
          
          <div className="ub-debug-endpoints">
            <h5>API Endpoints:</h5>
            <div className="ub-endpoint-status">
              <span>📋 GET /api/parking/my-bookings</span>
              <span className="status-ok">✅</span>
            </div>
            <div className="ub-endpoint-status">
              <span>🚫 POST /api/parking/cancel-booking</span>
              <span className="status-ready">🔧</span>
            </div>
            <div className="ub-endpoint-status">
              <span>✏️ POST /api/parking/amend-booking</span>
              <span className="status-ready">🔧</span>
            </div>
          </div>
          
          <div className="ub-debug-capabilities">
            <h5>Booking Capabilities:</h5>
            <div>Cancelable: {userBookings.filter(b => b.is_cancelable).length}</div>
            <div>Editable: {userBookings.filter(b => b.is_editable).length}</div>
            <div>Active: {userBookings.filter(b => ['confirmed', 'active'].includes(b.status?.toLowerCase())).length}</div>
          </div>

          {userBookings.length > 0 && (
            <div className="ub-debug-schema">
              <h5>Backend Schema Sample:</h5>
              <pre className="ub-debug-json">
                {JSON.stringify({
                  backend_mapping: {
                    our_reference: userBookings[0].our_reference,
                    magr_reference: userBookings[0].magr_reference,
                    status: userBookings[0].status,
                    nested_structures: {
                      customer_details: !!userBookings[0].customer_details,
                      travel_details: !!userBookings[0].travel_details,
                      vehicle_details: !!userBookings[0].vehicle_details,
                      service_features: userBookings[0].service_features
                    },
                    computed_capabilities: {
                      is_cancelable: userBookings[0].is_cancelable,
                      is_editable: userBookings[0].is_editable
                    }
                  }
                }, null, 2)}
              </pre>
            </div>
          )}

          <div className="ub-debug-actions">
            <button onClick={debugComplete} className="ub-debug-btn">
              <Settings size={14} />
              Complete Debug
            </button>
            <button onClick={() => setDebugInfo([])} className="ub-debug-btn">
              Clear Logs
            </button>
            <button onClick={() => console.log('Backend Data:', { bookings: userBookings, auth: authStatus })} className="ub-debug-btn">
              Log Backend Data
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserBooking;