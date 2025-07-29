import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import './useractivity.css';

const AdminUserActivity = () => {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    verifiedUsers: 0
  });
  const [loading, setLoading] = useState({
    users: true,
    stats: true,
    search: false
  });
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    verified: 'all',
    role: 'all',
    page: 1,
    limit: 10
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [notification, setNotification] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');

  // API configuration
  const API_BASE_URL = 'https://parksy-backend.onrender.com/api/auth';
  const axiosConfig = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  };

  // Enhanced error handler
  const handleApiError = (error, defaultMessage) => {
    console.error('API Error:', error);
    const message = error.response?.data?.message || 
                    error.message || 
                    defaultMessage;
    showNotification(message, 'error');
    return message;
  };

  // Fetch user statistics
  const fetchStats = async () => {
    try {
      setLoading(prev => ({ ...prev, stats: true }));
      const [activeRes, allRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/active-users`, axiosConfig),
        axios.get(`${API_BASE_URL}/users`, axiosConfig)
      ]);
      
      setStats({
        totalUsers: allRes.data.users?.length || 0,
        activeUsers: activeRes.data.count || 0,
        verifiedUsers: allRes.data.users?.filter(u => u.verified).length || 0
      });
    } catch (err) {
      handleApiError(err, 'Error fetching user statistics');
    } finally {
      setLoading(prev => ({ ...prev, stats: false }));
    }
  };

  // Fetch users with filters - updated to use backend filtering
  const fetchUsers = async () => {
    try {
      setLoading(prev => ({ ...prev, users: true }));
      const response = await axios.get(`${API_BASE_URL}/users`, axiosConfig);
      
      // Apply frontend filtering since backend doesn't support filter params
      let filteredUsers = response.data.users || [];
      
      if (filters.status !== 'all') {
        filteredUsers = filteredUsers.filter(user => {
          const status = getUserStatus(user.lastActive);
          return status === filters.status;
        });
      }
      
      if (filters.verified !== 'all') {
        filteredUsers = filteredUsers.filter(user => 
          filters.verified === 'verified' ? user.verified : !user.verified
        );
      }
      
      if (filters.role !== 'all') {
        filteredUsers = filteredUsers.filter(user => user.role === filters.role);
      }
      
      setUsers(filteredUsers);
    } catch (err) {
      handleApiError(err, 'Error fetching users');
      setUsers([]);
    } finally {
      setLoading(prev => ({ ...prev, users: false }));
    }
  };

  // Search users - updated to use frontend search since no search endpoint exists
  const searchUsers = async () => {
    if (!searchTerm.trim()) {
      fetchUsers();
      return;
    }

    try {
      setLoading(prev => ({ ...prev, search: true }));
      const response = await axios.get(`${API_BASE_URL}/users`, axiosConfig);
      const allUsers = response.data.users || [];
      
      const searchTermLower = searchTerm.toLowerCase();
      const filteredUsers = allUsers.filter(user => 
        user.username.toLowerCase().includes(searchTermLower) ||
        user.email.toLowerCase().includes(searchTermLower)
      );
      
      setUsers(filteredUsers);
    } catch (err) {
      handleApiError(err, 'Error searching users');
      setUsers([]);
    } finally {
      setLoading(prev => ({ ...prev, search: false }));
    }
  };

  // Delete user
  const deleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      await axios.delete(`${API_BASE_URL}/users/${userId}`, axiosConfig);
      setUsers(users.filter(user => user.id !== userId));
      fetchStats();
      showNotification('User deleted successfully', 'success');
      setSelectedUser(null);
    } catch (err) {
      handleApiError(err, 'Error deleting user');
    }
  };

  // Show notification
  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get user status
  const getUserStatus = (lastActive) => {
    if (!lastActive) return 'offline';
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    return new Date(lastActive) >= fifteenMinutesAgo ? 'online' : 'offline';
  };

  // Get status color
  const getStatusColor = (status) => {
    return status === 'online' ? '#10b981' : '#6b7280';
  };

  // Get role color
  const getRoleColor = (role) => {
    const colors = {
      'admin': '#ef4444',
      'moderator': '#3b82f6',
      'user': '#10b981'
    };
    return colors[role] || '#6b7280';
  };

  useEffect(() => {
    fetchStats();
    fetchUsers();
  }, [filters]);

  // Combined loading state
  const isLoading = loading.users || loading.stats || loading.search;

  return (
    <div className="admin-user-activity">
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

      {/* Global Loading Overlay */}
      {isLoading && (
        <div className="global-loading-overlay">
          <div className="spinner"></div>
        </div>
      )}

      {/* Header */}
      <motion.header 
        className="dashboard-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="header-content">
          <div className="header-title">
            <h1>👥 User Management</h1>
            <p>Manage all Parksy user accounts and activity</p>
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
              📋 User List
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
              <div className="stat-icon">👥</div>
              <div className="stat-info">
                <h3>Total Users</h3>
                <p className="stat-number">{stats.totalUsers}</p>
              </div>
            </motion.div>

            <motion.div 
              className="stat-card active"
              whileHover={{ scale: 1.02 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="stat-icon">🟢</div>
              <div className="stat-info">
                <h3>Active Now</h3>
                <p className="stat-number">{stats.activeUsers}</p>
              </div>
            </motion.div>

            <motion.div 
              className="stat-card verified"
              whileHover={{ scale: 1.02 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="stat-icon">✅</div>
              <div className="stat-info">
                <h3>Verified Users</h3>
                <p className="stat-number">{stats.verifiedUsers}</p>
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
            <h2>Recent User Activity</h2>
            {loading.users ? (
              <div className="loading-spinner">
                <div className="spinner"></div>
                <p>Loading recent activity...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="no-data">
                <div className="no-data-icon">👤</div>
                <h3>No Recent Activity</h3>
                <p>No users match your current filters.</p>
              </div>
            ) : (
              <div className="activity-list">
                {users.slice(0, 5).map((user, index) => (
                  <motion.div 
                    key={user.id}
                    className="activity-item"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * index }}
                    onClick={() => setSelectedUser(user)}
                  >
                    <div className="activity-info">
                      <div className="user-avatar">
                        <span>{user.username.charAt(0).toUpperCase()}</span>
                        <div className={`status-dot ${getUserStatus(user.lastActive)}`}></div>
                      </div>
                      <div>
                        <h4>{user.username}</h4>
                        <p>{user.email}</p>
                      </div>
                    </div>
                    <div className="activity-meta">
                      <span className="activity-time">
                        Last active: {formatDate(user.lastActive)}
                      </span>
                      <span 
                        className="role-badge"
                        style={{ backgroundColor: getRoleColor(user.role) }}
                      >
                        {user.role}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}

      {/* User List View */}
      {currentView === 'list' && (
        <motion.div 
          className="users-view"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Search and Filters */}
          <div className="controls-section">
            <div className="search-bar">
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchUsers()}
              />
              <button onClick={searchUsers}>🔍</button>
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
                    <option value="all">All Statuses</option>
                    <option value="online">Online</option>
                    <option value="offline">Offline</option>
                  </select>

                  <select 
                    value={filters.verified}
                    onChange={(e) => setFilters({...filters, verified: e.target.value})}
                  >
                    <option value="all">All Verification</option>
                    <option value="verified">Verified</option>
                    <option value="unverified">Unverified</option>
                  </select>

                  <select 
                    value={filters.role}
                    onChange={(e) => setFilters({...filters, role: e.target.value})}
                  >
                    <option value="all">All Roles</option>
                    <option value="admin">Admin</option>
                    <option value="moderator">Moderator</option>
                    <option value="user">User</option>
                  </select>

                  <button 
                    onClick={() => {
                      setFilters({
                        status: 'all',
                        verified: 'all',
                        role: 'all',
                        page: 1,
                        limit: 10
                      });
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

          {/* Users Table */}
          <div className="users-table">
            {loading.users ? (
              <div className="loading-spinner">
                <div className="spinner"></div>
                <p>Loading users...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="no-data">
                <div className="no-data-icon">👤</div>
                <h3>No Users Found</h3>
                <p>No users match your current filters or search criteria.</p>
              </div>
            ) : (
              <motion.div 
                className="table-container"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="table-wrapper">
                  <table className="users-table-element">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Email</th>
                        <th>Status</th>
                        <th>Role</th>
                        <th>Verified</th>
                        <th>Joined</th>
                        <th>Last Active</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user, index) => (
                        <tr 
                          key={user.id}
                          className="table-row"
                          style={{
                            animationDelay: `${0.05 * index}s`
                          }}
                        >
                          <td className="user-cell">
                            <div className="user-info">
                              <div className="user-avatar">
                                <span>{user.username.charAt(0).toUpperCase()}</span>
                                <div className={`status-dot ${getUserStatus(user.lastActive)}`}></div>
                              </div>
                              <strong>{user.username}</strong>
                            </div>
                          </td>
                          <td className="email-cell">
                            <a href={`mailto:${user.email}`}>{user.email}</a>
                          </td>
                          <td className="status-cell">
                            <span 
                              className="status-badge"
                              style={{ 
                                backgroundColor: getStatusColor(getUserStatus(user.lastActive))
                              }}
                            >
                              {getUserStatus(user.lastActive)}
                            </span>
                          </td>
                          <td className="role-cell">
                            <span 
                              className="role-badge"
                              style={{ 
                                backgroundColor: getRoleColor(user.role)
                              }}
                            >
                              {user.role}
                            </span>
                          </td>
                          <td className="verified-cell">
                            <span 
                              className={`verified-badge ${user.verified ? 'verified' : 'unverified'}`}
                            >
                              {user.verified ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td className="date-cell">
                            {formatDate(user.createdAt)}
                          </td>
                          <td className="date-cell">
                            {formatDate(user.lastActive)}
                          </td>
                          <td className="actions-cell">
                            <div className="action-buttons">
                              <button 
                                onClick={() => setSelectedUser(user)}
                                className="action-btn view-btn"
                                title="View Details"
                              >
                                👁️
                              </button>
                              <button 
                                onClick={() => deleteUser(user.id)}
                                className="action-btn delete-btn"
                                title="Delete User"
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

      {/* User Detail Modal */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedUser(null)}
          >
            <motion.div 
              className="user-modal"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>User Details</h2>
                <button 
                  className="close-modal"
                  onClick={() => setSelectedUser(null)}
                >
                  ×
                </button>
              </div>

              <div className="modal-content">
                <div className="user-details">
                  <div className="user-avatar-large">
                    <span>{selectedUser.username.charAt(0).toUpperCase()}</span>
                    <div className={`status-dot-large ${getUserStatus(selectedUser.lastActive)}`}></div>
                  </div>

                  <div className="detail-grid">
                    <div className="detail-section">
                      <h3>Account Information</h3>
                      <div className="detail-item">
                        <label>Username:</label>
                        <span>{selectedUser.username}</span>
                      </div>
                      <div className="detail-item">
                        <label>Email:</label>
                        <span>{selectedUser.email}</span>
                      </div>
                      <div className="detail-item">
                        <label>Role:</label>
                        <span 
                          className="role-badge"
                          style={{ backgroundColor: getRoleColor(selectedUser.role) }}
                        >
                          {selectedUser.role}
                        </span>
                      </div>
                      <div className="detail-item">
                        <label>Verified:</label>
                        <span 
                          className={`verified-badge ${selectedUser.verified ? 'verified' : 'unverified'}`}
                        >
                          {selectedUser.verified ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>

                    <div className="detail-section">
                      <h3>Activity Information</h3>
                      <div className="detail-item">
                        <label>Status:</label>
                        <span 
                          className="status-badge"
                          style={{ backgroundColor: getStatusColor(getUserStatus(selectedUser.lastActive)) }}
                        >
                          {getUserStatus(selectedUser.lastActive)}
                        </span>
                      </div>
                      <div className="detail-item">
                        <label>Joined:</label>
                        <span>{formatDate(selectedUser.createdAt)}</span>
                      </div>
                      <div className="detail-item">
                        <label>Last Active:</label>
                        <span>{formatDate(selectedUser.lastActive)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="modal-actions">
                  <button 
                    onClick={() => deleteUser(selectedUser.id)}
                    className="action-btn danger"
                  >
                    Delete User
                  </button>
                  <a 
                    href={`mailto:${selectedUser.email}`}
                    className="action-btn email"
                  >
                    Email User
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

export default AdminUserActivity;