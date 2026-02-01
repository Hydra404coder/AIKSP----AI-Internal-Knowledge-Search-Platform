/**
 * =============================================================================
 * LAYOUT COMPONENT - MAIN APPLICATION LAYOUT WITH NAVIGATION
 * =============================================================================
 * 
 * WHAT IS THIS FILE?
 * The main layout wrapper that provides consistent navigation, sidebar,
 * and footer across all authenticated pages.
 * 
 * LAYOUT STRUCTURE:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                         NAVBAR (Header)                         │
 * ├─────────────┬───────────────────────────────────────────────────┤
 * │             │                                                   │
 * │   SIDEBAR   │              MAIN CONTENT AREA                    │
 * │             │              (children)                           │
 * │             │                                                   │
 * ├─────────────┴───────────────────────────────────────────────────┤
 * │                         FOOTER (Optional)                        │
 * └─────────────────────────────────────────────────────────────────┘
 * 
 * =============================================================================
 */

import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePrivilege, useIsOrgAdmin } from '../hooks/usePrivilege';

// Import Lucide icons for navigation
import {
  Home,
  Search,
  FileText,
  Upload,
  User,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Settings,
  Shield,
  Brain,
  BookOpen
} from 'lucide-react';

/**
 * Layout Component
 * 
 * This component wraps all authenticated pages and provides:
 * - Responsive navigation bar
 * - Collapsible sidebar
 * - User menu dropdown
 * - Consistent styling
 */
