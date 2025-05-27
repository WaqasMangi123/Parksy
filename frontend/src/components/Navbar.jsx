import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import './navbar.css';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'About', path: '/about' },
    { name: 'Find Parking', path: '/parkingfinder' },
    { name: 'List Space', path: '/listyourspace' },
    { name: 'Guidance', path: '/guidance' },
    { name: 'Contact', path: '/contact' },
  ];

  const itemVariants = {
    open: {
      opacity: 1,
      y: 0,
      transition: { 
        type: 'spring', 
        stiffness: 300, 
        damping: 24,
        duration: 0.5
      }
    },
    closed: { 
      opacity: 0, 
      y: 20, 
      transition: { 
        duration: 0.3 
      } 
    }
  };

  return (
    <motion.nav 
      className={`navbar ${scrolled ? 'scrolled' : ''}`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: [0.6, 0.05, -0.01, 0.9] }}
    >
      <div className="navbar-container">
        <Link to="/" className="logo">
          <motion.img 
            src="/parksylogo.jpg" 
            alt="Parksy Logo"
            className="logo-img"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            whileHover={{ scale: 1.05 }}
          />
        </Link>

        <div className="desktop-links">
          {navLinks.map((link) => (
            <motion.div
              key={link.path}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 10 }}
            >
              <Link 
                to={link.path} 
                className={`nav-link ${location.pathname === link.path ? 'active' : ''}`}
              >
                {link.name}
                {location.pathname === link.path && (
                  <motion.div 
                    className="underline" 
                    layoutId="underline"
                    initial={false}
                    transition={{
                      type: 'spring',
                      stiffness: 500,
                      damping: 30,
                    }}
                  />
                )}
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.button 
          className="hamburger"
          onClick={() => setIsOpen(!isOpen)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          aria-label="Menu"
        >
          <motion.span
            className="hamburger-line"
            animate={isOpen ? "open" : "closed"}
            variants={{
              open: { rotate: 45, y: 7, backgroundColor: '#3a56d4' },
              closed: { rotate: 0, y: 0, backgroundColor: '#4361ee' }
            }}
            transition={{ duration: 0.3 }}
          />
          <motion.span
            className="hamburger-line"
            animate={isOpen ? "open" : "closed"}
            variants={{
              open: { opacity: 0, x: -20 },
              closed: { opacity: 1, x: 0 }
            }}
            transition={{ duration: 0.2 }}
          />
          <motion.span
            className="hamburger-line"
            animate={isOpen ? "open" : "closed"}
            variants={{
              open: { rotate: -45, y: -7, backgroundColor: '#3a56d4' },
              closed: { rotate: 0, y: 0, backgroundColor: '#4361ee' }
            }}
            transition={{ duration: 0.3 }}
          />
        </motion.button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className="mobile-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ 
              height: 'auto', 
              opacity: 1,
              transition: {
                height: { type: 'spring', bounce: 0.1, duration: 0.5 },
                opacity: { duration: 0.4 }
              }
            }}
            exit={{ 
              height: 0, 
              opacity: 0,
              transition: {
                height: { duration: 0.3 },
                opacity: { duration: 0.2 }
              }
            }}
          >
            <motion.ul
              initial="closed"
              animate="open"
              exit="closed"
              variants={{
                open: {
                  transition: { staggerChildren: 0.07, delayChildren: 0.2 }
                },
                closed: {
                  transition: { staggerChildren: 0.05, staggerDirection: -1 }
                }
              }}
            >
              {navLinks.map((link) => (
                <motion.li
                  key={link.path}
                  variants={itemVariants}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 400 }}
                >
                  <Link 
                    to={link.path} 
                    className={`mobile-link ${location.pathname === link.path ? 'active' : ''}`}
                  >
                    {link.name}
                    {location.pathname === link.path && (
                      <motion.div 
                        className="mobile-underline"
                        layoutId="mobile-underline"
                        transition={{
                          type: 'spring',
                          stiffness: 500,
                          damping: 30,
                        }}
                      />
                    )}
                  </Link>
                </motion.li>
              ))}
            </motion.ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;