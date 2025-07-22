import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import './useractivity.css';

const AdminUserActivity = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    verifiedUsers: 0
  });

  useEffect(() => {
    fetchUsers();
    fetchStats();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/auth/users');
      setUsers(response.data.users);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch users');
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/auth/active-users');
      const allUsers = await axios.get('/api/auth/users');
      
      setStats({
        totalUsers: allUsers.data.users.length,
        activeUsers: response.data.count,
        verifiedUsers: allUsers.data.users.filter(u => u.verified).length
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await axios.delete(`/api/auth/users/${userId}`);
      setUsers(users.filter(user => user.id !== userId));
      fetchStats(); // Refresh stats after deletion
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === 'all') return matchesSearch;
    if (activeTab === 'active') {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      return matchesSearch && new Date(user.lastActive) >= fifteenMinutesAgo;
    }
    if (activeTab === 'verified') return matchesSearch && user.verified;
    if (activeTab === 'unverified') return matchesSearch && !user.verified;
    
    return matchesSearch;
  });

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getUserStatus = (user) => {
    if (!user.lastActive) return 'offline';
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    return new Date(user.lastActive) >= fifteenMinutesAgo ? 'online' : 'offline';
  };

  return (
    <motion.div 
      className="admin-user-activity"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="admin-header">
        <h1>User Activity Dashboard</h1>
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <i className="fas fa-search"></i>
        </div>
      </div>

      <div className="stats-container">
        <motion.div 
          className="stat-card"
          whileHover={{ scale: 1.03 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
        >
          <h3>Total Users</h3>
          <p>{stats.totalUsers}</p>
        </motion.div>
        
        <motion.div 
          className="stat-card"
          whileHover={{ scale: 1.03 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
        >
          <h3>Active Now</h3>
          <p>{stats.activeUsers}</p>
        </motion.div>
        
        <motion.div 
          className="stat-card"
          whileHover={{ scale: 1.03 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
        >
          <h3>Verified Users</h3>
          <p>{stats.verifiedUsers}</p>
        </motion.div>
      </div>

      <div className="tabs">
        <button 
          className={activeTab === 'all' ? 'active' : ''}
          onClick={() => setActiveTab('all')}
        >
          All Users
        </button>
        <button 
          className={activeTab === 'active' ? 'active' : ''}
          onClick={() => setActiveTab('active')}
        >
          Active Now
        </button>
        <button 
          className={activeTab === 'verified' ? 'active' : ''}
          onClick={() => setActiveTab('verified')}
        >
          Verified
        </button>
        <button 
          className={activeTab === 'unverified' ? 'active' : ''}
          onClick={() => setActiveTab('unverified')}
        >
          Unverified
        </button>
      </div>

      {loading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading users...</p>
        </div>
      ) : error ? (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={fetchUsers}>Retry</button>
        </div>
      ) : (
        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Status</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Last Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map(user => (
                  <motion.tr 
                    key={user.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    whileHover={{ scale: 1.01, boxShadow: "0px 4px 15px rgba(0, 0, 0, 0.1)" }}
                  >
                    <td>
                      <div className="user-info">
                        <div className={`avatar ${getUserStatus(user)}`}>
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <span>{user.username}</span>
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`status ${getUserStatus(user)}`}>
                        {getUserStatus(user)}
                      </span>
                    </td>
                    <td>
                      <span className={`role ${user.role}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>{formatDate(user.createdAt)}</td>
                    <td>{formatDate(user.lastActive)}</td>
                    <td>
                      <div className="actions">
                        <button 
                          className="view-btn"
                          onClick={() => setSelectedUser(user)}
                        >
                          <i className="fas fa-eye"></i>
                        </button>
                        <button 
                          className="delete-btn"
                          onClick={() => deleteUser(user.id)}
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="no-results">
                    No users found matching your criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedUser && (
        <motion.div 
          className="user-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div 
            className="modal-content"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
          >
            <button 
              className="close-modal"
              onClick={() => setSelectedUser(null)}
            >
              &times;
            </button>
            
            <h2>User Details</h2>
            
            <div className="user-details-grid">
              <div className="detail-item">
                <span className="detail-label">Username:</span>
                <span className="detail-value">{selectedUser.username}</span>
              </div>
              
              <div className="detail-item">
                <span className="detail-label">Email:</span>
                <span className="detail-value">{selectedUser.email}</span>
              </div>
              
              <div className="detail-item">
                <span className="detail-label">Role:</span>
                <span className={`detail-value role ${selectedUser.role}`}>
                  {selectedUser.role}
                </span>
              </div>
              
              <div className="detail-item">
                <span className="detail-label">Status:</span>
                <span className={`detail-value status ${getUserStatus(selectedUser)}`}>
                  {getUserStatus(selectedUser)}
                </span>
              </div>
              
              <div className="detail-item">
                <span className="detail-label">Verified:</span>
                <span className={`detail-value ${selectedUser.verified ? 'verified' : 'unverified'}`}>
                  {selectedUser.verified ? 'Yes' : 'No'}
                </span>
              </div>
              
              <div className="detail-item">
                <span className="detail-label">Joined:</span>
                <span className="detail-value">{formatDate(selectedUser.createdAt)}</span>
              </div>
              
              <div className="detail-item">
                <span className="detail-label">Last Active:</span>
                <span className="detail-value">{formatDate(selectedUser.lastActive)}</span>
              </div>
            </div>
            
            <div className="modal-actions">
              <button 
                className="delete-btn"
                onClick={() => {
                  deleteUser(selectedUser.id);
                  setSelectedUser(null);
                }}
              >
                Delete User
              </button>
              <button 
                className="close-btn"
                onClick={() => setSelectedUser(null)}
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default AdminUserActivity;