import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Inject auth token into every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ps1_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global error handler
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('ps1_token');
      localStorage.removeItem('ps1_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
