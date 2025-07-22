import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Zap, Grid3X3, Map, Search, Clock, Star, ChevronRight, X, Loader2, AlertCircle } from "lucide-react";
import "./home.css";
import { useAuth } from "../context/AuthContext";

// Animation Variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const cardVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  },
  hover: {
    y: -5,
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)"
  }
};

const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoicGFya3N5dWsiLCJhIjoiY21kODNsaG0yMGw3bzJscXN1bmlkbHk4ZiJ9.DaA0-wfNgf-1PIhJyHXCxg';
const OPENCHARGE_API_KEY = '89499cfe-4016-4300-a570-2e435f249707';

const isYourParkingSpaceListing = (spot) => {
  return spot.provider === "YourParkingSpace" || spot.id.toString().startsWith("yps");
};

const GlobalParkingFinder = () => {
  const { user } = useAuth();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentLocation, setCurrentLocation] = useState("Loading location...");
  const [viewMode, setViewMode] = useState("boxes");
  const [evStations, setEvStations] = useState([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [bookingStep, setBookingStep] = useState(1);
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [mapError, setMapError] = useState(null);
  const [bookingStatus, setBookingStatus] = useState(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  const [bookingDetails, setBookingDetails] = useState({
    date: new Date().toISOString().split('T')[0],
    startTime: "09:00",
    duration: 2,
    vehicle: ""
  });

  // Sample parking data
  const [globalParkingSpots] = useState([
    {
      id: "yps-1",
      name: "Mayfair Secure Parking",
      provider: "YourParkingSpace",
      address: "Berkeley Square, Mayfair",
      postcode: "W1J 6BX",
      distance: "0.3 miles",
      price: 6.50,
      priceUnit: "hour",
      dailyRate: 45.00,
      rating: 4.9,
      reviews: 428,
      availability: "available",
      spots: { total: 120, available: 42 },
      features: ["24/7 Security", "EV Charging", "Valet Service", "Covered", "Contactless Payment"],
      image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&auto=format",
      coords: { lat: 51.5115, lng: -0.1471 },
      hasEVCharging: true,
      operatingHours: "24/7",
      city: "London",
      country: "UK"
    },
    {
      id: "airport-1",
      name: "Heathrow Terminal 5 Parking",
      provider: "AirportParkingCo",
      address: "Heathrow Airport",
      postcode: "TW6 1QG",
      distance: "2.1 miles",
      price: 8.00,
      priceUnit: "hour",
      dailyRate: 55.00,
      rating: 4.7,
      reviews: 512,
      availability: "available",
      spots: { total: 200, available: 35 },
      features: ["24/7 Security", "Covered", "Shuttle Service"],
      image: "https://images.unsplash.com/photo-1486401899868-0e435ed85128?w=800&auto=format",
      coords: { lat: 51.4694, lng: -0.4506 },
      hasEVCharging: true,
      operatingHours: "24/7",
      city: "London",
      country: "UK"
    }
  ]);

  const [filteredSpots, setFilteredSpots] = useState(globalParkingSpots);

  // Stable function to get location name
  const getLocationName = useCallback(async (lat, lng) => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_ACCESS_TOKEN}`
      );
      
      if (response.ok) {
        const data = await response.json();
        const features = data.features;
        let city = '';
        let country = '';
        
        for (const feature of features) {
          if (feature.place_type.includes('place')) {
            city = feature.text;
          }
          if (feature.place_type.includes('country')) {
            country = feature.text;
          }
        }
        
        if (city && country) {
          setCurrentLocation(`${city}, ${country}`);
        } else if (country) {
          setCurrentLocation(country);
        }
      }
    } catch (error) {
      console.error('Error fetching location name:', error);
      setCurrentLocation("Location unavailable");
    }
  }, []);

  // Fetch EV stations with cleanup
  const fetchEVStations = useCallback(async () => {
    const abortController = new AbortController();
    
    try {
      setIsLoading(true);
      const coords = userLocation || { lat: 51.5074, lng: -0.1278 };
      const url = new URL('https://api.openchargemap.io/v3/poi');
      url.searchParams.append('key', OPENCHARGE_API_KEY);
      url.searchParams.append('latitude', coords.lat);
      url.searchParams.append('longitude', coords.lng);
      url.searchParams.append('distance', 50);
      url.searchParams.append('maxresults', 100);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: abortController.signal
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const validStations = data.filter(station => 
        station.AddressInfo && 
        station.AddressInfo.Latitude && 
        station.AddressInfo.Longitude &&
        station.StatusType?.IsOperational
      );
      setEvStations(validStations);
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error fetching EV stations:', error);
        setMapError('Failed to load charging stations. Please try again later.');
      }
    } finally {
      if (!abortController.signal.aborted) {
        setIsLoading(false);
      }
    }

    return () => abortController.abort();
  }, [userLocation]);

  // Initialize map with cleanup
  const initializeMap = useCallback(() => {
    if (!mapLoaded || !mapRef.current || mapInstanceRef.current) return;

    try {
      const centerCoords = userLocation || { lat: 51.5074, lng: -0.1278 };

      const map = new window.mapboxgl.Map({
        container: mapRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [centerCoords.lng, centerCoords.lat],
        zoom: 12,
        pitch: 45,
        bearing: 0,
        antialias: true,
        attributionControl: false
      });

      map.addControl(new window.mapboxgl.NavigationControl(), 'top-right');

      const logo = document.createElement('div');
      logo.className = 'map-logo';
      logo.innerHTML = 'ParkFinder';
      map.getContainer().appendChild(logo);

      map.on('load', () => {
        // Add 3D buildings layer
        map.addLayer({
          'id': '3d-buildings',
          'source': 'composite',
          'source-layer': 'building',
          'filter': ['==', 'extrude', 'true'],
          'type': 'fill-extrusion',
          'minzoom': 14,
          'paint': {
            'fill-extrusion-color': '#E5E7EB',
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

        // Add user location marker
        if (userLocation) {
          const el = document.createElement('div');
          el.className = 'user-marker';
          new window.mapboxgl.Marker(el)
            .setLngLat([userLocation.lng, userLocation.lat])
            .addTo(map);
        }

        // Add parking markers
        globalParkingSpots.forEach(spot => {
          const el = document.createElement('div');
          el.className = `parking-marker ${spot.availability} ${isYourParkingSpaceListing(spot) ? 'yps' : 'airport'}`;
          el.innerHTML = `<div class="marker-inner"><span>£${spot.price}</span></div>`;

          const popupContent = document.createElement('div');
          popupContent.className = 'map-popup';
          popupContent.innerHTML = `
            <h4>${spot.name}</h4>
            <p>${spot.address}, ${spot.city}</p>
            <div class="popup-details">
              <span class="availability ${spot.availability}">
                ${spot.spots.available} spaces
              </span>
              <span class="rating">
                ${spot.rating} ★
              </span>
            </div>
            ${spot.hasEVCharging ? '<div class="ev-indicator">⚡ EV Charging</div>' : ''}
            <div class="provider-badge">
              ${isYourParkingSpaceListing(spot) ? 'YourParkingSpace' : 'Airport Parking'}
            </div>
          `;

          new window.mapboxgl.Marker(el)
            .setLngLat([spot.coords.lng, spot.coords.lat])
            .setPopup(new window.mapboxgl.Popup({ offset: 25 }).setDOMContent(popupContent))
            .addTo(map);
        });

        // Add EV charging markers
        evStations.forEach(station => {
          if (station.AddressInfo) {
            const el = document.createElement('div');
            el.className = 'ev-marker';
            el.innerHTML = `<div class="ev-marker-inner">⚡</div>`;

            const connections = station.Connections || [];
            const fastChargers = connections.filter(conn => conn.PowerKW > 50).length;

            const popupContent = document.createElement('div');
            popupContent.className = 'map-popup';
            popupContent.innerHTML = `
              <h4>${station.AddressInfo.Title || 'EV Charging Station'}</h4>
              <p>${station.AddressInfo.AddressLine1 || ''}</p>
              <div class="popup-details">
                <div class="connectors">
                  <span>${connections.length} connector${connections.length !== 1 ? 's' : ''}</span>
                  ${fastChargers > 0 ? `<span class="fast-chargers">${fastChargers} fast charger${fastChargers !== 1 ? 's' : ''}</span>` : ''}
                </div>
                <div class="operator">
                  ${station.OperatorInfo?.Title ? `<span>${station.OperatorInfo.Title}</span>` : ''}
                </div>
              </div>
            `;

            new window.mapboxgl.Marker(el)
              .setLngLat([station.AddressInfo.Longitude, station.AddressInfo.Latitude])
              .setPopup(new window.mapboxgl.Popup({ offset: 25 }).setDOMContent(popupContent))
              .addTo(map);
          }
        });
      });

      mapInstanceRef.current = map;
    } catch (error) {
      console.error('Map initialization error:', error);
      setMapError('Failed to initialize map. Please try again later.');
    }
  }, [mapLoaded, userLocation, globalParkingSpots, evStations]);

  // Load Mapbox resources
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.mapboxgl) {
      const script = document.createElement('script');
      script.src = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js';
      script.onload = () => {
        const link = document.createElement('link');
        link.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
        window.mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
        setMapLoaded(true);
      };
      script.onerror = () => {
        setMapError('Failed to load map resources. Please try again later.');
      };
      document.head.appendChild(script);
    } else if (window.mapboxgl) {
      window.mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
      setMapLoaded(true);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Get user location
  useEffect(() => {
    const getLocation = async () => {
      if (navigator.geolocation) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 0
            });
          });
          
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(coords);
          
          if (!currentLocation || currentLocation === "Loading location...") {
            await getLocationName(coords.lat, coords.lng);
          }
        } catch (error) {
          console.log("Location error:", error);
          const defaultCoords = { lat: 51.5074, lng: -0.1278 };
          setUserLocation(defaultCoords);
          setCurrentLocation("London, UK");
          setLocationError("Location access denied. Showing default location.");
        }
      } else {
        const defaultCoords = { lat: 51.5074, lng: -0.1278 };
        setUserLocation(defaultCoords);
        setCurrentLocation("London, UK");
        setLocationError("Geolocation is not supported by this browser.");
      }
    };

    getLocation();
  }, [getLocationName]);

  // Initialize map when in map view mode
  useEffect(() => {
    if (viewMode === 'map' && mapLoaded && !mapInstanceRef.current) {
      initializeMap();
    }
  }, [viewMode, mapLoaded, initializeMap]);

  // Fetch EV stations when in map view
  useEffect(() => {
    if (viewMode === 'map' && mapLoaded && evStations.length === 0) {
      fetchEVStations();
    }
  }, [viewMode, mapLoaded, evStations.length, fetchEVStations]);

  // Filter parking spots
  useEffect(() => {
    let filtered = globalParkingSpots;

    if (selectedFilter !== "all") {
      filtered = filtered.filter(spot => spot.availability === selectedFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter(spot => 
        spot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        spot.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        spot.postcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        spot.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        spot.country.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredSpots(filtered);
  }, [selectedFilter, searchQuery, globalParkingSpots]);

  // Booking handlers
  const handleBookingChange = (e) => {
    const { name, value } = e.target;
    setBookingDetails(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setBookingStatus(null);
    
    try {
      // Simulate booking API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      const bookingId = `AP-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
      
      setBookingStatus({
        success: true,
        message: `Booking confirmed at ${selectedSpot.name}`,
        details: { bookingId }
      });
      
      setBookingStep(2);
    } catch (error) {
      setBookingStatus({
        success: false,
        message: "Booking failed. Please try again.",
        error: error.message
      });
    }
  };

  // Parking Card Component
  const ParkingCard = ({ spot }) => {
    const isYPS = isYourParkingSpaceListing(spot);
    const isAvailable = spot.availability === "available";

    const handleBookClick = async (e) => {
      e.stopPropagation();
      if (!isAvailable) return;
      
      if (isYPS) {
        setIsGeneratingLink(true);
        try {
          const destinationUrl = `https://www.yourparkingspace.co.uk/space/${spot.id}`;
          window.open(destinationUrl, '_blank');
        } catch (error) {
          console.error("Failed to open booking link:", error);
        } finally {
          setIsGeneratingLink(false);
        }
      } else {
        setSelectedSpot(spot);
      }
    };

    return (
      <motion.div
        className="parking-card"
        variants={cardVariants}
        whileHover="hover"
        onClick={() => setSelectedSpot(spot)}
      >
        <div className="card-image">
          <img src={spot.image} alt={spot.name} />
          <div className={`availability-badge ${spot.availability}`}>
            {spot.availability === "available" ? "Available" : 
             spot.availability === "limited" ? "Limited" : "Full"}
          </div>
          {spot.hasEVCharging && (
            <div className="ev-badge">
              <Zap size={14} />
              EV Charging
            </div>
          )}
          {isYPS && (
            <div className="provider-badge yps">
              YourParkingSpace
            </div>
          )}
        </div>

        <div className="card-content">
          <div className="card-header">
            <h3>{spot.name}</h3>
            <div className="rating">
              <Star size={14} fill="#fbbf24" />
              <span>{spot.rating}</span>
              <span>({spot.reviews})</span>
            </div>
          </div>

          <div className="location">
            <MapPin size={14} />
            <span>{spot.address}, {spot.city}</span>
          </div>

          <div className="pricing">
            <div className="hourly-rate">
              <span className="price">£{spot.price}</span>
              <span className="unit">/hour</span>
            </div>
            <div className="daily-rate">
              £{spot.dailyRate} daily max
            </div>
          </div>

          <div className="details">
            <div className="spaces">
              {spot.spots.available} spaces available
            </div>
            <div className="distance">
              {spot.distance} away
            </div>
          </div>

          <div className="features">
            {spot.features.slice(0, 3).map((feature, index) => (
              <span key={index} className="feature-tag">
                {feature}
              </span>
            ))}
          </div>

          <motion.button
            className={`book-btn ${!isAvailable ? "disabled" : ""}`}
            whileHover={isAvailable ? { scale: 1.02 } : {}}
            onClick={handleBookClick}
            disabled={!isAvailable || (isYPS && isGeneratingLink)}
          >
            {isGeneratingLink && isYPS ? (
              <Loader2 size={16} className="spinner" />
            ) : isAvailable ? (
              <>
                {isYPS ? "Book on YPS" : "Book Now"}
                <ChevronRight size={16} />
              </>
            ) : spot.availability === "limited" ? "Limited" : "Full"}
          </motion.button>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="parking-dashboard">
      <header className="dashboard-header">
        <motion.div 
          className="header-content"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1>Global <span>Parking</span> Finder</h1>
          <p>Find and book secure parking worldwide with EV charging</p>
        </motion.div>
      </header>

      <motion.section 
        className="search-section"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="search-container">
          <div className="search-bar">
            <div className="search-input">
              <Search size={20} />
              <input
                type="text"
                placeholder="Search by location, postcode or parking name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="location-tag">
              <MapPin size={16} />
              <span>{currentLocation}</span>
            </div>
          </div>

          {locationError && (
            <div className="location-error">
              <AlertCircle size={14} />
              <span>{locationError}</span>
            </div>
          )}

          <div className="filter-controls">
            <div className="filter-tabs">
              {["all", "available", "limited", "full"].map((filter) => (
                <motion.button
                  key={filter}
                  className={`filter-tab ${selectedFilter === filter ? "active" : ""}`}
                  onClick={() => setSelectedFilter(filter)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {filter === "all" ? "All" : 
                   filter === "available" ? "Available" :
                   filter === "limited" ? "Limited" : "Full"}
                </motion.button>
              ))}
            </div>

            <div className="view-toggle">
              <motion.button
                className={`view-btn ${viewMode === "boxes" ? "active" : ""}`}
                onClick={() => setViewMode("boxes")}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Grid3X3 size={18} />
                List
              </motion.button>
              <motion.button
                className={`view-btn ${viewMode === "map" ? "active" : ""}`}
                onClick={() => {
                  setViewMode("map");
                  setMapError(null);
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Map size={18} />
                Map
              </motion.button>
            </div>
          </div>
        </div>
      </motion.section>

      <main className="main-content">
        <AnimatePresence mode="wait">
          {viewMode === "boxes" ? (
            <motion.div
              key="boxes-view"
              className="parking-grid"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {filteredSpots.map((spot) => (
                <ParkingCard key={spot.id} spot={spot} />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="map-view"
              className="map-container"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {mapError ? (
                <div className="rate-limit-message">
                  <AlertCircle size={24} />
                  <h3>Map Error</h3>
                  <p>{mapError}</p>
                </div>
              ) : (
                <>
                  <div className="map-wrapper" ref={mapRef}>
                    {isLoading && (
                      <div className="loading-overlay">
                        <Loader2 size={24} className="spinner" />
                        <p>Loading map data...</p>
                      </div>
                    )}
                    {!mapLoaded && !mapError && (
                      <div className="loading-overlay">
                        <Loader2 size={24} className="spinner" />
                        <p>Loading map resources...</p>
                      </div>
                    )}
                  </div>

                  <div className="map-legend">
                    <div className="legend-item">
                      <div className="marker parking yps"></div>
                      <span>YourParkingSpace</span>
                    </div>
                    <div className="legend-item">
                      <div className="marker parking airport"></div>
                      <span>Airport Parking</span>
                    </div>
                    <div className="legend-item">
                      <div className="marker ev"></div>
                      <span>EV Charging</span>
                    </div>
                    {userLocation && (
                      <div className="legend-item">
                        <div className="marker user"></div>
                        <span>Your Location</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {selectedSpot && !isYourParkingSpaceListing(selectedSpot) && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setSelectedSpot(null);
              setBookingStep(1);
              setBookingStatus(null);
            }}
          >
            <motion.div
              className="booking-modal"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                className="close-btn"
                onClick={() => {
                  setSelectedSpot(null);
                  setBookingStep(1);
                  setBookingStatus(null);
                }}
              >
                <X size={20} />
              </button>

              {bookingStep === 1 ? (
                <div className="booking-step-1">
                  <div className="modal-header">
                    <h2>Book Parking</h2>
                    <p>{selectedSpot.name}</p>
                  </div>

                  <div className="spot-details">
                    <div className="detail-item">
                      <MapPin size={16} />
                      <span>{selectedSpot.address}, {selectedSpot.city}</span>
                    </div>
                    <div className="detail-item">
                      <Clock size={16} />
                      <span>Open {selectedSpot.operatingHours}</span>
                    </div>
                    <div className="detail-item">
                      <div className="availability">
                        {selectedSpot.spots.available} spaces available
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleBookingSubmit}>
                    <div className="form-group">
                      <label>Date</label>
                      <input
                        type="date"
                        name="date"
                        value={bookingDetails.date}
                        onChange={handleBookingChange}
                        min={new Date().toISOString().split('T')[0]}
                        required
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Start Time</label>
                        <input
                          type="time"
                          name="startTime"
                          value={bookingDetails.startTime}
                          onChange={handleBookingChange}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Duration (hours)</label>
                        <select
                          name="duration"
                          value={bookingDetails.duration}
                          onChange={handleBookingChange}
                          required
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(num => (
                            <option key={num} value={num}>{num} hour{num !== 1 ? 's' : ''}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Vehicle Registration</label>
                      <input
                        type="text"
                        name="vehicle"
                        value={bookingDetails.vehicle}
                        onChange={handleBookingChange}
                        placeholder="e.g. AB12 CDE"
                        required
                      />
                    </div>

                    <div className="price-summary">
                      <div className="price-item">
                        <span>Parking fee</span>
                        <span>£{(selectedSpot.price * bookingDetails.duration).toFixed(2)}</span>
                      </div>
                      {selectedSpot.hasEVCharging && (
                        <div className="price-item">
                          <span>EV Charging</span>
                          <span>£2.50</span>
                        </div>
                      )}
                      <div className="price-total">
                        <span>Total</span>
                        <span>£{(selectedSpot.price * bookingDetails.duration + (selectedSpot.hasEVCharging ? 2.5 : 0)).toFixed(2)}</span>
                      </div>
                    </div>

                    <motion.button
                      type="submit"
                      className="confirm-btn"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 size={20} className="spinner" />
                      ) : (
                        "Confirm Booking"
                      )}
                    </motion.button>
                  </form>
                </div>
              ) : (
                <div className="booking-step-2">
                  {bookingStatus?.success ? (
                    <>
                      <div className="success-icon">
                        <svg viewBox="0 0 24 24">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                        </svg>
                      </div>
                      <h2>Booking Confirmed!</h2>
                      <p>Your parking space at {selectedSpot.name} has been reserved.</p>
                      
                      <div className="booking-summary">
                        <div className="summary-item">
                          <span>Date</span>
                          <span>{new Date(bookingDetails.date).toLocaleDateString('en-GB')}</span>
                        </div>
                        <div className="summary-item">
                          <span>Time</span>
                          <span>{bookingDetails.startTime} for {bookingDetails.duration} hour{bookingDetails.duration !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="summary-item">
                          <span>Vehicle</span>
                          <span>{bookingDetails.vehicle}</span>
                        </div>
                        <div className="summary-item">
                          <span>Booking Reference</span>
                          <span>{bookingStatus.details.bookingId}</span>
                        </div>
                        <div className="summary-item">
                          <span>Total Paid</span>
                          <span>£{(selectedSpot.price * bookingDetails.duration + (selectedSpot.hasEVCharging ? 2.5 : 0)).toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="actions">
                        <button className="print-btn">Print Receipt</button>
                        <button 
                          className="done-btn"
                          onClick={() => {
                            setSelectedSpot(null);
                            setBookingStep(1);
                            setBookingStatus(null);
                          }}
                        >
                          Done
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="error-icon">
                        <AlertCircle size={32} />
                      </div>
                      <h2>Booking Failed</h2>
                      <p>{bookingStatus?.message || "Please try again later"}</p>
                      <button 
                        className="done-btn"
                        onClick={() => {
                          setSelectedSpot(null);
                          setBookingStep(1);
                          setBookingStatus(null);
                        }}
                      >
                        Try Again
                      </button>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GlobalParkingFinder;