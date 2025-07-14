import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import './adminemergencycontactrequest.css';

const AdminDashboard = () => {
  const [contacts, setContacts] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    inquiryType: '',
    page: 1,
    limit: 10
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [notification, setNotification] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [analytics, setAnalytics] = useState(null);

  const API_BASE_URL = 'https://parksy-backend.onrender.com/api/contact';

  // Fetch dashboard statistics
  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/stats`);
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
      showNotification('Error fetching dashboard statistics', 'error');
    }
  };

  // Fetch emergency contacts
  const fetchContacts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await axios.get(`${API_BASE_URL}/admin/all?${params}`);
      setContacts(response.data.data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      showNotification('Error fetching emergency contacts', 'error');
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  // Search contacts
  const searchContacts = async () => {
    if (!searchTerm.trim()) {
      fetchContacts();
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/admin/search?q=${searchTerm}&page=${filters.page}&limit=${filters.limit}`);
      setContacts(response.data.data || []);
    } catch (error) {
      console.error('Error searching contacts:', error);
      showNotification('Error searching contacts', 'error');
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch analytics
  const fetchAnalytics = async () => {
    try {
      const [responseTimeRes, inquiryTypeRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/admin/analytics/response-time`),
        axios.get(`${API_BASE_URL}/admin/analytics/inquiry-types`)
      ]);
      
      setAnalytics({
        responseTime: responseTimeRes.data.data || [],
        inquiryTypes: inquiryTypeRes.data.data || []
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      showNotification('Error fetching analytics', 'error');
    }
  };

  // Update contact status
  const updateContactStatus = async (contactId, status, adminResponse = '') => {
    try {
      const response = await axios.put(`${API_BASE_URL}/admin/${contactId}/status`, {
        status,
        adminResponse
      });
      
      if (response.data.success) {
        fetchContacts();
        fetchStats();
        showNotification('Contact status updated successfully', 'success');
        setSelectedContact(null);
      }
    } catch (error) {
      console.error('Error updating contact status:', error);
      showNotification('Error updating contact status', 'error');
    }
  };

  // Delete/Close contact
  const closeContact = async (contactId) => {
    if (!window.confirm('Are you sure you want to close this emergency contact?')) return;

    try {
      const response = await axios.delete(`${API_BASE_URL}/admin/${contactId}`);
      if (response.data.success) {
        fetchContacts();
        fetchStats();
        showNotification('Emergency contact closed successfully', 'success');
        setSelectedContact(null);
      }
    } catch (error) {
      console.error('Error closing contact:', error);
      showNotification('Error closing contact', 'error');
    }
  };

  // Show notification
  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Format date
  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get priority color
  const getPriorityColor = (priority) => {
    return priority === 'HIGH' ? '#ef4444' : '#3b82f6';
  };

  // Get status color
  const getStatusColor = (status) => {
    const colors = {
      'OPEN': '#f59e0b',
      'IN_PROGRESS': '#3b82f6',
      'RESOLVED': '#10b981',
      'CLOSED': '#6b7280'
    };
    return colors[status] || '#6b7280';
  };

  useEffect(() => {
    fetchStats();
    fetchContacts();
  }, [filters]);

  useEffect(() => {
    if (currentView === 'analytics') {
      fetchAnalytics();
    }
  }, [currentView]);

  return (
    <div className="admin-dashboard">
      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`notification ${notification.type}`}
          >
            <span>{notification.message}</span>
            <button onClick={() => setNotification(null)}>×</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.header 
        className="dashboard-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="header-content">
          <div className="header-title">
            <h1>🚗 Parksy Admin Dashboard</h1>
            <p>Emergency Contact Management System</p>
          </div>
          
          <div className="header-actions">
            <button 
              className={`view-btn ${currentView === 'dashboard' ? 'active' : ''}`}
              onClick={() => setCurrentView('dashboard')}
            >
              📊 Dashboard
            </button>
            <button 
              className={`view-btn ${currentView === 'list' ? 'active' : ''}`}
              onClick={() => setCurrentView('list')}
            >
              📋 Contacts
            </button>
            <button 
              className={`view-btn ${currentView === 'analytics' ? 'active' : ''}`}
              onClick={() => setCurrentView('analytics')}
            >
              📈 Analytics
            </button>
          </div>
        </div>
      </motion.header>

      {/* Dashboard View */}
      {currentView === 'dashboard' && (
        <motion.div 
          className="dashboard-content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Stats Cards */}
          <div className="stats-grid">
            <motion.div 
              className="stat-card total"
              whileHover={{ scale: 1.02 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="stat-icon">📊</div>
              <div className="stat-info">
                <h3>Total Tickets</h3>
                <p className="stat-number">{stats.totalTickets || 0}</p>
              </div>
            </motion.div>

            <motion.div 
              className="stat-card open"
              whileHover={{ scale: 1.02 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="stat-icon">🔓</div>
              <div className="stat-info">
                <h3>Open Tickets</h3>
                <p className="stat-number">{stats.openTickets || 0}</p>
              </div>
            </motion.div>

            <motion.div 
              className="stat-card high-priority"
              whileHover={{ scale: 1.02 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="stat-icon">🚨</div>
              <div className="stat-info">
                <h3>High Priority</h3>
                <p className="stat-number">{stats.highPriorityTickets || 0}</p>
              </div>
            </motion.div>

            <motion.div 
              className="stat-card resolved"
              whileHover={{ scale: 1.02 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="stat-icon">✅</div>
              <div className="stat-info">
                <h3>Resolved</h3>
                <p className="stat-number">{stats.resolvedTickets || 0}</p>
              </div>
            </motion.div>
          </div>

          {/* Recent Activity */}
          <motion.div 
            className="recent-activity"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h2>Recent Emergency Contacts</h2>
            <div className="activity-list">
              {contacts.slice(0, 5).map((contact, index) => (
                <motion.div 
                  key={contact._id}
                  className="activity-item"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                  onClick={() => setSelectedContact(contact)}
                >
                  <div className="activity-info">
                    <h4>{contact.name}</h4>
                    <p>{contact.inquiryType}</p>
                    <span className="activity-time">{formatDate(contact.createdAt)}</span>
                  </div>
                  <div className="activity-status">
                    <span 
                      className="priority-badge"
                      style={{ backgroundColor: getPriorityColor(contact.priority) }}
                    >
                      {contact.priority}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Contacts List View */}
      {currentView === 'list' && (
        <motion.div 
          className="contacts-view"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Search and Filters */}
          <div className="controls-section">
            <div className="search-bar">
              <input
                type="text"
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchContacts()}
              />
              <button onClick={searchContacts}>🔍</button>
            </div>

            <button 
              className="filter-toggle"
              onClick={() => setShowFilters(!showFilters)}
            >
              🎛️ Filters
            </button>
          </div>

          {/* Filters Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div 
                className="filters-panel"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <div className="filters-grid">
                  <select 
                    value={filters.status}
                    onChange={(e) => setFilters({...filters, status: e.target.value})}
                  >
                    <option value="">All Statuses</option>
                    <option value="OPEN">Open</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="CLOSED">Closed</option>
                  </select>

                  <select 
                    value={filters.priority}
                    onChange={(e) => setFilters({...filters, priority: e.target.value})}
                  >
                    <option value="">All Priorities</option>
                    <option value="HIGH">High Priority</option>
                    <option value="NORMAL">Normal Priority</option>
                  </select>

                  <select 
                    value={filters.inquiryType}
                    onChange={(e) => setFilters({...filters, inquiryType: e.target.value})}
                  >
                    <option value="">All Types</option>
                    <option value="Not Finding Parking Spot">Not Finding Parking</option>
                    <option value="Double Booking Issue">Double Booking</option>
                    <option value="Payment Related Issue">Payment Issue</option>
                    <option value="Technical Problem">Technical Problem</option>
                    <option value="Refund Request">Refund Request</option>
                  </select>

                  <button 
                    onClick={() => {
                      setFilters({status: '', priority: '', inquiryType: '', page: 1, limit: 10});
                      setSearchTerm('');
                    }}
                    className="clear-filters"
                  >
                    Clear Filters
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Contacts Table - FIXED VERSION */}
          <div className="contacts-table">
            {loading ? (
              <div className="loading-spinner">
                <div className="spinner"></div>
                <p>Loading emergency contacts...</p>
              </div>
            ) : contacts.length === 0 ? (
              <div className="no-data">
                <div className="no-data-icon">📭</div>
                <h3>No Emergency Contacts Found</h3>
                <p>No contacts match your current filters or search criteria.</p>
              </div>
            ) : (
              <motion.div 
                className="table-container"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="table-wrapper">
                  <table className="contacts-table-element">
                    <thead>
                      <tr>
                        <th>Ticket ID</th>
                        <th>Customer</th>
                        <th>Contact</th>
                        <th>Issue Type</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contacts.map((contact, index) => (
                        <tr 
                          key={contact._id}
                          className="table-row"
                          style={{
                            animationDelay: `${0.05 * index}s`
                          }}
                        >
                          <td className="ticket-id-cell">
                            <span className="ticket-id">{contact.ticketId}</span>
                          </td>
                          <td className="customer-cell">
                            <div className="customer-info">
                              <strong>{contact.name}</strong>
                              <span>{contact.email}</span>
                            </div>
                          </td>
                          <td className="contact-cell">
                            <a href={`tel:${contact.phone}`} className="phone-link">
                              {contact.phone}
                            </a>
                          </td>
                          <td className="issue-cell">
                            <span className="issue-type">{contact.inquiryType}</span>
                          </td>
                          <td className="priority-cell">
                            <span 
                              className="priority-badge"
                              style={{ 
                                backgroundColor: getPriorityColor(contact.priority),
                                color: 'white'
                              }}
                            >
                              {contact.priority}
                            </span>
                          </td>
                          <td className="status-cell">
                            <span 
                              className="status-badge"
                              style={{ 
                                backgroundColor: getStatusColor(contact.status),
                                color: 'white'
                              }}
                            >
                              {contact.status}
                            </span>
                          </td>
                          <td className="date-cell">
                            <span className="date-text">{formatDate(contact.createdAt)}</span>
                          </td>
                          <td className="actions-cell">
                            <div className="action-buttons">
                              <button 
                                onClick={() => setSelectedContact(contact)}
                                className="action-btn view-btn"
                                title="View Details"
                              >
                                👁️
                              </button>
                              <button 
                                onClick={() => closeContact(contact._id)}
                                className="action-btn delete-btn"
                                title="Close Ticket"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}

      {/* Analytics View */}
      {currentView === 'analytics' && (
        <motion.div 
          className="analytics-view"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <h2>📈 Analytics Dashboard</h2>
          
          {analytics ? (
            <div className="analytics-grid">
              <motion.div 
                className="analytics-card"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
              >
                <h3>Response Time Analysis</h3>
                <div className="chart-container">
                  {analytics.responseTime && analytics.responseTime.length > 0 ? (
                    analytics.responseTime.map((item, index) => (
                      <div key={index} className="chart-item">
                        <span className="chart-label">{item._id} Priority</span>
                        <div className="chart-bar-container">
                          <div 
                            className="chart-bar"
                            style={{ 
                              width: `${Math.min((item.avgResponseTime / 24) * 100, 100)}%`,
                              backgroundColor: item._id === 'HIGH' ? '#ef4444' : '#3b82f6'
                            }}
                          ></div>
                        </div>
                        <span className="chart-value">{item.avgResponseTime.toFixed(1)}h avg</span>
                      </div>
                    ))
                  ) : (
                    <p className="no-data-text">No response time data available</p>
                  )}
                </div>
              </motion.div>

              <motion.div 
                className="analytics-card"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                <h3>Inquiry Type Distribution</h3>
                <div className="chart-container">
                  {analytics.inquiryTypes && analytics.inquiryTypes.length > 0 ? (
                    analytics.inquiryTypes.slice(0, 5).map((item, index) => (
                      <div key={index} className="chart-item">
                        <span className="chart-label">{item._id.substring(0, 20)}...</span>
                        <div className="chart-bar-container">
                          <div 
                            className="chart-bar"
                            style={{ 
                              width: `${(item.count / Math.max(...analytics.inquiryTypes.map(i => i.count))) * 100}%`,
                              backgroundColor: `hsl(${index * 60}, 70%, 50%)`
                            }}
                          ></div>
                        </div>
                        <span className="chart-value">{item.count} tickets</span>
                      </div>
                    ))
                  ) : (
                    <p className="no-data-text">No inquiry type data available</p>
                  )}
                </div>
              </motion.div>
            </div>
          ) : (
            <div className="loading-spinner">
              <div className="spinner"></div>
              <p>Loading analytics...</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Contact Detail Modal */}
      <AnimatePresence>
        {selectedContact && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedContact(null)}
          >
            <motion.div 
              className="contact-modal"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>Emergency Contact Details</h2>
                <button 
                  className="close-modal"
                  onClick={() => setSelectedContact(null)}
                >
                  ×
                </button>
              </div>

              <div className="modal-content">
                <div className="contact-details">
                  <div className="detail-section">
                    <h3>Ticket Information</h3>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <label>Ticket ID:</label>
                        <span>{selectedContact.ticketId}</span>
                      </div>
                      <div className="detail-item">
                        <label>Priority:</label>
                        <span 
                          className="priority-badge"
                          style={{ backgroundColor: getPriorityColor(selectedContact.priority) }}
                        >
                          {selectedContact.priority}
                        </span>
                      </div>
                      <div className="detail-item">
                        <label>Status:</label>
                        <span 
                          className="status-badge"
                          style={{ backgroundColor: getStatusColor(selectedContact.status) }}
                        >
                          {selectedContact.status}
                        </span>
                      </div>
                      <div className="detail-item">
                        <label>Created:</label>
                        <span>{formatDate(selectedContact.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h3>Customer Information</h3>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <label>Name:</label>
                        <span>{selectedContact.name}</span>
                      </div>
                      <div className="detail-item">
                        <label>Email:</label>
                        <a href={`mailto:${selectedContact.email}`}>
                          {selectedContact.email}
                        </a>
                      </div>
                      <div className="detail-item">
                        <label>Phone:</label>
                        <a href={`tel:${selectedContact.phone}`}>
                          {selectedContact.phone}
                        </a>
                      </div>
                      <div className="detail-item">
                        <label>Issue Type:</label>
                        <span>{selectedContact.inquiryType}</span>
                      </div>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h3>Emergency Details</h3>
                    <div className="message-content">
                      {selectedContact.message}
                    </div>
                  </div>

                  {selectedContact.adminResponse && (
                    <div className="detail-section">
                      <h3>Admin Response</h3>
                      <div className="admin-response">
                        {selectedContact.adminResponse}
                      </div>
                      <small>Responded: {formatDate(selectedContact.responseDate)}</small>
                    </div>
                  )}
                </div>

                <div className="modal-actions">
                  <button 
                    onClick={() => updateContactStatus(selectedContact._id, 'IN_PROGRESS')}
                    className="action-btn progress"
                    disabled={selectedContact.status === 'IN_PROGRESS'}
                  >
                    Mark In Progress
                  </button>
                  <button 
                    onClick={() => updateContactStatus(selectedContact._id, 'RESOLVED')}
                    className="action-btn resolved"
                    disabled={selectedContact.status === 'RESOLVED'}
                  >
                    Mark Resolved
                  </button>
                  <button 
                    onClick={() => closeContact(selectedContact._id)}
                    className="action-btn danger"
                  >
                    Close Ticket
                  </button>
                  <a 
                    href={`mailto:${selectedContact.email}?subject=Re: ${selectedContact.inquiryType} - Ticket ${selectedContact.ticketId}`}
                    className="action-btn email"
                  >
                    Email Customer
                  </a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;