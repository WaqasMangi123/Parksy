import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import "./home.css";

const Home = () => {
  // Animation variants for hero section
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.6,
        ease: [0.16, 1, 0.3, 1],
      },
    },
  };

  const buttonVariants = {
    hover: {
      scale: 1.05,
      boxShadow: "0 12px 25px rgba(0,0,0,0.1)",
      transition: {
        duration: 0.3,
        ease: "easeOut"
      },
    },
    tap: {
      scale: 0.96,
    },
  };

  const imageVariants = {
    hidden: { opacity: 0, x: 100, rotate: 5 },
    visible: {
      opacity: 1,
      x: 0,
      rotate: 0,
      transition: {
        duration: 0.8,
        delay: 0.5,
        ease: [0.16, 1, 0.3, 1]
      },
    },
    hover: {
      y: -10,
      transition: {
        duration: 0.5,
        yoyo: Infinity,
        ease: "easeInOut"
      }
    }
  };
// New variants for templates section
const templatesVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      when: "beforeChildren"
    }
  }
};

const templateItemVariants = {
  hidden: { y: 30, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1]
    }
  },
  hover: {
    y: -10,
    transition: { duration: 0.3 }
  }
};

const sliderVariants = {
  hidden: { opacity: 0, x: 100 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1]
    }
  }
};
  // Animation variants for collaboration section
  const collaborationContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        when: "beforeChildren"
      }
    }
  };

  const itemLeft = {
    hidden: { x: -50, opacity: 0 },
    visible: {
      x: 0,
      opacity: 1,
      transition: {
        duration: 0.8,
        ease: [0.16, 1, 0.3, 1]
      }
    }
  };

  const itemRight = {
    hidden: { x: 50, opacity: 0 },
    visible: {
      x: 0,
      opacity: 1,
      transition: {
        duration: 0.8,
        ease: [0.16, 1, 0.3, 1]
      }
    }
  };

  const logoAnimation = {
    hidden: { scale: 0.9, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        duration: 0.6,
        ease: "backOut"
      }
    },
    hover: {
      y: -5,
      transition: {
        duration: 0.3
      }
    }
  };

  // Animation variants for process section
  const processVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        when: "beforeChildren"
      }
    }
  };

  const stepItemVariants = {
    hidden: { y: 50, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.6,
        ease: [0.16, 1, 0.3, 1]
      }
    },
    hover: {
      y: -10,
      transition: { duration: 0.3 }
    }
  };

  const connectorVariants = {
    hidden: { scaleX: 0, opacity: 0 },
    visible: {
      scaleX: 1,
      opacity: 1,
      transition: {
        duration: 0.8,
        ease: [0.16, 1, 0.3, 1]
      }
    }
  };
  // Template data
  const templates = [
    {
      id: 1,
      name: "Modern Professional",
      imgSrc: "https://marketplace.canva.com/EAFzfwx_Qik/4/0/1131w/canva-blue-simple-professional-cv-resume-T9RPR4DPdiw.jpg",
      category: "Professional"
    },
    {
      id: 2,
      name: "Creative Minimalist",
      imgSrc: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT1sy7_iq-1i7xqTo1TC42hpz5L3i22VIlOjg&s",
      category: "Creative"
    },
    {
      id: 3,
      name: "Academic Elegance",
      imgSrc: "https://www.cvtemplate.co.uk/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fcv-template-clean.d239ac9c.png&w=3840&q=64",
      category: "Academic"
    },
    {
      id: 4,
      name: "Bold Executive",
      imgSrc: "https://cvonline.me/assets/img/examples-recent-graduate-university-college-cv-large.jpg",
      category: "Professional"
    },
  ];


  return (
    <div className="home-page-container">
      {/* Hero Section */}
      <div className="advanced-home-container">
        <motion.div 
          className="bg-glow-circle circle-1"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.1, scale: 1 }}
          transition={{ duration: 1.5, delay: 0.2 }}
        />
        <motion.div 
          className="bg-glow-circle circle-2"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.1, scale: 1 }}
          transition={{ duration: 1.5, delay: 0.4 }}
        />

        <motion.div
          className="advanced-hero-section"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <div className="hero-content-box">
            <motion.h1 variants={itemVariants} className="hero-title-adv">
              Discover scholarships that <span className="hero-highlight">match your ambitions</span>
            </motion.h1>

            <motion.p variants={itemVariants} className="hero-subtext">
              Unlock your future with tailored scholarships and a beautifully crafted CV – all in minutes.
            </motion.p>

            <motion.div variants={itemVariants} className="hero-buttons">
              <motion.div
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
              >
                <Link to="/profile" className="hero-btn primary-btn">
                  <span className="btn-icon">🚀</span> Create your Profile
                </Link>
              </motion.div>

              <motion.div
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
              >
                <Link to="/allscholarships" className="hero-btn secondary-btn">
                  <span className="btn-icon">🏆</span> All Scholarships
                </Link>
              </motion.div>
            </motion.div>

            <motion.div variants={itemVariants} className="hero-trust-badges">
              <div className="trust-box">✓ 10,000+ Scholarships</div>
              <div className="trust-box">✓ 50,000+ Students Helped</div>
              <div className="trust-box">✓ 95% Satisfaction Rate</div>
            </motion.div>
          </div>

          <motion.div 
            className="hero-img-container"
            variants={imageVariants}
            whileHover="hover"
          >
            <div className="glassmorphism-card">
              <img 
                src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1470&q=80" 
                alt="Happy graduate student" 
                className="main-hero-img"
              />
            </div>
            <div className="floating-icon scholarship">🎓</div>
            <div className="floating-icon document">📄</div>
            <div className="floating-icon check">✅</div>
          </motion.div>
        </motion.div>
      </div>

      {/* Collaboration Section */}
      <motion.section 
        className="collaboration-section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={collaborationContainer}
      >
        <div className="collaboration-glow-circle" />
        
        <div className="collaboration-container">
          <motion.div 
            className="collaboration-image-container"
            variants={itemLeft}
          >
            <div className="image-mask">
              <img 
                src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1470&q=80" 
                alt="Team collaboration" 
                className="collaboration-image"
              />
            </div>
            <div className="collaboration-badge">
              <span>Strategic Partnership</span>
            </div>
          </motion.div>

          <motion.div 
            className="collaboration-text"
            variants={itemRight}
          >
            <motion.h2 
              className="collaboration-title"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              Strategic <span className="highlight">Collaboration</span> with Leading Organizations
            </motion.h2>
            
            <motion.p 
              className="collaboration-description"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Scholar Finder is proud to collaborate with the Sona Foundation and FFC to amplify our impact. 
              This partnership combines our technological expertise with their extensive networks to deliver 
              unparalleled opportunities to students worldwide.
            </motion.p>

            <motion.div 
              className="logo-grid"
              initial="hidden"
              animate="visible"
              variants={containerVariants}
            >
              <motion.div 
                className="logo-item"
                variants={logoAnimation}
                whileHover="hover"
              >
                <img src="https://sonafoundation.org.pk/wp-content/uploads/2024/07/cropped-Sonawelfare.png" alt="Sona Foundation" />
              </motion.div>
              <motion.div 
                className="logo-item"
                variants={logoAnimation}
                whileHover="hover"
              >
                <img src="data:image/png;base64,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" alt="FFC" />
              </motion.div>
              <motion.div 
                className="logo-item"
                variants={logoAnimation}
                whileHover="hover"
              >
                <img src="data:image/jpeg;base64,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" alt="Scholar Finder" />
              </motion.div>
            </motion.div>

            <motion.div 
              className="collaboration-stats"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <div className="stat-item">
                <div className="stat-number">50+</div>
                <div className="stat-label">Joint Initiatives</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">10K+</div>
                <div className="stat-label">Students Reached</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">$5M+</div>
                <div className="stat-label">In Scholarships</div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* How It Works Section */}
      <motion.section 
        className="process-section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={processVariants}
      >
        <div className="process-glow-circle" />
        
        <div className="process-container">
          <motion.div 
            className="process-header"
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="process-title">
              Our <span className="highlight">Simple</span> Process
            </h2>
            <p className="process-subtitle">
              Get matched with perfect scholarships in just 5 easy steps
            </p>
          </motion.div>

          <div className="process-steps">
            {[1, 2, 3, 4, 5].map((step, index) => (
              <div key={step} className="process-step-wrapper">
                <motion.div
                  className="process-step-card"
                  variants={stepItemVariants}
                  whileHover="hover"
                >
                  <div className="step-number">0{step}</div>
                  <div className="step-content">
                    <h3 className="step-title">
                      {step === 1 && "Create Your Profile"}
                      {step === 2 && "Complete Your Details"}
                      {step === 3 && "Generate Your CV"}
                      {step === 4 && "Smart Algorithm Analysis"}
                      {step === 5 && "Get Matched"}
                    </h3>
                    <p className="step-description">
                      {step === 1 && "Start by creating your personalized profile in just 2 minutes"}
                      {step === 2 && "Fill in your academic and personal details using our intuitive interface"}
                      {step === 3 && "Download your professionally designed CV or proceed to matching"}
                      {step === 4 && "Our AI analyzes your profile against thousands of opportunities"}
                      {step === 5 && "Receive personalized scholarship recommendations tailored for you"}
                    </p>
                  </div>
                  <div className="step-icon">
                    {step === 1 && "📝"}
                    {step === 2 && "📋"}
                    {step === 3 && "📄"}
                    {step === 4 && "🤖"}
                    {step === 5 && "🎯"}
                  </div>
                </motion.div>

                {index < 4 && (
                  <motion.div
                    className="process-connector"
                    variants={connectorVariants}
                  >
                    <div className="connector-line" />
                    <div className="connector-arrow">→</div>
                  </motion.div>
                )}
              </div>
            ))}
          </div>

          <motion.div
            className="process-cta"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
          >
            <motion.div
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
            >
              <Link to="/profile" className="process-btn">
                Start Your Journey Now
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

       {/* Templates Section */}
       <motion.section 
        className="templates-section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={templatesVariants}
      >
        <div className="templates-glow-circle" />
        
        <div className="templates-container">
          <motion.div 
            className="templates-header"
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="templates-title">
              Stunning <span className="highlight">Templates</span>
            </h2>
            <p className="templates-subtitle">
              Explore a range of professionally crafted templates designed to showcase your profile with clarity and make a lasting impression.
            </p>
          </motion.div>

          <motion.div 
            className="template-slider-container"
            variants={sliderVariants}
          >
            <div className="template-slider-track">
              {templates.map((template) => (
                <motion.div
                  key={template.id}
                  className="template-card-wrapper"
                  variants={templateItemVariants}
                  whileHover="hover"
                >
                  <Link to={`/templateselection`} className="template-card">
                    <div className="template-image-container">
                      <img 
                        src={template.imgSrc} 
                        alt={template.name} 
                        className="template-image"
                      />
                      <div className="template-badge">
                        {template.category}
                      </div>
                    </div>
                    <div className="template-content">
                      <h3 className="template-name">{template.name}</h3>
                      <div className="template-cta">
                        <span>Preview Template</span>
                        <div className="arrow-icon">→</div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            className="templates-cta"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
          >
            <motion.div
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
            >
              <Link to="/templates" className="templates-btn">
                View All Templates
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>
    </div>
  );
};

export default Home;