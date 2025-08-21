import React, { useState, useEffect, useCallback, useRef } from "react";
import { 
  MapPin, Zap, Grid3X3, Map, Search, Clock, Star, ChevronRight, 
  X, Loader2, Plane, Calendar, Users, Car, Shield, Wifi, Camera, 
  CheckCircle, AlertCircle, Navigation, Home, Settings, Bell,
  Phone, Mail, CreditCard, Globe, Award, Lock, Info
} from "lucide-react";
import "./home.css";

const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoicGFya3N5dWsiLCJhIjoiY21kODNsaG0yMGw3bzJscXN1bmlkbHk4ZiJ9.DaA0-wfNgf-1PIhJyHXCxg';

// Enhanced Stripe loader with better error handling
const loadStripe = async () => {
  if (window.Stripe) return window.Stripe;

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.onload = () => {
      if (window.Stripe) {
        console.log('✅ Stripe.js loaded successfully');
        resolve(window.Stripe);
      } else {
        reject(new Error('Stripe.js failed to load properly'));
      }
    };
    script.onerror = () => {
      reject(new Error('Failed to load Stripe.js script'));
    };
    document.head.appendChild(script);
  });
};

const ProfessionalParksyDashboard = () => {
  // API Configuration - Fixed to deployed backend only
  const API_BASE_URL = "https://parksy-backend.onrender.com";
  
  // Enhanced Stripe Configuration with better test mode handling
  const [stripe, setStripe] = useState(null);
  const [stripePublishableKey, setStripePublishableKey] = useState(null);
  const [stripeConfig, setStripeConfig] = useState(null);
  const [isStripeTestMode, setIsStripeTestMode] = useState(false);
  const [testCardInfo, setTestCardInfo] = useState(null);
  const [paymentIntentId, setPaymentIntentId] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentStep, setPaymentStep] = useState(1);

  // Enhanced Stripe Elements state
  const [elements, setElements] = useState(null);
  const [cardElement, setCardElement] = useState(null);
  const [cardError, setCardError] = useState(null);
  const [cardComplete, setCardComplete] = useState(false);
  const [showTestCards, setShowTestCards] = useState(false);

  // Map references
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(null);
  
  // Airport images with high-quality visuals
  const airportImages = {
    'LHR': 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1200&auto=format&fit=crop&q=80',
    'LGW': 'https://images.unsplash.com/photo-1474302770737-173ee21bab63?w=1200&auto=format&fit=crop&q=80',
    'STN': 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=1200&auto=format&fit=crop&q=80',
    'LTN': 'https://images.unsplash.com/photo-1569354891445-466e95d9c516?w=1200&auto=format&fit=crop&q=80',
    'MAN': 'https://images.unsplash.com/photo-1517479149777-5f3b1511d5ad?w=1200&auto=format&fit=crop&q=80',
    'BHX': 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=1200&auto=format&fit=crop&q=80',
    'EDI': 'https://images.unsplash.com/photo-1539650116574-75c0c6d73a0e?w=1200&auto=format&fit=crop&q=80',
    'GLA': 'https://images.unsplash.com/photo-1473625247510-8ceb1760943f?w=1200&auto=format&fit=crop&q=80'
  };

  // State Management
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("boxes");
  const [isLoading, setIsLoading] = useState(false);
  const [bookingStep, setBookingStep] = useState(1);
  const [bookingStatus, setBookingStatus] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [parkingProducts, setParkingProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [availableAirports, setAvailableAirports] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [currentLocation, setCurrentLocation] = useState("Detecting location...");
  const [showAirplaneAnimation, setShowAirplaneAnimation] = useState(true);
  const [authStatus, setAuthStatus] = useState({ isLoggedIn: false, user: null });

  // Search Parameters - Fixed: Must be at least 48+ hours in advance
  const [searchParams, setSearchParams] = useState({
    airport_code: "LHR",
    dropoff_date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0], // Day after tomorrow
    dropoff_time: "09:00",
    pickup_date: new Date(Date.now() + 9 * 86400000).toISOString().split('T')[0], // 9 days later
    pickup_time: "18:00"
  });

  // Enhanced Booking Details
  const [bookingDetails, setBookingDetails] = useState({
    title: "Mr",
    first_name: "",
    last_name: "",
    customer_email: "",
    phone_number: "",
    departure_flight_number: "",
    arrival_flight_number: "",
    departure_terminal: "Terminal 1",
    arrival_terminal: "Terminal 1",
    car_registration_number: "",
    car_make: "",
    car_model: "",
    car_color: "",
    passenger: 1,
    paymentgateway: "Stripe"
  });

  // ========== ENHANCED AUTHENTICATION FUNCTIONS ==========

  // ✅ IMPROVED getAuthToken function with enhanced token detection
  const getAuthToken = () => {
 try {
   // Check all possible localStorage keys
   const localStorageKeys = [
     'token', 'authToken', 'jwt', 'access_token', 
     'auth_token', 'userToken', 'accessToken',
     'parksy_token', 'user_token', 'bearer_token'
   ];
   
   for (const key of localStorageKeys) {
     const token = localStorage.getItem(key);
     if (token && token !== 'null' && token !== 'undefined' && token.length > 10) {
       console.log(`🔑 Found token in localStorage.${key}, length:`, token.length);
       
       // Handle JSON token format
       if (token.startsWith('{')) {
         const parsed = JSON.parse(token);
         if (parsed.id && parsed.email) {
           const userData = { id: parsed.id, email: parsed.email, exp: Math.floor(Date.now()/1000) + 86400 };
           const mockJWT = btoa(JSON.stringify({typ:'JWT'})) + '.' + btoa(JSON.stringify(userData)) + '.demo';
           return mockJWT;
         }
       }
       return token;
     }
   }

      // Check sessionStorage
      const sessionStorageKeys = [
        'token', 'authToken', 'jwt', 'access_token',
        'auth_token', 'userToken', 'accessToken'
      ];
      
      for (const key of sessionStorageKeys) {
        const token = sessionStorage.getItem(key);
        if (token && token !== 'null' && token !== 'undefined' && token.length > 10) {
          console.log(`🔑 Found token in sessionStorage.${key}, length:`, token.length);
          return token;
        }
      }

      // Check cookies as fallback
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (['token', 'authToken', 'jwt', 'access_token'].includes(name) && value && value.length > 10) {
          console.log(`🔑 Found token in cookie.${name}, length:`, value.length);
          return decodeURIComponent(value);
        }
      }

      console.log('❌ No valid authentication token found in any storage');
      return null;
    } catch (error) {
      console.error('❌ Error accessing browser storage:', error);
      return null;
    }
  };

  const isUserLoggedIn = () => {
    const token = getAuthToken();
    const isLoggedIn = !!token;
    console.log('🔐 Login check:', { hasToken: isLoggedIn, tokenLength: token?.length || 0 });
    return isLoggedIn;
  };

  const getUserInfoFromToken = () => {
    const token = getAuthToken();
    if (!token) {
      console.log('❌ No token available for decoding');
      return null;
    }
    
    try {
      let payload;
      
      if (token.includes('.')) {
        // JWT format
        const base64Url = token.split('.')[1];
        if (!base64Url) {
          throw new Error('Invalid JWT format');
        }
        
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        payload = JSON.parse(jsonPayload);
        console.log('✅ JWT token decoded successfully');
      } else {
        // Try direct JSON parsing for non-JWT tokens
        payload = JSON.parse(atob(token));
        console.log('✅ Base64 token decoded successfully');
      }
      
      console.log('👤 User info extracted:', {
        id: payload.id || payload.user_id || payload.sub,
        email: payload.email,
        name: payload.name || payload.username,
        exp: payload.exp ? new Date(payload.exp * 1000) : null
      });
      
      return payload;
    } catch (error) {
      console.error('❌ Error decoding token:', error.message);
      return null;
    }
  };

  // ✅ ADD debugging function to help troubleshoot
  const debugAuthenticationIssues = () => {
    console.log('🔍 DEBUGGING AUTHENTICATION ISSUES:');
    console.log('1. Token Storage Check:');
    
    // Check localStorage
    const localKeys = ['token', 'authToken', 'jwt', 'access_token'];
    localKeys.forEach(key => {
      const value = localStorage.getItem(key);
      console.log(`   localStorage.${key}:`, value ? `${value.substring(0, 20)}... (${value.length} chars)` : 'null');
    });
    
    // Check sessionStorage
    localKeys.forEach(key => {
      const value = sessionStorage.getItem(key);
      console.log(`   sessionStorage.${key}:`, value ? `${value.substring(0, 20)}... (${value.length} chars)` : 'null');
    });
    
    // Check auth status
    const token = getAuthToken();
    console.log('2. Auth Status:', {
      hasToken: !!token,
      tokenLength: token?.length || 0,
      isLoggedIn: isUserLoggedIn(),
      userInfo: getUserInfoFromToken()
    });
    
    // Check API connectivity
    console.log('3. API Connectivity:');
    console.log(`   Backend URL: ${API_BASE_URL}`);
    console.log(`   Connection Status: ${connectionStatus}`);
    console.log(`   Stripe Status: ${stripe ? 'Ready' : 'Not Ready'}`);
  };

  // Call this function when you need to debug authentication issues
  if (typeof window !== 'undefined') {
    window.debugAuth = debugAuthenticationIssues;
  }

  // Check authentication status on component mount
  useEffect(() => {
    const checkAuth = () => {
      console.log('🔍 Checking authentication status...');
      
      const isLoggedIn = isUserLoggedIn();
      const userInfo = getUserInfoFromToken();
      
      setAuthStatus({
        isLoggedIn: isLoggedIn,
        user: userInfo
      });

      console.log('🔐 Final Authentication Status:', {
        isLoggedIn: isLoggedIn,
        userEmail: userInfo?.email || 'Not available',
        userId: userInfo?.id || userInfo?.user_id || userInfo?.sub || 'Not available',
        tokenExists: !!getAuthToken(),
        hasValidUserInfo: !!userInfo
      });
    };

    checkAuth();
    
    // Listen for storage changes (login/logout in other tabs)
    const handleStorageChange = (e) => {
      console.log('💾 Storage changed:', e.key, 'New value exists:', !!e.newValue);
      if (e.key && ['token', 'authToken', 'jwt', 'access_token'].includes(e.key)) {
        checkAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // ========== ENHANCED STRIPE INITIALIZATION ==========

  useEffect(() => {
    const initializeStripe = async () => {
      try {
        console.log('🔄 Initializing Stripe with enhanced error handling...');
        
        // Step 1: Get Stripe config from backend
        const response = await fetch(`${API_BASE_URL}/api/parking/stripe-config`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Failed to fetch Stripe config`);
        }

        const configData = await response.json();
        
        if (!configData.success || !configData.publishable_key) {
          throw new Error('Invalid Stripe configuration received from backend');
        }
        
        console.log('✅ Got Stripe config:', {
          hasPublishableKey: !!configData.publishable_key,
          isTestMode: configData.is_test_mode,
          stripeMode: configData.stripe_mode,
          hasTestCardInfo: !!configData.test_card_info
        });

        // Store configuration
        setStripeConfig(configData);
        setStripePublishableKey(configData.publishable_key);
        setIsStripeTestMode(configData.is_test_mode || false);
        setTestCardInfo(configData.test_card_info);
        
        // Step 2: Load Stripe.js
        console.log('🔄 Loading Stripe.js...');
        const stripeInstance = await loadStripe();
        
        if (!stripeInstance) {
          throw new Error('Failed to load Stripe.js');
        }

        // Step 3: Initialize Stripe client
        console.log('🔄 Initializing Stripe client...');
        const stripeClient = stripeInstance(configData.publishable_key);
        
        if (!stripeClient) {
          throw new Error('Failed to initialize Stripe client');
        }

        setStripe(stripeClient);
        
        console.log(`✅ Stripe initialized successfully in ${configData.is_test_mode ? 'TEST' : 'LIVE'} mode`);
        
        if (configData.is_test_mode) {
          console.log('🧪 TEST MODE ACTIVE - Test cards available:', configData.test_card_info);
        } else {
          console.log('🔴 LIVE MODE - Real payments will be processed');
        }
        
      } catch (error) {
        console.error('❌ Stripe initialization error:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
        setApiError(`Stripe setup error: ${error.message}`);
      }
    };

    if (connectionStatus === 'connected') {
      initializeStripe();
    }
  }, [connectionStatus, API_BASE_URL]);

  // ========== ENHANCED STRIPE ELEMENTS INITIALIZATION ==========

  useEffect(() => {
    const initializeStripeElements = async () => {
      if (stripe && !elements) {
        console.log('🔄 Creating Stripe Elements...');
        
        try {
          const elementsInstance = stripe.elements({
            appearance: {
              theme: 'stripe',
              variables: {
                colorPrimary: isStripeTestMode ? '#f59e0b' : '#635BFF',
                colorBackground: '#ffffff',
                colorText: '#1f2937',
                colorDanger: '#df1b41',
                fontFamily: 'system-ui, sans-serif',
                spacingUnit: '4px',
                borderRadius: '8px',
              },
            },
          });
          
          const cardElementInstance = elementsInstance.create('card', {
            style: {
              base: {
                fontSize: '16px',
                color: '#1f2937',
                '::placeholder': {
                  color: isStripeTestMode ? '#92400e' : '#9ca3af',
                },
              },
              invalid: {
                color: '#df1b41',
                iconColor: '#df1b41',
              },
            },
          });

          setElements(elementsInstance);
          setCardElement(cardElementInstance);
          
          console.log(`✅ Stripe Elements created in ${isStripeTestMode ? 'TEST' : 'LIVE'} mode`);
        } catch (error) {
          console.error('❌ Stripe Elements creation error:', error);
          setApiError(`Stripe Elements error: ${error.message}`);
        }
      }
    };

    if (stripe) {
      initializeStripeElements();
    }
  }, [stripe, elements, isStripeTestMode]);

  // Enhanced card element mounting
  useEffect(() => {
    if (cardElement && selectedSpot && bookingStep === 1) {
      const cardContainer = document.getElementById('card-element');
      if (cardContainer && !cardContainer.hasChildNodes()) {
        try {
          cardElement.mount('#card-element');
          
          cardElement.on('change', (event) => {
            setCardError(event.error ? event.error.message : null);
            setCardComplete(event.complete);
          });
          
          console.log('✅ Card element mounted successfully');
        } catch (error) {
          console.error('❌ Card element mounting error:', error);
          setCardError('Failed to load payment form. Please refresh and try again.');
        }
      }
    }

    // Cleanup when modal closes
    return () => {
      if (cardElement && !selectedSpot) {
        try {
          cardElement.unmount();
          console.log('🧹 Card element unmounted');
        } catch (error) {
          // Element may already be unmounted
          console.log('Card element cleanup completed');
        }
      }
    };
  }, [cardElement, selectedSpot, bookingStep]);

  // ========== TEST CARD FUNCTIONS ==========

  const fillTestCard = (cardType) => {
    if (!isStripeTestMode || !testCardInfo) {
      console.log('❌ Test cards only available in test mode');
      return;
    }

    const testCard = testCardInfo[cardType];
    if (testCard) {
      alert(`Test Card - ${cardType.toUpperCase()}:\n\nCard Number: ${testCard}\nExpiry: Any future date (e.g., 12/25)\nCVC: Any 3 digits (e.g., 123)\nZip: Any 5 digits (e.g., 12345)`);
    }
  };

  // ========== ENHANCED API FUNCTIONS ==========

  const testBackendConnection = async () => {
    setConnectionStatus('testing');
    
    try {
      console.log(`🔍 Testing backend connection to: ${API_BASE_URL}`);
      
      const response = await fetch(`${API_BASE_URL}/api/parking/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Backend connected:', data);
        setConnectionStatus('connected');
        return true;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`❌ Connection failed:`, error.message);
      setConnectionStatus('failed');
      setApiError(`Backend server error: ${error.message}`);
      return false;
    }
  };

  const loadAirports = async () => {
    try {
      const isConnected = await testBackendConnection();
      if (!isConnected) return;

      const response = await fetch(`${API_BASE_URL}/api/parking/airports`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAvailableAirports(data.data);
          console.log('✅ Airports loaded:', data.data.length);
        } else {
          throw new Error('Failed to load airports');
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Error loading airports:', error);
      setApiError(error.message);
    }
  };

  const fetchParkingProducts = useCallback(async () => {
    console.log('🔍 fetchParkingProducts called');

    if (connectionStatus !== 'connected') {
      console.log('❌ Backend not connected, skipping search');
      setApiError('Backend server is not connected. Please check if the server is running.');
      return;
    }

    setIsLoading(true);
    setApiError(null);
    
    try {
      console.log('🔍 Fetching parking products with params:', searchParams);
      
      const response = await fetch(`${API_BASE_URL}/api/parking/search-parking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchParams)
      });

      console.log('📋 Search API Response Status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Response Error:', errorText);
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Search API Response:', result);
      
      if (result.success && result.data && result.data.products) {
        const processedProducts = result.data.products.map(product => ({
          ...product,
          logo: airportImages[searchParams.airport_code] || airportImages['LHR'],
          features_array: product.features_array || [],
          availability_status: product.available_spaces 
            ? `${product.available_spaces} spots available`
            : 'Available Now',
          last_updated: new Date().toLocaleTimeString(),
          formatted_price: parseFloat(product.price).toFixed(2),
          commission_amount: (parseFloat(product.price) * (parseFloat(product.share_percentage || 0) / 100)).toFixed(2),
          coords: {
            lat: 51.4694 + (Math.random() - 0.5) * 0.01,
            lng: -0.4506 + (Math.random() - 0.5) * 0.01
          }
        }));
        
        setParkingProducts(processedProducts);
        setFilteredProducts(processedProducts);
        setApiError(null);
        console.log('✅ Products processed and loaded:', processedProducts.length);
      } else {
        console.error('❌ Invalid API response:', result);
        throw new Error(result.message || 'No parking data available from API');
      }
    } catch (error) {
      console.error('❌ Error fetching products:', {
        message: error.message,
        name: error.name
      });
      setApiError(`Search failed: ${error.message}`);
      setParkingProducts([]);
      setFilteredProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchParams, connectionStatus, API_BASE_URL]);

  // ========== ENHANCED STRIPE PAYMENT FUNCTIONS (WITH FIXES) ==========

  // ✅ FIXED createPaymentIntent - NO TOKEN IN BODY
  const createPaymentIntent = async () => {
    try {
      console.log(`💳 Creating payment intent in ${isStripeTestMode ? 'TEST' : 'LIVE'} mode...`);
      
      if (!selectedSpot) {
        throw new Error('No parking spot selected');
      }

      if (!authStatus.isLoggedIn) {
        throw new Error('User must be logged in');
      }

      const authToken = getAuthToken();
      
      if (!authToken) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      // Enhanced payment data with better error handling
      const paymentData = {
        amount: parseFloat(selectedSpot.price || selectedSpot.formatted_price),
        currency: 'gbp',
        service_name: selectedSpot.name,
        airport_code: searchParams.airport_code,
        company_code: selectedSpot.company_code || selectedSpot.product_code,
        dropoff_date: searchParams.dropoff_date,
        pickup_date: searchParams.pickup_date,
        product_name: selectedSpot.name,
        parking_type: selectedSpot.parking_type
      };

      console.log('🚀 Creating payment intent with data:', {
        amount: paymentData.amount,
        service: paymentData.service_name,
        user: authStatus.user?.email,
        isTestMode: isStripeTestMode
      });

      const response = await fetch(`${API_BASE_URL}/api/parking/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`, // ✅ ONLY in headers
        },
        body: JSON.stringify(paymentData) // ✅ NO token in body
      });

      console.log('💳 Payment Intent Response Status:', response.status, response.statusText);

      if (!response.ok) {
        let errorMessage;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || `HTTP ${response.status}`;
          console.error('❌ Payment Intent Error Details:', errorData);
        } catch (parseError) {
          const errorText = await response.text();
          errorMessage = errorText || `HTTP ${response.status}`;
          console.error('❌ Payment Intent Error Text:', errorText);
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      if (result.success) {
        setPaymentIntentId(result.payment_intent_id);
        setPaymentStatus('payment_intent_created');
        console.log('✅ Payment intent created:', result.payment_intent_id);
        return result;
      } else {
        throw new Error(result.message || 'Failed to create payment intent');
      }
    } catch (error) {
      console.error('❌ Payment intent creation error:', error);
      throw error;
    }
  };

  const processStripePayment = async (clientSecret) => {
    try {
      if (!stripe || !elements || !cardElement) {
        throw new Error('Stripe Elements not ready');
      }

      console.log(`💳 Processing payment in ${isStripeTestMode ? 'TEST' : 'LIVE'} mode...`);
      setProcessingPayment(true);

      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: `${bookingDetails.first_name} ${bookingDetails.last_name}`,
            email: bookingDetails.customer_email,
            phone: bookingDetails.phone_number,
          },
        }
      });

      if (error) {
        console.error(`❌ Stripe payment error:`, error);
        throw new Error(`Payment failed: ${error.message}`);
      }

      if (paymentIntent.status === 'succeeded') {
        console.log(`✅ Payment successful:`, paymentIntent.id);
        setPaymentStatus('payment_succeeded');
        return paymentIntent;
      } else {
        throw new Error(`Payment status: ${paymentIntent.status}`);
      }
    } catch (error) {
      console.error('❌ Stripe payment processing error:', error);
      throw error;
    } finally {
      setProcessingPayment(false);
    }
  };

  const verifyPayment = async (paymentIntentId) => {
    try {
      console.log(`🔍 Verifying payment:`, paymentIntentId);

      const authToken = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/parking/verify-payment/${paymentIntentId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        }
      });

      if (!response.ok) {
        let errorMessage;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || `HTTP ${response.status}`;
        } catch (parseError) {
          const errorText = await response.text();
          errorMessage = errorText || `HTTP ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log(`✅ Payment verification result:`, result);
      
      return result.is_paid;
    } catch (error) {
      console.error('❌ Payment verification error:', error);
      throw error;
    }
  };

  // ✅ FIXED createBookingWithPayment - NO TOKEN IN BODY
  const createBookingWithPayment = async (paymentIntentId) => {
    try {
      console.log(`🎫 Creating booking with payment:`, paymentIntentId);

      if (!authStatus.isLoggedIn) {
        throw new Error('User must be logged in');
      }

      const authToken = getAuthToken();
      
      if (!authToken) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      const userInfo = getUserInfoFromToken();

      console.log('🔑 Using auth token for booking:', authToken.substring(0, 20) + '...');

      // ✅ FIXED: Clean booking data - NO TOKEN IN BODY
      const bookingData = {
        payment_intent_id: paymentIntentId,
        
        // Service details
        company_code: selectedSpot.company_code || selectedSpot.product_code,
        product_name: selectedSpot.name,
        product_code: selectedSpot.product_code,
        airport_code: searchParams.airport_code,
        parking_type: selectedSpot.parking_type,
        
        // Dates and times
        dropoff_date: searchParams.dropoff_date,
        dropoff_time: searchParams.dropoff_time,
        pickup_date: searchParams.pickup_date,
        pickup_time: searchParams.pickup_time,
        
        // Financial
        booking_amount: parseFloat(selectedSpot.price || selectedSpot.formatted_price),
        commission_percentage: selectedSpot.share_percentage || 0,
        
        // Customer details
        title: bookingDetails.title,
        first_name: bookingDetails.first_name,
        last_name: bookingDetails.last_name,
        customer_email: bookingDetails.customer_email,
        phone_number: bookingDetails.phone_number,
        
        // Travel details
        departure_flight_number: bookingDetails.departure_flight_number || 'TBA',
        arrival_flight_number: bookingDetails.arrival_flight_number || 'TBA',
        departure_terminal: bookingDetails.departure_terminal || 'Terminal 1',
        arrival_terminal: bookingDetails.arrival_terminal || 'Terminal 1',
        passenger: parseInt(bookingDetails.passenger) || 1,
        
        // Vehicle details
        car_registration_number: bookingDetails.car_registration_number,
        car_make: bookingDetails.car_make,
        car_model: bookingDetails.car_model,
        car_color: bookingDetails.car_color,
        
        // Service features
        is_cancelable: selectedSpot.cancelable === 'Yes',
        is_editable: selectedSpot.editable === 'Yes',
        special_features: selectedSpot.features_array || []
      };

      console.log('🚀 Submitting booking:', {
        payment_intent_id: paymentIntentId,
        service: bookingData.product_name,
        airport: bookingData.airport_code,
        amount: bookingData.booking_amount
      });

      const response = await fetch(`${API_BASE_URL}/api/parking/bookings-with-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`, // ✅ ONLY in headers
        },
        body: JSON.stringify(bookingData) // ✅ NO token in body
      });

      console.log('📋 Booking response status:', response.status);

      if (!response.ok) {
        let errorMessage;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || `HTTP ${response.status}`;
          console.error('❌ Booking error details:', errorData);
        } catch (parseError) {
          const errorText = await response.text();
          errorMessage = errorText || `HTTP ${response.status}`;
          console.error('❌ Booking error text:', errorText);
        }
        throw new Error(`Booking failed: ${errorMessage}`);
      }

      const result = await response.json();
      console.log('✅ Booking successful:', result);

      return result;
    } catch (error) {
      console.error('❌ Booking error:', error);
      throw error;
    }
  };

  // ========== EVENT HANDLERS ==========

  const handleSearch = () => {
    console.log('🔍 Search button clicked');

    if (connectionStatus !== 'connected') {
      console.log('❌ Search blocked - backend not connected');
      setApiError('Backend server is not connected. Please wait for connection or refresh the page.');
      return;
    }

    console.log('✅ Starting search...');
    fetchParkingProducts();
  };

  const handleSearchParamChange = (field, value) => {
    setSearchParams(prev => ({ ...prev, [field]: value }));
  };

  const handleBookingChange = (e) => {
    const { name, value } = e.target;
    setBookingDetails(prev => ({ ...prev, [name]: value }));
  };

  // Enhanced booking submission with comprehensive error handling
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    
    console.log(`🎫 Starting payment flow in ${isStripeTestMode ? 'TEST' : 'LIVE'} mode...`);
    
    // Pre-flight checks
    if (!isUserLoggedIn()) {
      console.log('❌ User not logged in');
      setBookingStatus({
        success: false,
        message: 'Please log in to make a booking. You must sign in to book parking spaces through our system.'
      });
      setBookingStep(2);
      return;
    }

    if (!stripe || !stripePublishableKey) {
      console.log('❌ Stripe not initialized');
      setBookingStatus({
        success: false,
        message: 'Payment system not ready. Please refresh the page and try again.'
      });
      setBookingStep(2);
      return;
    }

    if (!cardElement || !cardComplete) {
      console.log('❌ Card details not complete');
      setBookingStatus({
        success: false,
        message: 'Please complete your card details before proceeding with payment.'
      });
      return;
    }

    setIsLoading(true);
    setBookingStatus(null);
    setPaymentStep(2);

    try {
      console.log('🔄 Step 1: Creating payment intent...');
      const paymentIntentResult = await createPaymentIntent();
      
      console.log('🔄 Step 2: Processing payment with Stripe...');
      const paymentIntent = await processStripePayment(paymentIntentResult.client_secret);
      
      console.log('🔄 Step 3: Verifying payment...');
      const isPaymentVerified = await verifyPayment(paymentIntent.id);
      
      if (!isPaymentVerified) {
        throw new Error('Payment verification failed');
      }

      setPaymentStep(3);

      console.log('🔄 Step 4: Creating booking with payment...');
      const bookingResult = await createBookingWithPayment(paymentIntent.id);
      
      if (bookingResult.success) {
        setBookingStatus({
          success: true,
          message: `Payment processed and booking confirmed successfully! (${isStripeTestMode ? 'TEST' : 'LIVE'} mode)`,
          reference: bookingResult.data.our_reference,
          magrReference: bookingResult.data.magr_reference,
          bookingId: bookingResult.data.booking_id || bookingResult.data.database_id,
          paymentIntentId: paymentIntent.id,
          paymentAmount: bookingResult.data.payment_amount,
          paymentCurrency: bookingResult.data.payment_currency,
          isTestMode: bookingResult.data.is_test_mode || isStripeTestMode,
          details: {
            user: bookingResult.data.user_email,
            service: bookingResult.data.service,
            airport: bookingResult.data.airport,
            amount: bookingResult.data.total_amount,
            commission: bookingResult.data.commission
          }
        });
        setBookingStep(2);
      } else {
        throw new Error(bookingResult.message || 'Booking creation failed after payment');
      }

    } catch (error) {
      console.error(`❌ Payment flow error:`, {
        message: error.message,
        name: error.name,
        step: paymentStep
      });
      
      setBookingStatus({
        success: false,
        message: `${error.message || 'Failed to process payment and create booking. Please try again.'} (${isStripeTestMode ? 'TEST' : 'LIVE'} mode)`,
        paymentStep: paymentStep,
        isTestMode: isStripeTestMode
      });
      setBookingStep(2);
    } finally {
      setIsLoading(false);
      setProcessingPayment(false);
      setPaymentStep(1);
    }
  };

  // Navigation function
  const navigateToEvCharging = () => {
    window.location.href = '/#/evcharging';
  };

  // Get user location
  const getUserLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setCurrentLocation("London, UK");
      setUserLocation({ lat: 51.5074, lng: -0.1278 });
      return;
    }

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000
          }
        );
      });

      const coords = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      
      setUserLocation(coords);
      
      // Get location name using Mapbox Geocoding
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${coords.lng},${coords.lat}.json?access_token=${MAPBOX_ACCESS_TOKEN}&types=place,locality,district`
        );
        
        if (response.ok) {
          const data = await response.json();
          const features = data.features;
          
          let locationName = "Your Location";
          if (features.length > 0) {
            const place = features.find(f => f.place_type.includes('place')) || features[0];
            const country = features.find(f => f.place_type.includes('country'));
            locationName = place.text + (country ? `, ${country.text}` : '');
          }
          
          setCurrentLocation(locationName);
        }
      } catch (error) {
        console.error('Error getting location name:', error);
        setCurrentLocation("Your Location");
      }
      
    } catch (error) {
      console.log('Geolocation error:', error);
      setCurrentLocation("London, UK");
      setUserLocation({ lat: 51.5074, lng: -0.1278 });
    }
  }, []);

  // Initialize Mapbox
  const initializeMapbox = useCallback(() => {
    if (typeof window !== 'undefined' && !window.mapboxgl) {
      const link = document.createElement('link');
      link.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css';
      link.rel = 'stylesheet';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js';
      script.onload = () => {
        window.mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
        setMapLoaded(true);
      };
      script.onerror = () => {
        setMapError('Failed to load map resources');
      };
      document.head.appendChild(script);
    } else if (window.mapboxgl) {
      window.mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
      setMapLoaded(true);
    }
  }, []);

  // Initialize map
  const initializeMap = useCallback(() => {
    if (!mapLoaded || !mapRef.current || mapInstanceRef.current) return;

    try {
      const centerCoords = userLocation || { lat: 51.5074, lng: -0.1278 };

      const map = new window.mapboxgl.Map({
        container: mapRef.current,
        style: 'mapbox://styles/mapbox/satellite-streets-v12',
        center: [centerCoords.lng, centerCoords.lat],
        zoom: 11,
        pitch: 60,
        bearing: -17.6,
        antialias: true,
        attributionControl: false
      });

      map.addControl(new window.mapboxgl.NavigationControl({
        visualizePitch: true
      }), 'top-right');

      const geolocate = new window.mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true,
        showUserHeading: true
      });
      map.addControl(geolocate, 'top-right');

      map.on('load', () => {
        map.addLayer({
          'id': '3d-buildings',
          'source': 'composite',
          'source-layer': 'building',
          'filter': ['==', 'extrude', 'true'],
          'type': 'fill-extrusion',
          'minzoom': 14,
          'paint': {
            'fill-extrusion-color': '#E2E8F0',
            'fill-extrusion-height': [
              'interpolate',
              ['linear'],
              ['zoom'],
              14, 0,
              14.05, ['get', 'height']
            ],
            'fill-extrusion-base': [
              'interpolate',
              ['linear'],
              ['zoom'],
              14, 0,
              14.05, ['get', 'min_height']
            ],
            'fill-extrusion-opacity': 0.8
          }
        });

        if (userLocation) {
          const userMarkerEl = document.createElement('div');
          userMarkerEl.className = 'user-location-marker';
          userMarkerEl.innerHTML = `
            <div class="user-marker-pulse"></div>
            <div class="user-marker-dot"></div>
          `;

          new window.mapboxgl.Marker(userMarkerEl)
            .setLngLat([userLocation.lng, userLocation.lat])
            .addTo(map);
        }

        filteredProducts.forEach(spot => {
          const markerEl = document.createElement('div');
          markerEl.className = 'parking-spot-marker';
          markerEl.innerHTML = `
            <div class="marker-content">
              <div class="marker-icon">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="white">
                  <path d="M19 7h-3V6a3 3 0 0 0-3-3H8a3 3 0 0 0-3 3v1H2v2h1v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9h1V7zM7 6a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v1H7V6zm10 13H7V9h10v10z"/>
                  <path d="M9 11h2v6H9zm4 0h2v6h-2z"/>
                </svg>
              </div>
              <div class="marker-price">£${spot.formatted_price}</div>
            </div>
            <div class="marker-arrow"></div>
          `;

          const popupContent = document.createElement('div');
          popupContent.className = 'map-popup-content';
          popupContent.innerHTML = `
            <div class="popup-header">
              <h3>${spot.name}</h3>
              <div class="popup-rating">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#fbbf24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                <span>${spot.rating || '4.5'}</span>
              </div>
            </div>
            <div class="popup-details">
              <p class="popup-address">${spot.address || 'Airport Location'}</p>
              <div class="popup-features">
                <span class="availability-status ${spot.availability_status ? 'available' : ''}">
                  ${spot.availability_status || 'Available'}
                </span>
                ${spot.cancelable === "Yes" ? '<span class="feature-tag">Cancelable</span>' : ''}
              </div>
              <div class="popup-pricing">
                <span class="price">£${spot.formatted_price} total</span>
                <span class="commission">${spot.share_percentage}% commission</span>
              </div>
            </div>
          `;

          const popup = new window.mapboxgl.Popup({ 
            offset: 25,
            className: 'parksy-popup'
          }).setDOMContent(popupContent);

          new window.mapboxgl.Marker(markerEl)
            .setLngLat([
              spot.coords?.lng || centerCoords.lng + (Math.random() - 0.5) * 0.02,
              spot.coords?.lat || centerCoords.lat + (Math.random() - 0.5) * 0.02
            ])
            .setPopup(popup)
            .addTo(map);
        });
      });

      mapInstanceRef.current = map;
    } catch (error) {
      console.error('Map initialization error:', error);
      setMapError('Failed to initialize map');
    }
  }, [mapLoaded, userLocation, filteredProducts]);

  // Filter products
  useEffect(() => {
    if (!searchQuery) {
      setFilteredProducts(parkingProducts);
      return;
    }

    const filtered = parkingProducts.filter(product => 
      product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.parking_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.features_array && product.features_array.some(feature => 
        feature.toLowerCase().includes(searchQuery.toLowerCase())
      ))
    );
    
    setFilteredProducts(filtered);
  }, [searchQuery, parkingProducts]);

  // Initialize everything
  useEffect(() => {
    getUserLocation();
    initializeMapbox();
    loadAirports();
    
    const timer = setTimeout(() => {
      setShowAirplaneAnimation(false);
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [getUserLocation, initializeMapbox]);

  useEffect(() => {
    if (availableAirports.length > 0 && connectionStatus === 'connected') {
      fetchParkingProducts();
    }
  }, [availableAirports, connectionStatus, fetchParkingProducts]);

  useEffect(() => {
    if (viewMode === 'map' && mapLoaded && !mapInstanceRef.current) {
      initializeMap();
    }
  }, [viewMode, mapLoaded, initializeMap]);

  // Cleanup map on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Enhanced Stripe Elements styles
  const stripeElementsStyles = `
    .card-element-container {
      background: white;
      padding: 16px;
      border: 2px solid ${isStripeTestMode ? '#f59e0b' : '#e5e7eb'};
      border-radius: 8px;
      margin: 16px 0;
      transition: border-color 0.3s ease;
      position: relative;
    }
    
    .card-element-container:focus-within {
      border-color: ${isStripeTestMode ? '#f59e0b' : '#635BFF'};
      box-shadow: 0 0 0 3px ${isStripeTestMode ? 'rgba(245, 158, 11, 0.1)' : 'rgba(99, 91, 255, 0.1)'};
    }
    
    .card-element-container.error {
      border-color: #df1b41;
    }
    
    .test-mode-indicator {
      position: absolute;
      top: -8px;
      right: 12px;
      background: #f59e0b;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
    }
    
    .card-error {
      color: #df1b41;
      font-size: 14px;
      margin-top: 8px;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    
    .card-success {
      color: #059669;
      font-size: 14px;
      margin-top: 8px;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    
    .test-cards-section {
      background: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 8px;
      padding: 16px;
      margin: 16px 0;
    }
    
    .test-card-button {
      background: #f59e0b;
      color: white;
      border: none;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
      margin: 4px 4px 4px 0;
      transition: all 0.2s ease;
    }
    
    .test-card-button:hover {
      background: #d97706;
      transform: translateY(-1px);
    }
  `;

  const PremiumParkingCard = ({ product, index }) => {
    const selectedAirport = availableAirports.find(a => a.code === searchParams.airport_code);
    
    return (
      <div 
        className="premium-parking-card"
        onClick={() => setSelectedSpot(product)}
        style={{ animationDelay: `${index * 0.1}s` }}
      >
        <div className="card-image-container">
          <div className="image-overlay"></div>
          <img 
            src={product.logo || airportImages[searchParams.airport_code] || airportImages['LHR']} 
            alt={selectedAirport?.name || 'Airport'}
            className="card-image"
          />
          
          <div className="image-badges">
            <div className="availability-badge">
              <CheckCircle size={12} />
              {product.availability_status || 'Available Now'}
            </div>
            {product.cancelable === "Yes" && (
              <div className="feature-badge cancelable">
                <Shield size={12} />
                Cancelable
              </div>
            )}
          </div>

          <div className="parking-type-badge">
            {product.parking_type}
          </div>

          <div className="real-time-badge">
            <div className="live-pulse"></div>
            LIVE - Updated: {product.last_updated}
          </div>
        </div>

        <div className="card-content">
          <div className="card-header">
            <h3 className="service-name">{product.name}</h3>
            <div className="company-info">
              <span className="company-id">ID: {product.companyID || product.product_code}</span>
              <div className="rating-display">
                <Star size={14} fill="#fbbf24" />
                <span>{product.rating || '4.' + Math.floor(Math.random() * 9 + 1)}</span>
              </div>
            </div>
          </div>

          <div className="location-info">
            <Plane size={16} />
            <span>{selectedAirport?.name || searchParams.airport_code} Airport</span>
          </div>

          <div className="pricing-section">
            <div className="main-price">
              <span className="currency">£</span>
              <span className="amount">{product.formatted_price}</span>
              <span className="period">total</span>
              <div className="live-indicator">
                <div className="live-pulse-small"></div>
                <span>LIVE</span>
              </div>
            </div>
            <div className="pricing-details">
              <div className="duration-info">
                <Calendar size={12} />
                <span>{product.duration_days || 
                  Math.ceil((new Date(searchParams.pickup_date) - new Date(searchParams.dropoff_date)) / (1000 * 60 * 60 * 24))} days</span>
              </div>
              <div className="commission-info">
                <span className="commission-rate">{product.share_percentage}% commission</span>
                <span className="commission-amount">£{product.commission_amount}</span>
              </div>
            </div>
          </div>

          <div className="service-details">
            <div className="operating-hours">
              <Clock size={14} />
              <span>{product.opening_time} - {product.closing_time}</span>
            </div>
            <div className="processing-time">
              <span className="process-label">Min advance:</span>
              <span className="process-value">{product.processtime}h</span>
            </div>
          </div>

          <div className="features-grid">
            {product.features_array && product.features_array.slice(0, 4).map((feature, idx) => (
              <div key={idx} className="feature-chip">
                <div className="feature-icon">
                  {feature.includes('CCTV') && <Camera size={10} />}
                  {feature.includes('Security') && <Shield size={10} />}
                  {feature.includes('Wifi') && <Wifi size={10} />}
                  {!feature.includes('CCTV') && !feature.includes('Security') && !feature.includes('Wifi') && <CheckCircle size={10} />}
                </div>
                <span className="feature-text">{feature}</span>
              </div>
            ))}
          </div>

          <button
            className="premium-book-btn"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedSpot(product);
            }}
          >
            <span className="btn-text">{isStripeTestMode ? '🧪 Book with Test Stripe' : '💳 Book with Stripe'}</span>
            <ChevronRight size={18} className="btn-icon" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="premium-parking-dashboard">
      {/* Add Enhanced Stripe Elements Styles */}
      <style>{stripeElementsStyles}</style>

      {/* Airplane Animation */}
      {showAirplaneAnimation && (
        <div className="airplane-animation">
          <div className="airplane">✈️</div>
          <div className="welcome-text">Welcome to Parksy</div>
          <div className="welcome-subtitle">Premium Airport Parking Solutions</div>
        </div>
      )}

      {/* Background Elements */}
      <div className="animated-background">
        <div className="bg-gradient-1"></div>
        <div className="bg-gradient-2"></div>
        <div className="bg-gradient-3"></div>
      </div>

      <header className="premium-header">
        <div className="header-content">
          <h1 className="main-title">
            <span className="title-primary">Parksy</span>
            <span className="title-accent">Airport</span>
            <span className="title-secondary">Parking</span>
          </h1>
          <p className="header-subtitle">Premium real-time parking solutions with secure Stripe payments</p>
          <div className="header-stats">
            <div className="stat-item">
              <span className="stat-number">{filteredProducts.length}</span>
              <span className="stat-label">Live Services</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <span className="stat-number">🔴</span>
              <span className="stat-label">Real-Time</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <span className="stat-number">{connectionStatus === 'connected' ? '✅' : '❌'}</span>
              <span className="stat-label">API Status</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <span className="stat-number">{stripe ? (isStripeTestMode ? '🧪' : '💳') : '❌'}</span>
              <span className="stat-label">{stripe ? (isStripeTestMode ? 'Stripe TEST' : 'Stripe LIVE') : 'Stripe Loading'}</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <span className="stat-number">{authStatus.isLoggedIn ? '👤' : '🚫'}</span>
              <span className="stat-label">{authStatus.isLoggedIn ? 'Logged In' : 'Not Logged In'}</span>
            </div>
          </div>
          <div className="api-url-display">
            <small>Backend: {API_BASE_URL}</small>
          </div>
        </div>
      </header>

      {/* Enhanced Status Banners */}
      {connectionStatus === 'failed' && (
        <div className="api-status-banner error">
          <AlertCircle size={16} />
          <span>❌ BACKEND SERVER CONNECTION FAILED - Check if backend is running</span>
        </div>
      )}
      
      {apiError && (
        <div className="api-status-banner error">
          <AlertCircle size={16} />
          <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{apiError}</pre>
        </div>
      )}

      {connectionStatus === 'connected' && (
        <div className="api-status-banner success">
          <CheckCircle size={16} />
          <span>🔴 LIVE CONNECTION - Real-time parking data with Stripe payments ready</span>
        </div>
      )}

      {/* Enhanced Stripe Status Banner */}
      {!stripe && connectionStatus === 'connected' && (
        <div className="api-status-banner warning" style={{backgroundColor: '#f59e0b', color: '#000'}}>
          <Lock size={16} />
          <span>💳 Loading Stripe payment system...</span>
        </div>
      )}

      {stripe && (
        <div className="api-status-banner success" style={{
          backgroundColor: isStripeTestMode ? '#f59e0b' : '#10b981',
          color: isStripeTestMode ? '#000' : '#fff'
        }}>
          <CreditCard size={16} />
          <span>{isStripeTestMode ? 
            `🧪 Stripe TEST MODE ready - Use test card numbers for payments` : 
            `💳 Stripe LIVE MODE ready - Real payments will be processed`}</span>
          {isStripeTestMode && (
            <button
              onClick={() => setShowTestCards(!showTestCards)}
              style={{
                marginLeft: '10px',
                background: '#fff',
                color: '#f59e0b',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              {showTestCards ? 'Hide Test Cards' : 'Show Test Cards'}
            </button>
          )}
        </div>
      )}

      {/* Test Cards Information Banner */}
      {isStripeTestMode && showTestCards && testCardInfo && (
        <div className="api-status-banner" style={{
          backgroundColor: '#fef3c7',
          color: '#92400e',
          border: '1px solid #f59e0b',
          flexDirection: 'column',
          alignItems: 'flex-start'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Info size={16} />
            <strong>🧪 TEST MODE - Available Test Cards:</strong>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '8px', width: '100%' }}>
            <div><strong>Visa Success:</strong> {testCardInfo.visa_success}</div>
            <div><strong>Visa Declined:</strong> {testCardInfo.visa_declined}</div>
            <div><strong>Mastercard:</strong> {testCardInfo.mastercard}</div>
            <div><strong>Visa Debit:</strong> {testCardInfo.visa_debit}</div>
          </div>
          <small style={{ marginTop: '8px' }}>{testCardInfo.note}</small>
        </div>
      )}

      {/* Authentication Status Banner */}
      {!authStatus.isLoggedIn && (
        <div className="api-status-banner warning" style={{backgroundColor: '#fbbf24', color: '#000'}}>
          <AlertCircle size={16} />
          <span>⚠️ You must be logged in to make bookings. Please sign in to book parking spots.</span>
          <small style={{marginLeft: '10px'}}>Token not found in browser storage - ensure your login system stores auth tokens.</small>
        </div>
      )}

      {authStatus.isLoggedIn && (
        <div className="api-status-banner success">
          <CheckCircle size={16} />
          <span>👤 Welcome {authStatus.user?.email || authStatus.user?.username || 'User'} - You can now make secure bookings!</span>
        </div>
      )}

      {/* Search Section */}
      <section className="premium-search-section">
        <div className="search-container">
          <div className="search-glass-panel">
            <div className="panel-glow"></div>
            
            {/* Parking Search Parameters */}
            <div className="search-parameters">
              <div className="param-group">
                <label className="param-label">
                  <Plane size={16} />
                  Airport
                </label>
                <select
                  className="param-input select-input"
                  value={searchParams.airport_code}
                  onChange={(e) => handleSearchParamChange('airport_code', e.target.value)}
                  disabled={connectionStatus !== 'connected'}
                >
                  {availableAirports.map(airport => (
                    <option key={airport.code} value={airport.code}>
                      {airport.name} ({airport.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="param-group">
                <label className="param-label">
                  <Calendar size={16} />
                  Drop-off Date
                </label>
                <input
                  type="date"
                  className="param-input"
                  value={searchParams.dropoff_date}
                  onChange={(e) => handleSearchParamChange('dropoff_date', e.target.value)}
                  min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                  disabled={connectionStatus !== 'connected'}
                />
              </div>

              <div className="param-group">
                <label className="param-label">
                  <Clock size={16} />
                  Drop-off Time
                </label>
                <input
                  type="time"
                  className="param-input"
                  value={searchParams.dropoff_time}
                  onChange={(e) => handleSearchParamChange('dropoff_time', e.target.value)}
                  disabled={connectionStatus !== 'connected'}
                />
              </div>

              <div className="param-group">
                <label className="param-label">
                  <Calendar size={16} />
                  Pick-up Date
                </label>
                <input
                  type="date"
                  className="param-input"
                  value={searchParams.pickup_date}
                  onChange={(e) => handleSearchParamChange('pickup_date', e.target.value)}
                  min={searchParams.dropoff_date}
                  disabled={connectionStatus !== 'connected'}
                />
              </div>

              <div className="param-group">
                <label className="param-label">
                  <Clock size={16} />
                  Pick-up Time
                </label>
                <input
                  type="time"
                  className="param-input"
                  value={searchParams.pickup_time}
                  onChange={(e) => handleSearchParamChange('pickup_time', e.target.value)}
                  disabled={connectionStatus !== 'connected'}
                />
              </div>

              <button
                className="premium-search-btn"
                onClick={handleSearch}
                disabled={isLoading || connectionStatus !== 'connected'}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={20} className="search-spinner" />
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    <Search size={20} />
                    <span>🔴 Search Live</span>
                  </>
                )}
              </button>
            </div>

            {/* Search Bar */}
            <div className="search-bar-section">
              <div className="search-input-container">
                <Search size={20} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search parking services, features, or locations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                  disabled={connectionStatus !== 'connected'}
                />
              </div>
            </div>

            {/* View Controls */}
            <div className="view-controls">
              <div className="control-group">
                <button
                  className={`view-control ${viewMode === "boxes" ? "active" : ""}`}
                  onClick={() => setViewMode("boxes")}
                  disabled={connectionStatus !== 'connected'}
                >
                  <Grid3X3 size={18} />
                  <span>Parking Gallery</span>
                </button>
                
                <button
                  className="view-control ev-charging-nav"
                  onClick={navigateToEvCharging}
                  style={{
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: 'white',
                    border: '2px solid #10b981',
                    fontWeight: '600'
                  }}
                >
                  <Zap size={18} />
                  <span>⚡ EV Charging</span>
                </button>
                
                <button
                  className={`view-control ${viewMode === "map" ? "active" : ""}`}
                  onClick={() => setViewMode("map")}
                  disabled={connectionStatus !== 'connected'}
                >
                  <Map size={18} />
                  <span>Map View</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="premium-main-content">
        {viewMode === "boxes" ? (
          <div className="premium-parking-grid">
            {connectionStatus !== 'connected' ? (
              <div className="no-results-premium">
                <div className="no-results-icon">
                  <AlertCircle size={64} />
                </div>
                <h3>❌ Backend Server Connection Failed</h3>
                <p>Unable to connect to the deployed backend server</p>
                <div className="backend-instructions">
                  <h4>Backend URL:</h4>
                  <p>{API_BASE_URL}</p>
                  <p>Please check if the backend is running on Render.</p>
                </div>
                <button 
                  className="retry-btn"
                  onClick={() => window.location.reload()}
                >
                  Retry Connection
                </button>
              </div>
            ) : isLoading ? (
              <div className="premium-loading">
                <div className="loading-spinner">
                  <Loader2 size={48} className="spinner-icon" />
                </div>
                <h3>Loading Real-Time Data...</h3>
                <p>
                  Fetching live availability from {availableAirports.find(a => a.code === searchParams.airport_code)?.name} via Parksy API
                </p>
              </div>
            ) : filteredProducts.length > 0 ? (
              filteredProducts.map((product, index) => (
                <PremiumParkingCard key={index} product={product} index={index} />
              ))
            ) : (
              <div className="no-results-premium">
                <div className="no-results-icon">
                  <Plane size={64} />
                </div>
                <h3>No Real-Time Data Available</h3>
                <p>
                  No live parking services found for your selected dates
                </p>
                <button 
                  className="retry-btn"
                  onClick={handleSearch}
                  disabled={isLoading}
                >
                  Search Again
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="premium-map-container">
            {mapError ? (
              <div className="map-error-premium">
                <div className="error-icon">
                  <Map size={48} />
                </div>
                <h3>Map Error</h3>
                <p>{mapError}</p>
                <button 
                  className="error-btn"
                  onClick={() => setViewMode("boxes")}
                >
                  Switch to Gallery View
                </button>
              </div>
            ) : (
              <div className="map-wrapper">
                <div ref={mapRef} className="map-container" />
                
                {(!mapLoaded || isLoading) && (
                  <div className="loading-overlay">
                    <Loader2 size={32} className="spinner" />
                    <p>{!mapLoaded ? 'Loading map resources...' : 'Loading parking locations...'}</p>
                  </div>
                )}

                <div className="map-legend">
                  <h4>Legend</h4>
                  <div className="legend-items">
                    <div className="legend-item">
                      <div className="marker parking"></div>
                      <span>Parksy Parking</span>
                    </div>
                    {userLocation && (
                      <div className="legend-item">
                        <div className="marker user"></div>
                        <span>Your Location</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="location-info">
                    <Navigation size={14} />
                    <span>{currentLocation}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Enhanced Stripe Payment & Booking Modal */}
      {selectedSpot && (
        <div className="premium-modal-overlay" onClick={() => {
          setSelectedSpot(null);
          setBookingStep(1);
          setBookingStatus(null);
          setPaymentStep(1);
          setPaymentIntentId(null);
          setPaymentStatus(null);
          setCardError(null);
          setCardComplete(false);
        }}>
          <div className="premium-booking-modal" onClick={(e) => e.stopPropagation()}>
            <button 
              className="premium-close-btn"
              onClick={() => {
                setSelectedSpot(null);
                setBookingStep(1);
                setBookingStatus(null);
                setPaymentStep(1);
                setPaymentIntentId(null);
                setPaymentStatus(null);
                setCardError(null);
                setCardComplete(false);
              }}
            >
              <X size={20} />
            </button>

            <div className="modal-content">
              {bookingStep === 1 ? (
                <div className="booking-step-premium">
                  {/* Enhanced Authentication & Stripe Warnings */}
                  {!authStatus.isLoggedIn && (
                    <div className="auth-warning">
                      <AlertCircle size={20} />
                      <p>You must be logged in to make bookings. Please sign in first through your authentication system.</p>
                      <small>Make sure your login system saves the authentication token to browser storage (localStorage or sessionStorage).</small>
                    </div>
                  )}

                  {!stripe && (
                    <div className="stripe-warning" style={{backgroundColor: '#f59e0b', color: '#000', padding: '12px', borderRadius: '8px', marginBottom: '16px'}}>
                      <Lock size={20} />
                      <p>Payment system is loading. Please wait for Stripe to initialize.</p>
                      <small>Secure payment processing will be available shortly.</small>
                    </div>
                  )}

                  {/* Enhanced Test Mode Warning */}
                  {isStripeTestMode && stripe && (
                    <div className="stripe-test-mode-warning" style={{
                      backgroundColor: '#fef3c7',
                      color: '#92400e',
                      border: '2px solid #f59e0b',
                      padding: '12px',
                      borderRadius: '8px',
                      marginBottom: '16px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <Info size={20} />
                        <strong>🧪 TEST MODE ACTIVE - No Real Charges</strong>
                      </div>
                      <p>This is a test environment. No real payments will be processed.</p>
                      <small>Use the test card numbers provided below for testing payments.</small>
                    </div>
                  )}

                  {/* Payment Processing Status */}
                  {(processingPayment || paymentStep > 1) && (
                    <div className="payment-status-banner" style={{
                      backgroundColor: paymentStep === 3 ? '#10b981' : (isStripeTestMode ? '#f59e0b' : '#3b82f6'),
                      color: isStripeTestMode && paymentStep !== 3 ? '#000' : 'white',
                      padding: '12px',
                      borderRadius: '8px',
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      {processingPayment ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>
                            {paymentStep === 2 ? (isStripeTestMode ? '🧪 Processing Test Payment...' : '💳 Processing Payment...') : 
                             paymentStep === 3 ? '🎫 Creating Booking...' : '🔄 Processing...'}
                          </span>
                        </>
                      ) : (
                        <>
                          <CreditCard size={16} />
                          <span>{isStripeTestMode ? '🧪 Ready for Test Payment' : '💳 Ready for Stripe Payment'}</span>
                        </>
                      )}
                    </div>
                  )}

                  {/* Modal Header */}
                  <div className="modal-header-premium">
                    <div className="service-image">
                      <img 
                        src={selectedSpot.logo || airportImages[searchParams.airport_code] || airportImages['LHR']} 
                        alt="Service"
                      />
                      <div className="live-data-badge">🔴 LIVE</div>
                      {isStripeTestMode && (
                        <div className="test-mode-badge" style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          background: '#f59e0b',
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '600'
                        }}>
                          TEST
                        </div>
                      )}
                    </div>
                    <div className="header-content">
                      <h2 className="service-title">{selectedSpot.name}</h2>
                      <p className="service-type">{selectedSpot.parking_type}</p>
                      <div className="service-badges">
                        {selectedSpot.cancelable === "Yes" && (
                          <span className="badge cancelable">Cancelable</span>
                        )}
                        <span className="badge live">🔴 Real-Time Pricing</span>
                        <span className="badge stripe" style={{
                          backgroundColor: isStripeTestMode ? '#f59e0b' : '#635BFF'
                        }}>
                          {isStripeTestMode ? '🧪 Stripe TEST' : '💳 Stripe Secure'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Service Overview */}
                  <div className="service-overview-premium">
                    <h4>{isStripeTestMode ? 'Test Payment & Booking' : 'Secure Payment & Booking'}</h4>
                    <p>{isStripeTestMode ? 
                        'Complete your test booking with Stripe test mode - no real charges will be made' :
                        'Complete your booking with secure Stripe payment processing'
                    }</p>
                    
                    <div className="service-highlights">
                      <div className="highlight-item">
                        <Plane size={16} />
                        <span>{availableAirports.find(a => a.code === searchParams.airport_code)?.name || searchParams.airport_code}</span>
                      </div>
                      <div className="highlight-item">
                        <Clock size={16} />
                        <span>Operating: {selectedSpot.opening_time} - {selectedSpot.closing_time}</span>
                      </div>
                      <div className="highlight-item live">
                        <CheckCircle size={16} />
                        <span>🔴 {selectedSpot.availability_status || 'Live availability'}</span>
                      </div>
                      <div className="highlight-item">
                        <CreditCard size={16} />
                        <span>{isStripeTestMode ? '🧪 Stripe Test Mode' : '💳 Stripe Secure Payment'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Booking Form */}
                  <form onSubmit={handleBookingSubmit} className="premium-booking-form">
                    {/* Personal Information */}
                    <div className="form-section-premium">
                      <h4>Personal Information</h4>
                      <div className="form-grid">
                        <div className="form-group-premium">
                          <label>Title</label>
                          <select
                            name="title"
                            value={bookingDetails.title}
                            onChange={handleBookingChange}
                            required
                            disabled={!authStatus.isLoggedIn || !stripe}
                          >
                            <option value="Mr">Mr</option>
                            <option value="Mrs">Mrs</option>
                            <option value="Miss">Miss</option>
                            <option value="Ms">Ms</option>
                            <option value="Dr">Dr</option>
                          </select>
                        </div>
                        <div className="form-group-premium">
                          <label>First Name</label>
                          <input
                            type="text"
                            name="first_name"
                            value={bookingDetails.first_name}
                            onChange={handleBookingChange}
                            required
                            disabled={!authStatus.isLoggedIn || !stripe}
                          />
                        </div>
                        <div className="form-group-premium">
                          <label>Last Name</label>
                          <input
                            type="text"
                            name="last_name"
                            value={bookingDetails.last_name}
                            onChange={handleBookingChange}
                            required
                            disabled={!authStatus.isLoggedIn || !stripe}
                          />
                        </div>
                        <div className="form-group-premium">
                          <label>Email Address</label>
                          <input
                            type="email"
                            name="customer_email"
                            value={bookingDetails.customer_email}
                            onChange={handleBookingChange}
                            required
                            disabled={!authStatus.isLoggedIn || !stripe}
                          />
                        </div>
                        <div className="form-group-premium">
                          <label>Phone Number</label>
                          <input
                            type="tel"
                            name="phone_number"
                            value={bookingDetails.phone_number}
                            onChange={handleBookingChange}
                            required
                            disabled={!authStatus.isLoggedIn || !stripe}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Travel Information */}
                    <div className="form-section-premium">
                      <h4>Travel Information</h4>
                      <div className="form-grid">
                        <div className="form-group-premium">
                          <label>Departure Flight</label>
                          <input
                            type="text"
                            name="departure_flight_number"
                            value={bookingDetails.departure_flight_number}
                            onChange={handleBookingChange}
                            placeholder="e.g. BA123"
                            disabled={!authStatus.isLoggedIn || !stripe}
                          />
                        </div>
                        <div className="form-group-premium">
                          <label>Arrival Flight</label>
                          <input
                            type="text"
                            name="arrival_flight_number"
                            value={bookingDetails.arrival_flight_number}
                            onChange={handleBookingChange}
                            placeholder="e.g. BA456"
                            disabled={!authStatus.isLoggedIn || !stripe}
                          />
                        </div>
                        <div className="form-group-premium">
                          <label>Departure Terminal</label>
                          <select
                            name="departure_terminal"
                            value={bookingDetails.departure_terminal}
                            onChange={handleBookingChange}
                            required
                            disabled={!authStatus.isLoggedIn || !stripe}
                          >
                            <option value="Terminal 1">Terminal 1</option>
                            <option value="Terminal 2">Terminal 2</option>
                            <option value="Terminal 3">Terminal 3</option>
                            <option value="Terminal 4">Terminal 4</option>
                            <option value="Terminal 5">Terminal 5</option>
                          </select>
                        </div>
                        <div className="form-group-premium">
                          <label>Arrival Terminal</label>
                          <select
                            name="arrival_terminal"
                            value={bookingDetails.arrival_terminal}
                            onChange={handleBookingChange}
                            required
                            disabled={!authStatus.isLoggedIn || !stripe}
                          >
                            <option value="Terminal 1">Terminal 1</option>
                            <option value="Terminal 2">Terminal 2</option>
                            <option value="Terminal 3">Terminal 3</option>
                            <option value="Terminal 4">Terminal 4</option>
                            <option value="Terminal 5">Terminal 5</option>
                          </select>
                        </div>
                        <div className="form-group-premium">
                          <label>Passengers</label>
                          <select
                            name="passenger"
                            value={bookingDetails.passenger}
                            onChange={handleBookingChange}
                            required
                            disabled={!authStatus.isLoggedIn || !stripe}
                          >
                            {[1,2,3,4,5,6,7,8].map(num => (
                              <option key={num} value={num}>{num} passenger{num !== 1 ? 's' : ''}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Vehicle Details */}
                    <div className="form-section-premium">
                      <h4>Vehicle Details</h4>
                      <div className="form-grid">
                        <div className="form-group-premium">
                          <label>Registration</label>
                          <input
                            type="text"
                            name="car_registration_number"
                            value={bookingDetails.car_registration_number}
                            onChange={handleBookingChange}
                            placeholder="e.g. AB12 CDE"
                            required
                            disabled={!authStatus.isLoggedIn || !stripe}
                          />
                        </div>
                        <div className="form-group-premium">
                          <label>Make</label>
                          <input
                            type="text"
                            name="car_make"
                            value={bookingDetails.car_make}
                            onChange={handleBookingChange}
                            placeholder="e.g. BMW"
                            required
                            disabled={!authStatus.isLoggedIn || !stripe}
                          />
                        </div>
                        <div className="form-group-premium">
                          <label>Model</label>
                          <input
                            type="text"
                            name="car_model"
                            value={bookingDetails.car_model}
                            onChange={handleBookingChange}
                            placeholder="e.g. X5"
                            required
                            disabled={!authStatus.isLoggedIn || !stripe}
                          />
                        </div>
                        <div className="form-group-premium">
                          <label>Color</label>
                          <input
                            type="text"
                            name="car_color"
                            value={bookingDetails.car_color}
                            onChange={handleBookingChange}
                            placeholder="e.g. Black"
                            required
                            disabled={!authStatus.isLoggedIn || !stripe}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Enhanced Stripe Elements Card Payment Section */}
                    <div className="form-section-premium">
                      <h4>{isStripeTestMode ? '🧪 Test Payment Details' : '💳 Secure Payment Details'}</h4>
                      <p>{isStripeTestMode ? 
                          'Enter test card information below. This is TEST MODE - no real payments will be charged.' :
                          'Enter your card information below. All payments are processed securely by Stripe.'
                      }</p>
                      
                      <div className="payment-methods-info" style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '16px',
                        padding: '12px',
                        backgroundColor: isStripeTestMode ? '#fef3c7' : '#f8fafc',
                        borderRadius: '8px'
                      }}>
                        <CreditCard size={20} style={{ color: isStripeTestMode ? '#f59e0b' : '#635BFF' }} />
                        <span style={{ fontSize: '14px', color: '#64748b' }}>
                          {isStripeTestMode ? 
                            'TEST MODE: Use test card numbers provided below' :
                            'We accept Visa, Mastercard, American Express, and more'
                          }
                        </span>
                      </div>

                      {/* Test Cards Quick Fill Buttons */}
                      {isStripeTestMode && testCardInfo && (
                        <div className="test-cards-section">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <Info size={16} />
                            <strong>Quick Test Cards (Click to see details):</strong>
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            <button
                              type="button"
                              className="test-card-button"
                              onClick={() => fillTestCard('visa_success')}
                            >
                              ✅ Visa Success
                            </button>
                            <button
                              type="button"
                              className="test-card-button"
                              onClick={() => fillTestCard('visa_declined')}
                            >
                              ❌ Visa Declined
                            </button>
                            <button
                              type="button"
                              className="test-card-button"
                              onClick={() => fillTestCard('mastercard')}
                            >
                              💳 Mastercard
                            </button>
                            <button
                              type="button"
                              className="test-card-button"
                              onClick={() => fillTestCard('visa_debit')}
                            >
                              💰 Visa Debit
                            </button>
                          </div>
                          <small style={{ display: 'block', marginTop: '8px', color: '#92400e' }}>
                            {testCardInfo.note}
                          </small>
                        </div>
                      )}

                      <div className={`card-element-container ${cardError ? 'error' : ''}`}>
                        {isStripeTestMode && (
                          <div className="test-mode-indicator">
                            TEST MODE
                          </div>
                        )}
                        <div id="card-element">
                          {/* Stripe Elements will mount here */}
                        </div>
                      </div>

                      {cardError && (
                        <div className="card-error">
                          <AlertCircle size={14} />
                          <span>{cardError}</span>
                        </div>
                      )}

                      {cardComplete && !cardError && (
                        <div className="card-success">
                          <CheckCircle size={14} />
                          <span>Card details are complete</span>
                        </div>
                      )}

                      <div className="stripe-security-info" style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginTop: '12px',
                        padding: '8px',
                        backgroundColor: isStripeTestMode ? '#fef3c7' : '#f0fdf4',
                        borderRadius: '6px',
                        fontSize: '13px',
                        color: isStripeTestMode ? '#92400e' : '#059669'
                      }}>
                        <Lock size={14} />
                        <span>{isStripeTestMode ? 
                          'TEST MODE: No real charges will be made' :
                          'Your payment information is encrypted and secure'
                        }</span>
                      </div>
                    </div>

                    {/* Enhanced Pricing Summary */}
                    <div className="pricing-summary-premium">
                      <div className="pricing-header">
                        <h4>{isStripeTestMode ? 'Test Payment Summary' : 'Payment Summary'}</h4>
                        <div className="payment-badges">
                          <span className="price-updated">
                            🔴 Live pricing updated: {selectedSpot.last_updated}
                          </span>
                          <span className="stripe-badge" style={{
                            backgroundColor: isStripeTestMode ? '#f59e0b' : '#635BFF'
                          }}>
                            {isStripeTestMode ? '🧪 TEST MODE' : '💳 Secured by Stripe'}
                          </span>
                        </div>
                      </div>
                      <div className="pricing-items">
                        <div className="pricing-item">
                          <span>Service Type</span>
                          <span>{selectedSpot.parking_type}</span>
                        </div>
                        <div className="pricing-item">
                          <span>Duration</span>
                          <span>{selectedSpot.duration_days || 
                            Math.ceil((new Date(searchParams.pickup_date) - new Date(searchParams.dropoff_date)) / (1000 * 60 * 60 * 24))} days</span>
                        </div>
                        <div className="pricing-item">
                          <span>Commission ({selectedSpot.share_percentage}%)</span>
                          <span>£{selectedSpot.commission_amount}</span>
                        </div>
                        <div className="pricing-total">
                          <span>{isStripeTestMode ? 'Test Amount (No Real Charge)' : 'Total Amount (Live Price)'}</span>
                          <span>£{selectedSpot.formatted_price}</span>
                        </div>
                      </div>
                    </div>

                    {/* Enhanced Submit Button */}
                    <button
                      type="submit"
                      className="premium-confirm-btn stripe-enhanced"
                      disabled={isLoading || !authStatus.isLoggedIn || !stripe || processingPayment || !cardComplete}
                      style={{
                        background: (!authStatus.isLoggedIn || !stripe || !cardComplete) ? '#94a3b8' : 
                                   processingPayment ? (isStripeTestMode ? '#f59e0b' : '#3b82f6') : 
                                   isStripeTestMode ? 'linear-gradient(135deg, #f59e0b, #d97706)' :
                                   'linear-gradient(135deg, #635BFF, #4F46E5)',
                        opacity: (!authStatus.isLoggedIn || !stripe || processingPayment || !cardComplete) ? 0.7 : 1
                      }}
                    >
                      {!authStatus.isLoggedIn ? (
                        <>
                          <AlertCircle size={20} />
                          <span>Please Log In First</span>
                        </>
                      ) : !stripe ? (
                        <>
                          <Loader2 size={20} className="btn-spinner" />
                          <span>Loading Stripe...</span>
                        </>
                      ) : !cardComplete ? (
                        <>
                          <CreditCard size={20} />
                          <span>Complete Card Details</span>
                        </>
                      ) : processingPayment || isLoading ? (
                        <>
                          <Loader2 size={20} className="btn-spinner" />
                          <span>
                            {paymentStep === 2 ? (isStripeTestMode ? '🧪 Processing Test Payment...' : '💳 Processing Payment...') : 
                             paymentStep === 3 ? '🎫 Creating Booking...' : 
                             '🔄 Processing...'}
                          </span>
                        </>
                      ) : (
                        <>
                          <CreditCard size={20} />
                          <span>{isStripeTestMode ? 
                            `🧪 Test Pay £${selectedSpot.formatted_price}` : 
                            `💳 Pay £${selectedSpot.formatted_price} Securely`
                          }</span>
                        </>
                      )}
                    </button>

                    <div className="stripe-disclaimer">
                      <small>
                        {isStripeTestMode ? (
                          <>
                            By clicking "Test Pay", you agree to our Terms of Service. 
                            This is TEST MODE - no real payments will be processed. 
                            This will create a test payment intent and process your booking in test mode.
                          </>
                        ) : (
                          <>
                            By clicking "Pay Securely", you agree to our Terms of Service and 
                            authorize Stripe to process your payment securely. 
                            This will create a payment intent and process your booking immediately.
                          </>
                        )}
                      </small>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="booking-success-premium">
                  {bookingStatus?.success ? (
                    <>
                      <div className="success-animation">
                        <div className="success-icon stripe-success">
                          <CheckCircle size={64} />
                          <div className="success-pulse"></div>
                        </div>
                      </div>
                      
                      <h2>{isStripeTestMode || bookingStatus.isTestMode ? 
                          '🧪 Test Payment Successful & Booking Confirmed!' : 
                          '💳 Payment Successful & Booking Confirmed!'
                      }</h2>
                      
                      <p>{isStripeTestMode || bookingStatus.isTestMode ?
                          'Your test payment has been processed by Stripe (TEST MODE) and your parking space has been reserved' :
                          'Your payment has been processed securely by Stripe and your parking space has been reserved'
                      }</p>
                      
                      {/* Test Mode Banner in Success */}
                      {(isStripeTestMode || bookingStatus.isTestMode) && (
                        <div style={{
                          background: '#fef3c7',
                          color: '#92400e',
                          padding: '12px',
                          borderRadius: '8px',
                          marginBottom: '16px',
                          border: '2px solid #f59e0b'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Info size={16} />
                            <strong>🧪 TEST MODE SUCCESS - No Real Charge Made</strong>
                          </div>
                          <small>This was a test transaction. No actual payment has been processed.</small>
                        </div>
                      )}
                      
                      <div className="booking-details-premium stripe-enhanced">
                        <div className="payment-confirmation">
                          <div className="payment-header">
                            <CreditCard size={20} />
                            <span>{(isStripeTestMode || bookingStatus.isTestMode) ? 'Test Payment Confirmation' : 'Payment Confirmation'}</span>
                          </div>
                          <div className="payment-details">
                            <div className="detail-row">
                              <span>Payment ID</span>
                              <strong>{bookingStatus.paymentIntentId}</strong>
                            </div>
                            <div className="detail-row">
                              <span>Amount {(isStripeTestMode || bookingStatus.isTestMode) ? '(Test)' : 'Paid'}</span>
                              <strong>£{bookingStatus.paymentAmount} {bookingStatus.paymentCurrency?.toUpperCase()}</strong>
                            </div>
                            <div className="detail-row">
                              <span>Payment Status</span>
                              <span className="status-badge success">
                                {(isStripeTestMode || bookingStatus.isTestMode) ? '🧪 Test Success' : '✅ Paid'}
                              </span>
                            </div>
                            {(isStripeTestMode || bookingStatus.isTestMode) && (
                              <div className="detail-row">
                                <span>Mode</span>
                                <span className="status-badge" style={{backgroundColor: '#f59e0b', color: 'white'}}>
                                  TEST MODE
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="booking-confirmation">
                          <div className="booking-header">
                            <CheckCircle size={20} />
                            <span>Booking Confirmation</span>
                          </div>
                          <div className="booking-details">
                            <div className="detail-row">
                              <span>Booking Reference</span>
                              <strong>{bookingStatus.reference}</strong>
                            </div>
                            <div className="detail-row">
                              <span>MAGR Reference</span>
                              <strong>{bookingStatus.magrReference}</strong>
                            </div>
                            <div className="detail-row">
                              <span>Service</span>
                              <span>{selectedSpot.name}</span>
                            </div>
                            <div className="detail-row">
                              <span>Airport</span>
                              <span>{availableAirports.find(a => a.code === searchParams.airport_code)?.name || searchParams.airport_code}</span>
                            </div>
                            {bookingStatus.details && (
                              <>
                                <div className="detail-row">
                                  <span>User</span>
                                  <span>{bookingStatus.details.user}</span>
                                </div>
                                <div className="detail-row">
                                  <span>Commission Earned</span>
                                  <span>£{bookingStatus.details.commission}</span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="success-actions">
                        <button 
                          className="action-btn primary stripe-primary"
                          onClick={() => {
                            setSelectedSpot(null);
                            setBookingStep(1);
                            setBookingStatus(null);
                            setPaymentStep(1);
                            setPaymentIntentId(null);
                            setPaymentStatus(null);
                            setCardError(null);
                            setCardComplete(false);
                            fetchParkingProducts();
                          }}
                        >
                          <CheckCircle size={18} />
                          <span>Complete</span>
                        </button>
                      </div>

                      <div className="stripe-success-footer">
                        <div className="stripe-info">
                          <Lock size={14} />
                          <span>{(isStripeTestMode || bookingStatus.isTestMode) ? 
                            'Your test payment was processed by Stripe (TEST MODE)' :
                            'Your payment was processed securely by Stripe'
                          }</span>
                        </div>
                        <div className="receipt-info">
                          <Mail size={14} />
                          <span>Receipt and booking details sent to {bookingDetails.customer_email}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="booking-error-premium stripe-error">
                      <div className="error-icon">
                        <AlertCircle size={64} />
                        <div className="error-pulse"></div>
                      </div>
                      <h2>{(isStripeTestMode || bookingStatus?.isTestMode) ? 
                          '🧪 Test Payment or Booking Failed' : 
                          '💳 Payment or Booking Failed'
                      }</h2>
                      <p>{bookingStatus?.message || "Unable to complete your payment or booking"}</p>
                      
                      {bookingStatus?.paymentStep && (
                        <div className="error-details">
                          <p><strong>Failed at step:</strong> {
                            bookingStatus.paymentStep === 1 ? 'Form Validation' :
                            bookingStatus.paymentStep === 2 ? 'Payment Processing' :
                            bookingStatus.paymentStep === 3 ? 'Booking Creation' : 'Unknown'
                          }</p>
                        </div>
                      )}
                      
                      <div className="error-actions">
                        <button 
                          className="retry-btn stripe-retry"
                          onClick={() => {
                            setBookingStep(1);
                            setBookingStatus(null);
                            setPaymentStep(1);
                            setPaymentIntentId(null);
                            setPaymentStatus(null);
                            setCardError(null);
                            setCardComplete(false);
                          }}
                        >
                          <CreditCard size={18} />
                          <span>{(isStripeTestMode || bookingStatus?.isTestMode) ? 
                            'Try Test Payment Again' : 
                            'Try Payment Again'
                          }</span>
                        </button>
                      </div>

                      <div className="stripe-error-footer">
                        <div className="support-info">
                          <Phone size={14} />
                          <span>Need help? Contact our support team</span>
                        </div>
                      </div>
                    </div>
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

export default ProfessionalParksyDashboard;