function Layout({ children }) {
  // State for mobile menu toggle
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // State for user dropdown menu
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  
  // Get current route for active link highlighting
  const location = useLocation();
  
  // Navigation function
  const navigate = useNavigate();
  
  // Get auth context for user info and logout
  const { user, logout } = useAuth();
  
  // Check user privileges
  const canUpload = usePrivilege('upload_documents');
  const canViewDocuments = usePrivilege('view_documents');
  const canQueryAI = usePrivilege('query_ai');
  const isOrgAdmin = useIsOrgAdmin();

  /**
   * Navigation items configuration
   * Each item has:
   * - name: Display text
   * - href: Route path
   * - icon: Lucide icon component
   * - description: Tooltip text (optional)
   * - show: Boolean to conditionally show/hide based on privileges
   */
  const navigation = [
    { 
      name: 'Dashboard', 
      href: '/dashboard', 
      icon: Home,
      description: 'Overview and stats',
      show: true // Always show dashboard
    },
    { 
      name: 'Search', 
      href: '/search', 
      icon: Search,
      description: 'Search documents and ask questions',
      show: canQueryAI || canViewDocuments // Show if can search or view docs
    },
    { 
      name: 'Documents', 
      href: '/documents', 
      icon: FileText,
      description: 'Browse all documents',
      show: canViewDocuments
    },
    { 
      name: 'Upload', 
      href: '/upload', 
      icon: Upload,
      description: 'Upload new documents',
      show: canUpload
    },
    { 
      name: 'Admin', 
      href: '/admin', 
      icon: Shield,
      description: 'Organization settings',
      show: isOrgAdmin
    },
  ].filter(item => item.show); // Filter out items user can't access

  /**
   * Handle logout click
   * Logs out user and redirects to login page
   */
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  /**
   * Check if a link is currently active
   * Used for highlighting the current page in navigation
   */
  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ============== TOP NAVIGATION BAR ============== */}
      <nav className="bg-white/80 backdrop-blur-xl shadow-sm border-b border-slate-200/60 fixed w-full z-30 top-0">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Left side: Logo and mobile menu button */}
            <div className="flex items-center">
              {/* Mobile menu button */}
              <button
                type="button"
                className="lg:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <span className="sr-only">Open sidebar</span>
                {sidebarOpen ? (
                  <X className="block h-6 w-6" />
                ) : (
                  <Menu className="block h-6 w-6" />
                )}
              </button>

              {/* Logo */}
              <Link to="/dashboard" className="flex items-center ml-2 lg:ml-0 group">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary-600 to-secondary-600 rounded-xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity" />
                  <div className="relative bg-gradient-to-r from-primary-600 to-secondary-600 p-2 rounded-xl">
                    <Brain className="h-6 w-6 text-white" />
                  </div>
                </div>
                <span className="ml-3 text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent hidden sm:block">
                  AI Knowledge Search
                </span>
                <span className="ml-3 text-xl font-bold text-slate-900 sm:hidden">
                  AIKSP
                </span>
              </Link>
            </div>

            {/* Right side: User menu */}
            <div className="flex items-center">
              {/* User dropdown */}
              <div className="relative ml-3">
                <button
                  type="button"
                  className="flex items-center max-w-xs bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 lg:p-2.5 lg:hover:bg-slate-50 transition-all border border-transparent lg:border-slate-200 lg:hover:border-slate-300"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                >
                  {/* User avatar */}
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-600 flex items-center justify-center text-white font-semibold shadow-lg shadow-primary-500/25">
                    {user?.firstName?.charAt(0) || 'U'}
                  </div>
                  
                  {/* User name (hidden on mobile) */}
                  <span className="hidden lg:flex lg:items-center lg:ml-3">
                    <span className="text-sm font-semibold text-slate-700">
                      {user?.firstName} {user?.lastName}
                    </span>
                    <ChevronDown className="ml-1.5 h-4 w-4 text-slate-400" />
                  </span>
                </button>

                {/* Dropdown menu */}
                {userMenuOpen && (
                  <>
                    {/* Backdrop to close menu when clicking outside */}
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setUserMenuOpen(false)} 
                    />
                    
                    {/* Menu items */}
                    <div className="absolute right-0 z-20 mt-2 w-56 origin-top-right rounded-xl bg-white py-2 shadow-xl ring-1 ring-slate-900/5 focus:outline-none animate-scale-in">
                      {/* User info */}
                      <div className="px-4 py-3 border-b border-slate-100">
                        <p className="text-sm font-semibold text-slate-900">
                          {user?.firstName} {user?.lastName}
                        </p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {user?.email}
                        </p>
                        <span className="inline-flex items-center mt-2 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r from-primary-50 to-secondary-50 text-primary-700 capitalize">
                          {user?.role?.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Menu links */}
                      <Link
                        to="/profile"
                        className="flex items-center px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <User className="mr-3 h-4 w-4 text-slate-400" />
                        Your Profile
                      </Link>
                      
                      <Link
                        to="/settings"
                        className="flex items-center px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Settings className="mr-3 h-4 w-4 text-slate-400" />
                        Settings
                      </Link>

                      {/* Admin link (only for admins) */}
                      {user?.isOrgAdmin && (
                        <Link
                          to="/admin"
                          className="flex items-center px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Shield className="mr-3 h-4 w-4 text-slate-400" />
                          Organization Admin
                        </Link>
                      )}

                      <div className="border-t border-slate-100 mt-2 pt-2">
                        {/* Logout button */}
                        <button
                          onClick={handleLogout}
                          className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <LogOut className="mr-3 h-4 w-4" />
                          Sign out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* ============== SIDEBAR ============== */}
      {/* 
        Two sidebars:
        1. Mobile sidebar (overlay) - shown when sidebarOpen is true
        2. Desktop sidebar (fixed) - always visible on large screens
      */}

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-20 w-72 bg-white border-r border-slate-200/60 pt-16
          transform transition-transform duration-300 ease-in-out
          lg:transform-none lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="h-full overflow-y-auto px-4 py-6">
          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    group flex items-center px-4 py-3 text-sm font-medium rounded-xl
                    transition-all duration-200 ease-in-out
                    ${active 
                      ? 'bg-gradient-to-r from-primary-50 to-secondary-50 text-primary-700 shadow-sm' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }
                  `}
                  title={item.description}
                >
                  <div className={`
                    p-2 rounded-lg mr-3 transition-colors
                    ${active 
                      ? 'bg-gradient-to-br from-primary-500 to-secondary-600 text-white shadow-lg shadow-primary-500/30' 
                      : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700'
                    }
                  `}>
                    <Icon className="h-4 w-4" />
                  </div>
                  {item.name}
                  {active && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-500" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Quick Tips Section */}
          <div className="mt-8 p-5 bg-gradient-to-br from-primary-50 via-secondary-50 to-primary-50 rounded-2xl border border-primary-100/50">
            <div className="flex items-center mb-3">
              <div className="p-2 bg-gradient-to-br from-primary-500 to-secondary-600 rounded-lg shadow-lg shadow-primary-500/25">
                <BookOpen className="h-4 w-4 text-white" />
              </div>
              <h3 className="ml-3 text-sm font-bold text-slate-900">Quick Tips</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Ask questions in natural language like "What is our refund policy?" 
              for AI-powered answers from your documents.
            </p>
          </div>

          {/* Version info */}
          <div className="absolute bottom-6 left-0 right-0 px-4">
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Version 1.0.0</span>
            </div>
          </div>
        </div>
      </aside>

      {/* ============== MAIN CONTENT AREA ============== */}
      <main className="lg:pl-72 pt-16">
        {/* 
          pt-16: Top padding for the fixed navbar (h-16 = 4rem = 64px)
          lg:pl-72: Left padding for the sidebar on large screens (w-72 = 18rem)
        */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}

export default Layout;
