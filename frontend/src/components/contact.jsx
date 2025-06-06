import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import './contact.css';

const ContactPage = () => {
  // First Section - Hero
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState({
    success: null,
    message: ''
  });
  
  const slides = [
    {
      image: "https://images.unsplash.com/photo-1723041948185-26648861cecd?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      alt: "Team collaborating in modern office"
    },
    {
      image: "https://images.unsplash.com/photo-1629741513470-0b6266d8aac4?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      alt: "Customer support team helping clients"
    },
    {
      image: "https://images.unsplash.com/photo-1518050084750-43b2240820d3?q=80&w=1469&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      alt: "Business team discussing project"
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [slides.length]);

  // Contact Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    queryType: '',
    message: ''
  });

  const queryTypes = [
    'General Inquiry',
    'Technical Support',
    'Partnership Opportunity',
    'Feedback/Suggestions',
    'Press Inquiry',
    'Other'
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus({ success: null, message: '' });

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setSubmitStatus({
        success: true,
        message: 'Thank you for your message! We will get back to you soon.'
      });
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        queryType: '',
        message: ''
      });
    } catch (error) {
      setSubmitStatus({
        success: false,
        message: 'Something went wrong. Please try again later.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Animation variants
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
    hidden: { y: 40, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.8,
        ease: [0.22, 1, 0.36, 1]
      }
    }
  };

  const slideVariants = {
    enter: { opacity: 0 },
    center: { opacity: 1 },
    exit: { opacity: 0 }
  };

  const chatBubbleVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: { 
      scale: 1, 
      opacity: 1,
      transition: {
        delay: 1.5,
        type: "spring",
        stiffness: 300,
        damping: 10
      }
    },
    hover: {
      y: -5,
      transition: { type: "spring", stiffness: 400, damping: 10 }
    }
  };

  return (
    <div className="contact-page">
      {/* First Section - Hero */}
      <section className="contact-hero" aria-label="Contact us hero section">
        {/* Background slider */}
        <div className="contact-hero__bg-container">
          {slides.map((slide, index) => (
            <motion.div
              key={index}
              className={`contact-hero__bg ${currentSlide === index ? 'active' : ''}`}
              style={{ backgroundImage: `url(${slide.image})` }}
              variants={slideVariants}
              initial="enter"
              animate={currentSlide === index ? "center" : "exit"}
              transition={{ duration: 1.8, ease: [0.76, 0, 0.24, 1] }}
              aria-hidden={currentSlide !== index}
            >
              <div className="contact-hero__overlay" />
            </motion.div>
          ))}
        </div>

        {/* Content */}
        <div className="contact-hero__content">
          <motion.div
            className="contact-hero__content-inner"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={itemVariants}>
              <div className="contact-hero__title-container">
                <motion.span 
                  className="contact-hero__title-line"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.4, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                />
                <motion.h1 
                  className="contact-hero__title"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                >
                  Get in Touch
                </motion.h1>
                <motion.span 
                  className="contact-hero__title-line contact-hero__title-line--right"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.6, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            </motion.div>

            <motion.div variants={itemVariants}>
              <motion.p 
                className="contact-hero__subtitle"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              >
                We're here to help and answer any questions you might have.
                <br />
                Our support team is available 24/7 to assist you.
              </motion.p>
            </motion.div>

            <motion.div 
              className="contact-hero__cta-container"
              variants={itemVariants}
            >
              <motion.a
                href="#contact-section"
                className="contact-hero__cta-button"
                whileHover={{ 
                  y: -3,
                  boxShadow: "0 10px 25px -5px rgba(99, 102, 241, 0.3)"
                }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                Contact Us
                <svg className="contact-hero__cta-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </motion.a>
            </motion.div>
          </motion.div>
        </div>

        {/* Slide indicators */}
        <div className="contact-hero__indicators">
          {slides.map((_, index) => (
            <button
              key={index}
              className={`contact-hero__indicator ${currentSlide === index ? 'active' : ''}`}
              onClick={() => setCurrentSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </section>

      {/* Second Section - Contact Info & Form */}
      <section id="contact-section" className="contact-section">
        <div className="contact-section__container">
          {/* Contact Information */}
          <motion.div 
            className="contact-info"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={containerVariants}
          >
            <motion.h2 className="contact-info__title" variants={itemVariants}>
              Contact Information
            </motion.h2>
            
            <motion.p className="contact-info__subtitle" variants={itemVariants}>
              Reach out to us through any of these channels
            </motion.p>
            
            <motion.div className="contact-info__items" variants={containerVariants}>
              <motion.div className="contact-info__item" variants={itemVariants}>
                <div className="contact-info__icon">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="contact-info__item-title">Email Us</h3>
                  <p className="contact-info__item-text">hello@parksy.uk</p>
                  <p className="contact-info__item-text">support@parksy.uk</p>
                </div>
              </motion.div>
              
              <motion.div className="contact-info__item" variants={itemVariants}>
                <div className="contact-info__icon">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="contact-info__item-title">Support Hours</h3>
                  <p className="contact-info__item-text">Monday - Friday: 9AM - 6PM GMT</p>
                  <p className="contact-info__item-text">Weekends: 10AM - 4PM GMT</p>
                </div>
              </motion.div>
              
              <motion.div className="contact-info__item" variants={itemVariants}>
                <div className="contact-info__icon">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="contact-info__item-title">Virtual Office</h3>
                  <p className="contact-info__item-text">123 Digital Street</p>
                  <p className="contact-info__item-text">London, UK</p>
                </div>
              </motion.div>
            </motion.div>
            
            <motion.div className="contact-info__social" variants={itemVariants}>
              <h3 className="contact-info__social-title">Connect With Us</h3>
              <div className="contact-info__social-links">
                <a href="#" aria-label="Twitter">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"/>
                  </svg>
                </a>
                <a href="#" aria-label="Instagram">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                  </svg>
                </a>
                <a href="#" aria-label="LinkedIn">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                  </svg>
                </a>
              </div>
            </motion.div>
          </motion.div>

          {/* Contact Form */}
          <motion.div 
            className="contact-form"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={containerVariants}
          >
            <motion.h2 className="contact-form__title" variants={itemVariants}>
              Send Us a Message
            </motion.h2>
            
            {submitStatus.success !== null && (
              <motion.div 
                className={`form-message ${submitStatus.success ? 'success' : 'error'}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                {submitStatus.message}
              </motion.div>
            )}
            
            <motion.form 
              onSubmit={handleSubmit}
              className="contact-form__form"
              variants={containerVariants}
            >
              <motion.div className="form-group" variants={itemVariants}>
                <label htmlFor="name" className="form-label">Full Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="form-input"
                  required
                  disabled={isSubmitting}
                />
              </motion.div>
              
              <motion.div className="form-group" variants={itemVariants}>
                <label htmlFor="email" className="form-label">Email Address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="form-input"
                  required
                  disabled={isSubmitting}
                />
              </motion.div>
              
              <motion.div className="form-group" variants={itemVariants}>
                <label htmlFor="queryType" className="form-label">Query Type</label>
                <select
                  id="queryType"
                  name="queryType"
                  value={formData.queryType}
                  onChange={handleChange}
                  className="form-select"
                  required
                  disabled={isSubmitting}
                >
                  <option value="">Select query type</option>
                  {queryTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </motion.div>
              
              <motion.div className="form-group" variants={itemVariants}>
                <label htmlFor="message" className="form-label">Your Message</label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  className="form-textarea"
                  rows="5"
                  required
                  disabled={isSubmitting}
                />
              </motion.div>
              
              <motion.button
                type="submit"
                className="form-submit"
                whileHover={{ y: -2, boxShadow: "0 4px 15px rgba(99, 102, 241, 0.3)" }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
                variants={itemVariants}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span>Sending...</span>
                ) : (
                  <>
                    Send Message
                    <svg className="form-submit-icon" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </>
                )}
              </motion.button>
            </motion.form>
          </motion.div>
        </div>
      </section>

      {/* Chat Bubble */}
     
    </div>
  );
};

export default ContactPage;