import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './guidance.css';

const FAQPage = () => {
  const [activeIndex, setActiveIndex] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [responses, setResponses] = useState({});
  const [showResults, setShowResults] = useState(false);

  // Hero section slides
  const slides = [
    {
      image: 'https://images.unsplash.com/photo-1666639890213-a3d57e46ec92?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      alt: 'Parking garage with available spaces',
      title: 'Find Parking Made Simple',
      subtitle: 'Discover and book parking spaces in seconds with our intuitive platform'
    },
    {
      image: 'https://images.unsplash.com/photo-1651346863911-d2d8050eea02?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      alt: 'Person using parking app on phone',
      title: 'Seamless Parking Experience',
      subtitle: 'From search to payment - all in one place with just a few taps'
    },
    {
      image: 'https://images.unsplash.com/photo-1591438885619-7e3a14aa6d7d?q=80&w=1374&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      alt: 'Empty driveway available for parking',
      title: 'Monetize Your Space',
      subtitle: 'Earn money by listing your unused parking space or driveway'
    }
  ];

  // Parking guidance questions
  const parkingQuestions = [
    {
      id: 1,
      question: "What's your primary parking need?",
      options: ["Daily commuter parking", "Event parking", "Long-term parking", "Business parking"],
      icon: "🚗"
    },
    {
      id: 2,
      question: "How do you typically search for parking?",
      options: ["Last minute on my phone", "Pre-book in advance", "Drive around looking", "Use the same spot regularly"],
      icon: "🔍"
    },
    {
      id: 3,
      question: "What's most important in a parking spot?",
      options: ["Price", "Proximity to destination", "Safety/security", "Availability guarantees"],
      icon: "⭐"
    },
    {
      id: 4,
      question: "How do you prefer to pay for parking?",
      options: ["Mobile app", "Credit card on site", "Monthly subscription", "Cash"],
      icon: "💳"
    }
  ];

  // Parking guidance results
  const getParkingGuidance = () => {
    const needs = responses[1];
    const search = responses[2];
    const importance = responses[3];
    const payment = responses[4];

    const tips = [];

    if (needs === "Daily commuter parking") {
      tips.push("Consider our monthly subscription plans for regular commuters - save up to 30% compared to daily rates");
    } else if (needs === "Event parking") {
      tips.push("Book event parking at least 48 hours in advance for the best rates and availability near venues");
    }

    if (search === "Last minute on my phone") {
      tips.push("Enable push notifications to get alerts when spots become available near your frequent destinations");
    } else if (search === "Drive around looking") {
      tips.push("Use our 'Find Nearby' feature to see all available spots in real-time as you approach your destination");
    }

    if (importance === "Price") {
      tips.push("Check our 'Best Value' filter to find spots that offer the best balance of price and walking distance");
    } else if (importance === "Safety/security") {
      tips.push("Look for spots with our 'Verified Secure' badge which includes 24/7 surveillance and well-lit areas");
    }

    if (payment === "Mobile app") {
      tips.push("Save your payment details in the app for faster checkout and to enable our 'Drive Away' auto-pay feature");
    } else if (payment === "Monthly subscription") {
      tips.push("Our corporate plans offer additional discounts for businesses with multiple parking needs");
    }

    return {
      title: "Your Personalized Parking Strategy",
      message: "Based on your responses, here are tailored recommendations to optimize your parking experience:",
      tips: tips.length > 0 ? tips : [
        "Set up favorite locations in the app for quick access to your most frequent parking needs",
        "Enable notifications for special offers and last-minute availability near your saved locations",
        "Consider carpooling or alternative transportation options when parking demand is high",
        "Read reviews from other parkers to find the best spots in your area"
      ]
    };
  };

  // FAQ questions
  const faqs = [
    {
      question: "How do I search for parking?",
      answer: "Use the search bar at the top of our homepage to enter your destination. You'll see all available parking spaces near your location. Filter by price, distance, or amenities to find your perfect spot.",
      category: "Searching"
    },
    {
      question: "Is Parksy free to use?",
      answer: "Yes! Searching for parking is completely free. You only pay when you book a space. We never charge hidden fees - the price you see is exactly what you'll pay for your parking reservation.",
      category: "Pricing"
    },
    {
      question: "How do I list my driveway or business parking?",
      answer: "Simply click 'List Your Space' in the top navigation, sign up as a host, and complete our easy step-by-step form. We'll guide you through setting your availability, pricing, and rules. Most listings are approved within 24 hours.",
      category: "Hosting"
    },
    {
      question: "Do I have to pre-book?",
      answer: "It depends on the space. Some locations offer instant access while others require pre-booking. This information is clearly displayed on each listing. We recommend booking in advance for popular locations or during peak times.",
      category: "Booking"
    },
    {
      question: "What happens if a booked space isn't available?",
      answer: "Contact us immediately through the app. We'll verify the issue and either find you a comparable nearby space or arrange a full refund. Our 24/7 customer support team is always here to help resolve any issues.",
      category: "Issues"
    },
    {
      question: "How do payments work for hosts?",
      answer: "We handle all payments securely. As a host, you'll receive your earnings via direct deposit weekly. Our platform takes a small service fee only after you've been paid, with transparent pricing shown upfront.",
      category: "Hosting"
    }
  ];

  // Auto-rotate hero slides
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [slides.length]);

  const toggleFAQ = (index) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  const handleSelectOption = (questionId, option) => {
    const newResponses = { ...responses, [questionId]: option };
    setResponses(newResponses);
    
    if (currentQuestion < parkingQuestions.length - 1) {
      setTimeout(() => {
        setCurrentQuestion(prev => prev + 1);
      }, 300);
    } else {
      setTimeout(() => {
        setShowResults(true);
      }, 500);
    }
  };

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const restartQuestionnaire = () => {
    setCurrentQuestion(0);
    setResponses({});
    setShowResults(false);
  };

  // Animation variants
  const slideVariants = {
    enter: { opacity: 0 },
    center: { opacity: 1 },
    exit: { opacity: 0 }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1]
      }
    }
  };

  const questionVariants = {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 }
  };

  const optionVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const guidance = getParkingGuidance();

  return (
    <div className="faq-page">
      {/* Section 1: Hero */}
      <section className="faq-hero" aria-label="Parking solutions hero section">
        <div className="faq-hero__bg-container">
          {slides.map((slide, index) => (
            <motion.div
              key={index}
              className={`faq-hero__bg ${currentSlide === index ? 'active' : ''}`}
              style={{ backgroundImage: `url(${slide.image})` }}
              variants={slideVariants}
              initial="enter"
              animate={currentSlide === index ? "center" : "exit"}
              transition={{ duration: 1.5, ease: [0.76, 0, 0.24, 1] }}
              aria-hidden={currentSlide !== index}
            >
              <div className="faq-hero__overlay" />
            </motion.div>
          ))}
        </div>

        <div className="faq-hero__content">
          <motion.div
            className="faq-hero__content-inner"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={itemVariants}>
              <div className="faq-hero__title-container">
                <motion.span 
                  className="faq-hero__title-line"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.4, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                />
                <motion.h1 
                  className="faq-hero__title"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                >
                  {slides[currentSlide].title}
                </motion.h1>
                <motion.span 
                  className="faq-hero__title-line faq-hero__title-line--right"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.6, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            </motion.div>

            <motion.div variants={itemVariants}>
              <motion.p 
                className="faq-hero__subtitle"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              >
                {slides[currentSlide].subtitle}
              </motion.p>
            </motion.div>

            <motion.div 
              className="faq-hero__cta-container"
              variants={itemVariants}
            >
              <motion.a
                href="#parking-guide"
                className="faq-hero__cta-button"
                whileHover={{ 
                  y: -3,
                  boxShadow: "0 10px 25px -5px rgba(99, 102, 241, 0.3)"
                }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                Get Parking Tips
                <svg className="faq-hero__cta-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </motion.a>
            </motion.div>
          </motion.div>
        </div>

        <div className="faq-hero__indicators">
          {slides.map((_, index) => (
            <button
              key={index}
              className={`faq-hero__indicator ${currentSlide === index ? 'active' : ''}`}
              onClick={() => setCurrentSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </section>

      {/* Section 2: Parking Guide */}
      <section id="parking-guide" className="parking-guide">
        <div className="parking-guide__container">
          <motion.div 
            className="parking-guide__header"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
          >
            <motion.span 
              className="parking-guide__subtitle"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              viewport={{ once: true }}
            >
              Personalized Guide
            </motion.span>
            <motion.h2 
              className="parking-guide__title"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              viewport={{ once: true }}
            >
              Optimize Your Parking Experience
            </motion.h2>
            <motion.p 
              className="parking-guide__description"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              viewport={{ once: true }}
            >
              Answer a few questions to get personalized parking recommendations
            </motion.p>
          </motion.div>

          {!showResults ? (
            <motion.div 
              className="parking-wizard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
            >
              <div className="wizard-progress">
                <div 
                  className="progress-bar" 
                  style={{ 
                    width: `${((currentQuestion + 1) / parkingQuestions.length) * 100}%`,
                    background: `linear-gradient(90deg, #10b981 0%, #34d399 100%)`
                  }} 
                />
                <span className="progress-text">Question {currentQuestion + 1} of {parkingQuestions.length}</span>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={currentQuestion}
                  className="question-container"
                  variants={questionVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  transition={{ duration: 0.4 }}
                >
                  <div className="question-header">
                    <span className="question-icon">{parkingQuestions[currentQuestion].icon}</span>
                    <h3 className="question-text">{parkingQuestions[currentQuestion].question}</h3>
                  </div>
                  
                  <div className="options-grid">
                    {parkingQuestions[currentQuestion].options.map((option, index) => (
                      <motion.button
                        key={index}
                        className={`option-card ${responses[parkingQuestions[currentQuestion].id] === option ? 'selected' : ''}`}
                        onClick={() => handleSelectOption(parkingQuestions[currentQuestion].id, option)}
                        variants={optionVariants}
                        initial="hidden"
                        animate="visible"
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        whileHover={{ y: -3, boxShadow: "0 6px 12px rgba(0,0,0,0.1)" }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {option}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>

              <div className="wizard-navigation">
                <motion.button
                  className="back-button"
                  onClick={handleBack}
                  disabled={currentQuestion === 0}
                  whileHover={{ scale: currentQuestion === 0 ? 1 : 1.05 }}
                  whileTap={{ scale: currentQuestion === 0 ? 1 : 0.95 }}
                >
                  Back
                </motion.button>
                
                {currentQuestion === parkingQuestions.length - 1 && (
                  <motion.button
                    className="submit-button"
                    onClick={() => setShowResults(true)}
                    disabled={!responses[parkingQuestions[currentQuestion].id]}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    See Results
                  </motion.button>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              className="guidance-results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="results-header">
                <h3>{guidance.title}</h3>
                <p>{guidance.message}</p>
              </div>
              
              <motion.div 
                className="results-section"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <h4>Actionable Tips</h4>
                <div className="tips-grid">
                  {guidance.tips.map((tip, index) => (
                    <motion.div
                      key={index}
                      className="tip-card"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + index * 0.1 }}
                      whileHover={{ y: -5 }}
                    >
                      <div className="tip-number">{index + 1}</div>
                      <p>{tip}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
              
              <motion.button
                className="restart-button"
                onClick={restartQuestionnaire}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                Start New Questionnaire
              </motion.button>
            </motion.div>
          )}
        </div>
      </section>

      {/* Section 3: Full FAQ */}
      <section className="full-faq">
        <div className="full-faq__container">
          <motion.div 
            className="full-faq__header"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
          >
            <motion.h2 
              className="full-faq__title"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              viewport={{ once: true }}
            >
              Frequently Asked Questions
            </motion.h2>
            <motion.p 
              className="full-faq__description"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              viewport={{ once: true }}
            >
              Can't find what you're looking for? Our support team is available 24/7.
            </motion.p>
          </motion.div>

          <div className="full-faq__list">
            {faqs.map((faq, index) => (
              <motion.div 
                key={index}
                className="full-faq__item"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}
              >
                <motion.button
                  className="full-faq__question"
                  onClick={() => toggleFAQ(index)}
                  whileHover={{ backgroundColor: '#f0fdf4' }}
                >
                  <span>{faq.question}</span>
                  <motion.span
                    animate={{ rotate: activeIndex === index ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
                    </svg>
                  </motion.span>
                </motion.button>

                <AnimatePresence>
                  {activeIndex === index && (
                    <motion.div
                      className="full-faq__answer"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                      <p>{faq.answer}</p>
                      {index % 2 === 0 && (
                        <motion.div 
                          className="helpful-buttons"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.2 }}
                        >
                          <span>Was this helpful?</span>
                          <motion.button whileTap={{ scale: 0.95 }}>👍 Yes</motion.button>
                          <motion.button whileTap={{ scale: 0.95 }}>👎 No</motion.button>
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Chat Bubble */}
      <motion.div
        className="chat-bubble"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1, type: "spring", stiffness: 300, damping: 10 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
        </svg>
        <span className="pulse-effect"></span>
      </motion.div>
    </div>
  );
};

export default FAQPage;