import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import './contactwidget.css';

const ContactWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    inquiryType: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [errors, setErrors] = useState({});

  const inquiryTypes = [
    'Not Finding Parking Spot',
    'Double Booking Issue',
    'Cancel Booking Request',
    'Payment Related Issue',
    'Technical Problem',
    'Parking Spot Quality Issue',
    'Refund Request',
    'Account Related Issue',
    'Other Emergency'
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const formatPhoneNumber = (value) => {
    // Remove all non-digit characters
    const phoneNumber = value.replace(/[^\d]/g, '');
    
    // Format as (XXX) XXX-XXXX for US numbers
    if (phoneNumber.length <= 3) {
      return phoneNumber;
    } else if (phoneNumber.length <= 6) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    } else {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
    }
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData(prev => ({
      ...prev,
      phone: formatted
    }));
    
    // Clear error when user starts typing
    if (errors.phone) {
      setErrors(prev => ({
        ...prev,
        phone: ''
      }));
    }
  };

  const validatePhone = (phone) => {
    // Remove formatting to check digits only
    const digitsOnly = phone.replace(/[^\d]/g, '');
    
    // Check if it's a valid phone number (7-15 digits)
    return digitsOnly.length >= 7 && digitsOnly.length <= 15;
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required for emergency contact';
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number (7-15 digits)';
    }
    
    if (!formData.inquiryType) {
      newErrors.inquiryType = 'Please select an emergency type';
    }
    
    if (!formData.message.trim()) {
      newErrors.message = 'Emergency details are required';
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'Emergency details must be at least 10 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    setSubmitStatus(null);
    
    try {
      // Clean phone number for submission (remove formatting)
      const cleanPhone = formData.phone.replace(/[^\d+]/g, '');
      
      const response = await axios.post('https://parksy-backend.onrender.com/api/contact/submit', {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: cleanPhone,
        inquiryType: formData.inquiryType,
        message: formData.message.trim()
      });
      
      if (response.data.success) {
        setSubmitStatus({
          type: 'success',
          message: response.data.message,
          ticketId: response.data.ticketId,
          priority: response.data.priority,
          dbId: response.data.dbId
        });
        setFormData({
          name: '',
          email: '',
          phone: '',
          inquiryType: '',
          message: ''
        });
      } else {
        setSubmitStatus({
          type: 'error',
          message: response.data.message || 'Something went wrong. Please try again.'
        });
      }
    } catch (error) {
      console.error('Error submitting emergency form:', error);
      
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Emergency request failed. Please try again or call our emergency hotline.';
      
      setSubmitStatus({
        type: 'error',
        message: errorMessage
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      inquiryType: '',
      message: ''
    });
    setErrors({});
    setSubmitStatus(null);
  };

  return (
    <div className="emergency-widget-container">
      {/* Emergency Toggle Button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className="emergency-toggle-btn"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, x: -100 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1, type: "spring", stiffness: 100 }}
      >
        {/* Emergency Icon */}
        <svg className="emergency-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        
        {/* Emergency Badge */}
        <div className="emergency-pulse-badge">
          SOS
        </div>
      </motion.button>

      {/* Emergency Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="emergency-modal-overlay"
            onClick={(e) => e.target === e.currentTarget && setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 50 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="emergency-modal"
            >
              {/* Header */}
              <div className="emergency-header">
                <button
                  onClick={() => setIsOpen(false)}
                  className="emergency-close-btn"
                >
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                
                <div className="emergency-header-content">
                  <div className="emergency-icon-container">
                    <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="emergency-title">🚨 Emergency Contact</h2>
                    <p className="emergency-subtitle">Need immediate assistance? We're here to help!</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="emergency-content">
                {submitStatus?.type === 'success' ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="emergency-success"
                  >
                    <div className="emergency-success-icon">
                      <svg width="40" height="40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    
                    <h3 className="emergency-success-title">Emergency Request Sent! ✅</h3>
                    <p className="emergency-success-message">{submitStatus.message}</p>
                    
                    {submitStatus.ticketId && (
                      <div className="emergency-ticket-info">
                        <div className="emergency-ticket-id">
                          <p className="emergency-ticket-label">Emergency Ticket ID</p>
                          <p className="emergency-ticket-number">{submitStatus.ticketId}</p>
                        </div>
                        {submitStatus.priority && (
                          <div className="emergency-priority-badge">
                            <span className={`priority-${submitStatus.priority.toLowerCase()}`}>
                              {submitStatus.priority} PRIORITY
                            </span>
                          </div>
                        )}
                        {submitStatus.dbId && (
                          <p className="emergency-db-info">
                            Database Reference: {submitStatus.dbId}
                          </p>
                        )}
                      </div>
                    )}
                    
                    <div className="emergency-next-steps">
                      <h4>What happens next?</h4>
                      <ul>
                        <li>📧 Confirmation email sent to your inbox</li>
                        <li>📱 Our team may call you for urgent matters</li>
                        <li>⚡ {submitStatus.priority === 'HIGH' ? 'Response within 2 hours' : 'Response within 24 hours'}</li>
                        <li>💾 Your emergency request is saved in our system</li>
                        <li>🔍 You can reference your ticket ID for follow-ups</li>
                      </ul>
                    </div>
                    
                    <div className="emergency-contact-info">
                      <h4>Emergency Contact Info:</h4>
                      <p>📧 support@parksy.com</p>
                      <p>📱 Emergency Hotline: +1-800-PARKSY-911</p>
                    </div>
                    
                    <button
                      onClick={() => {
                        resetForm();
                        setIsOpen(false);
                      }}
                      className="emergency-close-modal-btn"
                    >
                      Close
                    </button>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="emergency-form">
                    {submitStatus?.type === 'error' && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="emergency-error-alert"
                      >
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="emergency-error-text">{submitStatus.message}</p>
                      </motion.div>
                    )}

                    {/* Name Field */}
                    <div className="emergency-form-group">
                      <label htmlFor="name" className="emergency-label">
                        Full Name <span className="emergency-required">*</span>
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className={`emergency-input ${errors.name ? 'error' : ''}`}
                        placeholder="Enter your full name"
                        maxLength="100"
                      />
                      {errors.name && (
                        <div className="emergency-input-error">
                          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {errors.name}
                        </div>
                      )}
                    </div>

                    {/* Email Field */}
                    <div className="emergency-form-group">
                      <label htmlFor="email" className="emergency-label">
                        Email Address <span className="emergency-required">*</span>
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className={`emergency-input ${errors.email ? 'error' : ''}`}
                        placeholder="your.email@example.com"
                      />
                      {errors.email && (
                        <div className="emergency-input-error">
                          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {errors.email}
                        </div>
                      )}
                    </div>

                    {/* Phone Field - Now Required */}
                    <div className="emergency-form-group">
                      <label htmlFor="phone" className="emergency-label">
                        Phone Number <span className="emergency-required">*</span>
                        <span className="emergency-field-note">Required for emergency contact</span>
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handlePhoneChange}
                        className={`emergency-input ${errors.phone ? 'error' : ''}`}
                        placeholder="+1 (555) 123-4567"
                        maxLength="20"
                      />
                      {errors.phone && (
                        <div className="emergency-input-error">
                          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {errors.phone}
                        </div>
                      )}
                    </div>

                    {/* Emergency Type */}
                    <div className="emergency-form-group">
                      <label htmlFor="inquiryType" className="emergency-label">
                        Emergency Type <span className="emergency-required">*</span>
                      </label>
                      <select
                        id="inquiryType"
                        name="inquiryType"
                        value={formData.inquiryType}
                        onChange={handleInputChange}
                        className={`emergency-select ${errors.inquiryType ? 'error' : ''}`}
                      >
                        <option value="">Select emergency type...</option>
                        {inquiryTypes.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                      {errors.inquiryType && (
                        <div className="emergency-input-error">
                          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {errors.inquiryType}
                        </div>
                      )}
                    </div>

                    {/* Message Field */}
                    <div className="emergency-form-group">
                      <label htmlFor="message" className="emergency-label">
                        Emergency Details <span className="emergency-required">*</span>
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleInputChange}
                        className={`emergency-textarea ${errors.message ? 'error' : ''}`}
                        placeholder="Please describe your emergency situation in detail..."
                        maxLength="1000"
                        rows="4"
                      />
                      <div className="emergency-char-counter">
                        {errors.message && (
                          <div className="emergency-input-error">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {errors.message}
                          </div>
                        )}
                        <span className="emergency-char-count">
                          {formData.message.length}/1000
                        </span>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <motion.button
                      type="submit"
                      disabled={isSubmitting}
                      className="emergency-submit-btn"
                      whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
                    >
                      <div className="emergency-submit-content">
                        {isSubmitting ? (
                          <>
                            <svg className="emergency-spinner" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <span>Sending Emergency...</span>
                          </>
                        ) : (
                          <>
                            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <span>Send Emergency Request</span>
                          </>
                        )}
                      </div>
                    </motion.button>

                    <div className="emergency-footer-note">
                      🚨 <strong>Emergency Response:</strong> High priority issues receive immediate attention.<br/>
                      📱 <strong>Phone Required:</strong> We may call you for urgent matters.<br/>
                      💾 <strong>Data Saved:</strong> Your request will be saved in our system for tracking.<br/>
                      For life-threatening emergencies, please call 911 or your local emergency services.
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ContactWidget;