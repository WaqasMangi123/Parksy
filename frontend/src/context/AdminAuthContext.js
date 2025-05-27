import { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AdminContext = createContext();

export const AdminProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Check if admin is logged in on initial load
  useEffect(() => {
    const checkAdminAuth = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        if (token) {
          // You might want to verify token with backend here
          setAdmin({ token });
        }
      } catch (err) {
        console.error(err);
        localStorage.removeItem('adminToken');
      } finally {
        setLoading(false);
      }
    };
    
    checkAdminAuth();
  }, []);

  // Admin login
  const login = async (email, password) => {
    try {
      const res = await axios.post('/api/admin/login', { email, password });
      return res.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
      throw err;
    }
  };

  // Verify token
  const verifyToken = async (email, token) => {
    try {
      const res = await axios.post('/api/admin/verify', { email, token });
      localStorage.setItem('adminToken', res.data.token);
      setAdmin({ token: res.data.token });
      return res.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed');
      throw err;
    }
  };

  // Logout
  const logout = () => {
    localStorage.removeItem('adminToken');
    setAdmin(null);
    navigate('/admin/login');
  };

  return (
    <AdminContext.Provider
      value={{
        admin,
        loading,
        error,
        login,
        verifyToken,
        logout
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => useContext(AdminContext);