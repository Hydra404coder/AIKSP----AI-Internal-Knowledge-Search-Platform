/**
 * =============================================================================
 * API SERVICE - HTTP CLIENT FOR BACKEND COMMUNICATION
 * =============================================================================
 * 
 * WHAT IS THIS FILE?
 * A centralized API service using axios for making HTTP requests.
 * All API calls go through this service.
 * 
 * WHY A CENTRALIZED SERVICE?
 * - Single place to configure base URL, headers, etc.
 * - Automatic token attachment
 * - Consistent error handling
 * - Easy to mock for testing
 * 
 * FEATURES:
 * - Automatic JWT token attachment
 * - Error response parsing
 * - Request/response logging (development)
 * - Token refresh handling (future)
 * 
 * USAGE:
 * import api from '../services/api';
 * 
 * // GET request
 * const data = await api.get('/documents');
 * 
 * // POST request
 * const result = await api.post('/auth/login', { email, password });
 * 
 * =============================================================================
 */

import axios from 'axios';

/**
 * BASE URL
 * 
 * In development: Vite proxy handles /api → localhost:5000
 * In production: Set VITE_API_URL to actual backend URL
 */
const BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Create axios instance
 * 
 * We create a configured instance rather than using axios directly.
 * This lets us set defaults that apply to all requests.
 */
const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Token storage
 * 
 * We keep the token in memory for quick access.
 * It's also stored in localStorage for persistence.
 */
let authToken = null;

/**
 * REQUEST INTERCEPTOR
 * 
 * Runs before every request is sent.
 * We use it to attach the JWT token to the Authorization header.
 */
axiosInstance.interceptors.request.use(
  (config) => {
    // Attach token if available
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }
    
    // Log requests in development
    if (import.meta.env.DEV) {
      console.log(`📤 ${config.method?.toUpperCase()} ${config.url}`);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * RESPONSE INTERCEPTOR
 * 
 * Runs after every response is received.
 * We use it for:
 * - Extracting the data from axios response
 * - Handling 401 errors (token expired)
 * - Logging
 */
axiosInstance.interceptors.response.use(
  (response) => {
    // Log responses in development
    if (import.meta.env.DEV) {
      console.log(`📥 ${response.config.method?.toUpperCase()} ${response.config.url} → ${response.status}`);
    }
    
    // Return the data directly
    return response.data;
  },
  (error) => {
    // Log errors in development
    if (import.meta.env.DEV) {
      console.error(`❌ ${error.config?.method?.toUpperCase()} ${error.config?.url} → ${error.response?.status}`);
    }
    
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      // Check if this is a login/signup page - don't redirect, let the page handle the error
      const currentPath = window.location.pathname;
      const isAuthPage = currentPath.includes('/login') || 
                         currentPath.includes('/signup') || 
                         currentPath.includes('/register');
      
      if (!isAuthPage) {
        // Token expired or invalid - only clear and redirect if not on auth pages
        authToken = null;
        localStorage.removeItem('aiksp_token');
        localStorage.removeItem('aiksp_user');
        window.location.href = '/login';
      }
    }
    
    // Return a rejected promise with error details
    return Promise.reject(error);
  }
);

/**
 * API Object
 * 
 * Provides convenient methods for API calls.
 * Also includes token management functions.
 */
const api = {
  /**
   * setToken()
   * 
   * WHAT: Sets the JWT token for future requests
   * CALLED BY: AuthContext after login
   */
  setToken: (token) => {
    authToken = token;
  },

  /**
   * clearToken()
   * 
   * WHAT: Clears the JWT token
   * CALLED BY: AuthContext on logout
   */
  clearToken: () => {
    authToken = null;
  },

  /**
   * get()
   * 
   * WHAT: Makes a GET request
   * INPUT: url (string), params (optional query params)
   * OUTPUT: Response data
   * 
   * EXAMPLE:
   * const docs = await api.get('/documents', { page: 1, limit: 10 });
   */
  get: (url, params = {}) => {
    return axiosInstance.get(url, { params });
  },

  /**
   * post()
   * 
   * WHAT: Makes a POST request
   * INPUT: url (string), data (request body)
   * OUTPUT: Response data
   * 
   * EXAMPLE:
   * const result = await api.post('/auth/login', { email, password });
   */
  post: (url, data = {}) => {
    return axiosInstance.post(url, data);
  },

  /**
   * patch()
   * 
   * WHAT: Makes a PATCH request
   * INPUT: url (string), data (request body)
   * OUTPUT: Response data
   * 
   * EXAMPLE:
   * const result = await api.patch('/documents/123', { title: 'New Title' });
   */
  patch: (url, data = {}) => {
    return axiosInstance.patch(url, data);
  },

  /**
   * put()
   * 
   * WHAT: Makes a PUT request
   * INPUT: url (string), data (request body)
   * OUTPUT: Response data
   */
  put: (url, data = {}) => {
    return axiosInstance.put(url, data);
  },

  /**
   * delete()
   * 
   * WHAT: Makes a DELETE request
   * INPUT: url (string)
   * OUTPUT: Response data
   * 
   * EXAMPLE:
   * await api.delete('/documents/123');
   */
  delete: (url) => {
    return axiosInstance.delete(url);
  },

  /**
   * download()
   * 
   * WHAT: Downloads a file as a blob
   * INPUT: url (string)
   * OUTPUT: Blob data
   */
  download: (url) => {
    return axiosInstance.get(url, { responseType: 'blob' });
  },

  /**
   * upload()
   * 
   * WHAT: Uploads a file with form data
   * INPUT: url (string), formData (FormData object)
   * OUTPUT: Response data
   * 
   * WHY SPECIAL METHOD?
   * File uploads need multipart/form-data content type.
   * Axios handles this when we send FormData.
   * 
   * EXAMPLE:
   * const formData = new FormData();
   * formData.append('file', file);
   * formData.append('title', 'My Document');
   * const result = await api.upload('/documents', formData);
   */
  upload: (url, formData, config = {}) => {
    return axiosInstance.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      ...config,
    });
  },
};

export default api;
