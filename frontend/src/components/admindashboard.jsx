import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Car, 
  BarChart3, 
  Settings, 
  Phone, 
  Shield, 
  Bell,
  Search,
  Calendar,
  DollarSign,
  TrendingUp,
  Activity,
  MapPin,
  Clock,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Eye,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  ExternalLink,
  Plane
} from 'lucide-react';
import './admindashboard.css';

const AdminDashboard = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifications, setNotifications] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // API Configuration
  const API_BASE_URL = "https://parksy-backend.onrender.com";

  // Real dashboard data state
  const [dashboardData, setDashboardData] = useState({
    // User Statistics
    totalUsers: 0,
    activeUsers: 0,
    verifiedUsers: 0,
    
    // Booking Statistics
    totalBookings: 0,
    confirmedBookings: 0,
    cancelledBookings: 0,
    totalRevenue: 0,
    averageBookingValue: 0,
    
    // Emergency Contacts
    totalEmergencyContacts: 0,
    openEmergencyContacts: 0,
    highPriorityContacts: 0,
    
    // Recent Activity
    recentBookings: [],
    recentUsers: [],
    recentEmergencyContacts: [],
    
    // System Status
    systemHealth: {
      serverStatus: 'checking',
      databaseStatus: 'checking',
      apiStatus: 'checking'
    }
  });

  // Enhanced menu items with real routes
  const menuItems = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: LayoutDashboard, 
      active: true,
      route: null // Stay on current page
    },
    { 
      id: 'user-activity', 
      label: 'User Management', 
      icon: Users,
      route: '/admin/user-activity',
      description: 'Manage users and view activity'
    },
    { 
      id: 'bookings', 
      label: 'Booking Management', 
      icon: Car,
      route: '/admin/bookings',
      description: 'View and manage all bookings'
    },
    { 
      id: 'emergency-contacts', 
      label: 'Emergency Support', 
      icon: Phone,
      route: '/emergency-contacts',
      description: 'Handle emergency contact requests'
    },
    { 
      id: 'analytics', 
      label: 'Analytics', 
      icon: BarChart3,
      route: '/admin/analytics',
      description: 'View detailed analytics and reports'
    },
    { 
      id: 'settings', 
      label: 'Settings', 
      icon: Settings,
      route: '/admin/settings',
      description: 'System configuration'
    },
  ];

  // Fetch real user statistics
  const fetchUserStats = async () => {
    try {
      const [activeResponse, allUsersResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/auth/active-users`),
        fetch(`${API_BASE_URL}/api/auth/users`)
      ]);

      if (activeResponse.ok) {
        const activeData = await activeResponse.json();
        setDashboardData(prev => ({
          ...prev,
          activeUsers: activeData.count || 0
        }));
      }

      if (allUsersResponse.ok) {
        const allData = await allUsersResponse.json();
        const users = allData.users || [];
        setDashboardData(prev => ({
          ...prev,
          totalUsers: users.length,
          verifiedUsers: users.filter(user => user.verified).length,
          recentUsers: users.slice(0, 5).map(user => ({
            id: user.id,
            name: user.username,
            email: user.email,
            status: getUserStatus(user.lastActive),
            joinDate: user.createdAt,
            verified: user.verified
          }))
        }));
      }
    } catch (error) {
      console.error('❌ Error fetching user stats:', error);
    }
  };

  // Fetch real booking statistics
  const fetchBookingStats = async () => {
    try {
      const [bookingsResponse, statsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/parking/bookings`),
        fetch(`${API_BASE_URL}/api/parking/booking-stats`)
      ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        if (statsData.success) {
          setDashboardData(prev => ({
            ...prev,
            totalBookings: statsData.stats.total_bookings || 0,
            confirmedBookings: statsData.stats.confirmed_bookings || 0,
            cancelledBookings: statsData.stats.cancelled_bookings || 0,
            totalRevenue: statsData.stats.total_revenue || 0,
            averageBookingValue: statsData.stats.average_booking_value || 0
          }));
        }
      }

      if (bookingsResponse.ok) {
        const bookingsData = await bookingsResponse.json();
        if (bookingsData.success && bookingsData.data) {
          setDashboardData(prev => ({
            ...prev,
            recentBookings: bookingsData.data.slice(0, 5).map(booking => ({
              id: booking.id,
              reference: booking.our_reference,
              customerName: booking.customer_name,
              customerEmail: booking.customer_email,
              amount: booking.booking_amount,
              status: booking.status,
              airport: booking.airport_code,
              service: booking.product_name,
              createdAt: booking.created_at,
              paymentStatus: booking.payment_status
            }))
          }));
        }
      }
    } catch (error) {
      console.error('❌ Error fetching booking stats:', error);
    }
  };

  // Fetch emergency contact statistics
  const fetchEmergencyStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/contact/admin/stats`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.stats) {
          setDashboardData(prev => ({
            ...prev,
            totalEmergencyContacts: data.stats.totalTickets || 0,
            openEmergencyContacts: data.stats.openTickets || 0,
            highPriorityContacts: data.stats.highPriorityTickets || 0
          }));
        }
      }

      // Fetch recent emergency contacts
      const contactsResponse = await fetch(`${API_BASE_URL}/api/contact/admin/all?limit=5`);
      if (contactsResponse.ok) {
        const contactsData = await contactsResponse.json();
        if (contactsData.data) {
          setDashboardData(prev => ({
            ...prev,
            recentEmergencyContacts: contactsData.data.map(contact => ({
              id: contact._id,
              ticketId: contact.ticketId,
              name: contact.name,
              email: contact.email,
              inquiryType: contact.inquiryType,
              priority: contact.priority,
              status: contact.status,
              createdAt: contact.createdAt
            }))
          }));
        }
      }
    } catch (error) {
      console.error('❌ Error fetching emergency stats:', error);
    }
  };

  // Check system health
  const checkSystemHealth = async () => {
    try {
      const healthResponse = await fetch(`${API_BASE_URL}/api/parking/health`);
      
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        setDashboardData(prev => ({
          ...prev,
          systemHealth: {
            serverStatus: 'online',
            databaseStatus: healthData.services?.user_model === 'loaded' ? 'online' : 'offline',
            apiStatus: 'online'
          }
        }));
      } else {
        throw new Error('Health check failed');
      }
    } catch (error) {
      console.error('❌ System health check failed:', error);
      setDashboardData(prev => ({
        ...prev,
        systemHealth: {
          serverStatus: 'offline',
          databaseStatus: 'offline',
          apiStatus: 'offline'
        }
      }));
    }
  };

  // Get user status helper
  const getUserStatus = (lastActive) => {
    if (!lastActive) return 'offline';
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    return new Date(lastActive) >= fifteenMinutesAgo ? 'online' : 'offline';
  };

  // Navigate to external routes
  const navigateToPage = (route) => {
    if (route) {
      window.location.href = `/#${route}`;
    }
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('authToken');
    localStorage.removeItem('token');
    window.location.href = '/#/admin/login';
  };

  // Load all dashboard data
  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      await Promise.all([
        fetchUserStats(),
        fetchBookingStats(),
        fetchEmergencyStats(),
        checkSystemHealth()
      ]);
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount || 0);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status color
  const getStatusColor = (status) => {
    const colors = {
      'online': '#10b981',
      'confirmed': '#10b981',
      'paid': '#10b981',
      'offline': '#6b7280',
      'cancelled': '#ef4444',
      'failed': '#ef4444',
      'pending': '#f59e0b',
      'OPEN': '#f59e0b',
      'HIGH': '#ef4444',
      'RESOLVED': '#10b981'
    };
    return colors[status] || '#6b7280';
  };

  // Initialize dashboard
  useEffect(() => {
    document.body.classList.add('admin-dashboard-body');
    loadDashboardData();
    
    return () => {
      document.body.classList.remove('admin-dashboard-body');
    };
  }, []);

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const StatCard = ({ title, value, change, icon: Icon, color, trend, onClick, description }) => (
    <div 
      className={`adm-stat-card adm-stat-${color} ${onClick ? 'adm-stat-clickable' : ''}`}
      onClick={onClick}
    >
      <div className="adm-stat-card-content">
        <div className="adm-stat-header">
          <div className="adm-stat-icon">
            <Icon size={24} />
          </div>
          {change !== undefined && (
            <div className={`adm-stat-trend adm-trend-${trend}`}>
              <TrendingUp size={16} />
              <span>{change > 0 ? '+' : ''}{change}%</span>
            </div>
          )}
          {onClick && (
            <div className="adm-stat-external">
              <ExternalLink size={16} />
            </div>
          )}
        </div>
        <div className="adm-stat-body">
          <h3 className="adm-stat-value">{value}</h3>
          <p className="adm-stat-title">{title}</p>
          {description && <small className="adm-stat-description">{description}</small>}
        </div>
      </div>
    </div>
  );

  const ActivityItem = ({ activity, type }) => (
    <div className="adm-activity-item">
      <div className={`adm-activity-icon adm-activity-${type}`}>
        {type === 'booking' && <Car size={16} />}
        {type === 'user' && <Users size={16} />}
        {type === 'emergency' && <Phone size={16} />}
      </div>
      <div className="adm-activity-content">
        <div className="adm-activity-header">
          <span className="adm-activity-user">{activity.name || activity.customerName}</span>
          <span className="adm-activity-time">{formatDate(activity.createdAt || activity.joinDate)}</span>
        </div>
        <p className="adm-activity-action">
          {type === 'booking' && `${activity.status} booking - ${formatCurrency(activity.amount)}`}
          {type === 'user' && `${activity.verified ? 'Verified' : 'Unverified'} user - ${activity.status}`}
          {type === 'emergency' && `${activity.priority} priority - ${activity.status}`}
        </p>
        {activity.email && <small className="adm-activity-email">{activity.email}</small>}
      </div>
      <div 
        className="adm-activity-status"
        style={{ backgroundColor: getStatusColor(activity.status || activity.priority) }}
      >
        {activity.status || activity.priority}
      </div>
    </div>
  );

  return (
    <div className="adm-dashboard-container">
      {/* Loading Overlay */}
      {loading && (
        <div className="adm-loading-overlay">
          <div className="adm-loading-content">
            <RefreshCw className="adm-loading-spinner" size={32} />
            <p>Loading dashboard data...</p>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="adm-error-banner">
          <AlertTriangle size={20} />
          <span>{error}</span>
          <button onClick={loadDashboardData}>
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
      )}

      {/* Animated Background */}
      <div className="adm-dashboard-background">
        <div className="adm-floating-cars">
          <div className="adm-floating-car adm-car-1"><Car size={24} /></div>
          <div className="adm-floating-car adm-car-2"><Car size={20} /></div>
          <div className="adm-floating-car adm-car-3"><Car size={28} /></div>
          <div className="adm-floating-car adm-car-4"><Car size={22} /></div>
          <div className="adm-floating-car adm-car-5"><Car size={26} /></div>
        </div>
        
        <div className="adm-geometric-shapes">
          {[...Array(8)].map((_, i) => (
            <div key={i} className={`adm-shape adm-shape-${i + 1}`}></div>
          ))}
        </div>
      </div>

      {/* Sidebar */}
      <aside className={`adm-sidebar ${sidebarOpen ? 'adm-sidebar-open' : 'adm-sidebar-closed'}`}>
        <div className="adm-sidebar-header">
          <div className="adm-logo">
            <div className="adm-logo-icon">
              <Car size={32} />
            </div>
            {sidebarOpen && (
              <div className="adm-logo-text">
                <h2>Parksy Admin</h2>
                <span>Management Portal</span>
              </div>
            )}
          </div>
          <button 
            className="adm-sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="adm-sidebar-nav">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`adm-nav-item ${currentPage === item.id ? 'adm-nav-active' : ''}`}
              onClick={() => {
                if (item.route) {
                  navigateToPage(item.route);
                } else {
                  setCurrentPage(item.id);
                }
              }}
              title={item.description}
            >
              <div className="adm-nav-icon">
                <item.icon size={20} />
              </div>
              {sidebarOpen && (
                <>
                  <span className="adm-nav-label">{item.label}</span>
                  {item.route && <ExternalLink size={14} className="adm-nav-external" />}
                </>
              )}
              <div className="adm-nav-indicator"></div>
            </button>
          ))}
        </nav>

        <div className="adm-sidebar-footer">
          <div className="adm-user-profile">
            <div className="adm-user-avatar">
              <Shield size={20} />
            </div>
            {sidebarOpen && (
              <div className="adm-user-info">
                <span className="adm-user-name">Admin User</span>
                <span className="adm-user-role">Super Admin</span>
              </div>
            )}
          </div>
          <button className="adm-logout-btn" onClick={handleLogout}>
            <LogOut size={16} />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`adm-main-content ${sidebarOpen ? 'adm-content-sidebar-open' : 'adm-content-sidebar-closed'}`}>
        {/* Header */}
        <header className="adm-dashboard-header">
          <div className="adm-header-left">
            <div className="adm-page-title">
              <h1>Admin Dashboard</h1>
              <p>Real-time system overview and management controls</p>
            </div>
          </div>

          <div className="adm-header-center">
            <div className="adm-search-container">
              <Search className="adm-search-icon" size={20} />
              <input
                type="text"
                placeholder="Search dashboard..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="adm-search-input"
              />
            </div>
          </div>

          <div className="adm-header-right">
            <button 
              className="adm-refresh-btn"
              onClick={loadDashboardData}
              disabled={loading}
              title="Refresh Dashboard Data"
            >
              <RefreshCw size={20} className={loading ? 'adm-spinning' : ''} />
            </button>

            <button className="adm-header-btn adm-notifications-btn">
              <Bell size={20} />
              {notifications > 0 && <span className="adm-notification-badge">{notifications}</span>}
            </button>
            
            <div className="adm-user-menu">
              <button 
                className="adm-user-menu-btn"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <div className="adm-user-avatar">
                  <Shield size={20} />
                </div>
                <ChevronDown size={16} />
              </button>
              
              {userMenuOpen && (
                <div className="adm-user-dropdown">
                  <div className="adm-dropdown-item">
                    <Settings size={16} />
                    <span>Settings</span>
                  </div>
                  <div className="adm-dropdown-item" onClick={handleLogout}>
                    <LogOut size={16} />
                    <span>Logout</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="adm-dashboard-content">
          {/* Primary Stats Grid */}
          <div className="adm-stats-grid">
            <StatCard
              title="Total Users"
              value={dashboardData.totalUsers.toLocaleString()}
              icon={Users}
              color="blue"
              onClick={() => navigateToPage('/admin/user-activity')}
              description="Click to manage users"
            />
            <StatCard
              title="Total Revenue"
              value={formatCurrency(dashboardData.totalRevenue)}
              icon={DollarSign}
              color="green"
              onClick={() => navigateToPage('/admin/bookings')}
              description="From all confirmed bookings"
            />
            <StatCard
              title="Active Bookings"
              value={dashboardData.confirmedBookings}
              icon={Activity}
              color="purple"
              onClick={() => navigateToPage('/admin/bookings')}
              description="Currently confirmed bookings"
            />
            <StatCard
              title="Emergency Contacts"
              value={dashboardData.openEmergencyContacts}
              icon={Phone}
              color="orange"
              onClick={() => navigateToPage('/emergency-contacts')}
              description={`${dashboardData.highPriorityContacts} high priority`}
            />
          </div>

          {/* Secondary Stats Grid */}
          <div className="adm-secondary-stats">
            <div className="adm-stat-group">
              <h3>User Statistics</h3>
              <div className="adm-mini-stats">
                <div className="adm-mini-stat">
                  <span className="adm-mini-value">{dashboardData.activeUsers}</span>
                  <span className="adm-mini-label">Online Now</span>
                </div>
                <div className="adm-mini-stat">
                  <span className="adm-mini-value">{dashboardData.verifiedUsers}</span>
                  <span className="adm-mini-label">Verified</span>
                </div>
              </div>
            </div>

            <div className="adm-stat-group">
              <h3>Booking Statistics</h3>
              <div className="adm-mini-stats">
                <div className="adm-mini-stat">
                  <span className="adm-mini-value">{dashboardData.totalBookings}</span>
                  <span className="adm-mini-label">Total Bookings</span>
                </div>
                <div className="adm-mini-stat">
                  <span className="adm-mini-value">{formatCurrency(dashboardData.averageBookingValue)}</span>
                  <span className="adm-mini-label">Average Value</span>
                </div>
              </div>
            </div>

            <div className="adm-stat-group">
              <h3>Support Statistics</h3>
              <div className="adm-mini-stats">
                <div className="adm-mini-stat">
                  <span className="adm-mini-value">{dashboardData.totalEmergencyContacts}</span>
                  <span className="adm-mini-label">Total Tickets</span>
                </div>
                <div className="adm-mini-stat">
                  <span className="adm-mini-value">{dashboardData.highPriorityContacts}</span>
                  <span className="adm-mini-label">High Priority</span>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Dashboard */}
          <div className="adm-dashboard-grid">
            {/* Recent Bookings */}
            <div className="adm-activity-container">
              <div className="adm-activity-header">
                <h3>Recent Bookings</h3>
                <button 
                  className="adm-view-all-btn"
                  onClick={() => navigateToPage('/admin/bookings')}
                >
                  <Eye size={16} />
                  View All
                </button>
              </div>
              
              <div className="adm-activity-list">
                {dashboardData.recentBookings.length > 0 ? (
                  dashboardData.recentBookings.map((booking) => (
                    <ActivityItem key={booking.id} activity={booking} type="booking" />
                  ))
                ) : (
                  <div className="adm-no-activity">
                    <Car size={32} />
                    <p>No recent bookings</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Users */}
            <div className="adm-activity-container">
              <div className="adm-activity-header">
                <h3>Recent Users</h3>
                <button 
                  className="adm-view-all-btn"
                  onClick={() => navigateToPage('/admin/user-activity')}
                >
                  <Eye size={16} />
                  View All
                </button>
              </div>
              
              <div className="adm-activity-list">
                {dashboardData.recentUsers.length > 0 ? (
                  dashboardData.recentUsers.map((user) => (
                    <ActivityItem key={user.id} activity={user} type="user" />
                  ))
                ) : (
                  <div className="adm-no-activity">
                    <Users size={32} />
                    <p>No recent users</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Emergency Contacts */}
          <div className="adm-emergency-section">
            <div className="adm-activity-container">
              <div className="adm-activity-header">
                <h3>Emergency Contacts</h3>
                <button 
                  className="adm-view-all-btn"
                  onClick={() => navigateToPage('/emergency-contacts')}
                >
                  <Eye size={16} />
                  Manage All
                </button>
              </div>
              
              <div className="adm-activity-list">
                {dashboardData.recentEmergencyContacts.length > 0 ? (
                  dashboardData.recentEmergencyContacts.map((contact) => (
                    <ActivityItem key={contact.id} activity={contact} type="emergency" />
                  ))
                ) : (
                  <div className="adm-no-activity">
                    <Phone size={32} />
                    <p>No recent emergency contacts</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="adm-quick-actions">
            <h3>Quick Actions</h3>
            <div className="adm-actions-grid">
              <button 
                className="adm-action-card adm-manage-users"
                onClick={() => navigateToPage('/admin/user-activity')}
              >
                <Users size={24} />
                <span>Manage Users</span>
                <small>View and manage user accounts</small>
              </button>
              <button 
                className="adm-action-card adm-manage-bookings"
                onClick={() => navigateToPage('/admin/bookings')}
              >
                <Car size={24} />
                <span>Manage Bookings</span>
                <small>View all parking bookings</small>
              </button>
              <button 
                className="adm-action-card adm-emergency-support"
                onClick={() => navigateToPage('/emergency-contacts')}
              >
                <Phone size={24} />
                <span>Emergency Support</span>
                <small>Handle emergency contacts</small>
              </button>
              <button 
                className="adm-action-card adm-system-settings"
                onClick={() => navigateToPage('/admin/settings')}
              >
                <Settings size={24} />
                <span>System Settings</span>
                <small>Configure system settings</small>
              </button>
            </div>
          </div>

          {/* System Status */}
          <div className="adm-system-status">
            <h3>System Status</h3>
            <div className="adm-status-grid">
              <div className={`adm-status-item ${dashboardData.systemHealth.serverStatus === 'online' ? 'adm-status-online' : 'adm-status-offline'}`}>
                {dashboardData.systemHealth.serverStatus === 'online' ? <CheckCircle size={20} /> : <XCircle size={20} />}
                <span>Server Status</span>
                <small>{dashboardData.systemHealth.serverStatus}</small>
              </div>
              <div className={`adm-status-item ${dashboardData.systemHealth.databaseStatus === 'online' ? 'adm-status-online' : 'adm-status-offline'}`}>
                {dashboardData.systemHealth.databaseStatus === 'online' ? <CheckCircle size={20} /> : <XCircle size={20} />}
                <span>Database Status</span>
                <small>{dashboardData.systemHealth.databaseStatus}</small>
              </div>
              <div className={`adm-status-item ${dashboardData.systemHealth.apiStatus === 'online' ? 'adm-status-online' : 'adm-status-offline'}`}>
                {dashboardData.systemHealth.apiStatus === 'online' ? <CheckCircle size={20} /> : <XCircle size={20} />}
                <span>API Status</span>
                <small>{dashboardData.systemHealth.apiStatus}</small>
              </div>
              <div className="adm-status-item adm-status-online">
                <CheckCircle size={20} />
                <span>Parksy Backend</span>
                <small>Connected to Render</small>
              </div>
            </div>
          </div>

          {/* API Information */}
          <div className="adm-api-info">
            <h4>Backend Information</h4>
            <div className="adm-api-details">
              <div className="adm-api-item">
                <label>Backend URL:</label>
                <span>{API_BASE_URL}</span>
              </div>
              <div className="adm-api-item">
                <label>Last Updated:</label>
                <span>{formatDate(new Date().toISOString())}</span>
              </div>
              <div className="adm-api-item">
                <label>Auto Refresh:</label>
                <span>Every 30 seconds</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;