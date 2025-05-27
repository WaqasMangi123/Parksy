import React, { useState, useEffect } from 'react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import { 
  FaCar, 
  FaParking, 
  FaMapMarkerAlt, 
  FaClock, 
  FaMoneyBillWave, 
  FaShieldAlt, 
  FaMobileAlt, 
  FaRobot, 
  FaEnvelope, 
  FaPhone, 
  FaMapPin, 
  FaChevronRight,
  FaChevronLeft,
  FaArrowRight,
  FaBolt,
  FaLocationArrow,
  FaPlane,
  FaTrain,
  FaHospital,
  FaCity,
  FaHotel,
  FaCalendarAlt,
  FaCarSide,
  FaFilter
} from 'react-icons/fa';
import '@fontsource/montserrat/400.css';
import '@fontsource/montserrat/700.css';
import '@fontsource/montserrat/900.css';
import './mainpage.css';

// Testimonial data
const testimonials = [
  {
    id: 1,
    text: "Parksy saved me £200/month on parking near my office. The AI recommendations found me cheaper alternatives I never knew existed!",
    name: "James Wilson",
    role: "Daily Commuter",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&auto=format&fit=crop&w=634&q=80"
  },
  {
    id: 2,
    text: "As a private parking owner, Parksy helped me earn £1,200 last month by renting out my unused driveway spaces.",
    name: "Sarah Chen",
    role: "Property Owner",
    avatar: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?ixlib=rb-1.2.1&auto=format&fit=crop&w=634&q=80"
  },
  {
    id: 3,
    text: "The real-time availability feature means I never waste time driving around looking for parking anymore.",
    name: "Mohammed Khan",
    role: "Delivery Driver",
    avatar: "https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?ixlib=rb-1.2.1&auto=format&fit=crop&w=634&q=80"
  }
];

const ParksyHero = () => {
  const [currentBg, setCurrentBg] = useState(0);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([
    { sender: 'ai', text: 'Hello! I\'m Parksy AI. Ask me anything about parking in your area.' }
  ]);
  const controls = useAnimation();
  
  // Background images - parking related
  const backgrounds = [
    'url("https://images.unsplash.com/photo-1590674899484-d5640e854abe?q=80&w=1467&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D")',
    'url("https://images.unsplash.com/photo-1635704764831-082c47202c6c?q=80&w=1473&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D")',
    'url("https://images.unsplash.com/photo-1506521781263-d8422e82f27a?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D")'
  ];

  // Rotate backgrounds every 5 seconds
  useEffect(() => {
    const bgInterval = setInterval(() => {
      setCurrentBg((prev) => (prev + 1) % backgrounds.length);
    }, 5000);
    
    const testimonialInterval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 7000);
    
    return () => {
      clearInterval(bgInterval);
      clearInterval(testimonialInterval);
    };
  }, []);

  // Animation for features section
  useEffect(() => {
    controls.start("visible");
  }, [controls]);

  const nextTestimonial = () => {
    setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    
    // Add user message
    const newHistory = [...chatHistory, { sender: 'user', text: chatMessage }];
    setChatHistory(newHistory);
    setChatMessage('');
    
    // Simulate AI response after delay
    setTimeout(() => {
      const aiResponses = [
        "Based on your location, I found 3 available parking spots within 5 minutes walk.",
        "Parking restrictions in that area are Mon-Fri 8am-6pm, max stay 2 hours.",
        "The nearest secure car park is NCP Manchester at £12/day with 24/7 access.",
        "Yes, you can park there after 6:30pm without restrictions.",
        "I'm checking real-time availability now... There are 2 spaces currently free at the shopping center car park."
      ];
      const randomResponse = aiResponses[Math.floor(Math.random() * aiResponses.length)];
      setChatHistory([...newHistory, { sender: 'ai', text: randomResponse }]);
    }, 1000);
  };

  return (
    <>
      {/* Hero Section */}
      <section className="parksy-hero">
        {/* Animated background images */}
        <div className="hero-backgrounds">
          {backgrounds.map((bg, index) => (
            <motion.div
              key={index}
              className="hero-bg-image"
              style={{ backgroundImage: bg }}
              initial={{ opacity: 0 }}
              animate={{
                opacity: currentBg === index ? 1 : 0,
                scale: currentBg === index ? 1 : 1.05,
              }}
              transition={{ duration: 1.5, ease: [0.6, -0.05, 0.01, 0.99] }}
            />
          ))}
        </div>

        {/* Overlay */}
        <div className="hero-overlay" />

        {/* Content */}
        <motion.div
          className="hero-content"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="hero-title"
          >
            Smarter Parking Across the UK
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            className="hero-subtitle"
          >
            Parksy helps drivers find, compare, and access parking across the UK — from council-run car parks to private driveways.
          </motion.p>

          <motion.div
            className="hero-cta"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.8 }}
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="cta-button primary"
              onClick={() => document.getElementById('search-section').scrollIntoView({ behavior: 'smooth' })}
            >
              <FaMapMarkerAlt /> Find Parking Now
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="cta-button secondary"
              onClick={() => setChatOpen(true)}
            >
              <FaRobot /> Ask Parksy AI <FaChevronRight />
            </motion.button>
          </motion.div>
        </motion.div>

        {/* Scrolling indicator */}
        <motion.div
          className="scroll-indicator"
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          onClick={() => document.getElementById('how-it-works').scrollIntoView({ behavior: 'smooth' })}
        >
          <div className="chevron" />
          <div className="chevron" />
          <div className="chevron" />
        </motion.div>
      </section>

      {/* Search Section */}
      {/* Professional Search Section */}
