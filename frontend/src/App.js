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

// Chatbot component
import ParkingBot from './components/parkingbot';

// Layout components
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Auth Context
import { AuthProvider } from './context/AuthContext';

// Layout components
const SimpleLayout = ({ children }) => (
  <main className="main-content">{children}</main>
);

const LayoutWithNavFooter = ({ children }) => (
  <>
    <Navbar />
    <SimpleLayout>{children}</SimpleLayout>
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
          {/* ========== ROUTES WITH NAVBAR & FOOTER ========== */}
          <Route path="/" element={<LayoutWithNavFooter><MainPage /></LayoutWithNavFooter>} />
          <Route path="/about" element={<LayoutWithNavFooter><About /></LayoutWithNavFooter>} />
          <Route path="/contact" element={<LayoutWithNavFooter><Contact /></LayoutWithNavFooter>} />
          <Route path="/guidance" element={<LayoutWithNavFooter><Guidance /></LayoutWithNavFooter>} />
          <Route path="/parkingfinder" element={<LayoutWithNavFooter><ParkingFinder /></LayoutWithNavFooter>} />
          <Route path="/listyourspace" element={<LayoutWithNavFooter><SuccessStories /></LayoutWithNavFooter>} />

          {/* ========== ROUTES WITHOUT NAVBAR/FOOTER ========== */}
          <Route path="/privacypolicy" element={<SimpleLayout><Profile /></SimpleLayout>} />
          <Route path="/termsandconditions" element={<SimpleLayout><Blog /></SimpleLayout>} />
          <Route path="/blog/:id" element={<SimpleLayout><Blog /></SimpleLayout>} />

          {/* ========== ERROR ROUTE ========== */}
          <Route path="*" element={<SimpleLayout><div className="not-found">Page Not Found</div></SimpleLayout>} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;