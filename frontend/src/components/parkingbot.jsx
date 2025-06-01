import React, { useState, useRef, useEffect } from 'react';
import { searchParking, getParkingDetails } from '../services/parksyApi';
import './parkingbot.css';

const ParkingBot = ({ isOpen: propIsOpen, onClose }) => {
  const [isOpen, setIsOpen] = useState(propIsOpen || false);
  const [messages, setMessages] = useState([
    { 
      text: "Hello there! 👋 I'm Parksy, your UK parking assistant.",
      isBot: true,
      timestamp: new Date().toISOString()
    },
    {
      text: "I specialize in parking information across the United Kingdom. How can I help you today?",
      isBot: true,
      timestamp: new Date().toISOString(),
      suggestions: [
        "Find parking near London Victoria Station",
        "Parking rules in Manchester",
        "Parking prices in Edinburgh",
        "Help with disabled parking"
      ]
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [showAllParking, setShowAllParking] = useState(false);
  const messagesEndRef = useRef(null);

  // UK-specific predefined responses
  const predefinedResponses = {
    greetings: [
      "Hello! 👋 How can I help with your UK parking needs today?",
      "Hi there! 🚗 Looking for parking assistance in the UK?",
      "Greetings! I'm Parksy, your UK parking helper. What do you need?"
    ],
    howAreYou: [
      "I'm just a bot, but I'm fully operational and ready to assist with UK parking!",
      "I don't have feelings, but I'm excited to help you find parking in the UK!",
      "As a UK parking AI, I'm always at your service!"
    ],
    capabilities: [
      "I can help you with: \n- Find parking spots anywhere in the UK \n- Compare UK parking prices \n- Show UK parking restrictions \n- Provide contact information \n- Answer UK parking questions",
      "My main functions for UK parking: \n🚗 Finding available parking \n💰 Comparing prices across cities \n⏰ Showing time restrictions \nℹ️ Providing UK-specific parking info",
      "I specialize in UK parking: \n• Real-time availability \n• Cost comparisons \n• Location-based searches \n• UK parking regulations"
    ],
    creator: [
      "I was created by TechPrime Solutions, a UK-based software company specializing in parking solutions.",
      "My developers are the talented UK team at TechPrime Solutions.",
      "TechPrime Solutions UK is my creator - they built me to solve UK parking problems!"
    ],
    contact: [
      "You can reach our UK office at: \n📧 Email: hello@parksy.uk \n📞 Phone: +44 (0)20 3123 4567 \n🏢 Office: 123 Parking Lane, London, UK E1 6AN",
      "UK Contact information: \n• Email: hello@parksy.uk \n• Phone: +44 20 3123 4567 \n• Address: 123 Parking Lane, London",
      "Our UK details: \n✉️ hello@parksy.uk \n📞 +44 20 3123 4567 \n📍 123 Parking Lane, London"
    ],
    thanks: [
      "You're welcome! Happy to help with all your UK parking needs. 🚗💨",
      "No problem at all! Let me know if you need anything else regarding UK parking.",
      "My pleasure! Don't hesitate to ask if you have more UK parking questions."
    ],
    parkingHelp: [
      "I specialize in finding UK parking spots. Just tell me a UK location and I'll search for available parking.",
      "For UK parking assistance, provide me with a location, date, and time you need parking.",
      "I can find UK parking options for you. Where and when do you need to park?"
    ],
    default: [
      "I'm not sure I understand. I specialize in UK parking-related questions.",
      "Could you rephrase that? I'm best at helping with UK parking inquiries.",
      "I focus on UK parking assistance. Could you ask me about UK parking?"
    ]
  };

  // UK-specific question patterns
  const questionPatterns = [
    { patterns: [/hello/i, /hi/i, /hey/i], responseType: 'greetings' },
    { patterns: [/how are you/i, /how's it going/i], responseType: 'howAreYou' },
    { patterns: [/what can you do/i, /your functions/i, /capabilities/i], responseType: 'capabilities' },
    { patterns: [/who made you/i, /who created you/i, /techprime/i], responseType: 'creator' },
    { patterns: [/contact/i, /email/i, /phone/i, /address/i], responseType: 'contact' },
    { patterns: [/thank/i, /thanks/i, /appreciate/i], responseType: 'thanks' },
    { patterns: [/help with parking/i, /find parking/i, /parking help/i], responseType: 'parkingHelp' },
    { patterns: [/uk parking/i, /british parking/i, /in london/i, /in manchester/i], responseType: 'parkingHelp' }
  ];

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

  const simulateTyping = async (message, delay = 1000) => {
    setTyping(true);
    await new Promise(resolve => setTimeout(resolve, delay));
    setTyping(false);
    return message;
  };

  const getRandomResponse = (type) => {
    const responses = predefinedResponses[type] || predefinedResponses.default;
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const handleGeneralQuestion = async (question) => {
    let responseType = 'default';
    
    for (const pattern of questionPatterns) {
      if (pattern.patterns.some(regex => regex.test(question))) {
        responseType = pattern.responseType;
        break;
      }
    }
    
    const botResponse = await simulateTyping({
      text: getRandomResponse(responseType),
      isBot: true,
      timestamp: new Date().toISOString(),
      suggestions: responseType === 'parkingHelp' ? [
        "Find parking near London Bridge",
        "Parking in Manchester city center",
        "Show me parking at Heathrow Airport"
      ] : [
        "Find parking in Birmingham",
        "What can you do?",
        "Contact information"
      ]
    });
    
    setMessages(prev => [...prev, botResponse]);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || loading) return;
    
    const userMessage = { 
      text: inputValue,
      isBot: false,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);
    setShowAllParking(false);
    
    try {
      // Check if it's a general question
      let isGeneralQuestion = false;
      for (const pattern of questionPatterns) {
        if (pattern.patterns.some(regex => regex.test(inputValue))) {
          isGeneralQuestion = true;
          break;
        }
      }
      
      if (isGeneralQuestion) {
        await handleGeneralQuestion(inputValue);
      } else {
        // Handle parking location search
        setTyping(true);
        const data = await searchParking(inputValue);
        
        let resultsText, resultsToShow;
        
        if (data.data.parking_spots.length > 0) {
          resultsText = `I found ${data.data.parking_spots.length} UK parking spots near ${data.data.location}.`;
          resultsToShow = data.data.parking_spots;
        } else {
          resultsText = `Here are some common parking options in ${inputValue}:`;
          resultsToShow = generateFallbackParkingSpots(inputValue);
        }
        
        const botResponse = await simulateTyping({
          text: resultsText,
          isBot: true,
          timestamp: new Date().toISOString(),
          results: resultsToShow,
          topResults: resultsToShow.slice(0, 3),
          location: data.data.location || inputValue,
          totalSpots: resultsToShow.length,
          ukRules: data.data.general_rules || getDefaultUKRules()
        });
        
        setMessages(prev => [...prev, botResponse]);
      }
    } catch (error) {
      const errorMessage = await simulateTyping({
        text: `Sorry, I encountered an error: ${error.message}`,
        isBot: true,
        timestamp: new Date().toISOString()
      });
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const generateFallbackParkingSpots = (location) => {
    const city = location.split(',')[0].trim();
    return [
      {
        id: `fallback_${city.toLowerCase()}_1`,
        title: `${city} City Centre Car Park`,
        address: `City Centre, ${city}`,
        distance: 500,
        position: getCityCoordinates(city),
        score: 80,
        parking_type: {
          estimated_cost: '£2.50-£4.50/hour',
          typical_time_limit: 'Max 4 hours'
        },
        availability: {
          status: 'Available',
          message: 'Likely spaces available'
        },
        detailed_rules: getDefaultUKRules(),
        amenities: ['CCTV', 'Payment kiosk', 'Lighting'],
        payment_methods: ['Card', 'Mobile App', 'Cash'],
        uk_specific: true
      },
      {
        id: `fallback_${city.toLowerCase()}_2`,
        title: `${city} Shopping Centre Parking`,
        address: `Retail Park, ${city}`,
        distance: 800,
        position: {
          lat: getCityCoordinates(city).lat + 0.005,
          lng: getCityCoordinates(city).lng + 0.005
        },
        score: 75,
        parking_type: {
          estimated_cost: 'First 2 hours free, then £2/hour',
          typical_time_limit: 'Customer parking only'
        },
        availability: {
          status: 'Available',
          message: 'Free for shoppers'
        },
        detailed_rules: getDefaultUKRules(),
        amenities: ['CCTV', 'Disabled access'],
        payment_methods: ['Card', 'Mobile App'],
        uk_specific: true
      }
    ];
  };

  const getDefaultUKRules = () => [
    "Standard UK parking regulations apply",
    "Check local signage for specific restrictions",
    "Payment required during operational hours",
    "Disabled bays are strictly enforced",
    "No parking on double yellow lines"
  ];

  const getCityCoordinates = (city) => {
    const ukCities = {
      london: { lat: 51.5074, lng: -0.1278 },
      manchester: { lat: 53.4808, lng: -2.2426 },
      birmingham: { lat: 52.4862, lng: -1.8904 },
      leeds: { lat: 53.8008, lng: -1.5491 },
      liverpool: { lat: 53.4084, lng: -2.9916 },
      bristol: { lat: 51.4545, lng: -2.5879 },
      sheffield: { lat: 53.3811, lng: -1.4701 },
      glasgow: { lat: 55.8642, lng: -4.2518 },
      edinburgh: { lat: 55.9533, lng: -3.1883 }
    };
    
    const cityKey = Object.keys(ukCities).find(key => 
      city.toLowerCase().includes(key)
    );
    
    return ukCities[cityKey] || { lat: 51.5074, lng: -0.1278 }; // Default to London
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleParkingSelect = async (spotId) => {
    setLoading(true);
    try {
      const typingMsg = await simulateTyping({
        text: "Getting UK parking details...",
        isBot: true,
        timestamp: new Date().toISOString()
      });
      setMessages(prev => [...prev, typingMsg]);
      
      const details = await getParkingDetails(spotId);
      
      const detailMessage = {
        text: `Here's the UK parking information:`,
        isBot: true,
        timestamp: new Date().toISOString(),
        details: details.data,
        ukSpecific: true
      };
      
      setMessages(prev => [...prev, detailMessage]);
      
    } catch (error) {
      const errorMessage = await simulateTyping({
        text: `Couldn't get UK parking details: ${error.message}`,
        isBot: true,
        timestamp: new Date().toISOString()
      });
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const toggleShowAllParking = () => {
    setShowAllParking(!showAllParking);
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

  const renderParkingSpots = (spots) => {
    if (!spots || spots.length === 0) {
      return (
        <div className="no-results">
          <p>No parking spots found. Try a different location or time.</p>
        </div>
      );
    }

    return spots.map((spot) => (
      <div key={spot.id} className="parking-spot-card">
        <div className="spot-header">
          <h5>{spot.title}</h5>
          <div className="spot-score">
            <span className={`score-${spot.score > 75 ? 'high' : spot.score > 50 ? 'medium' : 'low'}`}>
              {spot.score}/100
            </span>
          </div>
        </div>
        <p className="spot-address">{spot.address}</p>
        <div className="spot-details">
          <span title="Distance">
            <span role="img" aria-label="Distance">🚗</span> {(spot.distance / 1000).toFixed(1)} km
          </span>
          <span title="Estimated cost">
            <span role="img" aria-label="Cost">💷</span> {spot.parking_type.estimated_cost}
          </span>
          <span title="Time limit">
            <span role="img" aria-label="Time">🕒</span> {spot.parking_type.typical_time_limit}
          </span>
        </div>
        <div className="spot-availability">
          <span className={`availability-${spot.availability.status.toLowerCase()}`}>
            {spot.availability.message}
          </span>
        </div>
        <button 
          onClick={() => handleParkingSelect(spot.id)}
          disabled={loading}
          className="details-button"
          aria-label={`View details for ${spot.title}`}
        >
          View UK Details
        </button>
      </div>
    ));
  };

  const renderUKRules = (rules) => {
    if (!rules || rules.length === 0) return null;
    
    return (
      <div className="uk-rules-section">
        <h4>UK Parking Regulations</h4>
        <ul>
          {rules.map((rule, index) => (
            <li key={index}>{rule}</li>
          ))}
        </ul>
      </div>
    );
  };

  const renderParkingDetails = (details) => {
    if (!details) return null;
    
    return (
      <div className="parking-details">
        <h4>UK Parking Details</h4>
        
        <div className="details-section">
          <h5>Location</h5>
          <p>{details.address}</p>
        </div>
        
        <div className="details-section">
          <h5>UK Rules & Restrictions</h5>
          <ul>
            {details.detailed_rules.map((rule, i) => (
              <li key={i}>{rule}</li>
            ))}
          </ul>
        </div>
        
        <div className="details-section">
          <h5>Pricing</h5>
          <div className="pricing-info">
            <p><strong>Hourly:</strong> {details.pricing?.estimated_hourly || '£2.00-£4.00'}</p>
            <p><strong>Daily:</strong> {details.pricing?.estimated_daily || '£15.00-£25.00'}</p>
            {details.pricing?.notes && (
              <div className="pricing-notes">
                {details.pricing.notes.map((note, i) => (
                  <p key={i}>• {note}</p>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="details-section">
          <h5>UK Amenities</h5>
          <div className="amenities-grid">
            {details.amenities.map((amenity, i) => (
              <span key={i} className="amenity-tag">
                {amenity}
              </span>
            ))}
          </div>
        </div>
        
        <div className="details-section">
          <h5>UK Payment Methods</h5>
          <div className="payment-methods">
            {details.payment_methods.map((method, i) => (
              <span key={i} className="payment-tag">
                {method}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`parking-bot-container ${isOpen ? 'open' : ''}`}>
      {!isOpen && (
        <div 
          className="chat-bubble" 
          onClick={() => setIsOpen(true)}
          aria-label="Open UK Parking Assistant"
        >
          <div className="bubble-icon">Bot</div>
          <div className="bubble-pulse"></div>
        </div>
      )}
      
      {isOpen && (
        <>
          <div className="parking-bot-header">
            <div className="bot-avatar" aria-hidden="true"> Bot</div>
            <div className="bot-title">
              <h3>UK Parking Assistant</h3>
              <p>Specialist in UK parking</p>
            </div>
            <div className="bot-status-indicator" aria-label="Online"></div>
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
              {messages.map((msg, index) => (
                <div 
                  key={`${msg.timestamp}-${index}`} 
                  className={`message ${msg.isBot ? 'bot' : 'user'}`}
                  aria-live={msg.isBot ? "polite" : "off"}
                >
                  <div className="message-meta">
                    {msg.isBot && <span className="bot-indicator">UK PARKSY</span>}
                    <span className="message-time">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="message-text">{msg.text}</div>
                  
                  {msg.suggestions && (
                    <div className="suggestions-container">
                      <p>Try these UK examples:</p>
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
                  
                  {msg.ukRules && renderUKRules(msg.ukRules)}
                  
                  {msg.topResults && (
                    <div className="parking-results">
                      <div className="results-header">
                        <h4>UK Parking Spots</h4>
                        <p>Showing {showAllParking ? msg.results.length : 3} of {msg.totalSpots} in {msg.location}</p>
                      </div>
                      {renderParkingSpots(showAllParking ? msg.results : msg.topResults)}
                      {msg.results.length > 3 && (
                        <button 
                          onClick={toggleShowAllParking}
                          className="show-more-button"
                          aria-label={showAllParking ? 'Show fewer results' : 'Show all results'}
                        >
                          {showAllParking ? 'Show Less' : `Show All ${msg.totalSpots} UK Spots`}
                        </button>
                      )}
                    </div>
                  )}
                  
                  {msg.details && renderParkingDetails(msg.details)}
                </div>
              ))}
              
              {(loading || typing) && (
                <div className="message bot typing-indicator" aria-label="Bot is typing">
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
                placeholder="Type a UK location or ask about UK parking..."
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
                {loading ? '...' : 'Send'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ParkingBot;