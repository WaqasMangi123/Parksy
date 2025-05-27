import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './terms.css';

// Premium placeholder images (replace with your own)
const bgImage1 = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80';
const bgImage2 = 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80';
const bgImage3 = 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80';

// Premium SVG icons
const LegalIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 17H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 13H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 9H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7 7H7.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7 11H7.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7 15H7.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const AgreementIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10 9H9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const LiabilityIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const Terms = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [effectiveDate] = useState(new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }));

  const backgroundImages = [bgImage1, bgImage2, bgImage3];

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isHovering) {
        setCurrentSlide((prev) => (prev + 1) % backgroundImages.length);
      }
    }, 6000);
    return () => clearInterval(interval);
  }, [backgroundImages.length, isHovering]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        when: "beforeChildren"
      }
    }
  };

  const itemVariants = {
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

  const fadeIn = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 1.2,
        ease: "easeInOut"
      }
    }
  };

  const slideIn = {
    hidden: { x: -100, opacity: 0 },
    visible: {
      x: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    }
  };

  const scaleUp = {
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

  return (
    <div className="terms-container">
      {/* Animated Background Slider */}
      <div 
        className="background-slider"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <AnimatePresence initial={false}>
          <motion.div
            key={currentSlide}
            className="slide"
            style={{ backgroundImage: `url(${backgroundImages[currentSlide]})` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: [0.4, 0.0, 0.2, 1] }}
          />
        </AnimatePresence>
        <div className="overlay"></div>
        <div className="gradient-overlay"></div>
      </div>

      {/* Main Content */}
      <motion.div 
        className="terms-content"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Header Block */}
        <motion.div 
          className="header-block"
          variants={itemVariants}
        >
          <motion.div 
            className="title-wrapper"
            initial="hidden"
            animate="visible"
            variants={slideIn}
          >
            <motion.span 
              className="title-decoration"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.3, duration: 0.8, ease: "circOut" }}
            />
            <h1>
              <motion.span 
                className="title-text"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
              >
                Terms & Conditions
              </motion.span>
            </h1>
            <motion.span 
              className="title-decoration"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.3, duration: 0.8, ease: "circOut" }}
            />
          </motion.div>
          
          <motion.p 
            className="effective-date"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
          >
            Effective from: <span>{effectiveDate}</span>
          </motion.p>
          
          <motion.p 
            className="intro-text"
            variants={fadeIn}
          >
            By using Parksy, you agree to the following terms and conditions that govern your use of our platform. 
            Please read them carefully before accessing or using our services.
          </motion.p>
        </motion.div>

        {/* Terms Blocks */}
        <div className="terms-blocks">
          {/* Block 1 */}
          <motion.div 
            className="terms-block"
            variants={itemVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            whileHover={{ y: -5 }}
          >
            <div className="block-header">
              <div className="icon-wrapper">
                <LegalIcon />
              </div>
              <h2>Use of Service</h2>
              <div className="block-decoration"></div>
            </div>
            <ul className="terms-list">
              <motion.li variants={scaleUp}>
                <span className="highlight">Parking Listings:</span> Parksy provides parking listings and redirection to third-party services.
              </motion.li>
              <motion.li variants={scaleUp}>
                <span className="highlight">Ownership:</span> We do not own or manage the listed parking spaces unless clearly stated.
              </motion.li>
              <motion.li variants={scaleUp}>
                <span className="highlight">Lawful Use:</span> You must use the platform lawfully and respectfully in compliance with all applicable laws.
              </motion.li>
              <motion.li variants={scaleUp}>
                <span className="highlight">Account Responsibility:</span> You are responsible for maintaining the confidentiality of your account credentials.
              </motion.li>
            </ul>
          </motion.div>

          {/* Block 2 */}
          <motion.div 
            className="terms-block"
            variants={itemVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            transition={{ delay: 0.1 }}
            whileHover={{ y: -5 }}
          >
            <div className="block-header">
              <div className="icon-wrapper">
                <AgreementIcon />
              </div>
              <h2>Bookings & Listings</h2>
              <div className="block-decoration"></div>
            </div>
            <ul className="terms-list">
              <motion.li variants={scaleUp}>
                <span className="highlight">Booking Terms:</span> Booking terms vary by space and provider.
              </motion.li>
              <motion.li variants={scaleUp}>
                <span className="highlight">Access Types:</span> Some listings are instant access; others may need approval from the space owner.
              </motion.li>
              <motion.li variants={scaleUp}>
                <span className="highlight">Listing Accuracy:</span> If you list a space, you must ensure it is legal, available, and accurately described.
              </motion.li>
              <motion.li variants={scaleUp}>
                <span className="highlight">Host Responsibilities:</span> You remain responsible for access, disputes, and availability of your listed spaces.
              </motion.li>
            </ul>
          </motion.div>

          {/* Block 3 */}
          <motion.div 
            className="terms-block"
            variants={itemVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            transition={{ delay: 0.2 }}
            whileHover={{ y: -5 }}
          >
            <div className="block-header">
              <div className="icon-wrapper">
                <LiabilityIcon />
              </div>
              <h2>Liability & Disputes</h2>
              <div className="block-decoration"></div>
            </div>
            <ul className="terms-list">
              <motion.li variants={scaleUp}>
                <span className="highlight">Limited Liability:</span> Parksy is not liable for damages to vehicles or property.
              </motion.li>
              <motion.li variants={scaleUp}>
                <span className="highlight">Third-Party Information:</span> We are not responsible for inaccurate listing info from third parties.
              </motion.li>
              <motion.li variants={scaleUp}>
                <span className="highlight">Service Availability:</span> We are not liable for issues caused by unavailable third-party APIs or services.
              </motion.li>
              <motion.li variants={scaleUp}>
                <span className="highlight">Refund Policy:</span> For private listings, refunds are issued at Parksy's discretion. For third-party bookings, their terms apply.
              </motion.li>
            </ul>
          </motion.div>
        </div>

        {/* Footer Note */}
        <motion.div 
          className="footer-note"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          <p>
            These terms may be updated periodically. Continued use of Parksy after changes constitutes acceptance of the new terms.
            For questions, please contact our support team.
          </p>
          <motion.div 
            className="scroll-indicator"
            animate={{ 
              y: [0, 10, 0],
              opacity: [0.6, 1, 0.6]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 14L12 21L5 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M19 8L12 15L5 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Terms;