<section id="search-section" className="search-section">
  <div className="search-section-background"></div>
  <div className="container">
    <motion.div 
      className="search-container"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.8 }}
    >
      <motion.div
        className="section-header"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2, duration: 0.6 }}
      >
        <h2 className="section-title">
          Find <span className="text-gradient">Perfect Parking</span> in Seconds
        </h2>
        <p className="section-subtitle">
          Discover and reserve premium parking spots near your destination with our AI-powered real-time availability system.
          <br />
          Get instant access to the best rates, guaranteed spots, and stress-free parking.
         
        
        </p>
      </motion.div>
      
      <motion.div 
        className="search-box"
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.4, duration: 0.6 }}
      >
        {/* Rest of your search box code remains the same */}
        <div className="search-input-container">
          <div className="search-input-wrapper">
            <div className="search-input">
              <div className="input-icon">
                <FaMapMarkerAlt className="search-icon" />
              </div>
              <input 
                type="text" 
                placeholder="Enter location, postcode or landmark..." 
                className="search-field"
              />
              <button className="search-button">
                <span className="button-text">Find Parking</span>
                <FaArrowRight className="button-icon" />
              </button>
            </div>
          </div>
        </div>
        
        <div className="search-features">
          <div className="feature-tags">
            <div className="tags-header">
              <FaBolt className="tag-icon" />
              <span className="tags-title">Popular searches:</span>
            </div>
            <div className="tags-container">
              <motion.span 
                className="tag"
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <FaLocationArrow className="tag-icon" /> Near me
              </motion.span>
              <motion.span 
                className="tag"
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <FaPlane className="tag-icon" /> Airports
              </motion.span>
              <motion.span 
                className="tag"
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <FaTrain className="tag-icon" /> Train stations
              </motion.span>
              <motion.span 
                className="tag"
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <FaHospital className="tag-icon" /> Hospitals
              </motion.span>
              <motion.span 
                className="tag"
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <FaCity className="tag-icon" /> City centers
              </motion.span>
              <motion.span 
                className="tag"
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <FaHotel className="tag-icon" /> Hotels
              </motion.span>
            </div>
          </div>
          
          <div className="search-options">
            <motion.div 
              className="option"
              whileHover={{ y: -2 }}
              transition={{ duration: 0.2 }}
            >
              <FaCalendarAlt className="option-icon" />
              <span>Date & Time</span>
            </motion.div>
            <motion.div 
              className="option"
              whileHover={{ y: -2 }}
              transition={{ duration: 0.2 }}
            >
              <FaCarSide className="option-icon" />
              <span>Vehicle Type</span>
            </motion.div>
            <motion.div 
              className="option"
              whileHover={{ y: -2 }}
              transition={{ duration: 0.2 }}
            >
              <FaFilter className="option-icon" />
              <span>More Filters</span>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  </div>
