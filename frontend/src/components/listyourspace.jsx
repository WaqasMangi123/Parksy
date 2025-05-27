import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiArrowRight, FiCheckCircle, FiDollarSign, FiCalendar, FiImage, FiMapPin, FiUser } from 'react-icons/fi';
import './successstories.css'; // Importing the CSS file directly

// Premium images for slider
const spaceImages = [
  'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?q=80&w=1374&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://plus.unsplash.com/premium_photo-1674512540096-46b2ca19ef96?q=80&w=1633&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1580137331426-c28eb6be023b?q=80&w=1374&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
];

const ListSpacePage = () => {
  const [currentImage, setCurrentImage] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  // Auto-rotate background images
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isHovering) {
        setCurrentImage(prev => (prev + 1) % spaceImages.length);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isHovering]);

  // Animation variants
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

  const fadeUp = {
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

  const scaleIn = {
    hidden: { scale: 0.9, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 10
      }
    }
  };

  const benefitCardVariants = {
    offscreen: { y: 50, opacity: 0 },
    onscreen: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        bounce: 0.4,
        duration: 0.8
      }
    }
  };

  const stepVariants = {
    hidden: { opacity: 0, x: -50 },
    visible: (i) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: i * 0.2,
        duration: 0.6,
        ease: "backOut"
      }
    })
  };

  const wavePath = "M0,100 C150,200 350,0 500,100 C650,200 750,0 800,100 L800,00 L0,0 Z";

  return (
    <div className="list-space-page">
      {/* Section 1: Hero with Image Slider */}
      <section 
        className="list-space-hero"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentImage}
            className="list-space-hero-bg"
            style={{ backgroundImage: `url(${spaceImages[currentImage]})` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
          />
        </AnimatePresence>
        
        <div className="list-space-hero-overlay"></div>
        
        <motion.div 
          className="list-space-hero-content"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <motion.div 
            className="list-space-hero-text"
            variants={fadeUp}
          >
            <motion.h1 
              className="list-space-hero-title"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              Earn from your unused space.
              <span className="list-space-hero-highlight"> List with Parksy today.</span>
            </motion.h1>
            
            <motion.p 
              className="list-space-hero-subtitle"
              variants={fadeUp}
            >
              Join thousands of hosts earning passive income by sharing their unused parking spaces, 
              garages, and driveways with trusted drivers in your area.
            </motion.p>
            
            <motion.button
              className="list-space-hero-cta"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              variants={scaleIn}
            >
              Get Started <FiArrowRight className="cta-icon" />
            </motion.button>
          </motion.div>
        </motion.div>
      </section>

      {/* Section 2: Benefits with Swiper Animation */}
      <section className="list-space-benefits">
        <div className="list-space-benefits-wave">
          <svg viewBox="0 0 800 100" preserveAspectRatio="none">
            <path d={wavePath} fill="white"></path>
          </svg>
        </div>
        
        <div className="list-space-benefits-container">
          <motion.h2 
            className="list-space-benefits-title"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            Why List With Parksy
          </motion.h2>
          
          <div className="list-space-benefits-grid">
            {[
              {
                icon: <FiDollarSign />,
                title: "Flexible Pricing",
                text: "Set your own rates and adjust them anytime based on demand"
              },
              {
                icon: <FiCheckCircle />,
                title: "Free to Join",
                text: "No upfront costs or hidden fees. We only succeed when you do"
              },
              {
                icon: <FiCalendar />,
                title: "Full Control",
                text: "Manage availability, bookings, and access from your dashboard"
              },
              {
                icon: <FiDollarSign />,
                title: "Monthly Payouts",
                text: "Get paid reliably through secure transfers to your bank"
              }
            ].map((benefit, index) => (
              <motion.div
                key={index}
                className="list-space-benefit-card"
                initial="offscreen"
                whileInView="onscreen"
                viewport={{ once: true, margin: "-50px" }}
                variants={benefitCardVariants}
              >
                <div className="list-space-benefit-icon">{benefit.icon}</div>
                <h3 className="list-space-benefit-title">{benefit.title}</h3>
                <p className="list-space-benefit-text">{benefit.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3: Steps with Wavy Timeline */}
      <section className="list-space-steps">
        <div className="list-space-steps-container">
          <motion.h2 
            className="list-space-steps-title"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            Get Listed in 4 Simple Steps
          </motion.h2>
          
          <div className="list-space-steps-timeline">
            <div className="list-space-steps-line"></div>
            
            {[
              {
                icon: <FiUser />,
                title: "Create Account",
                text: "Sign up in minutes with your email or social account"
              },
              {
                icon: <FiMapPin />,
                title: "Add Location",
                text: "Enter your address and space details (size, type, features)"
              },
              {
                icon: <FiImage />,
                title: "Upload Photos",
                text: "Add clear photos showing your space from multiple angles"
              },
              {
                icon: <FiDollarSign />,
                title: "Set Pricing",
                text: "Choose your rates and availability schedule"
              }
            ].map((step, index) => (
              <motion.div
                key={index}
                className="list-space-step"
                custom={index}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={stepVariants}
              >
                <div className="list-space-step-number">{index + 1}</div>
                <div className="list-space-step-icon">{step.icon}</div>
                <div className="list-space-step-content">
                  <h3 className="list-space-step-title">{step.title}</h3>
                  <p className="list-space-step-text">{step.text}</p>
                </div>
              </motion.div>
            ))}
          </div>
          
          <motion.button
            className="list-space-steps-cta"
            whileHover={{ 
              scale: 1.05,
              boxShadow: "0 10px 25px rgba(0,0,0,0.1)"
            }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.8 }}
          >
            Start Listing Now <FiArrowRight className="cta-icon" />
          </motion.button>
        </div>
      </section>
    </div>
  );
};

export default ListSpacePage;