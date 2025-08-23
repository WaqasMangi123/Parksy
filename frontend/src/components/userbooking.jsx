// UserBooking.jsx - FULLY FIXED VERSION with enhanced debugging and robust cancel/amend support
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
  const [debugInfo, setDebugInfo] = useState(null);

  // NEW: Amend form state
  const [amendFormData, setAmendFormData] = useState({
    dropoff_time: '',
    pickup_time: '',
    title: '',
    first_name: '',
    last_name: '',
    customer_email: '',
    phone_number: '',
    departure_flight_number: '',
    arrival_flight_number: '',
    departure_terminal: '',
    arrival_terminal: '',
    car_registration_number: '',
    car_make: '',
    car_model: '',
    car_color: ''
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

  // ENHANCED: Debug logging functions
  const logDebug = (message, data = null) => {
    console.log(`🔧 [UserBooking Debug] ${message}`, data || '');
    if (debugMode) {
      setDebugInfo(prev => [
        ...(prev || []),
        { timestamp: new Date().toLocaleTimeString(), message, data }
      ]);
    }
  };

  const debugBookingData = (booking, context = 'General') => {
    const debugData = {
      context,
      booking_fields: Object.keys(booking || {}),
      id_fields: {
        id: booking?.id,
        _id: booking?._id,
        our_reference: booking?.our_reference,
        magr_reference: booking?.magr_reference,
        booking_reference: booking?.booking_reference,
        reference: booking?.reference,
        booking_id: booking?.booking_id
      },
      status: booking?.status,
      user_id: booking?.user_id,
      customer_details: booking?.customer_details,
      vehicle_details: booking?.vehicle_details,
      travel_details: booking?.travel_details,
      nested_references: {
        customer_ref: booking?.customer_details?.booking_reference,
        travel_ref: booking?.travel_details?.booking_reference
      }
    };

    logDebug(`Booking Debug (${context})`, debugData);
    
    if (debugMode) {
      alert(`🔧 Booking Debug (${context}):
ID Fields:
- id: ${booking?.id || 'MISSING'}
- _id: ${booking?._id || 'MISSING'}
- our_reference: ${booking?.our_reference || 'MISSING'}
- magr_reference: ${booking?.magr_reference || 'MISSING'}
- booking_reference: ${booking?.booking_reference || 'MISSING'}
- reference: ${booking?.reference || 'MISSING'}

Status: ${booking?.status || 'MISSING'}
All Fields: ${Object.keys(booking || {}).slice(0, 10).join(', ')}${Object.keys(booking || {}).length > 10 ? '...' : ''}`);
    }
    
    return debugData;
  };

  // ENHANCED: Get booking reference with fallback priority
  const getBookingReference = (booking) => {
    const candidates = [
      booking?.our_reference,
      booking?.booking_reference,
      booking?.magr_reference,
      booking?.reference,
      booking?._id,
      booking?.id
    ];

    const validRef = candidates.find(ref => ref && ref !== null && ref !== undefined && ref !== '');
    
    logDebug('Getting booking reference', {
      candidates,
      selected: validRef,
      booking_keys: Object.keys(booking || {})
    });

    return validRef;
  };

  // ENHANCED: Authentication functions with comprehensive token detection
  const getAuthToken = () => {
    try {
      const localStorageKeys = [
        'token', 'authToken', 'jwt', 'access_token', 
        'auth_token', 'userToken', 'accessToken',
        'parksy_token', 'user_token', 'Authorization'
      ];
      
      for (const key of localStorageKeys) {
        const token = localStorage.getItem(key);
        if (token && token !== 'null' && token !== 'undefined' && token.length > 10) {
          return token;
        }
      }

      const sessionStorageKeys = [
        'token', 'authToken', 'jwt', 'access_token',
        'auth_token', 'userToken', 'accessToken'
      ];
      
      for (const key of sessionStorageKeys) {
        const token = sessionStorage.getItem(key);
        if (token && token !== 'null' && token !== 'undefined' && token.length > 10) {
          return token;
        }
      }

      return null;
    } catch (error) {
      logDebug('Error accessing browser storage', error);
      return null;
    }
  };

  const getValidJWTToken = () => {
    const token = getAuthToken();
    if (!token) return null;
    
    if (token.includes('.') && token.split('.').length === 3 && !token.startsWith('{')) {
      return token;
    }
    
    try {
      let userData = null;
      
      if (token.startsWith('{')) {
        userData = JSON.parse(token);
      } else {
        try {
          userData = JSON.parse(atob(token));
        } catch (e) {
          return token;
        }
      }
      
      if (userData && (userData.id || userData.user_id || userData.sub) && userData.email) {
        const jwtPayload = {
          sub: (userData.id || userData.user_id || userData.sub).toString(),
          id: userData.id || userData.user_id || userData.sub,
          user_id: userData.id || userData.user_id || userData.sub,
          email: userData.email,
          username: userData.username || userData.email,
          name: userData.name || userData.username || userData.email,
          exp: Math.floor(Date.now()/1000) + 86400,
          iat: Math.floor(Date.now()/1000),
          iss: 'parksy-frontend',
          aud: 'parksy-backend'
        };
        
        const header = btoa(JSON.stringify({typ:'JWT', alg:'HS256'}));
        const payload = btoa(JSON.stringify(jwtPayload));
        const signature = 'demo_signature_for_frontend';
        return `${header}.${payload}.${signature}`;
      }
    } catch (error) {
      logDebug('Token conversion failed', error);
    }
    
    return token;
  };

  const getUserInfoFromToken = () => {
    const token = getAuthToken();
    if (!token) {
      return null;
    }
    
    try {
      let payload;
      
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
      } else {
        try {
          payload = JSON.parse(atob(token));
        } catch (base64Error) {
          try {
            payload = JSON.parse(token);
          } catch (jsonError) {
            throw new Error('Token is not in JWT, Base64, or JSON format');
          }
        }
      }
      
      return payload;
    } catch (error) {
      logDebug('Error decoding token', error);
      return null;
    }
  };

  // Check authentication status
  useEffect(() => {
    const checkAuth = () => {
      const token = getAuthToken();
      const userInfo = getUserInfoFromToken();
      
      const isLoggedIn = !!(token && userInfo);
      
      logDebug('Authentication check', { isLoggedIn, hasToken: !!token, hasUserInfo: !!userInfo });
      
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
    
    const handleStorageChange = (e) => {
      if (e.key && ['token', 'authToken', 'jwt', 'access_token'].includes(e.key)) {
        checkAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // ENHANCED: Debug API endpoints
  const testDebugEndpoints = async () => {
    const authToken = getValidJWTToken();
    if (!authToken) {
      alert('No auth token found!');
      return;
    }

    try {
      setLoading(true);
      logDebug('Testing debug endpoints');

      // Test raw bookings endpoint
      const rawResponse = await fetch(`${API_BASE_URL}/api/parking/debug/user-bookings-raw`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        }
      });

      if (rawResponse.ok) {
        const rawData = await rawResponse.json();
        logDebug('Raw bookings data', rawData);
        
        if (rawData.data && rawData.data.length > 0) {
          // Test specific booking lookup
          const firstBooking = rawData.data[0];
          const testReference = getBookingReference(firstBooking);
          
          if (testReference) {
            const lookupResponse = await fetch(`${API_BASE_URL}/api/parking/debug/booking-lookup/${testReference}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
              }
            });

            if (lookupResponse.ok) {
              const lookupData = await lookupResponse.json();
              logDebug('Booking lookup data', lookupData);
            }
          }
        }

        alert(`Debug Test Results:
✅ Raw Bookings: ${rawData.data?.length || 0} found
📋 Sample Structure: ${JSON.stringify(rawData.data?.[0] || {}, null, 2).slice(0, 500)}...
Check console for full details.`);
      } else {
        const errorData = await rawResponse.text();
        alert(`❌ Debug endpoint failed: ${rawResponse.status}\n${errorData}`);
      }

    } catch (error) {
      logDebug('Debug endpoints error', error);
      alert(`❌ Debug test failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ENHANCED: Fetch user's bookings with better error handling
  const fetchUserBookings = async () => {
    if (!authStatus.isLoggedIn) {
      logDebug('Cannot fetch bookings - user not logged in');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const authToken = getValidJWTToken();
      
      if (!authToken) {
        throw new Error('No authentication token found in storage');
      }

      logDebug('Fetching user bookings', { tokenLength: authToken.length });

      const possibleEndpoints = [
        `${API_BASE_URL}/api/parking/my-bookings`,
        `${API_BASE_URL}/api/parking/bookings`,
        `${API_BASE_URL}/api/parking/user-bookings`
      ];

      let successfulResponse = null;
      let lastError = null;

      for (const endpoint of possibleEndpoints) {
        try {
          logDebug(`Trying endpoint: ${endpoint}`);

          const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`,
              'X-Requested-With': 'XMLHttpRequest',
              'Accept': 'application/json'
            }
          });

          if (response.ok) {
            successfulResponse = { response, endpoint };
            break;
          } else {
            const errorData = await response.json();
            lastError = new Error(errorData.message || `HTTP ${response.status} from ${endpoint}`);
            logDebug(`Endpoint failed: ${endpoint}`, { status: response.status, error: errorData });
          }

        } catch (networkError) {
          lastError = networkError;
          logDebug(`Network error for ${endpoint}`, networkError);
          continue;
        }
      }

      if (!successfulResponse) {
        throw lastError || new Error('All booking endpoints failed');
      }

      const data = await successfulResponse.response.json();
      logDebug('Bookings API response', { endpoint: successfulResponse.endpoint, dataStructure: Object.keys(data) });
      
      if (data.success && data.data) {
        const bookingsArray = Array.isArray(data.data) ? data.data : [];
        
        // ENHANCED: Process bookings with debug info
        const enhancedBookings = bookingsArray.map((booking, index) => {
          logDebug(`Processing booking ${index}`, {
            original_keys: Object.keys(booking),
            has_our_reference: !!booking.our_reference,
            has_booking_reference: !!booking.booking_reference,
            has_magr_reference: !!booking.magr_reference,
            status: booking.status
          });

          return {
            ...booking,
            // Ensure cancel/amend flags exist with proper defaults
            is_cancelable: booking.is_cancelable !== false && booking.status === 'confirmed',
            is_editable: booking.is_editable !== false && booking.status === 'confirmed',
            // Ensure nested objects exist
            customer_details: booking.customer_details || {},
            vehicle_details: booking.vehicle_details || {},
            travel_details: booking.travel_details || {},
            // Set default status if missing
            status: booking.status || 'confirmed',
            // Add debug reference
            _debug_reference: getBookingReference(booking)
          };
        });
        
        logDebug('Enhanced bookings processed', { count: enhancedBookings.length });
        
        setUserBookings(enhancedBookings);
        setFilteredBookings(enhancedBookings);
        setError(null);
      } else {
        logDebug('No bookings data in response', data);
        setUserBookings([]);
        setFilteredBookings([]);
        setError(null);
      }

    } catch (error) {
      logDebug('Error fetching bookings', error);
      setError(`Failed to load bookings: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ENHANCED: Handle Cancel Booking with proper error handling and debugging
  const handleCancelBooking = async (booking) => {
    debugBookingData(booking, 'Cancel Booking Handler');
    setSelectedBooking(booking);
    setModalType('cancel');
    setShowModal(true);
    setCancelReason('');
    setActionResult(null);
  };

  // ENHANCED: Handle Amend Booking with debugging
  const handleAmendBooking = async (booking) => {
    debugBookingData(booking, 'Amend Booking Handler');
    setSelectedBooking(booking);
    setModalType('amend');
    setShowModal(true);
    setCancelReason('');
    setActionResult(null);
    
    // Pre-populate amend form with current booking data
    if (booking) {
      setAmendFormData({
        dropoff_time: booking.dropoff_time || booking.travel_details?.dropoff_time || '',
        pickup_time: booking.pickup_time || booking.travel_details?.pickup_time || '',
        title: booking.customer_details?.title || '',
        first_name: booking.customer_details?.first_name || '',
        last_name: booking.customer_details?.last_name || '',
        customer_email: booking.customer_details?.customer_email || '',
        phone_number: booking.customer_details?.phone_number || '',
        departure_flight_number: booking.departure_flight_number || booking.travel_details?.departure_flight_number || '',
        arrival_flight_number: booking.arrival_flight_number || booking.travel_details?.arrival_flight_number || '',
        departure_terminal: booking.departure_terminal || booking.travel_details?.departure_terminal || '',
        arrival_terminal: booking.arrival_terminal || booking.travel_details?.arrival_terminal || '',
        car_registration_number: booking.vehicle_details?.car_registration_number || booking.car_registration_number || '',
        car_make: booking.vehicle_details?.car_make || '',
        car_model: booking.vehicle_details?.car_model || '',
        car_color: booking.vehicle_details?.car_color || ''
      });
    }
  };

  // ENHANCED: Process Cancel/Amend Action with comprehensive error handling and debugging
  const processBookingAction = async () => {
    if (!selectedBooking || !modalType) return;

    setProcessingAction(true);
    setActionResult(null);

    try {
      const authToken = getValidJWTToken();
      if (!authToken) {
        throw new Error('Authentication token not found');
      }

      const bookingReference = getBookingReference(selectedBooking);
      if (!bookingReference) {
        debugBookingData(selectedBooking, 'No Reference Found');
        throw new Error('No valid booking reference found. Cannot process action.');
      }

      logDebug(`Processing ${modalType} action`, {
        booking_reference: bookingReference,
        booking_status: selectedBooking.status,
        modal_type: modalType
      });

      if (modalType === 'cancel') {
        logDebug('Cancelling booking', { reference: bookingReference });
        
        const cancelPayload = {
          booking_reference: bookingReference,
          refund_amount: selectedBooking.booking_amount,
          reason: cancelReason || 'User requested cancellation'
        };

        logDebug('Cancel payload', cancelPayload);
        
        const response = await fetch(`${API_BASE_URL}/api/parking/cancel-booking`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify(cancelPayload)
        });

        logDebug('Cancel response received', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        });

        if (!response.ok) {
          const errorData = await response.json();
          logDebug('Cancel API error response', errorData);
          throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        logDebug('Cancel success response', result);
        
        if (result.success) {
          setActionResult({
            success: true,
            type: 'cancel',
            message: 'Booking cancelled successfully! Refund will be processed within 3-5 business days.',
            data: result.data
          });
          
          // Refresh bookings
          await fetchUserBookings();
        } else {
          throw new Error(result.message || 'Failed to cancel booking');
        }

      } else if (modalType === 'amend') {
        logDebug('Amending booking', { reference: bookingReference });
        
        const amendData = {
          booking_reference: bookingReference,
          ...amendFormData
        };

        // Remove empty fields
        Object.keys(amendData).forEach(key => {
          if (amendData[key] === '' || amendData[key] === null || amendData[key] === undefined) {
            delete amendData[key];
          }
        });

        logDebug('Amend payload', amendData);

        const response = await fetch(`${API_BASE_URL}/api/parking/amend-booking`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify(amendData)
        });

        logDebug('Amend response received', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        });

        if (!response.ok) {
          const errorData = await response.json();
          logDebug('Amend API error response', errorData);
          throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        logDebug('Amend success response', result);
        
        if (result.success) {
          setActionResult({
            success: true,
            type: 'amend',
            message: 'Booking amended successfully! Your changes have been saved.',
            data: result.data
          });
          
          // Refresh bookings
          await fetchUserBookings();
        } else {
          throw new Error(result.message || 'Failed to amend booking');
        }
      }

    } catch (error) {
      logDebug(`Error ${modalType}ing booking`, error);
      setActionResult({
        success: false,
        type: modalType,
        message: error.message || `Failed to ${modalType} booking`,
        error: error.message
      });
    } finally {
      setProcessingAction(false);
    }
  };

  const handleAmendFormChange = (field, value) => {
    setAmendFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const deleteBooking = async (booking, reason) => {
    try {
      setProcessingAction(true);
      const authToken = getValidJWTToken();
      const bookingReference = getBookingReference(booking);

      if (!authToken) {
        throw new Error('Authentication required');
      }

      if (!bookingReference) {
        throw new Error('No valid booking reference found');
      }

      logDebug('Deleting booking', { reference: bookingReference });

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
        setUserBookings(prevBookings => 
          prevBookings.filter(b => getBookingReference(b) !== bookingReference)
        );
        
        await fetchUserBookings();
        
        setShowModal(false);
        setSelectedBooking(null);
        setCancelReason('');
        
        alert('Booking deleted successfully!');
      } else {
        throw new Error(result.message || 'Deletion failed');
      }
    } catch (error) {
      logDebug('Error deleting booking', error);
      alert(`Failed to delete booking: ${error.message}`);
    } finally {
      setProcessingAction(false);
    }
  };

  // Filter and search bookings
  useEffect(() => {
    let filtered = [...userBookings];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(booking =>
        getBookingReference(booking)?.toLowerCase().includes(query) ||
        booking.product_name?.toLowerCase().includes(query) ||
        booking.vehicle_registration?.toLowerCase().includes(query) ||
        booking.airport_code?.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }

    filtered.sort((a, b) => {
      if (sortBy === 'created_at') {
        return new Date(b.created_at) - new Date(a.created_at);
      } else if (sortBy === 'dropoff_date') {
        return new Date(b.dropoff_date || b.travel_details?.dropoff_date) - new Date(a.dropoff_date || a.travel_details?.dropoff_date);
      } else if (sortBy === 'booking_amount') {
        return (b.booking_amount || 0) - (a.booking_amount || 0);
      }
      return 0;
    });

    setFilteredBookings(filtered);
  }, [userBookings, searchQuery, statusFilter, sortBy]);

  // Load data on component mount
  useEffect(() => {
    if (authStatus.isLoggedIn) {
      fetchUserBookings();
    }
  }, [authStatus.isLoggedIn]);

  // Helper functions
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount || 0);
  };

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

  const formatDateOnly = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

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

  const goToHome = () => {
    window.location.href = '/';
  };

  const goToNewBooking = () => {
    window.location.href = '/#/parking';
  };

  // Enhanced debug function
  const debugToken = () => {
    const token = getAuthToken();
    const userInfo = getUserInfoFromToken();
    
    const debugInfo = {
      token_exists: !!token,
      token_length: token ? token.length : 0,
      is_jwt: token ? (token.includes('.') && token.split('.').length === 3) : false,
      user_info: userInfo,
      auth_status: authStatus.isLoggedIn,
      bookings_count: userBookings.length,
      sample_booking_refs: userBookings.slice(0, 3).map(b => ({
        booking: getBookingReference(b),
        status: b.status,
        keys: Object.keys(b).slice(0, 5)
      }))
    };

    logDebug('Token debug info', debugInfo);
    
    alert(`🔧 UserBookings Debug Info:
Token exists: ${!!token}
Token length: ${token ? token.length : 0}
Is JWT: ${token ? (token.includes('.') && token.split('.').length === 3) : false}
User info: ${userInfo ? JSON.stringify(userInfo, null, 2) : 'none'}
Auth status: ${authStatus.isLoggedIn}
Bookings: ${userBookings.length}
Debug mode: ${debugMode}
Check console for detailed logs.`);
  };

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
              <button onClick={debugToken} className="ub-debug-btn">
                <Bug size={16} />
                Debug Token
              </button>
              <button onClick={() => setDebugMode(!debugMode)} 
                      className={`ub-debug-btn ${debugMode ? 'active' : ''}`}>
                <Settings size={16} />
                Debug Mode: {debugMode ? 'ON' : 'OFF'}
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
            <button onClick={debugToken} className="ub-debug-btn">
              <Bug size={16} />
              Debug
            </button>
            <button onClick={testDebugEndpoints} className="ub-debug-btn">
              <Settings size={16} />
              Test Debug APIs
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ub-user-bookings">
      {/* Enhanced Header with Debug Controls */}
      <div className="ub-user-header">
        <div className="ub-header-content">
          <div className="ub-header-left">
            <button className="ub-back-btn" onClick={goToHome}>
              <ArrowLeft size={20} />
            </button>
            <div className="ub-header-title">
              <h1>My Bookings {debugMode && <span style={{color: '#ff6b35'}}>(DEBUG)</span>}</h1>
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
            {debugMode && (
              <button className="ub-debug-btn" onClick={testDebugEndpoints}>
                <Bug size={16} />
                Test APIs
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Debug Panel */}
      {debugMode && debugInfo && (
        <div className="ub-debug-panel">
          <h4>🔧 Debug Log</h4>
          <div className="ub-debug-log">
            {debugInfo.slice(-10).map((log, index) => (
              <div key={index} className="ub-debug-entry">
                <span className="ub-debug-time">{log.timestamp}</span>
                <span className="ub-debug-message">{log.message}</span>
                {log.data && <pre className="ub-debug-data">{JSON.stringify(log.data, null, 2).slice(0, 200)}...</pre>}
              </div>
            ))}
          </div>
          <button onClick={() => setDebugInfo([])} className="ub-debug-clear">Clear Log</button>
        </div>
      )}

      {/* Debug Controls */}
      <div className="ub-debug-controls">
        <button onClick={() => setDebugMode(!debugMode)} 
                className={`ub-debug-toggle ${debugMode ? 'active' : ''}`}>
          <Bug size={14} />
          Debug: {debugMode ? 'ON' : 'OFF'}
        </button>
        {debugMode && (
          <>
            <button onClick={debugToken} className="ub-debug-btn">Token Info</button>
            <button onClick={testDebugEndpoints} className="ub-debug-btn">Test APIs</button>
          </>
        )}
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
              <div key={booking.id || booking._id || getBookingReference(booking)} className="ub-booking-card">
                <div className="ub-card-header">
                  <div className="ub-booking-reference">
                    <strong>#{getBookingReference(booking)}</strong>
                    <span className={getStatusBadge(booking.status)}>
                      {booking.status}
                    </span>
                    {debugMode && (
                      <span className="ub-debug-ref" title="Debug Reference">
                        🔧 {booking._debug_reference}
                      </span>
                    )}
                  </div>
                  <div className="ub-booking-actions">
                    <button
                      className="ub-action-btn ub-view"
                      onClick={() => {
                        debugBookingData(booking, 'View Action');
                        setSelectedBooking(booking);
                        setModalType('view');
                        setShowModal(true);
                      }}
                      title="View Details"
                    >
                      <Eye size={14} />
                    </button>
                    
                    {/* Enhanced Cancel Button - Now shows for confirmed bookings */}
                    {booking.status === 'confirmed' && booking.is_cancelable && (
                      <button
                        className="ub-action-btn ub-cancel"
                        onClick={() => handleCancelBooking(booking)}
                        title="Cancel Booking"
                      >
                        <XCircle size={14} />
                      </button>
                    )}
                    
                    {/* Enhanced Amend Button - Now shows for confirmed bookings */}
                    {booking.status === 'confirmed' && booking.is_editable && (
                      <button
                        className="ub-action-btn ub-amend"
                        onClick={() => handleAmendBooking(booking)}
                        title="Amend Booking"
                      >
                        <Edit size={14} />
                      </button>
                    )}
                    
                    {booking.status === 'cancelled' && (
                      <button
                        className="ub-action-btn ub-delete"
                        onClick={() => {
                          debugBookingData(booking, 'Delete Action');
                          setSelectedBooking(booking);
                          setModalType('delete');
                          setShowModal(true);
                        }}
                        title="Delete Booking"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}

                    {debugMode && (
                      <button
                        className="ub-action-btn ub-debug"
                        onClick={() => debugBookingData(booking, 'Manual Debug')}
                        title="Debug This Booking"
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
                        <span>{airportNames[booking.airport_code] || booking.airport_code}</span>
                      </div>
                    </div>
                    
                    <div className="ub-booking-details">
                      <div className="ub-detail-row">
                        <Calendar size={14} />
                        <span>Drop-off: {formatDateOnly(booking.dropoff_date || booking.travel_details?.dropoff_date)} at {booking.dropoff_time || booking.travel_details?.dropoff_time}</span>
                      </div>
                      <div className="ub-detail-row">
                        <Calendar size={14} />
                        <span>Pick-up: {formatDateOnly(booking.pickup_date || booking.travel_details?.pickup_date)} at {booking.pickup_time || booking.travel_details?.pickup_time}</span>
                      </div>
                      {(booking.vehicle_registration || booking.vehicle_details?.car_registration_number) && (
                        <div className="ub-detail-row">
                          <Car size={14} />
                          <span>{booking.vehicle_registration || booking.vehicle_details?.car_registration_number}</span>
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
                  
                  {/* Enhanced Booking capabilities indicators */}
                  <div className="ub-booking-capabilities">
                    {booking.is_cancelable && booking.status === 'confirmed' && (
                      <span className="ub-capability-badge cancelable" title="Cancellable">
                        <XCircle size={10} />
                      </span>
                    )}
                    {booking.is_editable && booking.status === 'confirmed' && (
                      <span className="ub-capability-badge editable" title="Amendable">
                        <Edit size={10} />
                      </span>
                    )}
                    {booking.is_test_payment && (
                      <span className="ub-capability-badge test-mode" title="Test Mode">
                        TEST
                      </span>
                    )}
                    {debugMode && (
                      <span className="ub-capability-badge debug-mode" title="Debug Info Available">
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

      {/* Enhanced Modal with better debugging */}
      {showModal && selectedBooking && (
        <div className="ub-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="ub-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="ub-modal-header">
              <h2>
                {modalType === 'view' && 'Booking Details'}
                {modalType === 'cancel' && 'Cancel Booking'}
                {modalType === 'amend' && 'Amend Booking'}
                {modalType === 'delete' && 'Delete Booking'}
                {debugMode && (
                  <span className="ub-debug-modal-info">
                    (Ref: {getBookingReference(selectedBooking)})
                  </span>
                )}
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
                  {/* Debug Section */}
                  {debugMode && (
                    <div className="ub-detail-section ub-debug-section">
                      <h3>🔧 Debug Information</h3>
                      <div className="ub-debug-info">
                        <pre>{JSON.stringify({
                          reference: getBookingReference(selectedBooking),
                          id_fields: {
                            id: selectedBooking.id,
                            _id: selectedBooking._id,
                            our_reference: selectedBooking.our_reference,
                            magr_reference: selectedBooking.magr_reference,
                            booking_reference: selectedBooking.booking_reference
                          },
                          status: selectedBooking.status,
                          capabilities: {
                            is_cancelable: selectedBooking.is_cancelable,
                            is_editable: selectedBooking.is_editable
                          }
                        }, null, 2)}</pre>
                      </div>
                    </div>
                  )}

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
                      {selectedBooking.is_test_payment && (
                        <span className="ub-status-badge ub-test-mode">
                          TEST MODE
                        </span>
                      )}
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
                        <span>{getBookingReference(selectedBooking)}</span>
                      </div>
                      {selectedBooking.magr_reference && getBookingReference(selectedBooking) !== selectedBooking.magr_reference && (
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
                        <span>{formatDateOnly(selectedBooking.dropoff_date || selectedBooking.travel_details?.dropoff_date)} at {selectedBooking.dropoff_time || selectedBooking.travel_details?.dropoff_time}</span>
                      </div>
                      <div className="ub-detail-item">
                        <label>Pick-up</label>
                        <span>{formatDateOnly(selectedBooking.pickup_date || selectedBooking.travel_details?.pickup_date)} at {selectedBooking.pickup_time || selectedBooking.travel_details?.pickup_time}</span>
                      </div>
                      {(selectedBooking.departure_flight_number || selectedBooking.travel_details?.departure_flight_number) && (
                        <div className="ub-detail-item">
                          <label>Departure Flight</label>
                          <span>{selectedBooking.departure_flight_number || selectedBooking.travel_details?.departure_flight_number}</span>
                        </div>
                      )}
                      {(selectedBooking.arrival_flight_number || selectedBooking.travel_details?.arrival_flight_number) && (
                        <div className="ub-detail-item">
                          <label>Arrival Flight</label>
                          <span>{selectedBooking.arrival_flight_number || selectedBooking.travel_details?.arrival_flight_number}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Vehicle Information */}
                  {(selectedBooking.vehicle_registration || selectedBooking.vehicle_details?.car_registration_number) && (
                    <div className="ub-detail-section">
                      <h3>Vehicle Information</h3>
                      <div className="ub-detail-grid">
                        <div className="ub-detail-item">
                          <label>Registration</label>
                          <span>{selectedBooking.vehicle_registration || selectedBooking.vehicle_details?.car_registration_number}</span>
                        </div>
                        {selectedBooking.vehicle_details?.car_make && (
                          <div className="ub-detail-item">
                            <label>Make & Model</label>
                            <span>{selectedBooking.vehicle_details.car_make} {selectedBooking.vehicle_details.car_model}</span>
                          </div>
                        )}
                        {selectedBooking.vehicle_details?.car_color && (
                          <div className="ub-detail-item">
                            <label>Color</label>
                            <span>{selectedBooking.vehicle_details.car_color}</span>
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
                      {selectedBooking.stripe_payment_intent_id && (
                        <div className="ub-detail-item">
                          <label>Payment ID</label>
                          <span className="ub-payment-id">{selectedBooking.stripe_payment_intent_id}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Service Features */}
                  <div className="ub-detail-section">
                    <h3>Service Features</h3>
                    <div className="ub-features-grid">
                      {selectedBooking.is_cancelable && (
                        <div className="ub-feature-item">
                          <XCircle size={16} />
                          <span>Cancellable</span>
                        </div>
                      )}
                      {selectedBooking.is_editable && (
                        <div className="ub-feature-item">
                          <Edit size={16} />
                          <span>Amendable</span>
                        </div>
                      )}
                      {selectedBooking.is_test_payment && (
                        <div className="ub-feature-item">
                          <Award size={16} />
                          <span>Test Mode</span>
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

                  {/* Action Buttons in View Mode */}
                  <div className="ub-view-actions">
                    {selectedBooking.status === 'confirmed' && selectedBooking.is_cancelable && (
                      <button 
                        className="ub-btn-warning"
                        onClick={() => {
                          setModalType('cancel');
                          setCancelReason('');
                          setActionResult(null);
                        }}
                      >
                        <XCircle size={16} />
                        Cancel Booking
                      </button>
                    )}
                    
                    {selectedBooking.status === 'confirmed' && selectedBooking.is_editable && (
                      <button 
                        className="ub-btn-primary"
                        onClick={() => {
                          setModalType('amend');
                          setCancelReason('');
                          setActionResult(null);
                          
                          // Pre-populate amend form
                          setAmendFormData({
                            dropoff_time: selectedBooking.dropoff_time || selectedBooking.travel_details?.dropoff_time || '',
                            pickup_time: selectedBooking.pickup_time || selectedBooking.travel_details?.pickup_time || '',
                            title: selectedBooking.customer_details?.title || '',
                            first_name: selectedBooking.customer_details?.first_name || '',
                            last_name: selectedBooking.customer_details?.last_name || '',
                            customer_email: selectedBooking.customer_details?.customer_email || '',
                            phone_number: selectedBooking.customer_details?.phone_number || '',
                            departure_flight_number: selectedBooking.departure_flight_number || selectedBooking.travel_details?.departure_flight_number || '',
                            arrival_flight_number: selectedBooking.arrival_flight_number || selectedBooking.travel_details?.arrival_flight_number || '',
                            departure_terminal: selectedBooking.departure_terminal || selectedBooking.travel_details?.departure_terminal || '',
                            arrival_terminal: selectedBooking.arrival_terminal || selectedBooking.travel_details?.arrival_terminal || '',
                            car_registration_number: selectedBooking.vehicle_details?.car_registration_number || selectedBooking.car_registration_number || '',
                            car_make: selectedBooking.vehicle_details?.car_make || '',
                            car_model: selectedBooking.vehicle_details?.car_model || '',
                            car_color: selectedBooking.vehicle_details?.car_color || ''
                          });
                        }}
                      >
                        <Edit size={16} />
                        Amend Booking
                      </button>
                    )}

                    {debugMode && (
                      <button 
                        className="ub-btn-secondary"
                        onClick={() => debugBookingData(selectedBooking, 'Modal View Debug')}
                      >
                        <Bug size={16} />
                        Debug Booking
                      </button>
                    )}
                  </div>
                </div>
              ) : !actionResult ? (
                <div className="ub-action-form">
                  {modalType === 'cancel' && (
                    <div className="ub-cancel-form">
                      <div className="ub-warning-message">
                        <AlertCircle size={24} />
                        <div>
                          <h4>Cancel Your Booking</h4>
                          <p>Cancelling your booking will process a refund according to the cancellation policy. This action cannot be undone.</p>
                          {debugMode && (
                            <small className="ub-debug-info">
                              🔧 Using reference: {getBookingReference(selectedBooking)}
                            </small>
                          )}
                        </div>
                      </div>

                      <div className="ub-booking-summary">
                        <div className="ub-summary-item">
                          <span>Service:</span>
                          <span>{selectedBooking.product_name}</span>
                        </div>
                        <div className="ub-summary-item">
                          <span>Reference:</span>
                          <span>{getBookingReference(selectedBooking)}</span>
                        </div>
                        <div className="ub-summary-item">
                          <span>Amount:</span>
                          <span>{formatCurrency(selectedBooking.booking_amount)}</span>
                        </div>
                        <div className="ub-summary-item">
                          <span>Refund Amount:</span>
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

                  {modalType === 'amend' && (
                    <div className="ub-amend-form">
                      <div className="ub-info-message">
                        <Info size={24} />
                        <div>
                          <h4>Modify Your Booking</h4>
                          <p>Update the details below. Only changed fields will be updated.</p>
                          <small>Note: Dates cannot be changed, only times and other details.</small>
                          {debugMode && (
                            <small className="ub-debug-info">
                              🔧 Using reference: {getBookingReference(selectedBooking)}
                            </small>
                          )}
                        </div>
                      </div>

                      <div className="ub-amend-sections">
                        {/* Travel Times */}
                        <div className="ub-form-section">
                          <h4>Travel Times</h4>
                          <div className="ub-form-grid">
                            <div className="ub-form-group">
                              <label>Drop-off Time</label>
                              <input
                                type="time"
                                value={amendFormData.dropoff_time}
                                onChange={(e) => handleAmendFormChange('dropoff_time', e.target.value)}
                              />
                              <small>Current: {selectedBooking.dropoff_time || selectedBooking.travel_details?.dropoff_time}</small>
                            </div>
                            <div className="ub-form-group">
                              <label>Pick-up Time</label>
                              <input
                                type="time"
                                value={amendFormData.pickup_time}
                                onChange={(e) => handleAmendFormChange('pickup_time', e.target.value)}
                              />
                              <small>Current: {selectedBooking.pickup_time || selectedBooking.travel_details?.pickup_time}</small>
                            </div>
                          </div>
                        </div>

                        {/* Personal Details */}
                        <div className="ub-form-section">
                          <h4>Personal Details</h4>
                          <div className="ub-form-grid">
                            <div className="ub-form-group">
                              <label>Title</label>
                              <select
                                value={amendFormData.title}
                                onChange={(e) => handleAmendFormChange('title', e.target.value)}
                              >
                                <option value="">No Change</option>
                                <option value="Mr">Mr</option>
                                <option value="Mrs">Mrs</option>
                                <option value="Miss">Miss</option>
                                <option value="Ms">Ms</option>
                                <option value="Dr">Dr</option>
                              </select>
                              <small>Current: {selectedBooking.customer_details?.title}</small>
                            </div>
                            <div className="ub-form-group">
                              <label>First Name</label>
                              <input
                                type="text"
                                value={amendFormData.first_name}
                                onChange={(e) => handleAmendFormChange('first_name', e.target.value)}
                                placeholder={selectedBooking.customer_details?.first_name}
                              />
                              <small>Current: {selectedBooking.customer_details?.first_name}</small>
                            </div>
                            <div className="ub-form-group">
                              <label>Last Name</label>
                              <input
                                type="text"
                                value={amendFormData.last_name}
                                onChange={(e) => handleAmendFormChange('last_name', e.target.value)}
                                placeholder={selectedBooking.customer_details?.last_name}
                              />
                              <small>Current: {selectedBooking.customer_details?.last_name}</small>
                            </div>
                            <div className="ub-form-group">
                              <label>Email</label>
                              <input
                                type="email"
                                value={amendFormData.customer_email}
                                onChange={(e) => handleAmendFormChange('customer_email', e.target.value)}
                                placeholder={selectedBooking.customer_details?.customer_email}
                              />
                              <small>Current: {selectedBooking.customer_details?.customer_email}</small>
                            </div>
                            <div className="ub-form-group">
                              <label>Phone</label>
                              <input
                                type="tel"
                                value={amendFormData.phone_number}
                                onChange={(e) => handleAmendFormChange('phone_number', e.target.value)}
                                placeholder={selectedBooking.customer_details?.phone_number}
                              />
                              <small>Current: {selectedBooking.customer_details?.phone_number}</small>
                            </div>
                          </div>
                        </div>

                        {/* Flight Details */}
                        <div className="ub-form-section">
                          <h4>Flight Details</h4>
                          <div className="ub-form-grid">
                            <div className="ub-form-group">
                              <label>Departure Flight</label>
                              <input
                                type="text"
                                value={amendFormData.departure_flight_number}
                                onChange={(e) => handleAmendFormChange('departure_flight_number', e.target.value)}
                                placeholder={selectedBooking.departure_flight_number || selectedBooking.travel_details?.departure_flight_number}
                              />
                              <small>Current: {selectedBooking.departure_flight_number || selectedBooking.travel_details?.departure_flight_number}</small>
                            </div>
                            <div className="ub-form-group">
                              <label>Arrival Flight</label>
                              <input
                                type="text"
                                value={amendFormData.arrival_flight_number}
                                onChange={(e) => handleAmendFormChange('arrival_flight_number', e.target.value)}
                                placeholder={selectedBooking.arrival_flight_number || selectedBooking.travel_details?.arrival_flight_number}
                              />
                              <small>Current: {selectedBooking.arrival_flight_number || selectedBooking.travel_details?.arrival_flight_number}</small>
                            </div>
                            <div className="ub-form-group">
                              <label>Departure Terminal</label>
                              <select
                                value={amendFormData.departure_terminal}
                                onChange={(e) => handleAmendFormChange('departure_terminal', e.target.value)}
                              >
                                <option value="">No Change</option>
                                <option value="Terminal 1">Terminal 1</option>
                                <option value="Terminal 2">Terminal 2</option>
                                <option value="Terminal 3">Terminal 3</option>
                                <option value="Terminal 4">Terminal 4</option>
                                <option value="Terminal 5">Terminal 5</option>
                              </select>
                              <small>Current: {selectedBooking.departure_terminal || selectedBooking.travel_details?.departure_terminal}</small>
                            </div>
                            <div className="ub-form-group">
                              <label>Arrival Terminal</label>
                              <select
                                value={amendFormData.arrival_terminal}
                                onChange={(e) => handleAmendFormChange('arrival_terminal', e.target.value)}
                              >
                                <option value="">No Change</option>
                                <option value="Terminal 1">Terminal 1</option>
                                <option value="Terminal 2">Terminal 2</option>
                                <option value="Terminal 3">Terminal 3</option>
                                <option value="Terminal 4">Terminal 4</option>
                                <option value="Terminal 5">Terminal 5</option>
                              </select>
                              <small>Current: {selectedBooking.arrival_terminal || selectedBooking.travel_details?.arrival_terminal}</small>
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
                                value={amendFormData.car_registration_number}
                                onChange={(e) => handleAmendFormChange('car_registration_number', e.target.value)}
                                placeholder={selectedBooking.vehicle_details?.car_registration_number || selectedBooking.car_registration_number}
                              />
                              <small>Current: {selectedBooking.vehicle_details?.car_registration_number || selectedBooking.car_registration_number}</small>
                            </div>
                            <div className="ub-form-group">
                              <label>Make</label>
                              <input
                                type="text"
                                value={amendFormData.car_make}
                                onChange={(e) => handleAmendFormChange('car_make', e.target.value)}
                                placeholder={selectedBooking.vehicle_details?.car_make}
                              />
                              <small>Current: {selectedBooking.vehicle_details?.car_make}</small>
                            </div>
                            <div className="ub-form-group">
                              <label>Model</label>
                              <input
                                type="text"
                                value={amendFormData.car_model}
                                onChange={(e) => handleAmendFormChange('car_model', e.target.value)}
                                placeholder={selectedBooking.vehicle_details?.car_model}
                              />
                              <small>Current: {selectedBooking.vehicle_details?.car_model}</small>
                            </div>
                            <div className="ub-form-group">
                              <label>Color</label>
                              <input
                                type="text"
                                value={amendFormData.car_color}
                                onChange={(e) => handleAmendFormChange('car_color', e.target.value)}
                                placeholder={selectedBooking.vehicle_details?.car_color}
                              />
                              <small>Current: {selectedBooking.vehicle_details?.car_color}</small>
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

                  {modalType === 'delete' && (
                    <div className="ub-delete-form">
                      <div className="ub-warning-message">
                        <AlertCircle size={24} />
                        <div>
                          <h4>Delete Booking Record</h4>
                          <p>This will permanently remove this booking from your history. Only cancelled bookings can be deleted.</p>
                          {debugMode && (
                            <small className="ub-debug-info">
                              🔧 Using reference: {getBookingReference(selectedBooking)}
                            </small>
                          )}
                        </div>
                      </div>

                      <div className="ub-booking-summary">
                        <div className="ub-summary-item">
                          <span>Reference:</span>
                          <span>{getBookingReference(selectedBooking)}</span>
                        </div>
                        <div className="ub-summary-item">
                          <span>Status:</span>
                          <span>{selectedBooking.status}</span>
                        </div>
                        <div className="ub-summary-item">
                          <span>Service:</span>
                          <span>{selectedBooking.product_name}</span>
                        </div>
                      </div>

                      <div className="ub-form-group">
                        <label>Reason (Optional)</label>
                        <textarea
                          value={cancelReason}
                          onChange={(e) => setCancelReason(e.target.value)}
                          placeholder="Why are you deleting this booking record?"
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
                          Keep Record
                        </button>
                        <button 
                          className="ub-btn-danger"
                          onClick={() => deleteBooking(selectedBooking, cancelReason)}
                          disabled={processingAction}
                        >
                          {processingAction ? (
                            <>
                              <RefreshCw className="ub-spinning" size={16} />
                              Deleting...
                            </>
                          ) : (
                            <>
                              <Trash2 size={16} />
                              Delete Record
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
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
                        {actionResult.type === 'cancel' ? '✅ Booking Cancelled Successfully!' : '✅ Booking Updated Successfully!'}
                      </h2>
                      <p>{actionResult.message}</p>
                      
                      {actionResult.data && (
                        <div className="ub-result-details">
                          <div className="ub-detail-row">
                            <span>Reference:</span>
                            <strong>{actionResult.data.our_reference || actionResult.data.reference || getBookingReference(selectedBooking)}</strong>
                          </div>
                          {actionResult.data.refund_amount && (
                            <div className="ub-detail-row">
                              <span>Refund Amount:</span>
                              <strong>{formatCurrency(actionResult.data.refund_amount)}</strong>
                            </div>
                          )}
                          {actionResult.type === 'cancel' && (
                            <div className="ub-detail-row">
                              <span>Refund Processing:</span>
                              <span>3-5 business days</span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="ub-success-actions">
                        <button 
                          className="ub-action-btn ub-primary"
                          onClick={() => {
                            setShowModal(false);
                            setSelectedBooking(null);
                            setModalType('view');
                            setCancelReason('');
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
                      
                      <h2>❌ {actionResult.type === 'cancel' ? 'Cancellation Failed' : 
                              actionResult.type === 'amend' ? 'Amendment Failed' : 'Action Failed'}</h2>
                      <p>{actionResult.message}</p>
                      
                      {debugMode && actionResult.error && (
                        <div className="ub-debug-error">
                          <h4>🔧 Debug Information:</h4>
                          <pre>{JSON.stringify({
                            error: actionResult.error,
                            reference_used: getBookingReference(selectedBooking),
                            booking_status: selectedBooking.status,
                            action_type: actionResult.type
                          }, null, 2)}</pre>
                        </div>
                      )}
                      
                      <div className="ub-error-actions">
                        <button 
                          className="ub-retry-btn"
                          onClick={() => {
                            setActionResult(null);
                          }}
                        >
                          Try Again
                        </button>
                        <button 
                          className="ub-btn-secondary"
                          onClick={() => {
                            setShowModal(false);
                            setSelectedBooking(null);
                            setModalType('view');
                            setCancelReason('');
                            setActionResult(null);
                          }}
                        >
                          Close
                        </button>
                        {debugMode && (
                          <button 
                            className="ub-btn-secondary"
                            onClick={() => debugBookingData(selectedBooking, 'Error Debug')}
                          >
                            <Bug size={16} />
                            Debug Booking
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Debug Info Panel */}
      {debugMode && (
        <div className="ub-debug-info-panel">
          <h4>🔧 Debug Information</h4>
          <div className="ub-debug-stats">
            <div>Total Bookings: {userBookings.length}</div>
            <div>Auth Status: {authStatus.isLoggedIn ? '✅' : '❌'}</div>
            <div>User ID: {authStatus.user?.id || authStatus.user?.user_id || 'N/A'}</div>
            <div>Token Length: {getAuthToken()?.length || 0}</div>
          </div>
          
          <div className="ub-debug-bookings-sample">
            <h5>Sample Booking Structure:</h5>
            {userBookings.length > 0 && (
              <pre className="ub-debug-json">
                {JSON.stringify({
                  sample_booking: {
                    id: userBookings[0].id,
                    _id: userBookings[0]._id,
                    our_reference: userBookings[0].our_reference,
                    magr_reference: userBookings[0].magr_reference,
                    booking_reference: userBookings[0].booking_reference,
                    status: userBookings[0].status,
                    is_cancelable: userBookings[0].is_cancelable,
                    is_editable: userBookings[0].is_editable,
                    _debug_reference: userBookings[0]._debug_reference,
                    all_keys_count: Object.keys(userBookings[0]).length
                  }
                }, null, 2)}
              </pre>
            )}
          </div>

          <div className="ub-debug-actions">
            <button onClick={testDebugEndpoints} className="ub-debug-btn">
              <Settings size={14} />
              Test API Endpoints
            </button>
            <button onClick={() => setDebugInfo([])} className="ub-debug-btn">
              Clear Logs
            </button>
            <button onClick={() => console.log('All bookings:', userBookings)} className="ub-debug-btn">
              Log All Bookings
            </button>
          </div>
        </div>
      )}

      {/* Footer with Debug Toggle */}
      <div className="ub-footer">
        <div className="ub-footer-content">
          <div className="ub-footer-links">
            <button onClick={goToHome}>Home</button>
            <button onClick={goToNewBooking}>New Booking</button>
            <button onClick={() => window.location.href = '/#/support'}>Support</button>
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
    </div>
  );
};

export default UserBooking;