</section>

      {/* Features Section */}
      <section className="parksy-features">
        <motion.div 
          className="features-container"
          initial="hidden"
          animate={controls}
          variants={{
            visible: {
              transition: {
                staggerChildren: 0.2
              }
            }
          }}
        >
          {/* Feature 1 */}
          <motion.div
            className="feature-card"
            variants={{
              hidden: { opacity: 0, y: 50 },
              visible: { 
                opacity: 1, 
                y: 0,
                transition: { duration: 0.6, ease: "easeOut" }
              }
            }}
            whileHover={{ y: -10 }}
          >
            <div className="feature-icon">
              <FaParking />
            </div>
            <h3>Comprehensive Database</h3>
            <p>Access thousands of parking spots across the UK - from council car parks to private driveways.</p>
          </motion.div>

          {/* Feature 2 */}
          <motion.div
            className="feature-card"
            variants={{
              hidden: { opacity: 0, y: 50 },
              visible: { 
                opacity: 1, 
                y: 0,
                transition: { duration: 0.6, ease: "easeOut", delay: 0.1 }
              }
            }}
            whileHover={{ y: -10 }}
          >
            <div className="feature-icon">
              <FaMoneyBillWave />
            </div>
            <h3>Transparent Pricing</h3>
            <p>No hidden fees. See all costs upfront including any additional charges.</p>
          </motion.div>

          {/* Feature 3 */}
          <motion.div
            className="feature-card"
            variants={{
              hidden: { opacity: 0, y: 50 },
              visible: { 
                opacity: 1, 
                y: 0,
                transition: { duration: 0.6, ease: "easeOut", delay: 0.2 }
              }
            }}
            whileHover={{ y: -10 }}
          >
            <div className="feature-icon">
              <FaShieldAlt />
            </div>
            <h3>Secure Listings</h3>
            <p>All parking spots are verified for safety and accessibility.</p>
          </motion.div>

          {/* Feature 4 */}
          <motion.div
            className="feature-card"
            variants={{
              hidden: { opacity: 0, y: 50 },
              visible: { 
                opacity: 1, 
                y: 0,
                transition: { duration: 0.6, ease: "easeOut", delay: 0.3 }
              }
            }}
            whileHover={{ y: -10 }}
          >
            <div className="feature-icon">
              <FaMobileAlt />
            </div>
            <h3>Mobile Optimized</h3>
            <p>Find and book parking on the go with our mobile-friendly platform.</p>
          </motion.div>
        </motion.div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="how-it-works-section">
        <div className="works-container">
          <motion.h2
            className="works-title"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            How Parksy Works
          </motion.h2>
          
          <motion.p
            className="works-subtitle"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Three simple steps to find your perfect parking spot
          </motion.p>
          
          <div className="steps-container">
            <motion.div
              className="step"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              whileHover={{ y: -10 }}
            >
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>Search Any Location</h3>
                <p>Enter your destination or let us detect your current location to find nearby parking options.</p>
              </div>
              <div className="step-connector"></div>
            </motion.div>
            
            <motion.div
              className="step"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              whileHover={{ y: -10 }}
            >
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>View Pricing & Space Types</h3>
                <p>Compare all available options with transparent pricing, restrictions, and amenities.</p>
              </div>
              <div className="step-connector"></div>
            </motion.div>
            
            <motion.div
              className="step"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              whileHover={{ y: -10 }}
            >
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>Park Instantly or Pre-Book</h3>
                <p>Secure your spot with instant access or reserve in advance for peace of mind.</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* AI Chat Section */}
      <section className="ai-chat-section">
        <motion.div 
          className="ai-container"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
        >
          <motion.div
            className="ai-content"
            initial={{ x: -50, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="ai-title">
              Ask Parksy: <span>"Can I park here?"</span>
            </h2>
            <p className="ai-subtitle">
              Our AI knows parking restrictions across the UK and can answer your questions in real-time.
            </p>
            
            <motion.ul 
              className="ai-features"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={{
                visible: {
                  transition: {
                    staggerChildren: 0.1
                  }
                }
              }}
            >
              <motion.li
                variants={{
                  hidden: { opacity: 0, x: -20 },
                  visible: { opacity: 1, x: 0 }
                }}
              >
                <FaClock /> Know the parking restrictions before you arrive
              </motion.li>
              <motion.li
                variants={{
                  hidden: { opacity: 0, x: -20 },
                  visible: { opacity: 1, x: 0, transition: { delay: 0.1 } }
                }}
              >
                <FaMapMarkerAlt /> Get personalized recommendations based on your needs
              </motion.li>
              <motion.li
                variants={{
                  hidden: { opacity: 0, x: -20 },
                  visible: { opacity: 1, x: 0, transition: { delay: 0.2 } }
                }}
              >
                <FaShieldAlt /> Avoid parking tickets with accurate, up-to-date information
              </motion.li>
            </motion.ul>
            
            <motion.button
              className="ai-button"
              whileHover={{ 
                scale: 1.05,
                boxShadow: "0 10px 25px rgba(79, 195, 247, 0.4)"
              }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setChatOpen(true)}
            >
              Try Parksy AI Now <FaChevronRight />
            </motion.button>
          </motion.div>
          
          <motion.div
            className="ai-image-container"
            initial={{ x: 50, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="ai-image-wrapper">
              <img 
                src="https://images.unsplash.com/photo-1619335680796-54f13b88c6ba?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" 
                alt="AI assistant" 
                className="ai-image"
              />
              <div className="ai-pulse" />
              <div className="ai-pulse delay-1" />
              <div className="ai-pulse delay-2" />
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* About Section */}
      <section className="about-section">
        <motion.div 
          className="about-container"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
        >
          <motion.div
            className="about-image-container"
            initial={{ x: -50, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="about-image-wrapper">
              <img 
                src="https://images.unsplash.com/photo-1572701203787-6e3f196126cc?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" 
                alt="Parking lot" 
                className="about-image" 
              />
              <div className="image-overlay" />
              <div className="floating-element floating-1">
                <FaParking />
              </div>
              <div className="floating-element floating-2">
                <FaCar />
              </div>
              <div className="floating-element floating-3">
                <FaMapMarkerAlt />
              </div>
            </div>
          </motion.div>

          <motion.div 
            className="about-content"
            initial={{ x: 50, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <h2 className="about-title">About Parksy</h2>
            <p className="about-text">
              We started Parksy to simplify UK parking. With rising demand and limited spaces, our AI-powered platform helps drivers find smarter solutions — from council bays to private driveways.
            </p>
            <p className="about-text">
              Our mission is to make parking seamless, efficient, and accessible for everyone. Whether you're a daily commuter, occasional visitor, or property owner with space to rent, Parksy creates value by connecting supply with demand through intelligent technology.
            </p>
            <p className="about-text">
              The platform combines real-time data with machine learning to predict availability, optimize pricing, and ensure you always find the best parking option for your needs.
            </p>
            
            <div className="about-stats">
              <div className="stat-item">
                <motion.div 
                  className="stat-number"
                  initial={{ number: 0 }}
                  whileInView={{ number: 25000 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.5 }}
                >
                  {({ number }) => <span>{Math.floor(number).toLocaleString()}+</span>}
                </motion.div>
                <div className="stat-label">Parking Spaces</div>
              </div>
              
              <div className="stat-item">
                <motion.div 
                  className="stat-number"
                  initial={{ number: 0 }}
                  whileInView={{ number: 120 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.5 }}
                >
                  {({ number }) => <span>{Math.floor(number)}</span>}
                </motion.div>
                <div className="stat-label">UK Cities Covered</div>
              </div>
              
              <div className="stat-item">
                <motion.div 
                  className="stat-number"
                  initial={{ number: 0 }}
                  whileInView={{ number: 98 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.5 }}
                >
                  {({ number }) => <span>{Math.floor(number)}%</span>}
                </motion.div>
                <div className="stat-label">Accuracy Rate</div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials-section">
        <motion.div 
          className="testimonials-container"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
        >
          <motion.div
            className="section-header"
            initial={{ y: 30, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="section-title">What Our Users Say</h2>
            <p className="section-subtitle">Hear from drivers and property owners using Parksy</p>
          </motion.div>

          <div className="testimonials-slider">
            <AnimatePresence mode="wait">
              <motion.div
                key={testimonials[currentTestimonial].id}
                className="testimonial-card"
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.6 }}
                whileHover={{ y: -5 }}
              >
                <div className="testimonial-content">
                  <div className="quote-icon">"</div>
                  <p className="testimonial-text">{testimonials[currentTestimonial].text}</p>
                  <div className="testimonial-author">
                    <img 
                      src={testimonials[currentTestimonial].avatar} 
                      alt={testimonials[currentTestimonial].name} 
                      className="author-avatar"
                    />
                    <div className="author-info">
                      <h4>{testimonials[currentTestimonial].name}</h4>
                      <p>{testimonials[currentTestimonial].role}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="slider-controls">
            <motion.button 
              className="slider-arrow prev"
              onClick={prevTestimonial}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <FaChevronLeft />
            </motion.button>
            <div className="slider-dots">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  className={`dot ${currentTestimonial === i ? 'active' : ''}`}
                  onClick={() => setCurrentTestimonial(i)}
                />
              ))}
            </div>
            <motion.button 
              className="slider-arrow next"
              onClick={nextTestimonial}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <FaChevronRight />
            </motion.button>
          </div>
        </motion.div>
      </section>

      {/* Contact Section */}
      <section className="contact-section">
        <div className="contact-container">
          <motion.div
            className="contact-content"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="contact-title">Get In Touch</h2>
            <p className="contact-text">
              Have questions about parking or want to list your space? Our team is here to help.
            </p>
            
            <div className="contact-info">
              <div className="contact-method">
                <div className="contact-icon">
                  <FaEnvelope />
                </div>
                <div className="contact-details">
                  <h4>Email Us</h4>
                  <a href="mailto:hello@parksy.uk">hello@parksy.uk</a>
                </div>
              </div>
              
              <div className="contact-method">
                <div className="contact-icon">
                  <FaPhone />
                </div>
                <div className="contact-details">
                  <h4>Call Us</h4>
                  <a href="tel:+4402031234567">+44 (0)20 3123 4567</a>
                  <p>Mon-Fri, 9am-5pm</p>
                </div>
              </div>
              
              <div className="contact-method">
                <div className="contact-icon">
                  <FaMapPin />
                </div>
                <div className="contact-details">
                  <h4>Our Office</h4>
                  <p>123 Parking Lane</p>
                  <p>London, UK E1 6AN</p>
                </div>
              </div>
            </div>
          </motion.div>
          
          <motion.div
            className="contact-form-container"
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <form className="contact-form">
              <div className="form-group">
                <label htmlFor="name">Name</label>
                <input type="text" id="name" placeholder="Your name" />
              </div>
              
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input type="email" id="email" placeholder="Your email" />
              </div>
              
              <div className="form-group">
                <label htmlFor="query">Query Type</label>
                <select id="query">
                  <option value="">Select an option</option>
                  <option value="general">General Inquiry</option>
                  <option value="driver">Driver Support</option>
                  <option value="property">List My Space</option>
                  <option value="business">Business Partnership</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="message">Message</label>
                <textarea id="message" rows="5" placeholder="Your message"></textarea>
              </div>
              
              <motion.button
                className="submit-button"
                whileHover={{ 
                  scale: 1.03,
                  boxShadow: "0 8px 20px rgba(79, 195, 247, 0.4)"
                }}
                whileTap={{ scale: 0.98 }}
              >
                Send Message <FaChevronRight />
              </motion.button>
            </form>
          </motion.div>
        </div>
      </section>

      {/* AI Chat Bot */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div 
            className="ai-chatbot"
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', damping: 25 }}
          >
            <div className="chat-header">
              <div className="chat-title">
                <FaRobot /> Parksy AI Assistant
              </div>
              <button 
                className="close-chat"
                onClick={() => setChatOpen(false)}
              >
                &times;
              </button>
            </div>
            
            <div className="chat-messages">
              {chatHistory.map((msg, index) => (
                <div 
                  key={index} 
                  className={`message ${msg.sender}`}
                >
                  {msg.text}
                </div>
              ))}
            </div>
            
            <form className="chat-input" onSubmit={handleSendMessage}>
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Ask about parking restrictions, availability..."
              />
              <button type="submit">
                <FaChevronRight />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ParksyHero;