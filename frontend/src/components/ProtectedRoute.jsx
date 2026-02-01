/**
 * =============================================================================
 * PROTECTED ROUTE COMPONENT - ROUTE GUARD FOR AUTHENTICATED PAGES
 * =============================================================================
 * 
 * WHAT IS THIS FILE?
 * A wrapper component that protects routes from unauthenticated access.
 * If user is not logged in, they are redirected to the login page.
 * 
 * HOW ROUTE PROTECTION WORKS:
 * 1. Check if user is authenticated
 * 2. If yes: Render the children (the protected page)
 * 3. If no: Redirect to /login
 * 
 * USAGE:
 * <Route path="/dashboard" element={
 *   <ProtectedRoute>
 *     <DashboardPage />
 *   </ProtectedRoute>
 * } />
 * 
 * =============================================================================
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute Component
 * 
 * PROPS:
 * - children: The protected content to render if authenticated
 * - requiredRole: Optional role requirement (admin, super_admin)
 */
function ProtectedRoute({ children, requiredRole = null }) {
  // Get auth state from context
  const { isAuthenticated, user, isLoading } = useAuth();
  
  // Get current location (for redirect back after login)
  const location = useLocation();

  // Show nothing while loading (prevents flash)
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    /**
     * Navigate component redirects to another route.
     * 
     * state={{ from: location }}
     * Saves the current location so we can redirect back after login.
     * 
     * replace
     * Replaces the current history entry instead of adding new one.
     * This prevents users from clicking "back" to the protected page.
     */
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role requirement if specified
  if (requiredRole) {
    const hasRole = Array.isArray(requiredRole)
      ? requiredRole.includes(user?.role)
      : user?.role === requiredRole;

    if (!hasRole) {
      // User doesn't have required role - redirect to dashboard
      return <Navigate to="/dashboard" replace />;
    }
  }

  // Authenticated (and has role if required) - render children
  return children;
}

export default ProtectedRoute;
