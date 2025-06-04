import React, { useState, useRef, useEffect } from 'react';
import { sendChatMessage, getParkingDetails } from '../services/parksyApi';
import './parkingbot.css';

const ParkingBot = ({ isOpen: propIsOpen, onClose }) => {
  const [isOpen, setIsOpen] = useState(propIsOpen || false);
  const [messages, setMessages] = useState([
    { 
      text: "🅿️ Hello! I'm Parksy, your comprehensive UK parking assistant.",
      isBot: true,
      timestamp: new Date().toISOString()
    },
    {
      text: "I can help you find parking anywhere in the UK with real-time availability, pricing, and detailed information. What do you need?",
      isBot: true,
      timestamp: new Date().toISOString(),
      suggestions: [
        "Find parking near London Victoria Station",
        "EV charging parking in Manchester",
        "Accessible parking in Birmingham",
        "Parking rules in Edinburgh"
      ]
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [showAllParking, setShowAllParking] = useState({});
  const messagesEndRef = useRef(null);

  // Sync with parent component's open state
  useEffect(() => {
    if (propIsOpen !== undefined) {
      setIsOpen(propIsOpen);
    }
  }, [propIsOpen]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const simulateTyping = async (delay = 1500) => {
    setTyping(true);
    await new Promise(resolve => setTimeout(resolve, delay));
    setTyping(false);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || loading) return;
    
    const userMessage = { 
      text: inputValue,
      isBot: false,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputValue;
    setInputValue('');
    setLoading(true);
    
    try {
      await simulateTyping();
      
      // Send message to backend
      const response = await sendChatMessage(currentInput);
      console.log('API Response:', response); // Debug log
      
      // Create bot message with proper API response handling
      const botMessage = {
        text: response.message || response.response || "I found some parking options for you!",
        isBot: true,
        timestamp: new Date().toISOString(),
        
        // Handle API response structure
        apiResponse: response,
        parkingData: response.top_recommendations || [],
        allParkingData: response.all_parking_options?.spots || response.top_recommendations || [],
        summary: response.summary || {},
        searchContext: response.search_context || {},
        areaInsights: response.area_insights || {},
        tips: response.tips || [],
        recommendations: response.recommendations || {},
        dataStatus: response.data_status || {},
        dataSources: response.data_sources || {}
      };
      
      setMessages(prev => [...prev, botMessage]);
      
    } catch (error) {
      console.error('Chat error:', error);
      
      const errorMessage = {
        text: `I apologize, but I'm having trouble processing your request. ${error.message}. Please try again with a simpler query.`,
        isBot: true,
        timestamp: new Date().toISOString(),
        isError: true,
        suggestions: [
          "Try: 'Find parking in London'",
          "Try: 'Parking near Manchester city center'",
          "Try: 'EV charging in Birmingham'"
        ]
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleParkingSelect = async (spotId, spotTitle) => {
    setLoading(true);
    try {
      await simulateTyping(800);
      
      const loadingMsg = {
        text: `Getting detailed information for ${spotTitle}...`,
        isBot: true,
        timestamp: new Date().toISOString(),
        isLoading: true
      };
      setMessages(prev => [...prev, loadingMsg]);
      
      const details = await getParkingDetails(spotId);
      
      const detailMessage = {
        text: `Here's the comprehensive information for ${spotTitle}:`,
        isBot: true,
        timestamp: new Date().toISOString(),
        spotDetails: details,
        spotId: spotId
      };
      
      setMessages(prev => [...prev, detailMessage]);
      
    } catch (error) {
      const errorMessage = {
        text: `Sorry, I couldn't retrieve detailed information for this parking spot. ${error.message}`,
        isBot: true,
        timestamp: new Date().toISOString(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const toggleShowAllParking = (messageIndex) => {
    setShowAllParking(prev => ({
      ...prev,
      [messageIndex]: !prev[messageIndex]
    }));
  };

  const handleCloseChat = () => {
    setIsOpen(false);
    if (onClose) onClose();
  };

  const handleSuggestionClick = (suggestion) => {
    setInputValue(suggestion);
    setTimeout(() => {
      const input = document.querySelector('.parking-bot-input input');
      if (input) input.focus();
    }, 0);
  };

  const formatPrice = (pricing) => {
    if (!pricing) return 'Price varies';
    if (typeof pricing === 'string') return pricing;
    if (pricing.hourly_rate) return pricing.hourly_rate;
    if (pricing.estimated_cost) return pricing.estimated_cost;
    return 'Price varies';
  };

  const formatDistance = (distance) => {
    if (!distance) return 'Distance unknown';
    if (typeof distance === 'string') return distance;
    if (typeof distance === 'number') {
      if (distance >= 1000) {
        return `${(distance / 1000).toFixed(1)} km`;
      }
      return `${distance}m`;
    }
    return distance;
  };

  const formatWalkingTime = (walkingTime, distance) => {
    if (walkingTime && typeof walkingTime === 'number') {
      return `${walkingTime} min walk`;
    }
    if (walkingTime && typeof walkingTime === 'string') {
      return walkingTime.includes('min') ? walkingTime : `${walkingTime} min walk`;
    }
    if (distance) {
      const distanceNum = typeof distance === 'string' ? parseInt(distance.replace(/\D/g, '')) : distance;
      if (distanceNum) {
        return `~${Math.ceil(distanceNum / 80)} min walk`;
      }
    }
    return 'Walking time varies';
  };

  const getAvailabilityClass = (availability) => {
    if (!availability) return 'unknown';
    const status = availability.status || availability;
    if (typeof status === 'string') {
      return status.toLowerCase().replace(/\s+/g, '-');
    }
    return 'unknown';
  };

  const getScoreClass = (score) => {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'fair';
    return 'poor';
  };

  const renderParkingSpots = (spots, showAll = false, messageIndex = 0) => {
    if (!spots || spots.length === 0) {
      return (
        <div className="no-results">
          <p>No parking spots found. Try a different location or adjust your requirements.</p>
        </div>
      );
    }

    const spotsToShow = showAll ? spots : spots.slice(0, 3);

    return spotsToShow.map((spot, index) => (
      <div key={spot.id || `spot-${index}`} className="parking-spot-card">
        <div className="spot-header">
          <h5>{spot.title}</h5>
          <div className="spot-badges">
            {spot.recommendation_score && (
              <span className={`score-badge ${getScoreClass(spot.recommendation_score)}`}>
                {spot.recommendation_score}/100
              </span>
            )}
            {spot.rank && (
              <span className="rank-badge">#{spot.rank}</span>
            )}
          </div>
        </div>
        
        <p className="spot-address">{spot.address}</p>
        <p className="spot-type">{spot.type || 'Parking Area'}</p>
        
        <div className="spot-details">
          <div className="detail-item">
            <span className="icon">📍</span>
            <span>{formatDistance(spot.distance)}</span>
          </div>
          <div className="detail-item">
            <span className="icon">🚶</span>
            <span>{formatWalkingTime(spot.walking_time, spot.distance)}</span>
          </div>
          <div className="detail-item">
            <span className="icon">💷</span>
            <span>{formatPrice(spot.pricing)}</span>
          </div>
        </div>
        
        {spot.availability && (
          <div className={`spot-availability ${getAvailabilityClass(spot.availability)}`}>
            <span className="availability-status">
              {spot.availability.status || spot.availability}
            </span>
            {(spot.availability.spaces_available || spot.spaces_available) && (
              <span className="spaces-info">
                {spot.availability.spaces_available || spot.spaces_available} spaces available
              </span>
            )}
          </div>
        )}
        
        {spot.special_features && spot.special_features.length > 0 && (
          <div className="special-features">
            {spot.special_features.map((feature, i) => (
              <span key={i} className="feature-tag">
                {feature}
              </span>
            ))}
          </div>
        )}
        
        {spot.analysis && spot.analysis.overall_rating && (
          <div className="spot-rating">
            <span className={`rating ${spot.analysis.overall_rating.toLowerCase()}`}>
              {spot.analysis.overall_rating}
            </span>
          </div>
        )}
        
        <button 
          onClick={() => handleParkingSelect(spot.id, spot.title)}
          disabled={loading}
          className="details-button"
          aria-label={`View details for ${spot.title}`}
        >
          View Full Details
        </button>
      </div>
    ));
  };

  const renderSummary = (summary) => {
    if (!summary || Object.keys(summary).length === 0) return null;
    
    return (
      <div className="summary-section">
        <h4>📊 Search Summary</h4>
        <div className="summary-grid">
          {summary.total_options && (
            <div className="summary-item">
              <span className="label">Total Options:</span>
              <span className="value">{summary.total_options}</span>
            </div>
          )}
          {summary.average_price && (
            <div className="summary-item">
              <span className="label">Average Price:</span>
              <span className="value">{summary.average_price}</span>
            </div>
          )}
          {summary.closest_option && summary.closest_option.distance && (
            <div className="summary-item">
              <span className="label">Closest Option:</span>
              <span className="value">{summary.closest_option.distance}</span>
            </div>
          )}
          {summary.cheapest_option && summary.cheapest_option.price && (
            <div className="summary-item">
              <span className="label">Best Value:</span>
              <span className="value">{summary.cheapest_option.price}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderAreaInsights = (insights) => {
    if (!insights || Object.keys(insights).length === 0) return null;
    
    return (
      <div className="insights-section">
        <h4>🏙️ Area Information</h4>
        <div className="insights-grid">
          {insights.area_type && (
            <div className="insight-item">
              <strong>Area Type:</strong> {insights.area_type}
            </div>
          )}
          {insights.parking_density && (
            <div className="insight-item">
              <strong>Parking Density:</strong> {insights.parking_density}
            </div>
          )}
          {insights.typical_pricing && (
            <div className="insight-item">
              <strong>Typical Pricing:</strong> {insights.typical_pricing}
            </div>
          )}
          {insights.best_parking_strategy && (
            <div className="insight-item">
              <strong>Strategy:</strong> {insights.best_parking_strategy}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTips = (tips) => {
    if (!tips || tips.length === 0) return null;
    
    return (
      <div className="tips-section">
        <h4>💡 Parking Tips</h4>
        <ul className="tips-list">
          {tips.map((tip, index) => (
            <li key={index}>{tip}</li>
          ))}
        </ul>
      </div>
    );
  };

  const renderRecommendations = (recommendations) => {
    if (!recommendations || Object.keys(recommendations).length === 0) return null;
    
    return (
      <div className="recommendations-section">
        <h4>🎯 Top Recommendations</h4>
        <div className="recommendations-grid">
          {recommendations.best_overall && (
            <div className="recommendation-item">
              <strong>Best Overall:</strong> {recommendations.best_overall.title}
            </div>
          )}
          {recommendations.best_value && (
            <div className="recommendation-item">
              <strong>Best Value:</strong> {recommendations.best_value.title}
            </div>
          )}
          {recommendations.closest && (
            <div className="recommendation-item">
              <strong>Closest:</strong> {recommendations.closest.title}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderDataStatus = (dataStatus, dataSources) => {
    if (!dataStatus && !dataSources) return null;
    
    return (
      <div className="data-status-section">
        <h4>📡 Data Status</h4>
        <div className="data-status-grid">
          {dataSources && dataSources.primary_source && (
            <div className="status-item">
              <strong>Primary Source:</strong> {dataSources.primary_source}
            </div>
          )}
          {dataSources && dataSources.real_time_spots !== undefined && (
            <div className="status-item">
              <strong>Real-time Spots:</strong> {dataSources.real_time_spots}
            </div>
          )}
          {dataSources && dataSources.enhanced_database_spots !== undefined && (
            <div className="status-item">
              <strong>Database Spots:</strong> {dataSources.enhanced_database_spots}
            </div>
          )}
          {dataStatus && dataStatus.last_updated && (
            <div className="status-item">
              <strong>Last Updated:</strong> {dataStatus.last_updated}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSpotDetails = (details, spotId) => {
    if (!details) return null;
    
    return (
      <div className="spot-details-full">
        <h4>🚗 Detailed Parking Information</h4>
        
        {details.detailed_info && (
          <div className="details-sections">
            <div className="detail-section">
              <h5>🕒 Availability</h5>
              <p>{details.detailed_info.live_availability}</p>
            </div>
            
            {details.detailed_info.recent_reviews && (
              <div className="detail-section">
                <h5>⭐ Recent Reviews</h5>
                {details.detailed_info.recent_reviews.map((review, i) => (
                  <div key={i} className="review-item">
                    <span className="rating">{'⭐'.repeat(review.rating)}</span>
                    <span className="comment">{review.comment}</span>
                  </div>
                ))}
              </div>
            )}
            
            {details.detailed_info.nearby_amenities && (
              <div className="detail-section">
                <h5>🏪 Nearby Amenities</h5>
                <ul>
                  {details.detailed_info.nearby_amenities.map((amenity, i) => (
                    <li key={i}>{amenity}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {details.detailed_info.traffic_conditions && (
              <div className="detail-section">
                <h5>🚦 Traffic Conditions</h5>
                <p>{details.detailed_info.traffic_conditions}</p>
              </div>
            )}
          </div>
        )}
        
        {details.booking_options && (
          <div className="detail-section">
            <h5>📱 Booking Options</h5>
            <div className="booking-options">
              {details.booking_options.map((option, i) => (
                <div key={i} className="booking-option">
                  <strong>{option.provider}</strong>
                  {option.advance_booking && <span className="feature">Advance Booking</span>}
                  {option.mobile_payment && <span className="feature">Mobile Payment</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`parking-bot-container ${isOpen ? 'open' : ''}`}>
      {!isOpen && (
        <div 
          className="chat-bubble" 
          onClick={() => setIsOpen(true)}
          aria-label="Open Parksy - UK Parking Assistant"
        >
          <div className="bubble-icon">🅿️</div>
          <div className="bubble-pulse"></div>
        </div>
      )}
      
      {isOpen && (
        <>
          <div className="parking-bot-header">
            <div className="bot-avatar">🅿️</div>
            <div className="bot-title">
              <h3>Parksy - UK Parking</h3>
              <p>Real-time parking intelligence</p>
            </div>
            <div className="bot-status-indicator online" aria-label="Online"></div>
            <button 
              className="close-chat" 
              onClick={handleCloseChat}
              aria-label="Close chat"
            >
              ×
            </button>
          </div>
          
          <div className="parking-bot-content">
            <div className="parking-bot-messages">
              {messages.map((msg, messageIndex) => (
                <div 
                  key={`${msg.timestamp}-${messageIndex}`} 
                  className={`message ${msg.isBot ? 'bot' : 'user'} ${msg.isError ? 'error' : ''} ${msg.isLoading ? 'loading' : ''}`}
                  aria-live={msg.isBot ? "polite" : "off"}
                >
                  <div className="message-meta">
                    {msg.isBot && <span className="bot-indicator">PARKSY</span>}
                    <span className="message-time">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="message-text">{msg.text}</div>
                  
                  {msg.suggestions && (
                    <div className="suggestions-container">
                      <p>Quick suggestions:</p>
                      <div className="suggestion-chips">
                        {msg.suggestions.map((suggestion, i) => (
                          <button 
                            key={i} 
                            className="suggestion-chip"
                            onClick={() => handleSuggestionClick(suggestion)}
                            aria-label={`Try: ${suggestion}`}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {msg.summary && renderSummary(msg.summary)}
                  
                  {msg.parkingData && msg.parkingData.length > 0 && (
                    <div className="parking-results">
                      <div className="results-header">
                        <h4>🅿️ Available Parking</h4>
                        <p>
                          Showing {showAllParking[messageIndex] ? msg.parkingData.length : Math.min(3, msg.parkingData.length)} 
                          of {msg.parkingData.length} options
                          {msg.searchContext?.location && ` in ${msg.searchContext.location}`}
                        </p>
                      </div>
                      
                      {renderParkingSpots(msg.parkingData, showAllParking[messageIndex], messageIndex)}
                      
                      {msg.parkingData.length > 3 && (
                        <button 
                          onClick={() => toggleShowAllParking(messageIndex)}
                          className="show-more-button"
                        >
                          {showAllParking[messageIndex] ? 'Show Less' : `Show All ${msg.parkingData.length} Options`}
                        </button>
                      )}
                    </div>
                  )}
                  
                  {msg.areaInsights && renderAreaInsights(msg.areaInsights)}
                  {msg.recommendations && renderRecommendations(msg.recommendations)}
                  {msg.tips && renderTips(msg.tips)}
                  {msg.dataStatus && renderDataStatus(msg.dataStatus, msg.dataSources)}
                  {msg.spotDetails && renderSpotDetails(msg.spotDetails, msg.spotId)}
                </div>
              ))}
              
              {(loading || typing) && (
                <div className="message bot typing-indicator" aria-label="Parksy is thinking">
                  <div className="message-meta">
                    <span className="bot-indicator">PARKSY</span>
                  </div>
                  <div className="typing-dots">
                    <div></div>
                    <div></div>
                    <div></div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} aria-hidden="true" />
            </div>
            
            <div className="parking-bot-input">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about parking anywhere in the UK..."
                disabled={loading}
                autoFocus
                aria-label="Type your parking question"
              />
              <button 
                onClick={handleSendMessage} 
                disabled={loading || !inputValue.trim()}
                className="send-button"
                aria-label="Send message"
              >
                {loading ? '⏳' : '🚀'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ParkingBot;