import React, { useState, useRef, useEffect, useCallback } from 'react';
import { sendChatMessage, checkApiHealth } from '../services/parksyApi';
import './parkingbot.css';

const ParkingBot = ({ isOpen: propIsOpen, onClose, onOpen }) => {
  const [isOpen, setIsOpen] = useState(propIsOpen || false);
  const [messages, setMessages] = useState([
    {
      text: "🅿️ Welcome to Parksy, your UK parking assistant!",
      isBot: true,
      timestamp: new Date().toISOString(),
    },
    {
      text: "I can find parking spots with real-time availability and pricing. Where are you looking to park?",
      isBot: true,
      timestamp: new Date().toISOString(),
      suggestions: [
        "Find parking in London",
        "EV charging in Manchester",
        "Accessible parking in Birmingham",
        "Parking in Edinburgh",
        "Cheap parking in Glasgow",
      ],
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [showAllParking, setShowAllParking] = useState({});
  const [apiHealthy, setApiHealthy] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Default number of locations to show initially
  const DEFAULT_LOCATIONS_SHOW = 4;

  // Handle opening the chat
  const handleOpenChat = useCallback(() => {
    setIsOpen(true);
    onOpen?.();
    // Focus input after a small delay to ensure the widget is rendered
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 150);
  }, [onOpen]);

  // Handle closing the chat
  const handleCloseChat = useCallback(() => {
    setIsOpen(false);
    onClose?.();
  }, [onClose]);

  // Update state when prop changes
  useEffect(() => {
    if (propIsOpen !== undefined && propIsOpen !== isOpen) {
      setIsOpen(propIsOpen);
    }
  }, [propIsOpen, isOpen]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Check API health on mount
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const health = await checkApiHealth();
        setApiHealthy(health.healthy);
        if (!health.healthy) {
          setMessages((prev) => [
            ...prev,
            {
              text: "⚠️ Parksy is having trouble connecting to the server. Please try again later or check your connection.",
              isBot: true,
              timestamp: new Date().toISOString(),
              isError: true,
              suggestions: [
                "Find parking in London",
                "Parking in Edinburgh",
                "Accessible parking in Birmingham",
              ],
            },
          ]);
        }
      } catch (error) {
        console.error('Health check failed:', error);
        setApiHealthy(false);
      }
    };
    checkHealth();
  }, []);

  const simulateTyping = useCallback(async (delay = 800) => {
    setTyping(true);
    await new Promise((resolve) => setTimeout(resolve, delay));
    setTyping(false);
  }, []);

  // Enhanced function to parse parking data from text response
  const parseParkingDataFromText = useCallback((text) => {
    const parkingSpots = [];
    
    // Enhanced regex patterns to extract parking information
    const spotPatterns = [
      // Pattern for numbered locations (1. **Location Name**)
      /(\d+)\.\s*\*\*([^*]+)\*\*\s*\(([^)]+)\)\s*-\s*([^0-9\n]*?)(?:£([\d.]+))?(?:\s*(\d+:\d+|\d+\/\d+|24\/7|Open \d+:\d+))?/gi,
      // Pattern for bullet points
      /[•-]\s*\*\*([^*]+)\*\*\s*\(([^)]+)\)\s*-\s*([^0-9\n]*?)(?:£([\d.]+))?(?:\s*(\d+:\d+|\d+\/\d+|24\/7|Open \d+:\d+))?/gi,
      // Pattern for simple format
      /\*\*([^*]+)\*\*\s*\(([^)]+)\)\s*-\s*([^£\n]*?)(?:£([\d.]+))?/gi
    ];

    let match;
    let spotId = 1;

    spotPatterns.forEach(pattern => {
      pattern.lastIndex = 0; // Reset regex
      while ((match = pattern.exec(text)) !== null) {
        const [, rank, title, address, description, price, hours] = match;
        
        // Extract additional details from description
        const details = extractDetailsFromDescription(description || '');
        
        parkingSpots.push({
          id: `spot-${spotId++}`,
          rank: rank || spotId,
          title: title?.trim() || 'Unknown Location',
          address: address?.trim() || 'Address not specified',
          description: description?.trim() || '',
          pricing: price ? `£${price}` : extractPricing(text, title),
          hours: hours || extractHours(text, title),
          distance: extractDistance(text, title),
          walkingTime: extractWalkingTime(text, title),
          restrictions: details.restrictions,
          accessibility: details.accessibility,
          features: details.features,
          type: extractParkingType(description || ''),
          availability: extractAvailability(text, title)
        });
      }
    });

    // If no structured data found, try to extract from general text
    if (parkingSpots.length === 0) {
      const generalMatches = text.match(/\*\*([^*]+)\*\*/g);
      if (generalMatches) {
        generalMatches.forEach((match, index) => {
          const title = match.replace(/\*\*/g, '').trim();
          if (title && !title.includes('Data Status') && !title.includes('Top spots')) {
            parkingSpots.push({
              id: `general-spot-${index + 1}`,
              rank: index + 1,
              title: title,
              address: extractAddressFromContext(text, title),
              description: extractDescriptionFromContext(text, title),
              pricing: extractPricing(text, title),
              hours: extractHours(text, title),
              distance: extractDistance(text, title),
              walkingTime: extractWalkingTime(text, title),
              restrictions: extractRestrictionsFromContext(text, title),
              accessibility: extractAccessibilityFromContext(text, title),
              features: extractFeaturesFromContext(text, title),
              type: 'Car Park',
              availability: 'Check availability'
            });
          }
        });
      }
    }

    return parkingSpots;
  }, []);

  // Helper functions for data extraction
  const extractDetailsFromDescription = (description) => {
    const restrictions = [];
    const accessibility = [];
    const features = [];

    // Features detection
    if (description.toLowerCase().includes('24/7') || description.toLowerCase().includes('24 hour')) {
      features.push('24/7 Access');
    }
    if (description.toLowerCase().includes('ev charging') || description.toLowerCase().includes('electric')) {
      features.push('EV Charging');
    }
    if (description.toLowerCase().includes('underground')) {
      features.push('Underground');
    }
    if (description.toLowerCase().includes('covered')) {
      features.push('Covered');
    }
    if (description.toLowerCase().includes('security') || description.toLowerCase().includes('cctv')) {
      features.push('Security');
    }

    // Restrictions detection
    if (description.toLowerCase().includes('permit') || description.toLowerCase().includes('residents only')) {
      restrictions.push('Permit Required');
    }
    if (description.toLowerCase().includes('max stay') || description.toLowerCase().includes('time limit')) {
      restrictions.push('Time Limited');
    }
    if (description.toLowerCase().includes('no return') || description.toLowerCase().includes('cooling off')) {
      restrictions.push('No Return Period');
    }

    // Accessibility detection
    if (description.toLowerCase().includes('wheelchair') || description.toLowerCase().includes('disabled')) {
      accessibility.push('Wheelchair Accessible');
    }
    if (description.toLowerCase().includes('blue badge')) {
      accessibility.push('Blue Badge Spaces');
    }

    return { restrictions, accessibility, features };
  };

  const extractPricing = (text, title) => {
    const pricingPatterns = [
      new RegExp(`${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^£]*£([\\d.]+)`, 'i'),
      /£([\d.]+)(?:\/hour|per hour|\/hr)?/gi
    ];
    
    for (const pattern of pricingPatterns) {
      const match = text.match(pattern);
      if (match) {
        const price = match[1] || match[0].match(/£([\d.]+)/)[1];
        return `£${price}/hour`;
      }
    }
    return 'Price varies';
  };

  const extractHours = (text, title) => {
    const hourPatterns = [
      /24\/7|24 hours?/i,
      /open (\d{1,2}:\d{2})/i,
      /(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/i,
      /(\d{1,2}am|\d{1,2}pm)\s*-\s*(\d{1,2}am|\d{1,2}pm)/i
    ];

    for (const pattern of hourPatterns) {
      const match = text.match(pattern);
      if (match) {
        if (match[0].toLowerCase().includes('24')) return '24/7';
        return match[0];
      }
    }
    return 'Check locally';
  };

  const extractDistance = (text, title) => {
    const distancePattern = /(\d+[\s-]?(?:min|minute|m|meter|km))/i;
    const match = text.match(distancePattern);
    return match ? match[1] : '5 min walk';
  };

  const extractWalkingTime = (text, title) => {
    const walkPattern = /(\d+[\s-]?min)/i;
    const match = text.match(walkPattern);
    return match ? match[1] + ' walk' : '5 min walk';
  };

  const extractParkingType = (description) => {
    if (description.toLowerCase().includes('ncp')) return 'NCP Car Park';
    if (description.toLowerCase().includes('q-park')) return 'Q-Park';
    if (description.toLowerCase().includes('street')) return 'Street Parking';
    if (description.toLowerCase().includes('underground')) return 'Underground Car Park';
    if (description.toLowerCase().includes('multi-storey')) return 'Multi-Storey Car Park';
    return 'Car Park';
  };

  const extractAvailability = (text, title) => {
    if (text.toLowerCase().includes('available')) return 'Available';
    if (text.toLowerCase().includes('full')) return 'Full';
    if (text.toLowerCase().includes('spaces available')) return 'Spaces Available';
    return 'Check availability';
  };

  const extractAddressFromContext = (text, title) => {
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(title) && i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        const addressMatch = nextLine.match(/\(([^)]+)\)/);
        if (addressMatch) return addressMatch[1];
      }
    }
    
    // Try to extract address from parentheses in the same line
    const addressMatch = text.match(new RegExp(`\\*\\*${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\*\\*[^(]*\\(([^)]+)\\)`, 'i'));
    return addressMatch ? addressMatch[1] : 'Address not specified';
  };

  const extractDescriptionFromContext = (text, title) => {
    const titleRegex = new RegExp(`\\*\\*${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\*\\*[^-]*-\\s*([^\\n]*)`);
    const match = text.match(titleRegex);
    return match ? match[1].trim() : 'No description available';
  };

  const extractRestrictionsFromContext = (text, title) => {
    const restrictions = [];
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('permit') || lowerText.includes('residents only')) {
      restrictions.push('Permit Required');
    }
    if (lowerText.includes('max stay') || lowerText.includes('time limit')) {
      restrictions.push('Time Limited');
    }
    if (lowerText.includes('no return')) {
      restrictions.push('No Return Period');
    }
    
    return restrictions;
  };

  const extractAccessibilityFromContext = (text, title) => {
    const accessibility = [];
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('wheelchair') || lowerText.includes('disabled')) {
      accessibility.push('Wheelchair Accessible');
    }
    if (lowerText.includes('blue badge')) {
      accessibility.push('Blue Badge Spaces');
    }
    
    return accessibility;
  };

  const extractFeaturesFromContext = (text, title) => {
    const features = [];
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('24/7') || lowerText.includes('24 hour')) {
      features.push('24/7 Access');
    }
    if (lowerText.includes('ev charging') || lowerText.includes('electric')) {
      features.push('EV Charging');
    }
    if (lowerText.includes('security') || lowerText.includes('cctv')) {
      features.push('Security');
    }
    if (lowerText.includes('covered')) {
      features.push('Covered');
    }
    
    return features;
  };

  // Function to extract AI response text (non-parking data)
  const extractAIResponse = (text) => {
    // Remove parking data sections but keep the conversational parts
    let cleanText = text;
    
    // Remove structured parking data patterns
    cleanText = cleanText.replace(/\*\*[^*]+\*\*\s*\([^)]+\)[^]*?(?=\*\*[^*]+\*\*|\n\n|$)/gi, '');
    
    // Remove data status sections
    cleanText = cleanText.replace(/\*\*📡 Data Status\*\*[^]*?(?=\n\n|$)/gi, '');
    
    // Remove parking options headers
    cleanText = cleanText.replace(/\*\*🅿️ Parking Options\*\*[^]*?(?=\n\n|$)/gi, '');
    
    // Clean up multiple newlines and extra whitespace
    cleanText = cleanText.replace(/\n{3,}/g, '\n\n').trim();
    
    // If there's meaningful content left, return it
    if (cleanText.length > 50 && !cleanText.match(/^\s*\*\*[^*]+\*\*\s*$/)) {
      return cleanText;
    }
    
    return null;
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || loading) return;

    const userMessage = {
      text: inputValue,
      isBot: false,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = inputValue;
    setInputValue('');
    setLoading(true);

    try {
      await simulateTyping();
      const response = await sendChatMessage(currentInput);
      
      // Parse parking data from the text response
      const parsedParkingData = parseParkingDataFromText(response.message);
      
      // Extract AI response text
      const aiResponseText = extractAIResponse(response.message);
      
      const botMessage = {
        text: aiResponseText || response.message,
        isBot: true,
        timestamp: response.search_context?.timestamp || new Date().toISOString(),
        parkingData: parsedParkingData.length > 0 ? parsedParkingData : (response.top_recommendations || []),
        allParkingData: response.all_spots || [],
        searchContext: response.search_context || {},
        dataStatus: response.data_status || {},
        hasStructuredData: parsedParkingData.length > 0,
        showText: !parsedParkingData.length > 0 || aiResponseText !== null
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error('Message send error:', error);
      const errorMessage = {
        text: `Sorry, I couldn't fetch parking data: ${error.message}. Try a different query?`,
        isBot: true,
        timestamp: new Date().toISOString(),
        isError: true,
        suggestions: [
          "Find parking in London",
          "Parking in Edinburgh",
          "Accessible parking in Birmingham",
        ],
      };
      setMessages((prev) => [...prev, errorMessage]);
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

  const toggleShowAllParking = (messageIndex) => {
    setShowAllParking((prev) => ({
      ...prev,
      [messageIndex]: !prev[messageIndex],
    }));
  };

  const handleSuggestionClick = (suggestion) => {
    setInputValue(suggestion);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleRetry = () => {
    const lastUserMessage = messages.slice().reverse().find((msg) => !msg.isBot)?.text;
    if (lastUserMessage) {
      setInputValue(lastUserMessage);
      setTimeout(() => {
        handleSendMessage();
      }, 100);
    }
  };

  const formatDistance = (distance) => {
    if (!distance) return 'Distance unknown';
    if (typeof distance === 'string') return distance;
    if (typeof distance === 'number') {
      return distance >= 1000 ? `${(distance / 1000).toFixed(1)} km` : `${distance} m`;
    }
    return distance;
  };

  const renderParkingSpots = (spots, showAll = false, messageIndex = 0) => {
    if (!spots || !spots.length) {
      return (
        <div className="no-results">
          <div className="no-results-icon">🚫</div>
          <p>No parking spots found. Try another location or a different query.</p>
        </div>
      );
    }

    const spotsToShow = showAll ? spots : spots.slice(0, DEFAULT_LOCATIONS_SHOW);

    return spotsToShow.map((spot, index) => (
      <div key={spot.id || `spot-${index}`} className="parking-spot-card">
        <div className="spot-header">
          <div className="spot-title-section">
            <h5 className="spot-title">{spot.title}</h5>
            <span className="spot-type">{spot.type || 'Car Park'}</span>
          </div>
          {spot.rank && <span className="rank-badge">#{spot.rank}</span>}
        </div>
        
        <div className="spot-address">
          <span className="icon">📍</span>
          <span>{spot.address}</span>
        </div>

        {spot.description && spot.description !== 'No description available' && (
          <div className="spot-description">
            {spot.description}
          </div>
        )}

        <div className="spot-details-grid">
          <div className="detail-card">
            <span className="detail-icon">🚶</span>
            <div className="detail-content">
              <span className="detail-label">Distance</span>
              <span className="detail-value">{formatDistance(spot.distance)}</span>
            </div>
          </div>

          <div className="detail-card">
            <span className="detail-icon">⏰</span>
            <div className="detail-content">
              <span className="detail-label">Hours</span>
              <span className="detail-value">{spot.hours || 'Check locally'}</span>
            </div>
          </div>

          <div className="detail-card">
            <span className="detail-icon">💷</span>
            <div className="detail-content">
              <span className="detail-label">Pricing</span>
              <span className="detail-value">{spot.pricing || 'Price varies'}</span>
            </div>
          </div>

          <div className="detail-card">
            <span className="detail-icon">🟢</span>
            <div className="detail-content">
              <span className="detail-label">Status</span>
              <span className="detail-value">{spot.availability || 'Check availability'}</span>
            </div>
          </div>
        </div>

        {spot.features && spot.features.length > 0 && (
          <div className="spot-features">
            <span className="features-label">Features:</span>
            <div className="features-tags">
              {spot.features.map((feature, i) => (
                <span key={i} className="feature-tag">{feature}</span>
              ))}
            </div>
          </div>
        )}

        {spot.restrictions && spot.restrictions.length > 0 && (
          <div className="spot-restrictions">
            <span className="icon">⚠️</span>
            <div className="restrictions-content">
              <span className="restrictions-label">Restrictions:</span>
              <span className="restrictions-text">{spot.restrictions.join(', ')}</span>
            </div>
          </div>
        )}

        {spot.accessibility && spot.accessibility.length > 0 && (
          <div className="spot-accessibility">
            <span className="icon">♿</span>
            <div className="accessibility-content">
              <span className="accessibility-label">Accessibility:</span>
              <span className="accessibility-text">{spot.accessibility.join(', ')}</span>
            </div>
          </div>
        )}
      </div>
    ));
  };

  const renderDataStatus = (dataStatus) => {
    if (!dataStatus) return null;
    return (
      <div className="data-status-section">
        <h4>📡 Data Status</h4>
        <div className="data-status-grid">
          {dataStatus.last_updated && (
            <div className="status-item">
              <strong>Last Updated:</strong>{' '}
              {new Date(dataStatus.last_updated).toLocaleString('en-GB', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </div>
          )}
          <div className="status-item">
            <strong>Data Type:</strong> {dataStatus.real_time ? 'Real-Time' : 'Cached'}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`parksy-container ${isOpen ? 'open' : ''}`} role="dialog" aria-label="Parksy Chatbot">
      {!isOpen && (
        <button
          className="parksy-bubble"
          onClick={handleOpenChat}
          aria-label="Open Parksy Chatbot"
          type="button"
        >
          <span className="bubble-icon">🅿️</span>
          <span className="bubble-pulse"></span>
          <span className="bubble-text">Find Parking</span>
        </button>
      )}
      {isOpen && (
        <div className="parksy-widget">
          <div className="parksy-header">
            <div className="header-left">
              <span className="parksy-avatar">🅿️</span>
              <div className="header-info">
                <h3>Parksy</h3>
                <span className="status-text">
                  {apiHealthy === null ? 'Connecting...' : 
                   apiHealthy ? 'UK Parking Assistant' : 'Connection Issues'}
                </span>
              </div>
            </div>
            <button
              className="close-button"
              onClick={handleCloseChat}
              aria-label="Close chatbot"
              type="button"
            >
              ×
            </button>
          </div>
          <div className="parksy-messages">
            {messages.map((msg, messageIndex) => (
              <div
                key={`${msg.timestamp}-${messageIndex}`}
                className={`message ${msg.isBot ? 'bot-message' : 'user-message'} ${
                  msg.isError ? 'error-message' : ''
                } ${msg.isLoading ? 'loading-message' : ''}`}
                aria-live={msg.isBot ? 'polite' : 'off'}
              >
                {msg.isBot && <span className="bot-avatar">🅿️</span>}
                <div className="message-content">
                  {/* Show AI response text when available */}
                  {(msg.showText !== false && msg.text) && (
                    <div className="message-text">{msg.text}</div>
                  )}
                  
                  <span className="message-time">
                    {new Date(msg.timestamp).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  
                  {msg.suggestions && (
                    <div className="suggestions">
                      <span className="suggestions-label">Try these:</span>
                      <div className="suggestion-buttons">
                        {msg.suggestions.map((suggestion, i) => (
                          <button
                            key={i}
                            className="suggestion-button"
                            onClick={() => handleSuggestionClick(suggestion)}
                            aria-label={`Try: ${suggestion}`}
                            type="button"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {msg.retry && (
                    <button
                      className="retry-button"
                      onClick={handleRetry}
                      aria-label="Retry query"
                      type="button"
                    >
                      🔄 Retry
                    </button>
                  )}
                  
                  {msg.parkingData && msg.parkingData.length > 0 && (
                    <div className="parking-results">
                      <div className="results-header">
                        <h4>🅿️ Parking Options</h4>
                        <p>
                          {showAllParking[messageIndex] ? 
                            `Showing all ${msg.parkingData.length}` :
                            `Showing ${Math.min(DEFAULT_LOCATIONS_SHOW, msg.parkingData.length)} of ${msg.parkingData.length}`
                          } parking {msg.parkingData.length === 1 ? 'location' : 'locations'}
                          {msg.searchContext?.location && ` near ${msg.searchContext.location}`}
                        </p>
                      </div>
                      {renderParkingSpots(
                        msg.parkingData,
                        showAllParking[messageIndex],
                        messageIndex
                      )}
                      {msg.parkingData.length > DEFAULT_LOCATIONS_SHOW && (
                        <button
                          className="show-more-button"
                          onClick={() => toggleShowAllParking(messageIndex)}
                          aria-label={
                            showAllParking[messageIndex] ? 'Show fewer spots' : 'Show all spots'
                          }
                          type="button"
                        >
                          {showAllParking[messageIndex]
                            ? `🔼 Show Fewer Locations (${DEFAULT_LOCATIONS_SHOW})`
                            : `🔽 Show All ${msg.parkingData.length} Locations`}
                        </button>
                      )}
                    </div>
                  )}
                  {msg.dataStatus && renderDataStatus(msg.dataStatus)}
                </div>
              </div>
            ))}
            {(loading || typing) && (
              <div className="message bot-message typing-message" aria-label="Parksy is typing">
                <span className="bot-avatar">🅿️</span>
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} aria-hidden="true" />
          </div>
          <div className="parksy-input">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="e.g., Parking near London Bridge"
              disabled={loading}
              aria-label="Type your parking query"
            />
            <button
              onClick={handleSendMessage}
              disabled={loading || !inputValue.trim()}
              className="send-button"
              aria-label="Send message"
              type="button"
            >
              {loading ? '⏳' : '🚗'}
            </button>
          </div>
          <div className="parksy-footer">
            Powered by Parksy AI {apiHealthy && '• Connected'}
          </div>
        </div>
      )}
    </div>
  );
};

export default ParkingBot;