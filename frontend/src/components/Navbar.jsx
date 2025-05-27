import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import './navbar.css';

const Navbar = () => {
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
    setActiveDropdown(null);
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
  };

  const handleDropdown = (menu) => {
    setActiveDropdown(activeDropdown === menu ? null : menu);
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
            
            {/* Find Parking Dropdown */}
            <li 
              className={`nav-item ${isDropdownOpen('parking') ? 'active' : ''}`}
              onMouseEnter={() => handleDropdown('parking')}
              onMouseLeave={() => handleDropdown('parking')}
            >
              <div className="dropdown-trigger">
                <Link to="/parkingfinder" className={`nav-link ${location.pathname.includes('/parkingfinder') ? 'active' : ''}`}>
                  <span>Find Parking</span>
                </Link>
                {isDropdownOpen('parking') ? <FaChevronUp /> : <FaChevronDown />}
              </div>
              <ul className="dropdown-menu">
                <li><Link to="/parkingfinder/nearme" className="dropdown-link">Near Me</Link></li>
                <li><Link to="/parkingfinder/bycity" className="dropdown-link">By City</Link></li>
                <li><Link to="/parkingfinder/airports" className="dropdown-link">Airports</Link></li>
              </ul>
            </li>

            {/* List Space Dropdown */}
            <li 
              className={`nav-item ${isDropdownOpen('list') ? 'active' : ''}`}
              onMouseEnter={() => handleDropdown('list')}
              onMouseLeave={() => handleDropdown('list')}
            >
              <div className="dropdown-trigger">
                <Link to="/listyourspace" className={`nav-link ${location.pathname.includes('/listyourspace') ? 'active' : ''}`}>
                  <span>List Space</span>
                </Link>
                {isDropdownOpen('list') ? <FaChevronUp /> : <FaChevronDown />}
              </div>
              <ul className="dropdown-menu">
                <li><Link to="/listyourspace/how-it-works" className="dropdown-link">How It Works</Link></li>
                <li><Link to="/listyourspace/pricing" className="dropdown-link">Pricing</Link></li>
                <li><Link to="/listyourspace/requirements" className="dropdown-link">Requirements</Link></li>
              </ul>
            </li>

            <li>
              <Link to="/guidance" className={`nav-link ${location.pathname === '/guidance' ? 'active' : ''}`}>Guidance</Link>
            </li>
            <li>
              <Link to="/contact" className={`nav-link ${location.pathname === '/contact' ? 'active' : ''}`}>Contact</Link>
            </li>
          </ul>

          <div className="nav-actions">
            <Link to="/privacypolicy" className="terms-link">Privacy Policy</Link>
            <Link to="/termsandconditions" className="terms-link">Terms & Conditions</Link>
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
          <li>
            <Link to="/" className="mobile-nav-link" onClick={toggleMobileMenu}>Home</Link>
          </li>
          <li>
            <Link to="/about" className="mobile-nav-link" onClick={toggleMobileMenu}>About</Link>
          </li>

          {/* Find Parking Dropdown */}
          <li className="mobile-dropdown">
            <div 
              className="mobile-dropdown-trigger" 
              onClick={() => handleDropdown('mobile-parking')}
            >
              <span>Find Parking</span>
              {isDropdownOpen('mobile-parking') ? <FaChevronUp /> : <FaChevronDown />}
            </div>
            <ul className={`mobile-dropdown-menu ${isDropdownOpen('mobile-parking') ? "open" : ""}`}>
              <li><Link to="/parkingfinder" className="mobile-dropdown-link" onClick={toggleMobileMenu}>All Parking</Link></li>
              <li><Link to="/parkingfinder/nearme" className="mobile-dropdown-link" onClick={toggleMobileMenu}>Near Me</Link></li>
              <li><Link to="/parkingfinder/bycity" className="mobile-dropdown-link" onClick={toggleMobileMenu}>By City</Link></li>
              <li><Link to="/parkingfinder/airports" className="mobile-dropdown-link" onClick={toggleMobileMenu}>Airports</Link></li>
            </ul>
          </li>

          {/* List Space Dropdown */}
          <li className="mobile-dropdown">
            <div 
              className="mobile-dropdown-trigger" 
              onClick={() => handleDropdown('mobile-list')}
            >
              <span>List Space</span>
              {isDropdownOpen('mobile-list') ? <FaChevronUp /> : <FaChevronDown />}
            </div>
            <ul className={`mobile-dropdown-menu ${isDropdownOpen('mobile-list') ? "open" : ""}`}>
              <li><Link to="/listyourspace" className="mobile-dropdown-link" onClick={toggleMobileMenu}>Overview</Link></li>
              <li><Link to="/listyourspace/how-it-works" className="mobile-dropdown-link" onClick={toggleMobileMenu}>How It Works</Link></li>
              <li><Link to="/listyourspace/pricing" className="mobile-dropdown-link" onClick={toggleMobileMenu}>Pricing</Link></li>
              <li><Link to="/listyourspace/requirements" className="mobile-dropdown-link" onClick={toggleMobileMenu}>Requirements</Link></li>
            </ul>
          </li>

          <li>
            <Link to="/guidance" className="mobile-nav-link" onClick={toggleMobileMenu}>Guidance</Link>
          </li>
          <li>
            <Link to="/contact" className="mobile-nav-link" onClick={toggleMobileMenu}>Contact</Link>
          </li>
          <li>
            <Link to="/privacypolicy" className="mobile-terms-link" onClick={toggleMobileMenu}>Privacy Policy</Link>
          </li>
          <li>
            <Link to="/termsandconditions" className="mobile-terms-link" onClick={toggleMobileMenu}>Terms & Conditions</Link>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;