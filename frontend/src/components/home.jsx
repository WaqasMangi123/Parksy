import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./home.css";

const ParkingDashboard = () => {
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentLocation, setCurrentLocation] = useState("Islamabad, Pakistan");
  const [viewMode, setViewMode] = useState("grid"); // grid or map

  // Dummy parking spots data
  const parkingSpots = [
    {
      id: 1,
      name: "Blue Area Parking Plaza",
      address: "Blue Area, Islamabad",
      distance: "0.5 km",
      price: 50,
      priceUnit: "hour",
      rating: 4.8,
      reviews: 142,
      availability: "available",
      spots: { total: 150, available: 45 },
      features: ["CCTV", "Security", "Covered", "24/7"],
      image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop",
      coords: { lat: 33.6844, lng: 73.0479 }
    },
    {
      id: 2,
      name: "F-6 Commercial Center",
      address: "F-6 Markaz, Islamabad",
      distance: "1.2 km",
      price: 40,
      priceUnit: "hour",
      rating: 4.6,
      reviews: 98,
      availability: "available",
      spots: { total: 80, available: 12 },
      features: ["Security", "Covered", "EV Charging"],
      image: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=300&fit=crop",
      coords: { lat: 33.6938, lng: 73.0651 }
    },
    {
      id: 3,
      name: "Centaurus Mall Parking",
      address: "F-8, Islamabad",
      distance: "2.1 km",
      price: 60,
      priceUnit: "hour",
      rating: 4.9,
      reviews: 267,
      availability: "limited",
      spots: { total: 200, available: 8 },
      features: ["CCTV", "Security", "Covered", "Valet", "EV Charging"],
      image: "https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=400&h=300&fit=crop",
      coords: { lat: 33.6974, lng: 73.0515 }
    },
    {
      id: 4,
      name: "Sector G-9 Parking",
      address: "G-9 Markaz, Islamabad",
      distance: "3.0 km",
      price: 35,
      priceUnit: "hour",
      rating: 4.3,
      reviews: 76,
      availability: "full",
      spots: { total: 60, available: 0 },
      features: ["Security", "Open Air"],
      image: "https://images.unsplash.com/photo-1553708881-112abc53fe54?w=400&h=300&fit=crop",
      coords: { lat: 33.6890, lng: 73.0470 }
    },
    {
      id: 5,
      name: "Jinnah Convention Centre",
      address: "Serena Chowk, Islamabad",
      distance: "1.8 km",
      price: 70,
      priceUnit: "hour",
      rating: 4.7,
      reviews: 189,
      availability: "available",
      spots: { total: 120, available: 32 },
      features: ["CCTV", "Security", "Covered", "Valet"],
      image: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=400&h=300&fit=crop",
      coords: { lat: 33.6908, lng: 73.0542 }
    },
    {
      id: 6,
      name: "Pakistan Monument Parking",
      address: "Shakarparian, Islamabad",
      distance: "4.2 km",
      price: 30,
      priceUnit: "hour",
      rating: 4.4,
      reviews: 134,
      availability: "available",
      spots: { total: 90, available: 67 },
      features: ["Security", "Open Air", "Tourist Area"],
      image: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=300&fit=crop",
      coords: { lat: 33.6938, lng: 73.0651 }
    }
  ];

  const [filteredSpots, setFilteredSpots] = useState(parkingSpots);

  // Filter spots based on search and availability
  useEffect(() => {
    let filtered = parkingSpots;

    if (selectedFilter !== "all") {
      filtered = filtered.filter(spot => spot.availability === selectedFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter(spot => 
        spot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        spot.address.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredSpots(filtered);
  }, [selectedFilter, searchQuery]);

  // Animation variants
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

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1]
      }
    }
  };

  const cardVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.4,
        ease: [0.16, 1, 0.3, 1]
      }
    },
    hover: {
      y: -8,
      scale: 1.02,
      transition: {
        duration: 0.3,
        ease: "easeOut"
      }
    }
  };

  const getAvailabilityColor = (availability) => {
    switch (availability) {
      case "available": return "#10b981";
      case "limited": return "#f59e0b";
      case "full": return "#ef4444";
      default: return "#6b7280";
    }
  };

  const getAvailabilityText = (availability) => {
    switch (availability) {
      case "available": return "Available";
      case "limited": return "Limited";
      case "full": return "Full";
      default: return "Unknown";
    }
  };

  const handleBookSpot = (spot) => {
    setSelectedSpot(spot);
  };

  const handleCloseModal = () => {
    setSelectedSpot(null);
  };

  const handleConfirmBooking = () => {
    // Here you would integrate with the third-party API
    alert(`Booking confirmed for ${selectedSpot.name}!`);
    setSelectedSpot(null);
  };

  return (
    <div className="parking-dashboard">
      {/* Header Section */}
      <motion.div 
        className="dashboard-header"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="header-content">
          <div className="header-main">
            <h1 className="dashboard-title">
              Find Your Perfect <span className="highlight">Parking Spot</span>
            </h1>
            <p className="dashboard-subtitle">
              Discover and book secure parking spaces in {currentLocation}
            </p>
          </div>
          <div className="header-stats">
            <div className="stat-item">
              <div className="stat-number">50+</div>
              <div className="stat-label">Locations</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">1.2K+</div>
              <div className="stat-label">Happy Customers</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">24/7</div>
              <div className="stat-label">Support</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Search and Filters */}
      <motion.div 
        className="search-filters"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className="search-bar">
          <div className="search-input-container">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input
              type="text"
              placeholder="Search parking spots, locations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="location-selector">
            <svg className="location-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <span>{currentLocation}</span>
          </div>
        </div>

        <div className="filter-tabs">
          {["all", "available", "limited", "full"].map((filter) => (
            <motion.button
              key={filter}
              className={`filter-tab ${selectedFilter === filter ? "active" : ""}`}
              onClick={() => setSelectedFilter(filter)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {filter === "all" ? "All Spots" : getAvailabilityText(filter)}
            </motion.button>
          ))}
        </div>

        <div className="view-toggle">
          <motion.button
            className={`view-btn ${viewMode === "grid" ? "active" : ""}`}
            onClick={() => setViewMode("grid")}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            Grid
          </motion.button>
          <motion.button
            className={`view-btn ${viewMode === "map" ? "active" : ""}`}
            onClick={() => setViewMode("map")}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon>
              <line x1="9" y1="3" x2="9" y2="18"></line>
              <line x1="15" y1="6" x2="15" y2="21"></line>
            </svg>
            Map
          </motion.button>
        </div>
      </motion.div>

      {/* Results Count */}
      <motion.div 
        className="results-info"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.4 }}
      >
        <p>{filteredSpots.length} parking spots found</p>
      </motion.div>

      {/* Parking Spots Grid */}
      <motion.div 
        className="parking-grid"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <AnimatePresence>
          {filteredSpots.map((spot) => (
            <motion.div
              key={spot.id}
              className="parking-card"
              variants={cardVariants}
              whileHover="hover"
              layout
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <div className="card-image">
                <img src={spot.image} alt={spot.name} />
                <div 
                  className="availability-badge"
                  style={{ backgroundColor: getAvailabilityColor(spot.availability) }}
                >
                  {getAvailabilityText(spot.availability)}
                </div>
                <div className="distance-badge">
                  📍 {spot.distance}
                </div>
              </div>

              <div className="card-content">
                <div className="card-header">
                  <h3 className="spot-name">{spot.name}</h3>
                  <div className="rating">
                    <span className="star">⭐</span>
                    <span className="rating-value">{spot.rating}</span>
                    <span className="reviews">({spot.reviews})</span>
                  </div>
                </div>

                <p className="spot-address">{spot.address}</p>

                <div className="spot-details">
                  <div className="price-info">
                    <span className="price">Rs. {spot.price}</span>
                    <span className="price-unit">/{spot.priceUnit}</span>
                  </div>
                  <div className="spots-info">
                    <span className="available-spots">{spot.spots.available}</span>
                    <span className="total-spots">/{spot.spots.total} spots</span>
                  </div>
                </div>

                <div className="features">
                  {spot.features.slice(0, 3).map((feature) => (
                    <span key={feature} className="feature-tag">
                      {feature}
                    </span>
                  ))}
                  {spot.features.length > 3 && (
                    <span className="feature-more">
                      +{spot.features.length - 3} more
                    </span>
                  )}
                </div>

                <motion.button
                  className={`book-btn ${spot.availability === "full" ? "disabled" : ""}`}
                  onClick={() => spot.availability !== "full" && handleBookSpot(spot)}
                  disabled={spot.availability === "full"}
                  whileHover={spot.availability !== "full" ? { scale: 1.02 } : {}}
                  whileTap={spot.availability !== "full" ? { scale: 0.98 } : {}}
                >
                  {spot.availability === "full" ? "Fully Booked" : "Book Now"}
                </motion.button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Booking Modal */}
      <AnimatePresence>
        {selectedSpot && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseModal}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3>Book Parking Spot</h3>
                <button className="close-btn" onClick={handleCloseModal}>
                  ×
                </button>
              </div>

              <div className="modal-body">
                <div className="booking-spot-info">
                  <img src={selectedSpot.image} alt={selectedSpot.name} />
                  <div className="spot-details">
                    <h4>{selectedSpot.name}</h4>
                    <p>{selectedSpot.address}</p>
                    <div className="price">Rs. {selectedSpot.price}/{selectedSpot.priceUnit}</div>
                  </div>
                </div>

                <div className="booking-form">
                  <div className="form-group">
                    <label>Select Date & Time</label>
                    <input type="datetime-local" className="form-control" />
                  </div>
                  <div className="form-group">
                    <label>Duration (hours)</label>
                    <select className="form-control">
                      <option value="1">1 hour</option>
                      <option value="2">2 hours</option>
                      <option value="4">4 hours</option>
                      <option value="8">8 hours</option>
                      <option value="24">24 hours</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Vehicle Number</label>
                    <input type="text" placeholder="ABC-1234" className="form-control" />
                  </div>
                </div>

                <div className="booking-summary">
                  <div className="summary-row">
                    <span>Parking Fee (2 hours)</span>
                    <span>Rs. {selectedSpot.price * 2}</span>
                  </div>
                  <div className="summary-row">
                    <span>Service Fee</span>
                    <span>Rs. 20</span>
                  </div>
                  <div className="summary-row total">
                    <span>Total</span>
                    <span>Rs. {selectedSpot.price * 2 + 20}</span>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button className="btn-primary" onClick={handleConfirmBooking}>
                  Confirm Booking
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ParkingDashboard;