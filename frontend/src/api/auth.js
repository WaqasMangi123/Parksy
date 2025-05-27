import axios from 'axios';

// Configure API settings
const API_CONFIG = {
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api/auth',
  timeout: 10000, // 10 seconds timeout
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

// Create axios instance
const api = axios.create(API_CONFIG);

// Request interceptor for auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Handle specific status codes
      if (error.response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
      return Promise.reject(error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      return Promise.reject({ error: 'Network error - server unavailable' });
    } else {
      // Something happened in setting up the request
      return Promise.reject({ error: error.message });
    }
  }
);

// Auth API methods with correct endpoint paths
export const authAPI = {
  register: (userData) => api.post('/register', userData),
  login: (credentials) => api.post('/login', credentials),
  verifyEmail: (token) => api.get(`/verify/${token}`),
  forgotPassword: (email) => api.post('/forgot-password', { email }),
  resetPassword: (token, newPassword) => api.put(`/reset-password/${token}`, { password: newPassword }),
  getCurrentUser: () => api.get('/me'),
  refreshToken: () => api.post('/refresh-token'),
  logout: () => {
    localStorage.removeItem('token');
    return api.post('/logout');
  }
};

// Individual exports with correct paths
export const register = (userData) => api.post('/register', userData);
export const login = (credentials) => api.post('/login', credentials);
export const verifyEmail = (token) => api.get(`/verify/${token}`);
export const forgotPassword = (email) => api.post('/forgot-password', { email });
export const resetPassword = (token, newPassword) => api.put(`/reset-password/${token}`, { password: newPassword });
export const getCurrentUser = () => api.get('/me');