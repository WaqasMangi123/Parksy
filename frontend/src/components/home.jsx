import React, { useState, useEffect, useCallback, useRef } from "react";
import { 
  MapPin, Zap, Grid3X3, Map, Search, Clock, Star, ChevronRight, 
  X, Loader2, Plane, Calendar, Users, Car, Shield, Wifi, Camera, 
  CheckCircle, AlertCircle, Navigation, Home, Settings, Bell,
  Phone, Mail, CreditCard, Globe, Award
} from "lucide-react";
import "./home.css";

const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoicGFya3N5dWsiLCJhIjoiY21kODNsaG0yMGw3bzJscXN1bmlkbHk4ZiJ9.DaA0-wfNgf-1PIhJyHXCxg';

const ProfessionalParksyDashboard = () => {
  // API Configuration - Fixed to deployed backend only
  const API_BASE_URL = "https://parksy-backend.onrender.com";
  
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

  // Search Parameters
  const [searchParams, setSearchParams] = useState({
    airport_code: "LHR",
    dropoff_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    dropoff_time: "09:00",
    pickup_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    pickup_time: "18:00"
  });

  // Booking Details
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
    paymentgateway: "Invoice"
  });

  // ========== AUTHENTICATION FUNCTIONS ==========

  // Get authentication token from browser memory
  const getAuthToken = () => {
    // Try different storage locations where the login system might store the token
    return localStorage.getItem('token') || 
           localStorage.getItem('authToken') || 
           localStorage.getItem('jwt') ||
           localStorage.getItem('access_token') ||
           sessionStorage.getItem('token') || 
           sessionStorage.getItem('authToken') ||
           sessionStorage.getItem('jwt') ||
           sessionStorage.getItem('access_token');
  };

  // Check if user is logged in
  const isUserLoggedIn = () => {
    const token = getAuthToken();
    return !!token;
  };

  // Get user info from token (decode without verification - just for display)
  const getUserInfoFromToken = () => {
    const token = getAuthToken();
    if (!token) return null;
    
    try {
      // Decode JWT payload (without verification)
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      const payload = JSON.parse(jsonPayload);
      return payload;
    } catch (error) {
      console.error('❌ Error decoding token:', error);
      return null;
    }
  };

  // Check authentication status on component mount
  useEffect(() => {
    const checkAuth = () => {
      const isLoggedIn = isUserLoggedIn();
      const userInfo = getUserInfoFromToken();
      
      setAuthStatus({
        isLoggedIn: isLoggedIn,
        user: userInfo
      });

      console.log('🔐 Authentication Status:', {
        isLoggedIn: isLoggedIn,
        userEmail: userInfo?.email || 'Not available',
        tokenExists: !!getAuthToken()
      });
    };

    checkAuth();
  }, []);

  // ========== API FUNCTIONS ==========

  // Smart backend connection with fallback
  const testBackendConnection = async () => {
    setConnectionStatus('testing');
    
    try {
      console.log(`🔍 Testing backend connection to: ${API_BASE_URL}`);
      const response = await fetch(`${API_BASE_URL}/api/parking/health`, {
        method: 'GET',
        timeout: 10000
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Backend connected successfully:', data);
        setConnectionStatus('connected');
        return true;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`❌ Connection failed for ${API_BASE_URL}:`, error.message);
      setConnectionStatus('failed');
      setApiError(`Unable to connect to backend server: ${error.message}`);
      return false;
    }
  };

  // Updated API request function with authentication
  const makeAPIRequest = async (endpoint, options = {}) => {
    const token = getAuthToken();
    
    // Prepare request body - include token for authenticated requests
    let requestBody = options.body || {};
    
    // Add token to request body for booking requests (authentication required)
    if (token && endpoint.includes('/bookings')) {
      requestBody = {
        ...requestBody,
        token: token  // Send token in body instead of header
      };
    }
    
    const config = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: Object.keys(requestBody).length > 0 ? JSON.stringify(requestBody) : undefined,
    };

    try {
      console.log('🚀 API Request:', {
        endpoint: `${API_BASE_URL}${endpoint}`,
        method: config.method,
        hasToken: !!token,
        requiresAuth: endpoint.includes('/bookings')
      });
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle authentication errors
        if (response.status === 401 || errorData.requireAuth) {
          console.log('❌ Authentication required');
          throw new Error('Please log in to make bookings. You must be signed in to book parking spots.');
        }
        
        if (response.status === 403 || errorData.requireVerification) {
          console.log('❌ Email verification required');
          throw new Error('Please verify your email address before making bookings.');
        }
        
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ API Response successful');
      
      return data;
    } catch (error) {
      console.error('❌ API Request failed:', error);
      throw error;
    }
  };

  const loadAirports = async () => {
    try {
      const isConnected = await testBackendConnection();
      if (!isConnected) return;

      const response = await makeAPIRequest('/api/parking/airports');
      if (response.success) {
        setAvailableAirports(response.data);
        console.log('✅ Airports loaded:', response.data.length);
      } else {
        throw new Error('Failed to load airports');
      }
    } catch (error) {
      console.error('❌ Error loading airports:', error);
      setApiError(error.message);
    }
  };

  const fetchParkingProducts = useCallback(async () => {
    if (connectionStatus !== 'connected') {
      setApiError('Backend server is not connected');
      return;
    }

    setIsLoading(true);
    setApiError(null);
    
    try {
      console.log('🔍 Fetching parking products...');
      const response = await makeAPIRequest('/api/parking/search-parking', {
        method: 'POST',
        body: searchParams
      });
      
      if (response.success) {
        const processedProducts = response.data.products.map(product => ({
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
        console.log('✅ Products loaded:', processedProducts.length);
      } else {
        throw new Error('No parking data available');
      }
    } catch (error) {
      console.error('❌ Error fetching products:', error);
      setApiError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [searchParams, connectionStatus, API_BASE_URL]);

  // ========== EVENT HANDLERS ==========

  const handleSearch = () => {
    if (connectionStatus !== 'connected') {
      setApiError('Backend server is not connected');
      return;
    }
    fetchParkingProducts();
  };

  const handleSearchParamChange = (field, value) => {
    setSearchParams(prev => ({ ...prev, [field]: value }));
  };

  const handleBookingChange = (e) => {
    const { name, value } = e.target;
    setBookingDetails(prev => ({ ...prev, [name]: value }));
  };

  // UPDATED BOOKING SUBMIT WITH AUTHENTICATION
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    
    // Check if user is logged in FIRST
    if (!isUserLoggedIn()) {
      console.log('❌ User not logged in');
      setBookingStatus({
        success: false,
        message: 'Please log in to make a booking. You must sign in to book parking spaces through our system.'
      });
      setBookingStep(2);
      return;
    }

    // Get user info for logging
    const userInfo = getUserInfoFromToken();
    console.log('👤 Making booking for user:', userInfo?.email || 'Unknown');

    setIsLoading(true);
    setBookingStatus(null);
    
    try {
      // Prepare booking data with all required fields
      const bookingData = {
        // Service details
        company_code: selectedSpot.companyID || selectedSpot.product_code,
        product_name: selectedSpot.name,
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
        
        // Payment details
        paymentgateway: bookingDetails.paymentgateway || 'Invoice',
        payment_token: `pi_${Math.random().toString(36).substring(2, 15)}`,
        
        // Service features
        is_cancelable: selectedSpot.cancelable === 'Yes',
        is_editable: selectedSpot.editable === 'Yes',
        special_features: selectedSpot.features_array || []
      };

      console.log('🎫 Submitting booking:', {
        user: userInfo?.email,
        service: bookingData.product_name,
        airport: bookingData.airport_code,
        amount: bookingData.booking_amount
      });

      const response = await makeAPIRequest('/api/parking/bookings', {
        method: 'POST',
        body: bookingData
      });
      
      console.log('📋 Booking response:', response);
      
      if (response.success) {
        setBookingStatus({
          success: true,
          message: 'Booking confirmed successfully!',
          reference: response.data.our_reference,
          magrReference: response.data.magr_reference,
          bookingId: response.data.booking_id || response.data.database_id,
          details: {
            user: response.data.user_email,
            service: response.data.service,
            airport: response.data.airport,
            amount: response.data.total_amount,
            commission: response.data.commission
          }
        });
        setBookingStep(2);
      } else {
        throw new Error(response.message || 'Booking failed');
      }
    } catch (error) {
      console.error('❌ Booking submission error:', error);
      setBookingStatus({
        success: false,
        message: error.message || 'Failed to create booking. Please try again.'
      });
      setBookingStep(2);
    } finally {
      setIsLoading(false);
    }
  };

  // Navigation function for EV Charging
  const navigateToEvCharging = () => {
    window.location.href = '/#/evcharging';
  };

  // Get user location with enhanced accuracy
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
      // Load Mapbox CSS
      const link = document.createElement('link');
      link.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css';
      link.rel = 'stylesheet';
      document.head.appendChild(link);

      // Load Mapbox JS
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

      // Add navigation controls
      map.addControl(new window.mapboxgl.NavigationControl({
        visualizePitch: true
      }), 'top-right');

      // Add geolocate control
      const geolocate = new window.mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true,
        showUserHeading: true
      });
      map.addControl(geolocate, 'top-right');

      map.on('load', () => {
        // Add 3D buildings
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

        // Add user location marker if available
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

        // Add parking spot markers
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

          // Create popup content
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
    
    // Hide airplane animation after 3 seconds
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
            <span className="btn-text">Book Real-Time</span>
            <ChevronRight size={18} className="btn-icon" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="premium-parking-dashboard">
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
          <p className="header-subtitle">Premium real-time parking solutions with live availability</p>
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
              <span className="stat-number">{authStatus.isLoggedIn ? '👤' : '🚫'}</span>
              <span className="stat-label">{authStatus.isLoggedIn ? 'Logged In' : 'Not Logged In'}</span>
            </div>
          </div>
          <div className="api-url-display">
            <small>Backend: {API_BASE_URL}</small>
          </div>
        </div>
      </header>

      {/* Status Banners */}
      {connectionStatus === 'failed' && (
        <div className="api-status-banner error">
          <AlertCircle size={16} />
          <span>❌ BACKEND SERVER CONNECTION FAILED - Check if Render backend is running</span>
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
          <span>🔴 LIVE CONNECTION - Real-time parking data from Parksy API</span>
        </div>
      )}

      {/* Authentication Status Banner */}
      {!authStatus.isLoggedIn && (
        <div className="api-status-banner warning" style={{backgroundColor: '#fbbf24', color: '#000'}}>
          <AlertCircle size={16} />
          <span>⚠️ You must be logged in to make bookings. Please sign in to book parking spots.</span>
        </div>
      )}

      {authStatus.isLoggedIn && (
        <div className="api-status-banner success">
          <CheckCircle size={16} />
          <span>👤 Welcome {authStatus.user?.email || 'User'} - You can now make bookings!</span>
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

      {/* Parking Booking Modal */}
      {selectedSpot && (
        <div className="premium-modal-overlay" onClick={() => {
          setSelectedSpot(null);
          setBookingStep(1);
          setBookingStatus(null);
        }}>
          <div className="premium-booking-modal" onClick={(e) => e.stopPropagation()}>
            <button 
              className="premium-close-btn"
              onClick={() => {
                setSelectedSpot(null);
                setBookingStep(1);
                setBookingStatus(null);
              }}
            >
              <X size={20} />
            </button>

            <div className="modal-content">
              {bookingStep === 1 ? (
                <div className="booking-step-premium">
                  {/* Authentication Warning */}
                  {!authStatus.isLoggedIn && (
                    <div className="auth-warning">
                      <AlertCircle size={20} />
                      <p>You must be logged in to make bookings. Please sign in first.</p>
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
                    </div>
                    <div className="header-content">
                      <h2 className="service-title">{selectedSpot.name}</h2>
                      <p className="service-type">{selectedSpot.parking_type}</p>
                      <div className="service-badges">
                        {selectedSpot.cancelable === "Yes" && (
                          <span className="badge cancelable">Cancelable</span>
                        )}
                        <span className="badge live">🔴 Real-Time Pricing</span>
                      </div>
                    </div>
                  </div>

                  {/* Service Overview */}
                  <div className="service-overview-premium">
                    <h4>Real-Time Service Details</h4>
                    <p>Live parking service with real-time availability and pricing</p>
                    
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
                            disabled={!authStatus.isLoggedIn}
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
                            disabled={!authStatus.isLoggedIn}
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
                            disabled={!authStatus.isLoggedIn}
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
                            disabled={!authStatus.isLoggedIn}
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
                            disabled={!authStatus.isLoggedIn}
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
                            disabled={!authStatus.isLoggedIn}
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
                            disabled={!authStatus.isLoggedIn}
                          />
                        </div>
                        <div className="form-group-premium">
                          <label>Departure Terminal</label>
                          <select
                            name="departure_terminal"
                            value={bookingDetails.departure_terminal}
                            onChange={handleBookingChange}
                            required
                            disabled={!authStatus.isLoggedIn}
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
                            disabled={!authStatus.isLoggedIn}
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
                            disabled={!authStatus.isLoggedIn}
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
                            disabled={!authStatus.isLoggedIn}
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
                            disabled={!authStatus.isLoggedIn}
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
                            disabled={!authStatus.isLoggedIn}
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
                            disabled={!authStatus.isLoggedIn}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Pricing Summary */}
                    <div className="pricing-summary-premium">
                      <div className="pricing-header">
                        <h4>Real-Time Booking Summary</h4>
                        <span className="price-updated">
                          🔴 Live pricing updated: {selectedSpot.last_updated}
                        </span>
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
                          <span>Total Amount (Live Price)</span>
                          <span>£{selectedSpot.formatted_price}</span>
                        </div>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      className="premium-confirm-btn"
                      disabled={isLoading || !authStatus.isLoggedIn}
                    >
                      {!authStatus.isLoggedIn ? (
                        <>
                          <AlertCircle size={20} />
                          <span>Please Log In First</span>
                        </>
                      ) : isLoading ? (
                        <>
                          <Loader2 size={20} className="btn-spinner" />
                          <span>Processing Real-Time Booking...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle size={20} />
                          <span>🔴 Confirm Live Booking</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="booking-success-premium">
                  {bookingStatus?.success ? (
                    <>
                      <div className="success-animation">
                        <div className="success-icon">
                          <CheckCircle size={64} />
                        </div>
                      </div>
                      
                      <h2>🔴 Real-Time Booking Confirmed!</h2>
                      
                      <p>Your parking space has been successfully reserved through Parksy API and saved to our database</p>
                      
                      <div className="booking-details-premium">
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
                          <span>Total Amount</span>
                          <strong>£{selectedSpot.formatted_price}</strong>
                        </div>
                        {bookingStatus.details && (
                          <>
                            <div className="detail-row">
                              <span>User</span>
                              <span>{bookingStatus.details.user}</span>
                            </div>
                            <div className="detail-row">
                              <span>Commission</span>
                              <span>£{bookingStatus.details.commission}</span>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="success-actions">
                        <button 
                          className="action-btn primary"
                          onClick={() => {
                            setSelectedSpot(null);
                            setBookingStep(1);
                            setBookingStatus(null);
                            fetchParkingProducts();
                          }}
                        >
                          Done
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="booking-error-premium">
                      <div className="error-icon">
                        <AlertCircle size={64} />
                      </div>
                      <h2>Booking Failed</h2>
                      <p>{bookingStatus?.message || "Unable to complete your booking"}</p>
                      <div className="error-actions">
                        <button 
                          className="retry-btn"
                          onClick={() => {
                            setBookingStep(1);
                            setBookingStatus(null);
                          }}
                        >
                          Try Again
                        </button>
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