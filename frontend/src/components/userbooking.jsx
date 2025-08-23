import React, { useState, useEffect } from 'react';
import { 
  Calendar, User, Car, CreditCard, MapPin, Clock, Phone, Mail, 
  Plane, AlertCircle, CheckCircle, XCircle, RefreshCw, Trash2,
  Eye, Download, Filter, Search, Star, Shield, Navigation,
  ArrowLeft, Home, LogOut, Bell, Settings, Plus, Edit, Loader2,
  Info, Award
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
  const [modalType, setModalType] = useState('view'); // 'view', 'cancel', 'amend'
  const [cancelReason, setCancelReason] = useState('');
  const [processingAction, setProcessingAction] = useState(false);
  const [authStatus, setAuthStatus] = useState({ isLoggedIn: false, user: null });
  const [actionResult, setActionResult] = useState(null);

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

  // ✅ COMPLETELY FIXED: Get authentication token that matches backend expectations
  const getAuthToken = () => {
    try {
      console.log('🔍 UserBooking: Checking for authentication token...');
      
      // Priority 1: Check for real JWT tokens first (backend-generated)
      const tokenKeys = ['token', 'authToken', 'jwt', 'access_token', 'auth_token'];
      for (const key of tokenKeys) {
        const token = localStorage.getItem(key);
        if (token && token !== 'null' && token !== 'undefined' && token.length > 10) {
          // Check if it's a real JWT (3 parts separated by dots)
          if (token.includes('.') && token.split('.').length === 3) {
            try {
              // Try to decode the JWT to verify it's valid
              const parts = token.split('.');
              const payload = JSON.parse(atob(parts[1]));
              
              // Verify it has the required fields that backend expects
              if (payload.id || payload.user_id || payload.sub) {
                console.log(`✅ UserBooking: Found valid backend JWT token in localStorage[${key}]`);
                return token;
              }
            } catch (decodeError) {
              console.log(`⚠️ Failed to decode token from ${key}:`, decodeError.message);
            }
          }
        }
      }
      
      // Priority 2: Check for user object with embedded token
      const userStr = localStorage.getItem('user');
      if (userStr && userStr !== 'null') {
        try {
          const userObj = JSON.parse(userStr);
          console.log('✅ UserBooking: Found user object:', {
            hasId: !!userObj.id,
            hasEmail: !!userObj.email,
            email: userObj.email,
            hasToken: !!userObj.token,
            hasAccessToken: !!userObj.access_token
          });
          
          // If user object has direct token from backend, use it
          if (userObj.token && userObj.token.length > 10 && userObj.token.includes('.')) {
            try {
              // Verify it's a proper JWT
              const parts = userObj.token.split('.');
              if (parts.length === 3) {
                const payload = JSON.parse(atob(parts[1]));
                if (payload.id || payload.user_id || payload.sub) {
                  console.log('✅ UserBooking: Found backend token in user object');
                  return userObj.token;
                }
              }
            } catch (error) {
              console.log('⚠️ Token in user object is not valid JWT');
            }
          }
          
          // If user object has access_token from backend, use it
          if (userObj.access_token && userObj.access_token.length > 10 && userObj.access_token.includes('.')) {
            try {
              const parts = userObj.access_token.split('.');
              if (parts.length === 3) {
                const payload = JSON.parse(atob(parts[1]));
                if (payload.id || payload.user_id || payload.sub) {
                  console.log('✅ UserBooking: Found backend access_token in user object');
                  return userObj.access_token;
                }
              }
            } catch (error) {
              console.log('⚠️ access_token in user object is not valid JWT');
            }
          }
          
          // ❌ NO FRONTEND JWT GENERATION - Backend expects real tokens only
          if (userObj.id && userObj.email && !userObj.token && !userObj.access_token) {
            console.log('⚠️ UserBooking: User exists but no backend token found');
            console.log('⚠️ UserBooking: Backend requires server-signed JWT tokens');
            console.log('⚠️ UserBooking: User needs to log in again to get proper token');
            
            // Clear invalid user data to force re-login
            localStorage.removeItem('user');
            localStorage.removeItem('jwt');
            localStorage.removeItem('token');
            
            return null; // Force re-login to get proper backend token
          }
        } catch (parseError) {
          console.log('⚠️ UserBooking: Failed to parse user object:', parseError.message);
        }
      }
      
      console.log('❌ UserBooking: No valid backend authentication token found');
      console.log('❌ UserBooking: Frontend-generated JWTs will not work with backend');
      console.log('❌ UserBooking: User must log in through proper login API to get backend token');
      
      // Debug: Show what's actually in localStorage
      console.log('📋 UserBooking: Current localStorage contents:');
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);
        console.log(`  ${key}: ${value ? (value.length > 50 ? value.substring(0, 50) + '...' : value) : 'null'}`);
      }
      
      return null;
      
    } catch (error) {
      console.error('❌ UserBooking: Error getting auth token:', error);
      return null;
    }
  };

  const getValidJWTToken = () => {
    const token = getAuthToken();
    if (!token) return null;
    
    // If it's already a JWT, return as-is
    if (token.includes('.') && token.split('.').length === 3 && !token.startsWith('{')) {
      return token;
    }
    
    // Convert other formats to JWT if needed
    try {
      let userData = null;
      
      if (token.startsWith('{')) {
        userData = JSON.parse(token);
      } else {
        try {
          userData = JSON.parse(atob(token));
        } catch (e) {
          return token; // Use as-is if can't convert
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
      console.error('❌ Token conversion failed:', error);
    }
    
    return token;
  };

  // ✅ COMPLETELY FIXED: Get user info from backend token or user object
  const getUserInfoFromToken = () => {
    try {
      console.log('👤 UserBooking: Getting user info...');
      
      // Priority 1: Get user directly from localStorage (exactly how auth login saves it)
      const userStr = localStorage.getItem('user');
      if (userStr && userStr !== 'null') {
        try {
          const userObj = JSON.parse(userStr);
          console.log('🔍 UserBooking: Parsed user object:', {
            hasId: !!userObj.id,
            hasEmail: !!userObj.email,
            hasUsername: !!userObj.username,
            email: userObj.email,
            username: userObj.username
          });
          
          if (userObj.id && userObj.email) {
            console.log('✅ UserBooking: User info from localStorage[user]');
            return {
              id: userObj.id,
              _id: userObj.id, // Backend expects _id
              email: userObj.email,
              username: userObj.username || userObj.email,
              name: userObj.name || userObj.username || userObj.first_name || userObj.email,
              role: userObj.role || 'user'
            };
          }
        } catch (parseError) {
          console.log('⚠️ UserBooking: Failed to parse user from localStorage:', parseError.message);
        }
      }
      
      // Priority 2: Try to decode from JWT token if available
      const token = getAuthToken();
      if (token && token.includes('.') && token.split('.').length === 3) {
        try {
          const parts = token.split('.');
          const base64Url = parts[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join(''));
          const payload = JSON.parse(jsonPayload);
          
          console.log('✅ UserBooking: User info from JWT token payload');
          return {
            id: payload.id || payload.user_id || payload.sub,
            _id: payload.id || payload.user_id || payload.sub, // Backend expects _id
            email: payload.email,
            username: payload.username || payload.name,
            name: payload.name || payload.username,
            role: payload.role || 'user'
          };
        } catch (error) {
          console.error('❌ UserBooking: Failed to decode JWT token:', error.message);
        }
      }
      
      console.log('❌ UserBooking: No user info found anywhere');
      return null;
      
    } catch (error) {
      console.error('❌ UserBooking: Error getting user info:', error);
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
        userId: userInfo?.id || 'none'
      });
      
      const isLoggedIn = !!(token && userInfo);
      
      setAuthStatus({
        isLoggedIn: isLoggedIn,
        user: userInfo
      });

      if (!isLoggedIn) {
        setError('Please log in to view your bookings. You must log in through the login page to get a valid authentication token.');
        setLoading(false);
      } else {
        // Clear any invalid stored data
        localStorage.removeItem('jwt');
      }
    };

    checkAuth();
    
    // Listen for storage changes (login/logout in other tabs)
    const handleStorageChange = (e) => {
      console.log('💾 UserBooking: Storage changed:', e.key, 'New value exists:', !!e.newValue);
      if (e.key && ['token', 'authToken', 'jwt', 'access_token', 'user'].includes(e.key)) {
        checkAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // ✅ COMPLETELY FIXED: Enhanced Fetch user's bookings with backend-matching endpoints
  const fetchUserBookings = async () => {
    if (!authStatus.isLoggedIn) {
      console.log('❌ UserBookings: Cannot fetch bookings - user not logged in');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const authToken = getValidJWTToken();
      
      console.log('🚀 UserBookings: Starting fetchUserBookings with complete debug:', {
        tokenExists: !!authToken,
        tokenLength: authToken ? authToken.length : 0,
        isValidJWT: authToken ? (authToken.includes('.') && authToken.split('.').length === 3) : false,
        tokenPreview: authToken ? authToken.substring(0, 30) + '...' : 'none',
        userEmail: authStatus.user?.email,
        userId: authStatus.user?.id
      });
      
      if (!authToken) {
        throw new Error('No authentication token found in storage');
      }

      // ✅ FIXED: Try endpoints in order based on backend routes
      const possibleEndpoints = [
        `${API_BASE_URL}/api/parking/my-bookings`,      // Primary endpoint from backend
        `${API_BASE_URL}/api/parking/bookings`,         // Alternative endpoint that worked
        `${API_BASE_URL}/api/parking/user-bookings`     // Fallback endpoint
      ];

      let lastError = null;
      let successfulResponse = null;

      // Try each endpoint until we find one that works
      for (const endpoint of possibleEndpoints) {
        try {
          console.log(`🌐 UserBookings: Trying endpoint: ${endpoint}`);

          const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`,
              'Accept': 'application/json'
            }
          });

          console.log(`📡 UserBookings: Response from ${endpoint}:`, {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            headers: {
              contentType: response.headers.get('content-type'),
              contentLength: response.headers.get('content-length')
            }
          });

          if (response.ok) {
            successfulResponse = { response, endpoint };
            break;
          } else if (response.status === 401) {
            // Authentication failed - clear token and redirect
            console.error('❌ UserBookings: Authentication failed - clearing tokens');
            localStorage.removeItem('user');
            localStorage.removeItem('jwt');
            localStorage.removeItem('token');
            throw new Error('Authentication failed. Please log in again.');
          } else if (response.status !== 404) {
            // If it's not a 404, try to get error details
            try {
              const errorData = await response.json();
              lastError = new Error(errorData.message || `HTTP ${response.status} from ${endpoint}`);
              console.error(`❌ UserBookings: Error from ${endpoint}:`, errorData);
            } catch (parseError) {
              lastError = new Error(`HTTP ${response.status} from ${endpoint}`);
            }
          }

        } catch (networkError) {
          console.error(`❌ UserBookings: Network error for ${endpoint}:`, networkError.message);
          lastError = networkError;
          continue; // Try next endpoint
        }
      }

      // If no endpoint worked, throw the last error
      if (!successfulResponse) {
        throw lastError || new Error('All booking endpoints failed. Please check if the backend is running and accessible.');
      }

      // Parse successful response
      let data;
      try {
        data = await successfulResponse.response.json();
      } catch (parseError) {
        console.error('❌ UserBookings: Failed to parse response JSON');
        throw new Error('Invalid response format from server');
      }
      
      console.log('✅ UserBookings: Successful API Response:', {
        endpoint: successfulResponse.endpoint,
        success: data.success,
        dataExists: !!data.data,
        dataType: data.data ? (Array.isArray(data.data) ? 'array' : typeof data.data) : 'null',
        dataCount: Array.isArray(data.data) ? data.data.length : 'not array',
        message: data.message,
        hasBookings: data.bookings ? 'bookings field exists' : 'no bookings field'
      });
      
      // ✅ FIXED: Handle different response structures from backend
      let bookingsArray = [];
      
      if (data.success && data.data) {
        bookingsArray = Array.isArray(data.data) ? data.data : [];
      } else if (data.success && data.bookings) {
        // Alternative response structure
        bookingsArray = Array.isArray(data.bookings) ? data.bookings : [];
      } else if (data.success && !data.data) {
        // Success but no data means empty bookings
        console.log('✅ UserBookings: No bookings found for user (empty result)');
        bookingsArray = [];
      } else if (!data.success) {
        console.warn('⚠️ UserBookings: API returned success=false:', data);
        throw new Error(data.message || data.error || 'Failed to fetch booking data from server');
      }

      // ✅ FIXED: Enhanced data processing to handle different field structures
      const processedBookings = bookingsArray.map(booking => ({
        ...booking,
        // Ensure consistent field names
        our_reference: booking.our_reference || booking.booking_reference,
        booking_reference: booking.booking_reference || booking.our_reference,
        
        // Handle nested structures
        dropoff_date: booking.dropoff_date || booking.travel_details?.dropoff_date,
        dropoff_time: booking.dropoff_time || booking.travel_details?.dropoff_time,
        pickup_date: booking.pickup_date || booking.travel_details?.pickup_date,
        pickup_time: booking.pickup_time || booking.travel_details?.pickup_time,
        
        // Customer details
        customer_email: booking.customer_email || booking.customer_details?.customer_email,
        customer_name: booking.customer_name || booking.customer_details?.customer_name,
        
        // Vehicle details
        vehicle_registration: booking.vehicle_registration || booking.car_registration_number,
        
        // Service features (default to true for better UX)
        is_cancelable: booking.is_cancelable !== false,
        is_editable: booking.is_editable !== false,
        
        // Status processing
        display_status: booking.status,
        status_class: booking.status
      }));
        
      setUserBookings(processedBookings);
      setFilteredBookings(processedBookings);
      setError(null);
      
      console.log('✅ UserBookings: Bookings loaded and processed successfully:', {
        count: processedBookings.length,
        endpoint: successfulResponse.endpoint,
        sampleBooking: processedBookings[0] ? {
          ref: processedBookings[0].our_reference,
          status: processedBookings[0].status,
          cancelable: processedBookings[0].is_cancelable,
          editable: processedBookings[0].is_editable
        } : null
      });

    } catch (error) {
      console.error('❌ UserBookings: Complete error in fetchUserBookings:', {
        name: error.name,
        message: error.message,
        stack: error.stack?.substring(0, 300),
        authStatus: authStatus.isLoggedIn,
        hasToken: !!getAuthToken(),
        timestamp: new Date().toISOString()
      });
      
      // Enhanced error handling with user-friendly messages
      let userFriendlyMessage = error.message;
      
      if (error.message.includes('endpoints failed') || error.message.includes('All booking endpoints failed')) {
        userFriendlyMessage = 'Unable to connect to booking service. Please check if the backend server is running and accessible.';
      } else if (error.message.includes('Authentication failed') || error.message.includes('session') || error.message.includes('token')) {
        userFriendlyMessage = 'Your login session has expired. Please log in again.';
        // Clear auth data
        localStorage.removeItem('user');
        localStorage.removeItem('jwt');
        localStorage.removeItem('token');
        setUserBookings([]);
        setFilteredBookings([]);
        setAuthStatus({ isLoggedIn: false, user: null });
      } else if (error.message.includes('fetch') || error.message.includes('network')) {
        userFriendlyMessage = 'Network connection error. Please check your internet connection and try again.';
      } else if (error.message.includes('Invalid response format')) {
        userFriendlyMessage = 'Server returned invalid data format. Please contact support if this persists.';
      }
      
      setError(`Failed to load bookings: ${userFriendlyMessage}`);
      
    } finally {
      setLoading(false);
    }
  };

  // NEW: Handle Cancel Booking
  const handleCancelBooking = async (booking) => {
    setSelectedBooking(booking);
    setModalType('cancel');
    setShowModal(true);
    setCancelReason('');
    setActionResult(null);
  };

  // NEW: Handle Amend Booking
  const handleAmendBooking = async (booking) => {
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
        title: booking.customer_details?.title || booking.title || '',
        first_name: booking.customer_details?.first_name || booking.first_name || '',
        last_name: booking.customer_details?.last_name || booking.last_name || '',
        customer_email: booking.customer_details?.customer_email || booking.customer_email || '',
        phone_number: booking.customer_details?.phone_number || booking.phone_number || '',
        departure_flight_number: booking.departure_flight_number || '',
        arrival_flight_number: booking.arrival_flight_number || '',
        departure_terminal: booking.departure_terminal || '',
        arrival_terminal: booking.arrival_terminal || '',
        car_registration_number: booking.vehicle_details?.car_registration_number || booking.car_registration_number || '',
        car_make: booking.vehicle_details?.car_make || booking.car_make || '',
        car_model: booking.vehicle_details?.car_model || booking.car_model || '',
        car_color: booking.vehicle_details?.car_color || booking.car_color || ''
      });
    }
  };

  // ✅ COMPLETELY FIXED: Process Cancel/Amend Action with backend-matching authentication
  const processBookingAction = async () => {
    if (!selectedBooking || !modalType) return;

    setProcessingAction(true);
    setActionResult(null);

    try {
      const authToken = getValidJWTToken();
      if (!authToken) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      console.log('🔑 UserBooking: Using auth token for action:', {
        hasToken: !!authToken,
        tokenLength: authToken.length,
        isJWT: authToken.includes('.') && authToken.split('.').length === 3,
        action: modalType,
        bookingRef: selectedBooking.our_reference || selectedBooking.booking_reference
      });

      if (modalType === 'cancel') {
        console.log('🗑️ UserBooking: Cancelling booking:', selectedBooking.our_reference || selectedBooking.booking_reference);
        
        // ✅ FIXED: Use exact payload structure that backend expects
        const cancelPayload = {
          booking_reference: selectedBooking.our_reference || selectedBooking.booking_reference,
          cancellation_reason: cancelReason || 'User requested cancellation'
        };

        console.log('📤 Sending cancel request with payload:', cancelPayload);
        
        const response = await fetch(`${API_BASE_URL}/api/parking/cancel-booking`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
            'Accept': 'application/json'
          },
          body: JSON.stringify(cancelPayload)
        });

        console.log('📡 Cancel response:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        });

        let result;
        try {
          result = await response.json();
          console.log('📋 Cancel response data:', result);
        } catch (parseError) {
          console.error('❌ Failed to parse cancel response JSON');
          throw new Error(`HTTP ${response.status}: Unable to parse response`);
        }

        if (response.ok && result.success) {
          console.log('✅ Cancel successful:', result);
          setActionResult({
            success: true,
            type: 'cancel',
            message: result.message || 'Booking cancelled successfully! Refund will be processed within 3-5 business days.',
            data: result.booking || result.data
          });
          
          // Refresh user bookings
          await fetchUserBookings();
        } else {
          const errorMessage = result?.message || result?.error || `HTTP ${response.status}`;
          console.error('❌ Cancel failed:', errorMessage);
          throw new Error(errorMessage);
        }

      } else if (modalType === 'amend') {
        console.log('✏️ UserBooking: Amending booking:', selectedBooking.our_reference || selectedBooking.booking_reference);
        
        // ✅ FIXED: Use exact payload structure that backend expects (with new_ prefix)
        const amendPayload = {
          booking_reference: selectedBooking.our_reference || selectedBooking.booking_reference,
          amendment_reason: cancelReason || 'User requested changes'
        };

        // Add only non-empty fields with 'new_' prefix (as expected by backend)
        Object.keys(amendFormData).forEach(key => {
          if (amendFormData[key] && amendFormData[key] !== '' && amendFormData[key] !== null) {
            amendPayload[`new_${key}`] = amendFormData[key];
          }
        });

        console.log('📤 Sending amend request with payload keys:', Object.keys(amendPayload));

        const response = await fetch(`${API_BASE_URL}/api/parking/amend-booking`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
            'Accept': 'application/json'
          },
          body: JSON.stringify(amendPayload)
        });

        console.log('📡 Amend response:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        });

        let result;
        try {
          result = await response.json();
          console.log('📋 Amend response data:', result);
        } catch (parseError) {
          console.error('❌ Failed to parse amend response JSON');
          throw new Error(`HTTP ${response.status}: Unable to parse response`);
        }
        
        if (response.ok && result.success) {
          console.log('✅ Amend successful:', result);
          setActionResult({
            success: true,
            type: 'amend',
            message: result.message || 'Booking amended successfully! Your changes have been saved.',
            data: result.booking || result.data
          });
          
          // Refresh user bookings
          await fetchUserBookings();
        } else {
          const errorMessage = result?.message || result?.error || `HTTP ${response.status}`;
          console.error('❌ Amend failed:', errorMessage);
          throw new Error(errorMessage);
        }
      }

    } catch (error) {
      console.error(`❌ UserBooking: Error ${modalType}ing booking:`, {
        name: error.name,
        message: error.message,
        stack: error.stack?.substring(0, 500)
      });
      
      setActionResult({
        success: false,
        type: modalType,
        message: error.message || `Failed to ${modalType} booking`,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setProcessingAction(false);
    }
  };

  // NEW: Handle amend form changes
  const handleAmendFormChange = (field, value) => {
    setAmendFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Delete booking (only cancelled ones)
  const deleteBooking = async (bookingReference, reason) => {
    try {
      setProcessingAction(true);
      const authToken = getValidJWTToken();

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
          prevBookings.filter(booking => 
            (booking.our_reference || booking.booking_reference) !== bookingReference
          )
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
        (booking.our_reference || booking.booking_reference || '').toLowerCase().includes(query) ||
        (booking.magr_reference || '').toLowerCase().includes(query) ||
        (booking.product_name || '').toLowerCase().includes(query) ||
        (booking.vehicle_registration || booking.car_registration_number || '').toLowerCase().includes(query) ||
        (booking.airport_code || '').toLowerCase().includes(query)
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
        const aDate = b.dropoff_date || b.travel_details?.dropoff_date;
        const bDate = a.dropoff_date || a.travel_details?.dropoff_date;
        return new Date(aDate) - new Date(bDate);
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
      userId: authStatus.user?.id
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
      'payment_failed': 'ub-status-badge ub-failed',
      'amended': 'ub-status-badge ub-amended'
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
            <p>Please log in through the login page to get a valid authentication token</p>
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
            {filteredBookings.map((booking, index) => (
              <div key={booking.id || index} className="ub-booking-card">
                <div className="ub-card-header">
                  <div className="ub-booking-reference">
                    <strong>#{booking.our_reference || booking.booking_reference}</strong>
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
                    
                    {/* NEW: Cancel Button */}
                    {booking.status === 'confirmed' && (booking.is_cancelable !== false) && (
                      <button
                        className="ub-action-btn ub-cancel"
                        onClick={() => handleCancelBooking(booking)}
                        title="Cancel Booking"
                      >
                        <XCircle size={14} />
                      </button>
                    )}
                    
                    {/* NEW: Amend Button */}
                    {booking.status === 'confirmed' && (booking.is_editable !== false) && (
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
                        <span>Drop-off: {formatDateOnly(booking.dropoff_date || booking.travel_details?.dropoff_date)} at {booking.dropoff_time || booking.travel_details?.dropoff_time}</span>
                      </div>
                      <div className="ub-detail-row">
                        <Calendar size={14} />
                        <span>Pick-up: {formatDateOnly(booking.pickup_date || booking.travel_details?.pickup_date)} at {booking.pickup_time || booking.travel_details?.pickup_time}</span>
                      </div>
                      {(booking.vehicle_registration || booking.car_registration_number) && (
                        <div className="ub-detail-row">
                          <Car size={14} />
                          <span>{booking.vehicle_registration || booking.car_registration_number}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="ub-payment-info">
                    <div className="ub-amount">
                      {formatCurrency(booking.booking_amount || booking.price)}
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
                  
                  {/* NEW: Booking capabilities indicators */}
                  <div className="ub-booking-capabilities">
                    {(booking.is_cancelable !== false) && booking.status === 'confirmed' && (
                      <span className="ub-capability-badge cancelable" title="Cancellable">
                        <XCircle size={10} />
                      </span>
                    )}
                    {(booking.is_editable !== false) && booking.status === 'confirmed' && (
                      <span className="ub-capability-badge editable" title="Amendable">
                        <Edit size={10} />
                      </span>
                    )}
                    {booking.is_test_payment && (
                      <span className="ub-capability-badge test-mode" title="Test Mode">
                        TEST
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Enhanced Modal */}
      {showModal && selectedBooking && (
        <div className="ub-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="ub-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="ub-modal-header">
              <h2>
                {modalType === 'view' && 'Booking Details'}
                {modalType === 'cancel' && 'Cancel Booking'}
                {modalType === 'amend' && 'Amend Booking'}
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
                        <span>{selectedBooking.our_reference || selectedBooking.booking_reference}</span>
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
                        <span>{formatDateOnly(selectedBooking.dropoff_date || selectedBooking.travel_details?.dropoff_date)} at {selectedBooking.dropoff_time || selectedBooking.travel_details?.dropoff_time}</span>
                      </div>
                      <div className="ub-detail-item">
                        <label>Pick-up</label>
                        <span>{formatDateOnly(selectedBooking.pickup_date || selectedBooking.travel_details?.pickup_date)} at {selectedBooking.pickup_time || selectedBooking.travel_details?.pickup_time}</span>
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
                  {(selectedBooking.vehicle_registration || selectedBooking.car_registration_number) && (
                    <div className="ub-detail-section">
                      <h3>Vehicle Information</h3>
                      <div className="ub-detail-grid">
                        <div className="ub-detail-item">
                          <label>Registration</label>
                          <span>{selectedBooking.vehicle_registration || selectedBooking.car_registration_number}</span>
                        </div>
                        {(selectedBooking.car_make || selectedBooking.vehicle_details?.car_make) && (
                          <div className="ub-detail-item">
                            <label>Make</label>
                            <span>{selectedBooking.car_make || selectedBooking.vehicle_details?.car_make}</span>
                          </div>
                        )}
                        {(selectedBooking.car_model || selectedBooking.vehicle_details?.car_model) && (
                          <div className="ub-detail-item">
                            <label>Model</label>
                            <span>{selectedBooking.car_model || selectedBooking.vehicle_details?.car_model}</span>
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
                        <span className="ub-amount-highlight">{formatCurrency(selectedBooking.booking_amount || selectedBooking.price)}</span>
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
                      {(selectedBooking.is_cancelable !== false) && (
                        <div className="ub-feature-item">
                          <XCircle size={16} />
                          <span>Cancellable</span>
                        </div>
                      )}
                      {(selectedBooking.is_editable !== false) && (
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
                    {selectedBooking.status === 'confirmed' && (selectedBooking.is_cancelable !== false) && (
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
                    
                    {selectedBooking.status === 'confirmed' && (selectedBooking.is_editable !== false) && (
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
                            title: selectedBooking.customer_details?.title || selectedBooking.title || '',
                            first_name: selectedBooking.customer_details?.first_name || selectedBooking.first_name || '',
                            last_name: selectedBooking.customer_details?.last_name || selectedBooking.last_name || '',
                            customer_email: selectedBooking.customer_details?.customer_email || selectedBooking.customer_email || '',
                            phone_number: selectedBooking.customer_details?.phone_number || selectedBooking.phone_number || '',
                            departure_flight_number: selectedBooking.departure_flight_number || '',
                            arrival_flight_number: selectedBooking.arrival_flight_number || '',
                            departure_terminal: selectedBooking.departure_terminal || '',
                            arrival_terminal: selectedBooking.arrival_terminal || '',
                            car_registration_number: selectedBooking.vehicle_details?.car_registration_number || selectedBooking.car_registration_number || '',
                            car_make: selectedBooking.vehicle_details?.car_make || selectedBooking.car_make || '',
                            car_model: selectedBooking.vehicle_details?.car_model || selectedBooking.car_model || '',
                            car_color: selectedBooking.vehicle_details?.car_color || selectedBooking.car_color || ''
                          });
                        }}
                      >
                        <Edit size={16} />
                        Amend Booking
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
                        </div>
                      </div>

                      <div className="ub-booking-summary">
                        <div className="ub-summary-item">
                          <span>Service:</span>
                          <span>{selectedBooking.product_name}</span>
                        </div>
                        <div className="ub-summary-item">
                          <span>Amount:</span>
                          <span>{formatCurrency(selectedBooking.booking_amount || selectedBooking.price)}</span>
                        </div>
                        <div className="ub-summary-item">
                          <span>Refund Amount:</span>
                          <span>{formatCurrency(selectedBooking.booking_amount || selectedBooking.price)}</span>
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
                              <small>Current: {selectedBooking.customer_details?.title || selectedBooking.title}</small>
                            </div>
                            <div className="ub-form-group">
                              <label>First Name</label>
                              <input
                                type="text"
                                value={amendFormData.first_name}
                                onChange={(e) => handleAmendFormChange('first_name', e.target.value)}
                                placeholder={selectedBooking.customer_details?.first_name || selectedBooking.first_name}
                              />
                              <small>Current: {selectedBooking.customer_details?.first_name || selectedBooking.first_name}</small>
                            </div>
                            <div className="ub-form-group">
                              <label>Last Name</label>
                              <input
                                type="text"
                                value={amendFormData.last_name}
                                onChange={(e) => handleAmendFormChange('last_name', e.target.value)}
                                placeholder={selectedBooking.customer_details?.last_name || selectedBooking.last_name}
                              />
                              <small>Current: {selectedBooking.customer_details?.last_name || selectedBooking.last_name}</small>
                            </div>
                            <div className="ub-form-group">
                              <label>Email</label>
                              <input
                                type="email"
                                value={amendFormData.customer_email}
                                onChange={(e) => handleAmendFormChange('customer_email', e.target.value)}
                                placeholder={selectedBooking.customer_details?.customer_email || selectedBooking.customer_email}
                              />
                              <small>Current: {selectedBooking.customer_details?.customer_email || selectedBooking.customer_email}</small>
                            </div>
                            <div className="ub-form-group">
                              <label>Phone</label>
                              <input
                                type="tel"
                                value={amendFormData.phone_number}
                                onChange={(e) => handleAmendFormChange('phone_number', e.target.value)}
                                placeholder={selectedBooking.customer_details?.phone_number || selectedBooking.phone_number}
                              />
                              <small>Current: {selectedBooking.customer_details?.phone_number || selectedBooking.phone_number}</small>
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
                                placeholder={selectedBooking.departure_flight_number}
                              />
                              <small>Current: {selectedBooking.departure_flight_number}</small>
                            </div>
                            <div className="ub-form-group">
                              <label>Arrival Flight</label>
                              <input
                                type="text"
                                value={amendFormData.arrival_flight_number}
                                onChange={(e) => handleAmendFormChange('arrival_flight_number', e.target.value)}
                                placeholder={selectedBooking.arrival_flight_number}
                              />
                              <small>Current: {selectedBooking.arrival_flight_number}</small>
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
                              <small>Current: {selectedBooking.departure_terminal}</small>
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
                              <small>Current: {selectedBooking.arrival_terminal}</small>
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
                                placeholder={selectedBooking.vehicle_details?.car_make || selectedBooking.car_make}
                              />
                              <small>Current: {selectedBooking.vehicle_details?.car_make || selectedBooking.car_make}</small>
                            </div>
                            <div className="ub-form-group">
                              <label>Model</label>
                              <input
                                type="text"
                                value={amendFormData.car_model}
                                onChange={(e) => handleAmendFormChange('car_model', e.target.value)}
                                placeholder={selectedBooking.vehicle_details?.car_model || selectedBooking.car_model}
                              />
                              <small>Current: {selectedBooking.vehicle_details?.car_model || selectedBooking.car_model}</small>
                            </div>
                            <div className="ub-form-group">
                              <label>Color</label>
                              <input
                                type="text"
                                value={amendFormData.car_color}
                                onChange={(e) => handleAmendFormChange('car_color', e.target.value)}
                                placeholder={selectedBooking.vehicle_details?.car_color || selectedBooking.car_color}
                              />
                              <small>Current: {selectedBooking.vehicle_details?.car_color || selectedBooking.car_color}</small>
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
                    <div className="ub-warning-message">
                      <AlertCircle size={24} />
                      <div>
                        <h4>Delete Booking Record</h4>
                        <p>This will permanently remove this booking from your history. Only cancelled bookings can be deleted.</p>
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
                          onClick={() => deleteBooking(selectedBooking.our_reference || selectedBooking.booking_reference, cancelReason)}
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
                      
                      <h2>{actionResult.type === 'cancel' ? '✅ Booking Cancelled Successfully!' : '✅ Booking Updated Successfully!'}</h2>
                      <p>{actionResult.message}</p>
                      
                      {actionResult.data && (
                        <div className="ub-result-details">
                          <div className="ub-detail-row">
                            <span>Reference:</span>
                            <strong>{actionResult.data.our_reference || actionResult.data.booking_reference || actionResult.data.reference}</strong>
                          </div>
                          {actionResult.data.refund_amount && (
                            <div className="ub-detail-row">
                              <span>Refund Amount:</span>
                              <strong>£{actionResult.data.refund_amount}</strong>
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
                      
                      <h2>❌ {actionResult.type === 'cancel' ? 'Cancellation Failed' : 'Amendment Failed'}</h2>
                      <p>{actionResult.message}</p>
                      
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
                      </div>
                    </>
                  )}
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