import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiShield, FiDatabase, FiShare2, FiPieChart, FiUserCheck, FiMail } from 'react-icons/fi';
import './profile.css';

// Premium placeholder images
const profileBgImages = [
  'https://plus.unsplash.com/premium_photo-1661902046698-40bba703f396?q=80&w=1471&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://plus.unsplash.com/premium_photo-1661964162988-a81f384f6040?q=80&w=1471&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://plus.unsplash.com/premium_photo-1661869578542-60e408846cbf?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
];

const ProfilePage = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [lastUpdated] = useState(new Date().toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }));

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % profileBgImages.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const profileContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        when: "beforeChildren"
      }
    }
  };

  const profileSectionVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: [0.6, -0.05, 0.01, 0.99]
      }
    }
  };

  const profileFadeIn = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 1.2,
        ease: "easeInOut"
      }
    }
  };

  const profileCardVariants = {
    hidden: { scale: 0.95, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        duration: 0.6,
        ease: "backOut"
      }
    }
  };

  const profileIconVariants = {
    hidden: { rotate: -30, opacity: 0 },
    visible: {
      rotate: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 150,
        damping: 10
      }
    }
  };

  return (
    <div className="profile-page">
      {/* Animated Background Slider */}
      <div className="profile-bg-slider">
        <AnimatePresence initial={false}>
          <motion.div
            key={currentSlide}
            className="profile-bg-slide"
            style={{ backgroundImage: `url(${profileBgImages[currentSlide]})` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: [0.4, 0.0, 0.2, 1] }}
          />
        </AnimatePresence>
        <div className="profile-bg-overlay"></div>
        <div className="profile-bg-gradient"></div>
      </div>

      {/* Main Content */}
      <motion.div 
        className="profile-content-container"
        initial="hidden"
        animate="visible"
        variants={profileContainerVariants}
      >
        {/* Hero Section */}
        <motion.section 
          className="profile-hero-section"
          variants={profileSectionVariants}
        >
          <motion.div 
            className="profile-hero-title-wrapper"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            <motion.span 
              className="profile-title-decoration"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.4, duration: 0.8, ease: "circOut" }}
            />
            <h1 className="profile-main-title">Privacy Policy</h1>
            <motion.span 
              className="profile-title-decoration"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.4, duration: 0.8, ease: "circOut" }}
            />
          </motion.div>
          
          <motion.p 
            className="profile-update-date"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
          >
            Last updated: <span className="profile-update-date-value">{lastUpdated}</span>
          </motion.p>
          
          <motion.p 
            className="profile-intro-text"
            variants={profileFadeIn}
          >
            Parksy ("we", "our", or "us") is committed to protecting your privacy. This policy outlines how we handle your personal data when you visit our website, book parking, or list your space.
          </motion.p>
        </motion.section>

        {/* Policy Sections */}
        <div className="profile-policy-sections">
          {/* What We Collect */}
          <motion.section 
            className="profile-policy-section profile-policy-section--data-collection"
            variants={profileSectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            <motion.div 
              className="profile-section-header"
              whileHover={{ x: 5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <motion.div 
                className="profile-section-icon-container"
                variants={profileIconVariants}
              >
                <FiDatabase className="profile-section-icon" />
              </motion.div>
              <h2 className="profile-section-title">What We Collect</h2>
            </motion.div>
            
            <motion.ul 
              className="profile-policy-list"
              variants={profileContainerVariants}
            >
              <motion.li className="profile-policy-item" variants={profileCardVariants}>
                <span className="profile-highlight-text">Personal Information:</span> Name, email, contact details
              </motion.li>
              <motion.li className="profile-policy-item" variants={profileCardVariants}>
                <span className="profile-highlight-text">Location Data:</span> When searching for parking options
              </motion.li>
              <motion.li className="profile-policy-item" variants={profileCardVariants}>
                <span className="profile-highlight-text">User Content:</span> Listings or bookings you create
              </motion.li>
              <motion.li className="profile-policy-item" variants={profileCardVariants}>
                <span className="profile-highlight-text">Technical Data:</span> Device/browser information (cookies, analytics)
              </motion.li>
            </motion.ul>
          </motion.section>

          {/* How We Use It */}
          <motion.section 
            className="profile-policy-section profile-policy-section--data-usage"
            variants={profileSectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            transition={{ delay: 0.1 }}
          >
            <motion.div 
              className="profile-section-header"
              whileHover={{ x: 5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <motion.div 
                className="profile-section-icon-container"
                variants={profileIconVariants}
              >
                <FiShield className="profile-section-icon" />
              </motion.div>
              <h2 className="profile-section-title">How We Use It</h2>
            </motion.div>
            
            <motion.ul 
              className="profile-policy-list"
              variants={profileContainerVariants}
            >
              <motion.li className="profile-policy-item" variants={profileCardVariants}>
                To operate and improve our services
              </motion.li>
              <motion.li className="profile-policy-item" variants={profileCardVariants}>
                To show relevant parking options based on your preferences
              </motion.li>
              <motion.li className="profile-policy-item" variants={profileCardVariants}>
                For customer service and support purposes
              </motion.li>
              <motion.li className="profile-policy-item" variants={profileCardVariants}>
                For safety, fraud prevention, and legal compliance
              </motion.li>
            </motion.ul>
          </motion.section>

          {/* Sharing */}
          <motion.section 
            className="profile-policy-section profile-policy-section--data-sharing"
            variants={profileSectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            transition={{ delay: 0.2 }}
          >
            <motion.div 
              className="profile-section-header"
              whileHover={{ x: 5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <motion.div 
                className="profile-section-icon-container"
                variants={profileIconVariants}
              >
                <FiShare2 className="profile-section-icon" />
              </motion.div>
              <h2 className="profile-section-title">Data Sharing</h2>
            </motion.div>
            
            <motion.div 
              className="profile-policy-content"
              variants={profileFadeIn}
            >
              <motion.p className="profile-policy-text" variants={profileCardVariants}>
                <strong>We do not sell your data.</strong> We may share information with:
              </motion.p>
              <motion.ul 
                className="profile-policy-list"
                variants={profileContainerVariants}
              >
                <motion.li className="profile-policy-item" variants={profileCardVariants}>
                  Payment processors to complete transactions
                </motion.li>
                <motion.li className="profile-policy-item" variants={profileCardVariants}>
                  Parking providers (only when making a booking)
                </motion.li>
                <motion.li className="profile-policy-item" variants={profileCardVariants}>
                  Law enforcement when legally required
                </motion.li>
              </motion.ul>
            </motion.div>
          </motion.section>

          {/* Cookies */}
          <motion.section 
            className="profile-policy-section profile-policy-section--cookies"
            variants={profileSectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            transition={{ delay: 0.3 }}
          >
            <motion.div 
              className="profile-section-header"
              whileHover={{ x: 5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <motion.div 
                className="profile-section-icon-container"
                variants={profileIconVariants}
              >
                <FiPieChart className="profile-section-icon" />
              </motion.div>
              <h2 className="profile-section-title">Cookies</h2>
            </motion.div>
            
            <motion.ul 
              className="profile-policy-list"
              variants={profileContainerVariants}
            >
              <motion.li className="profile-policy-item" variants={profileCardVariants}>
                We use cookies for essential site functionality and analytics
              </motion.li>
              <motion.li className="profile-policy-item" variants={profileCardVariants}>
                Cookies help personalize your experience and improve our services
              </motion.li>
              <motion.li className="profile-policy-item" variants={profileCardVariants}>
                You can control or disable cookies via your browser settings
              </motion.li>
            </motion.ul>
          </motion.section>

          {/* Your Rights */}
          <motion.section 
            className="profile-policy-section profile-policy-section--rights"
            variants={profileSectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            transition={{ delay: 0.4 }}
          >
            <motion.div 
              className="profile-section-header"
              whileHover={{ x: 5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <motion.div 
                className="profile-section-icon-container"
                variants={profileIconVariants}
              >
                <FiUserCheck className="profile-section-icon" />
              </motion.div>
              <h2 className="profile-section-title">Your Rights (UK GDPR)</h2>
            </motion.div>
            
            <motion.ul 
              className="profile-policy-list"
              variants={profileContainerVariants}
            >
              <motion.li className="profile-policy-item" variants={profileCardVariants}>
                Access or correct your personal data
              </motion.li>
              <motion.li className="profile-policy-item" variants={profileCardVariants}>
                Request deletion of your data
              </motion.li>
              <motion.li className="profile-policy-item" variants={profileCardVariants}>
                Object to processing of your data
              </motion.li>
              <motion.li className="profile-policy-item" variants={profileCardVariants}>
                Withdraw consent anytime
              </motion.li>
            </motion.ul>
          </motion.section>

          {/* Contact */}
          <motion.section 
            className="profile-policy-section profile-policy-section--contact"
            variants={profileSectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            transition={{ delay: 0.5 }}
          >
            <motion.div 
              className="profile-section-header"
              whileHover={{ x: 5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <motion.div 
                className="profile-section-icon-container"
                variants={profileIconVariants}
              >
                <FiMail className="profile-section-icon" />
              </motion.div>
              <h2 className="profile-section-title">Contact Us</h2>
            </motion.div>
            
            <motion.div 
              className="profile-contact-content"
              variants={profileFadeIn}
            >
              <motion.p className="profile-contact-text" variants={profileCardVariants}>
                For any privacy-related questions or to exercise your rights, please contact us at:
              </motion.p>
              <motion.a 
                href="mailto:hello@parksy.uk"
                className="profile-contact-email"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                hello@parksy.uk
              </motion.a>
            </motion.div>
          </motion.section>
        </div>
      </motion.div>
    </div>
  );
};

export default ProfilePage;