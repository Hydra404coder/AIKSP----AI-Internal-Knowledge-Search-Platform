/**
 * =============================================================================
 * AUTHENTICATION CONTEXT - GLOBAL AUTH STATE MANAGEMENT
 * =============================================================================
 * 
 * WHAT IS THIS FILE?
 * Provides authentication state and functions to the entire app.
 * Uses React Context API for global state management.
 * 
 * WHAT IS CONTEXT?
 * Context provides a way to pass data through the component tree
 * without having to pass props down manually at every level.
 * 
 * WHAT THIS CONTEXT PROVIDES:
 * - user: Current user object (or null if not logged in)
 * - token: JWT token (or null)
 * - isLoading: Loading state during auth checks
 * - isAuthenticated: Boolean for auth status
 * - login: Function to log in
 * - logout: Function to log out
 * - register: Function to register
 * 
 * USAGE IN COMPONENTS:
 * import { useAuth } from '../context/AuthContext';
 * 
 * function MyComponent() {
 *   const { user, login, logout } = useAuth();
 *   // ...
 * }
 * 
 * =============================================================================
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

/**
 * Create the context
 * 
 * We create it outside the component so it's stable across renders.
 * Initial value is null (will be populated by AuthProvider).
 */
const AuthContext = createContext(null);

/**
 * TOKEN STORAGE
 * 
 * We store the token in localStorage for persistence.
 * This means users stay logged in even after closing the browser.
 * 
 * ALTERNATIVES:
 * - sessionStorage: Clears when browser closes
 * - HttpOnly cookie: More secure, but needs backend changes
 */
const TOKEN_KEY = 'aiksp_token';
const USER_KEY = 'aiksp_user';

/**
 * AuthProvider Component
 * 
 * WHAT: Wraps the app and provides auth context to all children
 * 
 * WHERE: Wraps the entire app in App.jsx
 * 
 * PROPS:
 * - children: React children (the rest of the app)
 */
