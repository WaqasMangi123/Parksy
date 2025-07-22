import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';

// Main components
import MainPage from './components/mainpage';
import Contact from './components/contact';
import About from './components/about';
import Guidance from './components/guidance';
import SuccessStories from './components/listyourspace';
import Profile from './components/privacypolicy';
import Blog from './components/termsandconditions';
import ParkingFinder from './components/parkingfinder';
import ParkingListingThirdParty from './components/home';
import AdminEmergencyContactRequest from './components/adminemergencycontactrequest';

// Auth components
import Login from './components/login';
import Register from './components/register';
import ForgotPassword from './components/forgetpassword';
import ResetPassword from './components/resetpassword';
import EmailVerification from './components/emailverification';

// Admin components
import AdminLogin from './components/adminlogin';
import AdminDashboard from './components/admindashboard';
import AdminUserActivity from './components/adminuseractivity'; // New component

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

// Auth layout wrapper
const AuthLayout = ({ children }) => (
  <div className="auth-layout">
    <main className="main-content">{children}</main>
  </div>
);

// Auth layout with ContactWidget
const AuthLayoutWithWidget = ({ children }) => (
  <div className="auth-layout">
    <main className="main-content">
      {children}
      <ContactWidget />
    </main>
  </div>
);

// Home layout with ContactWidget
const HomeLayout = ({ children }) => (
  <>
    <Navbar />
    <main className="main-content">
      {children}
      <ContactWidget />
    </main>
    <Footer />
  </>
);

// Admin layout wrapper (no navbar/footer for admin)
const AdminLayout = ({ children }) => (
  <div className="admin-layout">
    <main className="admin-main-content">{children}</main>
  </div>
);

function App() {
  return (
    <Router>
      <AuthProvider>
        <ParkingBot />
        
        <Routes>
          {/* ========== PUBLIC ROUTES ========== */}
          <Route path="/" element={<Layout><MainPage /></Layout>} />
          <Route path="/about" element={<Layout><About /></Layout>} />
          <Route path="/contact" element={<Layout><Contact /></Layout>} />
          <Route path="/guidance" element={<Layout><Guidance /></Layout>} />
          <Route path="/parkingfinder" element={<Layout><ParkingFinder /></Layout>} />
          <Route path="/listyourspace" element={<Layout><SuccessStories /></Layout>} />
          <Route path="/emergency-contacts" element={<Layout><AdminEmergencyContactRequest /></Layout>} />
          
          {/* HOME ROUTE WITH WIDGET */}
          <Route path="/home" element={<HomeLayout><ParkingListingThirdParty /></HomeLayout>} />
          
          {/* ========== AUTH ROUTES ========== */}
          <Route path="/login" element={<AuthLayoutWithWidget><Login /></AuthLayoutWithWidget>} />
          <Route path="/register" element={<AuthLayout><Register /></AuthLayout>} />
          <Route path="/forgot-password" element={<AuthLayout><ForgotPassword /></AuthLayout>} />
          <Route path="/reset-password/:token" element={<AuthLayout><ResetPassword /></AuthLayout>} />
          <Route path="/verify-email" element={<AuthLayout><EmailVerification /></AuthLayout>} />
          
          {/* ========== ADMIN ROUTES ========== */}
          <Route path="/admin/login" element={<AdminLayout><AdminLogin /></AdminLayout>} />
          <Route path="/admin/dashboard" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
          <Route path="/admin/user-activity" element={<AdminLayout><AdminUserActivity /></AdminLayout>} />
          <Route path="/admin" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
          
          {/* ========== SIMPLE PAGES ========== */}
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