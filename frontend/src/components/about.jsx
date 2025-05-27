import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import './about.css';

const AboutPage = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    "https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?q=80&w=1374&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    "https://images.unsplash.com/photo-1562426509-5044a121aa49?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    "https://plus.unsplash.com/premium_photo-1674512540096-46b2ca19ef96?q=80&w=1633&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [slides.length]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.8,
        ease: [0.16, 1, 0.3, 1]
      }
    }
  };

  const slideVariants = {
    enter: { opacity: 0 },
    center: { opacity: 1 },
    exit: { opacity: 0 }
  };

  return (
    <>
      {/* Hero Section */}
      <section className="about-hero">
        <div className="about-hero-bg-container">
          {slides.map((slide, index) => (
            <motion.div
              key={index}
              className={`about-hero-bg ${currentSlide === index ? 'active' : ''}`}
              style={{ backgroundImage: `url(${slide})` }}
              variants={slideVariants}
              initial="enter"
              animate={currentSlide === index ? "center" : "exit"}
              transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="about-hero-overlay" />
            </motion.div>
          ))}
        </div>

        <div className="about-hero-content">
          <motion.div
            className="about-hero-content-inner"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={itemVariants}>
              <div className="about-hero-title-container">
                <motion.span 
                  className="about-hero-title-line"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.4, duration: 0.8 }}
                />
                <motion.h1 
                  className="about-hero-title"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  About Parksy
                </motion.h1>
                <motion.span 
                  className="about-hero-title-line right"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.6, duration: 0.8 }}
                />
              </div>
            </motion.div>

            <motion.div variants={itemVariants}>
              <motion.p 
                className="about-hero-subtitle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                Revolutionizing parking solutions across the UK with smart technology and innovative approaches
              </motion.p>
            </motion.div>

            <motion.div 
              className="about-hero-scroll-container"
              variants={itemVariants}
            >
              <motion.div
                className="about-hero-scroll"
                animate={{
                  y: [0, -5, 0],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 2,
                  ease: "easeInOut"
                }}
              >
                <svg className="about-hero-scroll-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                <span className="about-hero-scroll-text">Discover More</span>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>

        <div className="slide-indicators">
          {slides.map((_, index) => (
            <button
              key={index}
              className={`slide-indicator ${currentSlide === index ? 'active' : ''}`}
              onClick={() => setCurrentSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </section>

      {/* Parksy Background Section */}
<section className="company-story-section">
  <div className="section-container">
    <motion.div 
      className="section-header"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ 
        duration: 0.8,
        ease: [0.16, 1, 0.3, 1]
      }}
    >
      <motion.h2
        initial={{ letterSpacing: 5, opacity: 0 }}
        whileInView={{ letterSpacing: 1, opacity: 1 }}
        transition={{ duration: 1, delay: 0.2 }}
        className="section-title"
      >
        Our Story
      </motion.h2>
      <motion.p
        initial={{ y: 20, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="section-subtitle"
      >
        How Parksy began and what drives us forward
      </motion.p>
    </motion.div>

    <motion.div 
      className="story-content"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ 
        duration: 1.2, 
        delay: 0.6,
        staggerChildren: 0.2
      }}
    >
      <div className="story-text">
        <motion.p
          initial={{ y: 30, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          We started Parksy to simplify UK parking. With rising demand and limited spaces, our AI-powered platform helps drivers find smarter solutions — from council bays to mosque driveways.
        </motion.p>
        <motion.p
          initial={{ y: 30, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          Born out of frustration with the traditional parking experience, Parksy was founded in 2022 with a vision to transform urban mobility. Our team of parking experts and technologists came together to create a solution that benefits both drivers and space owners.
        </motion.p>
      </div>
      
      <motion.div 
        className="story-stats"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ 
          duration: 1,
          staggerChildren: 0.2
        }}
      >
        {[
          { number: "250K+", label: "Parking Spaces" },
          { number: "95%", label: "User Satisfaction" },
          { number: "24/7", label: "Support" }
        ].map((stat, index) => (
          <motion.div 
            key={index}
            className="stat-item"
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            transition={{ 
              type: "spring",
              stiffness: 100,
              damping: 10,
              delay: 0.1 * index
            }}
            whileHover={{ 
              y: -5,
              transition: { duration: 0.3 }
            }}
          >
            <span className="stat-number">{stat.number}</span>
            <span className="stat-label">{stat.label}</span>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  </div>
</section>

     {/* Mission Section */}
<section className="mission-section">
  <div className="mission-background-pattern"></div>
  <div className="section-container">
    <motion.div 
      className="mission-content"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 1.2 }}
    >
      <motion.div 
        className="mission-statement"
        initial={{ y: 50, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        <motion.h2
          initial={{ letterSpacing: 10, opacity: 0 }}
          whileInView={{ letterSpacing: 1, opacity: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
        >
          Our Mission
        </motion.h2>
        <motion.blockquote
          initial={{ scale: 0.95, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          "To make parking seamless, efficient, and accessible for everyone — whether you're finding a space or renting one out."
        </motion.blockquote>
      </motion.div>

      <motion.div 
        className="mission-features"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ staggerChildren: 0.15 }}
      >
        {[
          {
            icon: "🚗",
            title: "Smart Matching",
            description: "AI-powered algorithms find you the perfect spot based on your needs"
          },
          {
            icon: "⏱️",
            title: "Time Savings",
            description: "Reduce parking search time by up to 70%"
          },
          {
            icon: "💰",
            title: "Cost Effective",
            description: "Access better rates than traditional parking options"
          },
          {
            icon: "🌍",
            title: "Community Focus",
            description: "Helping communities monetize unused spaces"
          },
          {
            icon: "🔒",
            title: "Secure Transactions",
            description: "End-to-end encrypted payments for peace of mind"
          },
          {
            icon: "📱",
            title: "Mobile Convenience",
            description: "Book and manage parking from anywhere with our app"
          }
        ].map((feature, index) => (
          <motion.div 
            key={index}
            className="feature-card"
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            whileHover={{ 
              y: -10,
              boxShadow: "0 20px 40px rgba(2, 136, 209, 0.15)"
            }}
            transition={{ 
              type: "spring",
              stiffness: 100,
              damping: 10,
              delay: index * 0.1
            }}
          >
            <motion.div 
              className="feature-icon"
              whileHover={{ scale: 1.2 }}
            >
              {feature.icon}
            </motion.div>
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
            <div className="feature-hover-indicator"></div>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  </div>
</section>

{/* Core Values Section */}
<section className="core-values-section">
  <div className="section-container">
    <motion.div 
      className="section-header"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
    >
      <motion.h2
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        Our Principles
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.4 }}
      >
        The values that guide our parking revolution
      </motion.p>
    </motion.div>

    <motion.div 
      className="values-grid"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ staggerChildren: 0.1 }}
    >
      {[
        {
          icon: "🤝",
          title: "Trust",
          description: "Verified spaces and transparent pricing build confidence in every transaction."
        },
        {
          icon: "💡",
          title: "Innovation",
          description: "Continually evolving our technology to solve real parking challenges."
        },
        {
          icon: "🌆",
          title: "Urban Impact",
          description: "Reducing congestion and emissions by optimizing parking efficiency."
        },
        {
          icon: "👥",
          title: "Community",
          description: "Creating value for both drivers and space owners across the UK."
        },
        {
          icon: "🔍",
          title: "Transparency",
          description: "Clear pricing and honest information for all parking options."
        },
        {
          icon: "♿",
          title: "Accessibility",
          description: "Ensuring parking solutions work for everyone, including disabled drivers."
        }
      ].map((value, index) => (
        <motion.div 
          key={index}
          className="value-card"
          initial={{ y: 60, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          whileHover={{ 
            y: -10,
            boxShadow: "0 20px 40px rgba(2, 136, 209, 0.2)"
          }}
          transition={{ 
            type: "spring",
            stiffness: 100,
            damping: 10,
            delay: index * 0.1
          }}
        >
          <motion.div 
            className="value-icon"
            whileHover={{ rotateY: 180 }}
          >
            {value.icon}
          </motion.div>
          <h3>{value.title}</h3>
          <p>{value.description}</p>
          <div className="value-card-glow"></div>
        </motion.div>
      ))}
    </motion.div>
  </div>
</section>

      {/* Technology Section */}
      <section className="technology-section">
        <div className="section-container">
          <motion.div 
            className="tech-content"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.3 }}
          >
            <div className="tech-text">
              <h2>Smart Parking Technology</h2>
              <p>
                Parksy leverages advanced algorithms and real-time data to transform urban parking. Our system analyzes thousands of data points to predict availability and optimize space utilization.
              </p>
              <ul className="tech-features">
                <li>AI-powered availability predictions</li>
                <li>Dynamic pricing models</li>
                <li>Seamless mobile integration</li>
                <li>Real-time space monitoring</li>
              </ul>
            </div>
            <div className="tech-visual">
              <div className="tech-circle">
                <div className="circle-item">AI Matching</div>
                <div className="circle-item">Real-Time Data</div>
                <div className="circle-item">Smart Routing</div>
                <div className="circle-item main">Parksy Tech</div>
                <div className="circle-item">Secure Payments</div>
                <div className="circle-item">User Analytics</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="about-cta">
        <div className="section-container">
          <motion.div 
            className="cta-content"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2>Ready to experience smarter parking?</h2>
            <p>Join thousands of drivers and space owners revolutionizing urban parking</p>
            <div className="cta-buttons">
              <button className="cta-button primary">Find Parking Now</button>
              <button className="cta-button secondary">List Your Space</button>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
};

export default AboutPage;