export function AuthProvider({ children }) {
  // ---- STATE ----
  
  /**
   * user - The current authenticated user
   * null if not logged in, user object if logged in
   */
  const [user, setUser] = useState(null);
  
  /**
   * token - The JWT token
   * null if not logged in, string if logged in
   */
  const [token, setToken] = useState(null);
  
  /**
   * isLoading - Whether we're checking auth status
   * True during initial load, false after check completes
   */
  const [isLoading, setIsLoading] = useState(true);
  
  /**
   * error - Any auth error message
   */
  const [error, setError] = useState(null);

  // ---- INITIALIZATION ----
  
  /**
   * useEffect - Runs on mount to check for existing session
   * 
   * FLOW:
   * 1. Check localStorage for token
   * 2. If token exists, verify it's still valid
   * 3. If valid, set user state
   * 4. If invalid, clear stored data
   */
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Get stored token
        const storedToken = localStorage.getItem(TOKEN_KEY);
        const storedUser = localStorage.getItem(USER_KEY);

        if (storedToken && storedUser) {
          // Set token in API service
          api.setToken(storedToken);
          
          // Verify token is still valid
          try {
            const response = await api.get('/auth/verify');
            
            if (response.success) {
              setToken(storedToken);
              setUser(response.data);
            } else {
              // Token invalid, clear storage
              localStorage.removeItem(TOKEN_KEY);
              localStorage.removeItem(USER_KEY);
            }
          } catch {
            // Token verification failed, clear storage
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // ---- AUTH FUNCTIONS ----

  /**
   * login()
   * 
   * WHAT: Logs in a user with email and password
   * 
   * CALLED BY: LoginPage form submission
   * INPUT: email (string), password (string)
   * OUTPUT: User object on success, throws error on failure
   */
  const login = useCallback(async (email, password) => {
    setError(null);
    
    try {
      const response = await api.post('/auth/login', { email, password });
      
      if (response.success) {
        const { token: newToken, user: userData } = response.data;

        // Store in localStorage
        localStorage.setItem(TOKEN_KEY, newToken);
        localStorage.setItem(USER_KEY, JSON.stringify(userData));

        // Set in API service
        api.setToken(newToken);

        // Update state
        setToken(newToken);
        setUser(userData);

        return { success: true, user: userData };
      }

      return { success: false, error: response.message || 'Login failed' };
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Login failed';
      setError(message);
      return { success: false, error: message };
    }
  }, []);

  /**
   * register()
   * 
   * WHAT: Registers a new user
   * 
   * CALLED BY: RegisterPage form submission
   * INPUT: { name, email, password, department }
   * OUTPUT: User object on success, throws error on failure
   */
  const register = useCallback(async (userData) => {
    setError(null);
    
    try {
      const response = await api.post('/auth/register', userData);
      
      if (response.success) {
        const { token: newToken, user: newUser } = response.data;
        
        // Store in localStorage
        localStorage.setItem(TOKEN_KEY, newToken);
        localStorage.setItem(USER_KEY, JSON.stringify(newUser));
        
        // Set in API service
        api.setToken(newToken);
        
        // Update state
        setToken(newToken);
        setUser(newUser);
        
        return { success: true, user: newUser };
      } else {
        return { success: false, error: response.message || 'Registration failed' };
      }
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Registration failed';
      setError(message);
      return { success: false, error: message };
    }
  }, []);

  /**
   * registerOrganization()
   * 
   * WHAT: Creates a new organization and admin account
   * 
   * CALLED BY: OrgSignupPage form submission
   * INPUT: { organizationName, organizationDescription, firstName, lastName, email, password, department }
   * OUTPUT: { success, user, secretKey } on success
   * 
   * NOTE: The secretKey is returned ONLY once and must be saved by the user
   */
  const registerOrganization = useCallback(async (userData) => {
    setError(null);
    
    try {
      const response = await api.post('/auth/register/organization', userData);
      
      if (response.success) {
        const { token: newToken, user: newUser, secretKey } = response.data;
        
        // Store in localStorage
        localStorage.setItem(TOKEN_KEY, newToken);
        localStorage.setItem(USER_KEY, JSON.stringify(newUser));
        
        // Set in API service
        api.setToken(newToken);
        
        // Update state
        setToken(newToken);
        setUser(newUser);
        
        // Return success with secretKey (shown only once to user)
        return { success: true, user: newUser, secretKey };
      } else {
        return { success: false, error: response.message || 'Organization registration failed' };
      }
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Organization registration failed';
      setError(message);
      return { success: false, error: message };
    }
  }, []);

  /**
   * registerEmployee()
   * 
   * WHAT: Registers an employee to join an existing organization
   * 
   * CALLED BY: EmployeeSignupPage form submission
   * INPUT: { organizationName, secretKey, firstName, lastName, email, password, department }
   * OUTPUT: { success, user } on success
   */
  const registerEmployee = useCallback(async (userData) => {
    setError(null);
    
    try {
      const response = await api.post('/auth/register/employee', userData);
      
      if (response.success) {
        const { token: newToken, user: newUser } = response.data;
        
        // Store in localStorage
        localStorage.setItem(TOKEN_KEY, newToken);
        localStorage.setItem(USER_KEY, JSON.stringify(newUser));
        
        // Set in API service
        api.setToken(newToken);
        
        // Update state
        setToken(newToken);
        setUser(newUser);
        
        return { success: true, user: newUser };
      } else {
        return { success: false, error: response.message || 'Employee registration failed' };
      }
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Registration failed. Please check your organization name and secret key.';
      setError(message);
      return { success: false, error: message };
    }
  }, []);

  /**
   * logout()
   * 
   * WHAT: Logs out the current user
   * 
   * CALLED BY: Navbar logout button, session expiry
   */
  const logout = useCallback(async () => {
    try {
      // Call backend logout (optional, for logging)
      await api.post('/auth/logout');
    } catch {
      // Ignore errors - we're logging out anyway
    } finally {
      // Clear localStorage
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      
      // Clear API token
      api.clearToken();
      
      // Clear state
      setToken(null);
      setUser(null);
    }
  }, []);

  /**
   * updateProfile()
   * 
   * WHAT: Updates the current user's profile
   * 
   * CALLED BY: ProfilePage form submission
   */
  const updateProfile = useCallback(async (updates) => {
    try {
      const response = await api.patch('/auth/profile', updates);
      
      if (response.success) {
        const updatedUser = response.data;
        
        // Update localStorage
        localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
        
        // Update state
        setUser(updatedUser);
        
        return updatedUser;
      } else {
        throw new Error(response.message || 'Update failed');
      }
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Update failed';
      throw new Error(message);
    }
  }, []);

  // ---- DERIVED VALUES ----
  
  /**
   * isAuthenticated - Whether user is logged in
   * Simple boolean for convenience
   */
  const isAuthenticated = !!user && !!token;

  // ---- CONTEXT VALUE ----
  
  /**
   * The value object provided to consumers
   * Contains all state and functions
   */
  const value = {
    user,
    token,
    isLoading,
    isAuthenticated,
    error,
    login,
    register,
    registerOrganization,
    registerEmployee,
    logout,
    updateProfile,
  };

  // ---- RENDER ----
  
  /**
   * Render loading state while checking auth
   * This prevents flash of login page for authenticated users
   */
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * useAuth Hook
 * 
 * WHAT: Custom hook to access auth context
 * 
 * USAGE:
 * const { user, login, logout } = useAuth();
 * 
 * THROWS:
 * Error if used outside AuthProvider
 */
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

export default AuthContext;
