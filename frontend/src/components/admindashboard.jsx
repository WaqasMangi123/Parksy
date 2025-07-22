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
    window.location.href = '#/admin/login';
  };

  useEffect(() => {
    // Add unique body class for admin dashboard
    document.body.classList.add('admin-dashboard-body');
    
    return () => {
      // Clean up on unmount
      document.body.classList.remove('admin-dashboard-body');
    };
  }, []);

  const StatCard = ({ title, value, change, icon: Icon, color, trend }) => (
    <div className={`adm-stat-card adm-stat-${color}`}>
      <div className="adm-stat-card-content">
        <div className="adm-stat-header">
          <div className="adm-stat-icon">
            <Icon size={24} />
          </div>
          <div className={`adm-stat-trend adm-trend-${trend}`}>
            <TrendingUp size={16} />
            <span>{change}%</span>
          </div>
        </div>
        <div className="adm-stat-body">
          <h3 className="adm-stat-value">{value}</h3>
          <p className="adm-stat-title">{title}</p>
        </div>
      </div>
      <div className="adm-stat-animation">
        <div className="adm-floating-particles">
          {[...Array(6)].map((_, i) => (
            <div key={i} className={`adm-particle adm-particle-${i + 1}`}></div>
          ))}
        </div>
      </div>
    </div>
  );

  const ActivityItem = ({ activity }) => (
    <div className="adm-activity-item">
      <div className={`adm-activity-icon adm-activity-${activity.type}`}>
        {activity.type === 'booking' && <Car size={16} />}
        {activity.type === 'payment' && <DollarSign size={16} />}
        {activity.type === 'extension' && <Clock size={16} />}
        {activity.type === 'cancellation' && <XCircle size={16} />}
      </div>
      <div className="adm-activity-content">
        <div className="adm-activity-header">
          <span className="adm-activity-user">{activity.user}</span>
          <span className="adm-activity-time">{activity.time}</span>
        </div>
        <p className="adm-activity-action">{activity.action}</p>
      </div>
    </div>
  );

  return (
    <div className="adm-dashboard-container">
      {/* Animated Background */}
      <div className="adm-dashboard-background">
        <div className="adm-floating-cars">
          <div className="adm-floating-car adm-car-1">
            <Car size={24} />
          </div>
          <div className="adm-floating-car adm-car-2">
            <Car size={20} />
          </div>
          <div className="adm-floating-car adm-car-3">
            <Car size={28} />
          </div>
          <div className="adm-floating-car adm-car-4">
            <Car size={22} />
          </div>
          <div className="adm-floating-car adm-car-5">
            <Car size={26} />
          </div>
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
                <h2>ParkAdmin</h2>
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
              onClick={() => setCurrentPage(item.id)}
            >
              <div className="adm-nav-icon">
                <item.icon size={20} />
              </div>
              {sidebarOpen && (
                <span className="adm-nav-label">{item.label}</span>
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
        </div>
      </aside>

      {/* Main Content */}
      <main className={`adm-main-content ${sidebarOpen ? 'adm-content-sidebar-open' : 'adm-content-sidebar-closed'}`}>
        {/* Header */}
        <header className="adm-dashboard-header">
          <div className="adm-header-left">
            <div className="adm-page-title">
              <h1>
                {menuItems.find(item => item.id === currentPage)?.label || 'Dashboard'}
              </h1>
              <p>Welcome back! Here's what's happening today.</p>
            </div>
          </div>

          <div className="adm-header-center">
            <div className="adm-search-container">
              <Search className="adm-search-icon" size={20} />
              <input
                type="text"
                placeholder="Search anything..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="adm-search-input"
              />
            </div>
          </div>

          <div className="adm-header-right">
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
        {currentPage === 'dashboard' && (
          <div className="adm-dashboard-content">
            {/* Stats Grid */}
            <div className="adm-stats-grid">
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
            <div className="adm-dashboard-grid">
              {/* Chart Section */}
              <div className="adm-chart-container">
                <div className="adm-chart-header">
                  <h3>Booking Analytics</h3>
                  <div className="adm-chart-controls">
                    <button className="adm-chart-btn adm-chart-active">7D</button>
                    <button className="adm-chart-btn">30D</button>
                    <button className="adm-chart-btn">90D</button>
                  </div>
                </div>
                
                <div className="adm-chart-content">
                  <div className="adm-chart-visualization">
                    {dashboardData.chartData.map((item, index) => (
                      <div key={index} className="adm-chart-bar">
                        <div 
                          className="adm-bar"
                          style={{ 
                            height: `${(item.bookings / 134) * 100}%`,
                            animationDelay: `${index * 0.1}s`
                          }}
                        ></div>
                        <span className="adm-bar-label">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="adm-activity-container">
                <div className="adm-activity-header">
                  <h3>Recent Activity</h3>
                  <button className="adm-view-all-btn">
                    <Eye size={16} />
                    View All
                  </button>
                </div>
                
                <div className="adm-activity-list">
                  {dashboardData.recentActivity.map((activity) => (
                    <ActivityItem key={activity.id} activity={activity} />
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="adm-quick-actions">
              <h3>Quick Actions</h3>
              <div className="adm-actions-grid">
                <button className="adm-action-card adm-add-spot">
                  <Car size={24} />
                  <span>Add Parking Spot</span>
                </button>
                <button className="adm-action-card adm-view-users">
                  <Users size={24} />
                  <span>Manage Users</span>
                </button>
                <button className="adm-action-card adm-generate-report">
                  <BarChart3 size={24} />
                  <span>Generate Report</span>
                </button>
                <button className="adm-action-card adm-system-settings">
                  <Settings size={24} />
                  <span>System Settings</span>
                </button>
              </div>
            </div>

            {/* System Status */}
            <div className="adm-system-status">
              <h3>System Status</h3>
              <div className="adm-status-grid">
                <div className="adm-status-item adm-status-online">
                  <CheckCircle size={20} />
                  <span>Server Online</span>
                </div>
                <div className="adm-status-item adm-status-online">
                  <CheckCircle size={20} />
                  <span>Database Connected</span>
                </div>
                <div className="adm-status-item adm-status-warning">
                  <AlertTriangle size={20} />
                  <span>High Traffic</span>
                </div>
                <div className="adm-status-item adm-status-online">
                  <CheckCircle size={20} />
                  <span>Payment Gateway</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Other Pages Placeholder */}
        {currentPage !== 'dashboard' && (
          <div className="adm-page-placeholder">
            <div className="adm-placeholder-content">
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