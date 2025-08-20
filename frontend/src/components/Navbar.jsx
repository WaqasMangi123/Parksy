import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FaChevronDown, FaChevronUp, FaUser, FaSignOutAlt } from "react-icons/fa";
import './navbar.css';

const Navbar = () => {
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [user, setUser] = useState(null);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Check for user authentication on component mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing user data:', error);
        // Clear invalid data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
    setActiveDropdown(null);
    setIsUserDropdownOpen(false);
  }, [location]);

  // Add scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!isMobileMenuOpen);
    setActiveDropdown(null);
    setIsUserDropdownOpen(false);
  };

  const handleDropdown = (menu) => {
    setActiveDropdown(activeDropdown === menu ? null : menu);
  };

  const handleUserDropdown = () => {
    setIsUserDropdownOpen(!isUserDropdownOpen);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsUserDropdownOpen(false);
    navigate('/');
  };

  const isDropdownOpen = (menu) => activeDropdown === menu;

  return (
    <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
      <div className="navbar-container">
        {/* Logo */}
        <Link to="/" className="logo-link">
          <img src="/parksylogo.jpg" alt="Parksy Logo" className="logo" />
        </Link>

        {/* Desktop Navigation */}
        <div className="desktop-nav">
          <ul className="nav-links">
            <li>
              <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>Home</Link>
            </li>
            <li>
              <Link to="/about" className={`nav-link ${location.pathname === '/about' ? 'active' : ''}`}>About</Link>
            </li>
            
            {/* Simplified Find Parking - No Dropdown */}
            <li>
              <Link to="/parkingfinder" className={`nav-link ${location.pathname.includes('/parkingfinder') ? 'active' : ''}`}>
                Find Parking
              </Link>
            </li>

            {/* Simplified List Space - No Dropdown */}
            <li>
              <Link to="/listyourspace" className={`nav-link ${location.pathname.includes('/listyourspace') ? 'active' : ''}`}>
                List Space
              </Link>
            </li>

            <li>
              <Link to="/guidance" className={`nav-link ${location.pathname === '/guidance' ? 'active' : ''}`}>Guidance</Link>
            </li>
            <li>
              <Link to="/contact" className={`nav-link ${location.pathname === '/contact' ? 'active' : ''}`}>Contact</Link>
            </li>
          </ul>

          <div className="nav-actions">
            {/* User Authentication Section */}
            <div className="auth-section">
              {user ? (
                // User is logged in - show user dropdown
                <div 
                  className="user-dropdown"
                  onMouseEnter={() => setIsUserDropdownOpen(true)}
                  onMouseLeave={() => setIsUserDropdownOpen(false)}
                >
                  <button className="user-button" onClick={handleUserDropdown}>
                    <FaUser className="user-icon" />
                    <span className="user-name">{user.username || user.email}</span>
                    {isUserDropdownOpen ? <FaChevronUp /> : <FaChevronDown />}
                  </button>
                  
                  <ul className={`user-dropdown-menu ${isUserDropdownOpen ? 'open' : ''}`}>
                    <li>
                      <Link to="/home" className="user-dropdown-link">
                        <FaUser className="dropdown-icon" />
                        Dashboard
                      </Link>
                    </li>
                    <li>
                      <Link to="/profile" className="user-dropdown-link">
                        <FaUser className="dropdown-icon" />
                        My Profile
                      </Link>
                    </li>
                    <li>
                      <Link to="/my-bookings" className="user-dropdown-link">
                        <FaUser className="dropdown-icon" />
                        My Bookings
                      </Link>
                    </li>
                    <li>
                      <button onClick={handleLogout} className="user-dropdown-link logout-btn">
                        <FaSignOutAlt className="dropdown-icon" />
                        Logout
                      </button>
                    </li>
                  </ul>
                </div>
              ) : (
                // User is not logged in - show login/register buttons
                <div className="auth-buttons">
                  <Link to="/login" className="login-btn">
                    <FaUser className="auth-icon" />
                    Login
                  </Link>
                  <Link to="/register" className="register-btn">
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Hamburger */}
        <div 
          className={`hamburger ${isMobileMenuOpen ? "open" : ""}`} 
          onClick={toggleMobileMenu}
        >
          <div className="bar"></div>
          <div className="bar"></div>
          <div className="bar"></div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`mobile-menu ${isMobileMenuOpen ? "open" : ""}`}>
        <ul className="mobile-nav-links">
          {/* Mobile User Section */}
          {user ? (
            <li className="mobile-user-section">
              <div className="mobile-user-info">
                <FaUser className="mobile-user-icon" />
                <span className="mobile-user-name">Welcome, {user.username || user.email}</span>
              </div>
              <div className="mobile-user-actions">
                <Link to="/dashboard" className="mobile-user-link" onClick={toggleMobileMenu}>
                  Dashboard
                </Link>
                <Link to="/profile" className="mobile-user-link" onClick={toggleMobileMenu}>
                  My Profile
                </Link>
                <Link to="/bookings" className="mobile-user-link" onClick={toggleMobileMenu}>
                  My Bookings
                </Link>
                <button onClick={handleLogout} className="mobile-logout-btn">
                  <FaSignOutAlt className="logout-icon" />
                  Logout
                </button>
              </div>
            </li>
          ) : (
            <li className="mobile-auth-section">
              <Link to="/login" className="mobile-login-btn" onClick={toggleMobileMenu}>
                <FaUser className="auth-icon" />
                Login
              </Link>
              <Link to="/register" className="mobile-register-btn" onClick={toggleMobileMenu}>
                Sign Up
              </Link>
            </li>
          )}

          <li>
            <Link to="/" className="mobile-nav-link" onClick={toggleMobileMenu}>Home</Link>
          </li>
          <li>
            <Link to="/about" className="mobile-nav-link" onClick={toggleMobileMenu}>About</Link>
          </li>
          <li>
            <Link to="/parkingfinder" className="mobile-nav-link" onClick={toggleMobileMenu}>Find Parking</Link>
          </li>
          <li>
            <Link to="/listyourspace" className="mobile-nav-link" onClick={toggleMobileMenu}>List Space</Link>
          </li>
          <li>
            <Link to="/guidance" className="mobile-nav-link" onClick={toggleMobileMenu}>Guidance</Link>
          </li>
          <li>
            <Link to="/contact" className="mobile-nav-link" onClick={toggleMobileMenu}>Contact</Link>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;