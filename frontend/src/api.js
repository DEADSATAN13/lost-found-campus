import axios from 'axios';

// Resolve API base URL with fallback for local development
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach Bearer token from localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('found_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 on authenticated sessions
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If /auth/me returns 401, the user's session is expired or deleted from DB
    if (error.response && error.response.status === 401) {
      const requestUrl = error.config ? error.config.url : '';
      if (requestUrl.includes('/auth/me')) {
        localStorage.removeItem('found_token');
        localStorage.removeItem('found_user');
        window.dispatchEvent(new Event('authChange'));
      }
    }
    return Promise.reject(error);
  }
);

// Authentication state helpers
export function getStoredToken() {
  return localStorage.getItem('found_token');
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem('found_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSession(user, token) {
  if (token) localStorage.setItem('found_token', token);
  if (user) localStorage.setItem('found_user', JSON.stringify(user));
  window.dispatchEvent(new Event('authChange'));
}

export function clearSession() {
  localStorage.removeItem('found_token');
  localStorage.removeItem('found_user');
  window.dispatchEvent(new Event('authChange'));
}

export function triggerUserRefresh() {
  window.dispatchEvent(new Event('refreshUser'));
}

export default api;
