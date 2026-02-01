/**
 * =============================================================================
 * APP.JSX - ROOT REACT COMPONENT
 * =============================================================================
 * 
 * WHAT IS THIS FILE?
 * The root component that sets up:
 * - React Router for navigation
 * - Authentication context
 * - Global layout
 * 
 * COMPONENT STRUCTURE:
 * App
 * ├── AuthProvider (context for auth state)
 * │   └── BrowserRouter (handles URL routing)
 * │       └── Routes (defines URL → component mapping)
 * │           ├── PublicRoute → LoginPage
 * │           ├── ProtectedRoute → Dashboard
 * │           ├── ProtectedRoute → Documents
 * │           └── ProtectedRoute → Search
 * 
 * ROUTING EXPLAINED:
 * React Router maps URLs to components:
 * - /login → LoginPage
 * - /dashboard → DashboardPage
 * - /documents → DocumentsPage
 * - /search → SearchPage
 * 
 * =============================================================================
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import OrgSignupPage from './pages/OrgSignupPage';
import EmployeeSignupPage from './pages/EmployeeSignupPage';
import DashboardPage from './pages/DashboardPage';
import DocumentsPage from './pages/DocumentsPage';
import DocumentDetailPage from './pages/DocumentDetailPage';
import CollectionDetailPage from './pages/CollectionDetailPage';
import UploadPage from './pages/UploadPage';
import SearchPage from './pages/SearchPage';
import ProfilePage from './pages/ProfilePage';
import OrgAdminPage from './pages/OrgAdminPage';

/**
 * App Component
 * 
 * The root component that wraps everything.
 * 
 * WHY CONTEXT OUTSIDE ROUTER?
 * AuthContext needs to be available everywhere, including inside routes.
 * Putting it outside BrowserRouter ensures all components can access it.
 */
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes - No authentication required */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* Organization Signup Routes */}
          <Route path="/signup/organization" element={<OrgSignupPage />} />
          <Route path="/signup/employee" element={<EmployeeSignupPage />} />

          {/* Protected Routes - Authentication required */}
          {/* Each protected route wraps its page in Layout */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <DashboardPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/documents"
            element={
              <ProtectedRoute>
                <Layout>
                  <DocumentsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/documents/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <DocumentDetailPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/collections/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <CollectionDetailPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/upload"
            element={
              <ProtectedRoute>
                <Layout>
                  <UploadPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/search"
            element={
              <ProtectedRoute>
                <Layout>
                  <SearchPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Layout>
                  <ProfilePage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <Layout>
                  <OrgAdminPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Root redirect to dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Catch all - redirect to dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
