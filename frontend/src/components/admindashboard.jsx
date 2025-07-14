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
  XCircle
} from 'lucide-react';
import './admindashboard.css';

const AdminDashboard = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifications, setNotifications] = useState(3);
  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Sample data
  const [dashboardData, setDashboardData] = useState({
    totalUsers: 2847,
    totalRevenue: 125840,
    activeBookings: 156,
    availableSpots: 423,
    todayBookings: 89,
    recentActivity: [
      { id: 1, user: 'John Doe', action: 'Booked Spot A-23', time: '2 mins ago', type: 'booking' },
      { id: 2, user: 'Sarah Wilson', action: 'Payment completed', time: '5 mins ago', type: 'payment' },
      { id: 3, user: 'Mike Johnson', action: 'Extended parking', time: '8 mins ago', type: 'extension' },
      { id: 4, user: 'Emma Brown', action: 'Cancelled booking', time: '12 mins ago', type: 'cancellation' },
    ],
    chartData: [
      { name: 'Mon', bookings: 65, revenue: 2400 },
      { name: 'Tue', bookings: 89, revenue: 3200 },
      { name: 'Wed', bookings: 78, revenue: 2800 },
      { name: 'Thu', bookings: 95, revenue: 3600 },
      { name: 'Fri', bookings: 112, revenue: 4200 },
      { name: 'Sat', bookings: 134, revenue: 5100 },
      { name: 'Sun', bookings: 98, revenue: 3700 }
    ]
  });

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, active: true },
    { id: 'user-activity', label: 'User Activity', icon: Users },
    { id: 'parking-spots', label: 'Parking Spots', icon: Car },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'emergency-contact', label: 'Emergency Contact', icon: Phone },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    window.location.href = '/admin/login';
  };

  const StatCard = ({ title, value, change, icon: Icon, color, trend }) => (
    <div className={`stat-card ${color}`}>
      <div className="stat-card-content">
        <div className="stat-header">
          <div className="stat-icon">
            <Icon size={24} />
          </div>
          <div className={`stat-trend ${trend}`}>
            <TrendingUp size={16} />
            <span>{change}%</span>
          </div>
        </div>
        <div className="stat-body">
          <h3 className="stat-value">{value}</h3>
          <p className="stat-title">{title}</p>
        </div>
      </div>
      <div className="stat-animation">
        <div className="floating-particles">
          {[...Array(6)].map((_, i) => (
            <div key={i} className={`particle particle-${i + 1}`}></div>
          ))}
        </div>
      </div>
    </div>
  );

  const ActivityItem = ({ activity }) => (
    <div className="activity-item">
      <div className={`activity-icon ${activity.type}`}>
        {activity.type === 'booking' && <Car size={16} />}
        {activity.type === 'payment' && <DollarSign size={16} />}
        {activity.type === 'extension' && <Clock size={16} />}
        {activity.type === 'cancellation' && <XCircle size={16} />}
      </div>
      <div className="activity-content">
        <div className="activity-header">
          <span className="activity-user">{activity.user}</span>
          <span className="activity-time">{activity.time}</span>
        </div>
        <p className="activity-action">{activity.action}</p>
      </div>
    </div>
  );

  return (
    <div className="admin-dashboard">
      {/* Animated Background */}
      <div className="dashboard-background">
        <div className="floating-cars">
          <div className="floating-car car-1">
            <Car size={24} />
          </div>
          <div className="floating-car car-2">
            <Car size={20} />
          </div>
          <div className="floating-car car-3">
            <Car size={28} />
          </div>
          <div className="floating-car car-4">
            <Car size={22} />
          </div>
          <div className="floating-car car-5">
            <Car size={26} />
          </div>
        </div>
        
        <div className="geometric-shapes">
          {[...Array(8)].map((_, i) => (
            <div key={i} className={`shape shape-${i + 1}`}></div>
          ))}
        </div>
      </div>

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon">
              <Car size={32} />
            </div>
            {sidebarOpen && (
              <div className="logo-text">
                <h2>ParkAdmin</h2>
                <span>Management Portal</span>
              </div>
            )}
          </div>
          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
              onClick={() => setCurrentPage(item.id)}
            >
              <div className="nav-icon">
                <item.icon size={20} />
              </div>
              {sidebarOpen && (
                <span className="nav-label">{item.label}</span>
              )}
              <div className="nav-indicator"></div>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">
              <Shield size={20} />
            </div>
            {sidebarOpen && (
              <div className="user-info">
                <span className="user-name">Admin User</span>
                <span className="user-role">Super Admin</span>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`main-content ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        {/* Header */}
        <header className="dashboard-header">
          <div className="header-left">
            <div className="page-title">
              <h1>
                {menuItems.find(item => item.id === currentPage)?.label || 'Dashboard'}
              </h1>
              <p>Welcome back! Here's what's happening today.</p>
            </div>
          </div>

          <div className="header-center">
            <div className="search-container">
              <Search className="search-icon" size={20} />
              <input
                type="text"
                placeholder="Search anything..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
          </div>

          <div className="header-right">
            <button className="header-btn notifications-btn">
              <Bell size={20} />
              {notifications > 0 && <span className="notification-badge">{notifications}</span>}
            </button>
            
            <div className="user-menu">
              <button 
                className="user-menu-btn"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <div className="user-avatar">
                  <Shield size={20} />
                </div>
                <ChevronDown size={16} />
              </button>
              
              {userMenuOpen && (
                <div className="user-dropdown">
                  <div className="dropdown-item">
                    <Settings size={16} />
                    <span>Settings</span>
                  </div>
                  <div className="dropdown-item" onClick={handleLogout}>
                    <LogOut size={16} />
                    <span>Logout</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        {currentPage === 'dashboard' && (
          <div className="dashboard-content">
            {/* Stats Grid */}
            <div className="stats-grid">
              <StatCard
                title="Total Users"
                value={dashboardData.totalUsers.toLocaleString()}
                change={12}
                icon={Users}
                color="blue"
                trend="up"
              />
              <StatCard
                title="Total Revenue"
                value={`$${dashboardData.totalRevenue.toLocaleString()}`}
                change={18}
                icon={DollarSign}
                color="green"
                trend="up"
              />
              <StatCard
                title="Active Bookings"
                value={dashboardData.activeBookings}
                change={5}
                icon={Activity}
                color="purple"
                trend="up"
              />
              <StatCard
                title="Available Spots"
                value={dashboardData.availableSpots}
                change={-3}
                icon={MapPin}
                color="orange"
                trend="down"
              />
            </div>

            {/* Charts and Activity */}
            <div className="dashboard-grid">
              {/* Chart Section */}
              <div className="chart-container">
                <div className="chart-header">
                  <h3>Booking Analytics</h3>
                  <div className="chart-controls">
                    <button className="chart-btn active">7D</button>
                    <button className="chart-btn">30D</button>
                    <button className="chart-btn">90D</button>
                  </div>
                </div>
                
                <div className="chart-content">
                  <div className="chart-visualization">
                    {dashboardData.chartData.map((item, index) => (
                      <div key={index} className="chart-bar">
                        <div 
                          className="bar"
                          style={{ 
                            height: `${(item.bookings / 134) * 100}%`,
                            animationDelay: `${index * 0.1}s`
                          }}
                        ></div>
                        <span className="bar-label">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="activity-container">
                <div className="activity-header">
                  <h3>Recent Activity</h3>
                  <button className="view-all-btn">
                    <Eye size={16} />
                    View All
                  </button>
                </div>
                
                <div className="activity-list">
                  {dashboardData.recentActivity.map((activity) => (
                    <ActivityItem key={activity.id} activity={activity} />
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="quick-actions">
              <h3>Quick Actions</h3>
              <div className="actions-grid">
                <button className="action-card add-spot">
                  <Car size={24} />
                  <span>Add Parking Spot</span>
                </button>
                <button className="action-card view-users">
                  <Users size={24} />
                  <span>Manage Users</span>
                </button>
                <button className="action-card generate-report">
                  <BarChart3 size={24} />
                  <span>Generate Report</span>
                </button>
                <button className="action-card system-settings">
                  <Settings size={24} />
                  <span>System Settings</span>
                </button>
              </div>
            </div>

            {/* System Status */}
            <div className="system-status">
              <h3>System Status</h3>
              <div className="status-grid">
                <div className="status-item online">
                  <CheckCircle size={20} />
                  <span>Server Online</span>
                </div>
                <div className="status-item online">
                  <CheckCircle size={20} />
                  <span>Database Connected</span>
                </div>
                <div className="status-item warning">
                  <AlertTriangle size={20} />
                  <span>High Traffic</span>
                </div>
                <div className="status-item online">
                  <CheckCircle size={20} />
                  <span>Payment Gateway</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Other Pages Placeholder */}
        {currentPage !== 'dashboard' && (
          <div className="page-placeholder">
            <div className="placeholder-content">
              <Car size={64} />
              <h2>{menuItems.find(item => item.id === currentPage)?.label}</h2>
              <p>This page is under construction. Coming soon!</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;