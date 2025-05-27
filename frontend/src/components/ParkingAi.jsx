import React, { useState, useEffect, useRef } from 'react';
import { FiSend, FiMessageSquare, FiX, FiMapPin, FiClock, FiDollarSign, FiInfo } from 'react-icons/fi';
import { ParkingAssistant } from '../services/ParkingAssistant';
import './ParkingAi.css';

const ParkingAI = ({ parkingData = [], currentLocation = null }) => {
  const [messages, setMessages] = useState([
    { 
      text: "Hello! I'm your professional parking assistant. How can I help you today?", 
      sender: 'ai',
      meta: { type: 'welcome' }
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  
  const assistant = useRef(new ParkingAssistant(parkingData)).current;

  // Initialize assistant with location
  useEffect(() => {
    assistant.setLocation(currentLocation);
  }, [currentLocation, assistant]);

  // Check for parking data changes
  useEffect(() => {
    if (parkingData.length > 0 && messages.length === 1) {
      setMessages(prev => [...prev, {
        text: `I now have parking data for ${currentLocation || 'your area'}. Ask me anything!`,
        sender: 'ai',
        meta: { type: 'data_loaded' }
      }]);
    }
  }, [parkingData, currentLocation]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Add user message
    setMessages(prev => [...prev, { 
      text: input, 
      sender: 'user',
      meta: { type: 'user_query' }
    }]);
    setInput('');
    setIsLoading(true);

    try {
      const result = await assistant.processQuery(input);
      
      setMessages(prev => [...prev, {
        text: result.text,
        sender: 'ai',
        data: result.data,
        meta: {
          type: result.type,
          suggestions: result.suggestions,
          action: result.action
        }
      }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        text: "Sorry, I encountered an error processing your request.",
        sender: 'ai',
        meta: { type: 'error' }
      }]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const renderParkingSpot = (spot) => (
    <div className="parking-spot-card" key={`${spot.id}-${spot.name}`}>
      <div className="spot-header">
        <FiMapPin className="spot-icon" />
        <h4>{spot.name || 'Unnamed Parking'}</h4>
      </div>
      {spot.address && <p className="spot-address">{spot.address}</p>}
      <div className="spot-details">
        <div className="detail-item">
          <FiDollarSign className="detail-icon" />
          <span>{spot.fee || 'Fee unknown'}</span>
        </div>
        <div className="detail-item">
          <FiClock className="detail-icon" />
          <span>{spot.capacity || '?'} spaces</span>
        </div>
        {spot.distance && (
          <div className="detail-item">
            <span>📏 {spot.distance}</span>
          </div>
        )}
        {spot.tags?.opening_hours && (
          <div className="detail-item">
            <FiInfo className="detail-icon" />
            <span>{spot.tags.opening_hours}</span>
          </div>
        )}
      </div>
    </div>
  );

  const renderMessageContent = (message) => {
    switch(message.meta.type) {
      case 'error':
        return (
          <div className="error-message">
            <p>{message.text}</p>
            {message.meta.suggestions && (
              <div className="suggestions">
                {message.meta.suggestions.map((suggestion, i) => (
                  <button 
                    key={i} 
                    className="suggestion-btn"
                    onClick={() => setInput(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        );

      case 'no_data':
        return (
          <div className="no-data-message">
            <p>{message.text}</p>
            {message.meta.action === 'navigate_to_finder' && (
              <button className="action-btn">
                Go to Parking Finder
              </button>
            )}
          </div>
        );

      case 'near_location':
      case 'free_parking':
      case 'paid_parking':
      case 'capacity_info':
      case 'operating_hours':
      case 'affordable_parking':
      case 'safety_info':
      case 'accessibility_info':
        return (
          <div className="data-message">
            <p>{message.text}</p>
            {message.data && message.data.length > 0 ? (
              <div className="parking-results">
                {message.data.map(renderParkingSpot)}
              </div>
            ) : (
              <p className="no-results">No matching parking spots found.</p>
            )}
            {message.meta.suggestions && (
              <div className="suggestions">
                {message.meta.suggestions.map((suggestion, i) => (
                  <button 
                    key={i} 
                    className="suggestion-btn"
                    onClick={() => setInput(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="text-message">
            <p>{message.text}</p>
            {message.meta.suggestions && (
              <div className="suggestions">
                {message.meta.suggestions.map((suggestion, i) => (
                  <button 
                    key={i} 
                    className="suggestion-btn"
                    onClick={() => setInput(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
    }
  };

  const toggleChat = () => {
    if (isMinimized) {
      setIsMinimized(false);
      setIsOpen(true);
    } else {
      setIsOpen(!isOpen);
    }
  };

  if (!isOpen && !isMinimized) {
    return (
      <button className="chat-launcher" onClick={() => setIsOpen(true)}>
        <FiMessageSquare />
        <span>Parking Help</span>
      </button>
    );
  }

  if (isMinimized) {
    return (
      <div className="chat-minimized" onClick={toggleChat}>
        <FiMessageSquare />
        <span>Parking Assistant</span>
        {messages.length > 1 && <div className="unread-indicator"></div>}
      </div>
    );
  }

  return (
    <div className="parking-chat-container">
      <div className="chat-header">
        <div className="header-content">
          <FiMessageSquare className="header-icon" />
          <h3>Parking Assistant</h3>
          {currentLocation && <span className="location-badge">{currentLocation}</span>}
        </div>
        <div className="header-actions">
          <button 
            className="minimize-btn" 
            onClick={() => setIsMinimized(true)}
            aria-label="Minimize chat"
          >
            <FiX />
          </button>
        </div>
      </div>

      <div className="chat-messages">
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.sender}`}>
            {renderMessageContent(message)}
          </div>
        ))}
        {isLoading && (
          <div className="message ai typing">
            <div className="typing-indicator">
              <span>●</span>
              <span>●</span>
              <span>●</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="chat-input-area">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={parkingData.length > 0 ? "Ask about parking..." : "Visit Parking Finder first..."}
          disabled={isLoading}
          aria-label="Type your parking question"
        />
        <button 
          type="submit" 
          disabled={isLoading || !input.trim()}
          className="send-button"
          aria-label="Send message"
        >
          <FiSend />
        </button>
      </form>
    </div>
  );
};

export default ParkingAI;