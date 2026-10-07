import axios from 'axios';

// Where the backend lives. Set VITE_API_URL in frontend/.env (local) or in the
// hosting dashboard (production). Vite bakes it in at build time.
export const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '');

// Turn a server-relative path like /uploads/x.png into a full URL.
// Absolute URLs (e.g. cloud storage) are returned unchanged.
export function assetUrl(path) {
  if (!path) return '';
  return /^https?:\/\//i.test(path) ? path : `${API_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`;
}

const api = axios.create({
  baseURL: `${API_ORIGIN}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
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

// Response interceptor to handle unauthorized errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token and redirect if token is expired/invalid
      const path = window.location.pathname;
      if (path !== '/login' && path !== '/register') {
        localStorage.removeItem('token');
        window.location.reload();
      }
    }
    return Promise.reject(error);
  }
);

export default api;
