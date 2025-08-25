import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import './footer.css';

const Footer = () => {
  const footerVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: 'easeOut' }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1, duration: 0.5 }
    })
  };

  const links = [
    { title: 'Quick Links', items: [
      { name: 'Home', path: '/' },
      { name: 'About', path: '/about' },
      { name: 'Parking Finder', path: '/parkingfinder' },
      { name: 'List Your Space', path: '/listyourspace' },
      { name: 'Contact', path: '/contact' }
    ]},
    { title: 'Legal', items: [
      { name: 'Privacy Policy', path: '/privacypolicy' },
      { name: 'Terms & Conditions', path: '/termsandconditions' }
    ]},
    { title: 'Support', items: [
      { name: 'Guidance', path: '/guidance' },
      { name: 'FAQ', path: '/guidance' },
      { name: 'Help Center', path: '/contact' }
    ]}
  ];

  return (
    <motion.footer
      className="footer"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={footerVariants}
    >
      <div className="footer-container">
        <motion.div 
          className="footer-about"
          custom={0}
          variants={itemVariants}
        >
          <h3 className="footer-logo">Parksy</h3>
          <p className="footer-description">
            Revolutionizing parking solutions with cutting-edge technology and 
            customer-focused services to make urban mobility seamless.
          </p>
          <div className="social-links">
            {['facebook', 'twitter', 'instagram', 'linkedin'].map((social, i) => (
              <motion.a
                key={social}
                href={`https://${social}.com`}
                target="_blank"
                rel="noopener noreferrer"
                className={`social-link ${social}`}
                whileHover={{ y: -3 }}
                custom={i + 1}
                variants={itemVariants}
              >
                <i className={`fab fa-${social}`}></i>
              </motion.a>
            ))}
          </div>
        </motion.div>

        {links.map((section, i) => (
          <motion.div 
            key={section.title}
            className="footer-section"
            custom={i + 1}
            variants={itemVariants}
          >
            <h4 className="footer-section-title">{section.title}</h4>
            <ul className="footer-links">
              {section.items.map((item, j) => (
                <motion.li 
                  key={item.path}
                  custom={j + i + 2}
                  variants={itemVariants}
                >
                  <Link 
                    to={item.path}
                    className="footer-link"
                    whileHover={{ x: 5 }}
                  >
                    {item.name}
                  </Link>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>

      <motion.div 
        className="footer-bottom"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        <div className="footer-container">
          <div className="footer-bottom-content">
            <p>&copy; {new Date().getFullYear()} Parksy. All rights reserved.</p>
            <div className="footer-legal">
              <Link to="/privacypolicy" className="legal-link">Privacy Policy</Link>
              <Link to="/termsandconditions" className="legal-link">Terms & Conditions</Link>
            </div>
          </div>
          
          {/* TechPrime Solutions Credit */}
          <motion.div 
            className="footer-credit"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3, duration: 0.6 }}
          >
            <motion.div 
              className="credit-content"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <motion.span 
                className="credit-text"
                animate={{ 
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                }}
                transition={{ 
                  duration: 4, 
                  repeat: Infinity, 
                  ease: "linear" 
                }}
              >
                Crafted by 
                <motion.span 
                  className="company-name"
                  whileHover={{ 
                    textShadow: "0 0 20px rgba(139, 92, 246, 0.6)" 
                  }}
                  transition={{ duration: 0.3 }}
                >
                  TechPrimeSolutions
                </motion.span>
              </motion.span>
              <motion.div 
                className="credit-decoration"
                animate={{ 
                  rotate: [0, 360] 
                }}
                transition={{ 
                  duration: 8, 
                  repeat: Infinity, 
                  ease: "linear" 
                }}
              >
                ✨
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </motion.footer>
  );
};

export default Footer;