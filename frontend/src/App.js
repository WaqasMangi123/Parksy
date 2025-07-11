import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Main components
import MainPage from './components/mainpage';
import Contact from './components/contact';
import About from './components/about';
import Guidance from './components/guidance';
import SuccessStories from './components/listyourspace';
import Profile from './components/privacypolicy';
import Blog from './components/termsandconditions';
import ParkingFinder from './components/parkingfinder';
import ParkingListingThirdParty from './components/home'; // New import

// Auth components
import Login from './components/login';
import Register from './components/register';
import ForgotPassword from './components/forgetpassword';
import ResetPassword from './components/resetpassword'; // ✅ This now matches the export
import EmailVerification from './components/emailverification';

// Chatbot component
import ParkingBot from './components/parkingbot';

// Contact Widget component
import ContactWidget from './components/contactwidget';

// Layout components
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Auth Context
import { AuthProvider } from './context/AuthContext';

// Layout wrapper with navbar and footer
const Layout = ({ children }) => (
  <>
    <Navbar />
    <main className="main-content">{children}</main>
    <Footer />
  </>
);

// Auth layout wrapper (different styling if needed)
const AuthLayout = ({ children }) => (
  <div className="auth-layout">
    <main className="main-content">{children}</main>
  </div>
);

// Auth layout wrapper WITH ContactWidget (for login page)
const AuthLayoutWithWidget = ({ children }) => (
  <div className="auth-layout">
    <main className="main-content">
      {children}
      {/* Contact Widget appears on login page */}
      <ContactWidget />
    </main>
  </div>
);

// Home layout wrapper with ContactWidget
const HomeLayout = ({ children }) => (
  <>
    <Navbar />
    <main className="main-content">
      {children}
      {/* Contact Widget only appears on home page */}
      <ContactWidget />
    </main>
    <Footer />
  </>
);

function App() {
  return (
    <Router>
      <AuthProvider>
        {/* ParkingBot Chatbot - appears on all pages */}
        <ParkingBot />
        
        <Routes>
          {/* ========== PUBLIC ROUTES WITH LAYOUT ========== */}
          <Route path="/" element={<Layout><MainPage /></Layout>} />
          <Route path="/about" element={<Layout><About /></Layout>} />
          <Route path="/contact" element={<Layout><Contact /></Layout>} />
          <Route path="/guidance" element={<Layout><Guidance /></Layout>} />
          <Route path="/parkingfinder" element={<Layout><ParkingFinder /></Layout>} />
          <Route path="/listyourspace" element={<Layout><SuccessStories /></Layout>} />
          
          {/* HOME ROUTE WITH CONTACT WIDGET */}
          <Route path="/home" element={<HomeLayout><ParkingListingThirdParty /></HomeLayout>} />
          
          {/* ========== AUTH ROUTES ========== */}
          {/* LOGIN PAGE WITH CONTACT WIDGET */}
          <Route path="/login" element={<AuthLayoutWithWidget><Login /></AuthLayoutWithWidget>} />
          
          {/* OTHER AUTH ROUTES WITHOUT CONTACT WIDGET */}
          <Route path="/register" element={<AuthLayout><Register /></AuthLayout>} />
          <Route path="/forgot-password" element={<AuthLayout><ForgotPassword /></AuthLayout>} />
          {/* ✅ FIXED: Component name now matches the export */}
          <Route path="/reset-password/:token" element={<AuthLayout><ResetPassword /></AuthLayout>} />
          <Route path="/verify-email" element={<AuthLayout><EmailVerification /></AuthLayout>} />
          
          {/* ========== SIMPLE ROUTES WITHOUT NAVBAR/FOOTER ========== */}
          <Route path="/privacypolicy" element={<Profile />} />
          <Route path="/termsandconditions" element={<Blog />} />
          <Route path="/blog/:id" element={<Blog />} />
          
          {/* ========== ERROR ROUTE ========== */}
          <Route path="*" element={<Layout><div className="not-found">Page Not Found</div></Layout>} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;