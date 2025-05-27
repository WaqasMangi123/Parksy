import React, { useState, useRef, useEffect } from 'react';
import { searchParking, getParkingDetails } from '../services/parksyApi';
import './parkingbot.css';

const ParkingBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { 
      text: "Hello! I'm Parksy, your premium parking assistant. How can I help you find parking today?",
      isBot: true,
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef(null);

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

  const handleSendMessage = async () => {
    if (!inputValue.trim() || loading) return;
    
    // Add user message
    const userMessage = { 
      text: inputValue,
      isBot: false,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);
    
    try {
      // Show typing indicator
      setTyping(true);
      
      // Search parking
      const data = await searchParking(inputValue);
      
      // Format results
      const resultsText = data.data.parking_spots.length > 0 ?
        `I found ${data.data.parking_spots.length} parking spots near ${data.data.location}. Here are the top 3:` :
        `I couldn't find parking spots for ${inputValue}. Try a more specific location.`;
      
      // Add bot response
      const botResponse = await simulateTyping({
        text: resultsText,
        isBot: true,
        timestamp: new Date().toISOString(),
        results: data.data.parking_spots.slice(0, 3),
        location: data.data.location
      });
      
      setMessages(prev => [...prev, botResponse]);
      
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
        text: "Getting detailed information...",
        isBot: true,
        timestamp: new Date().toISOString()
      });
      setMessages(prev => [...prev, typingMsg]);
      
      const details = await getParkingDetails(spotId);
      
      const detailMessage = {
        text: `Here's what I found about this parking spot:`,
        isBot: true,
        timestamp: new Date().toISOString(),
        details: details.data
      };
      
      setMessages(prev => [...prev, detailMessage]);
      
    } catch (error) {
      const errorMessage = await simulateTyping({
        text: `Couldn't get details: ${error.message}`,
        isBot: true,
        timestamp: new Date().toISOString()
      });
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`parking-bot-container ${isOpen ? 'open' : ''}`}>
      {!isOpen && (
        <div className="chat-bubble" onClick={() => setIsOpen(true)}>
          <div className="bubble-icon">🅿️</div>
          <div className="bubble-pulse"></div>
        </div>
      )}
      
      {isOpen && (
        <>
          <div className="parking-bot-header" onClick={() => setIsOpen(false)}>
            <div className="bot-avatar">🅿️</div>
            <div className="bot-title">
              <h3>Parking Assistant</h3>
              <p>Online</p>
            </div>
            <div className="bot-status-indicator"></div>
            <button className="close-chat">×</button>
          </div>
          
          <div className="parking-bot-content">
            <div className="parking-bot-messages">
              {messages.map((msg, index) => (
                <div key={`${msg.timestamp}-${index}`} className={`message ${msg.isBot ? 'bot' : 'user'}`}>
                  <div className="message-meta">
                    {msg.isBot && <span className="bot-indicator">PARKSY</span>}
                    <span className="message-time">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="message-text">{msg.text}</div>
                  
                  {msg.results && (
                    <div className="parking-results">
                      <div className="results-header">
                        <h4>Top Parking Spots</h4>
                        <p>Showing {msg.results.length} of {msg.results.length} near {msg.location}</p>
                      </div>
                      {msg.results.map((spot) => (
                        <div key={spot.id} className="parking-spot-card">
                          <div className="spot-header">
                            <h5>{spot.title}</h5>
                            <div className="spot-score">{spot.score}/100</div>
                          </div>
                          <p className="spot-address">{spot.address}</p>
                          <div className="spot-details">
                            <span>🚗 {(spot.distance / 1000).toFixed(1)} km</span>
                            <span>💵 {spot.parking_type.estimated_cost}</span>
                            <span>🕒 {spot.parking_type.typical_time_limit}</span>
                          </div>
                          <button 
                            onClick={() => handleParkingSelect(spot.id)}
                            disabled={loading}
                            className="details-button"
                          >
                            View Details
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {msg.details && (
                    <div className="parking-details">
                      <h4>Detailed Information</h4>
                      <div className="details-section">
                        <h5>Rules & Restrictions</h5>
                        <ul>
                          {msg.details.detailed_rules.map((rule, i) => (
                            <li key={i}>{rule}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="details-section">
                        <h5>Amenities</h5>
                        <div className="amenities-grid">
                          {msg.details.amenities.map((amenity, i) => (
                            <span key={i} className="amenity-tag">{amenity}</span>
                          ))}
                        </div>
                      </div>
                      <div className="details-section">
                        <h5>Payment Methods</h5>
                        <div className="payment-methods">
                          {msg.details.payment_methods.map((method, i) => (
                            <span key={i} className="payment-tag">{method}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {(loading || typing) && (
                <div className="message bot typing-indicator">
                  <div className="typing-dots">
                    <div></div>
                    <div></div>
                    <div></div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
            
            <div className="parking-bot-input">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a location (e.g., 'Parking near Leeds Station')..."
                disabled={loading}
              />
              <button 
                onClick={handleSendMessage} 
                disabled={loading || !inputValue.trim()}
                className="send-button"
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