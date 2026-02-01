/**
 * =============================================================================
 * PAGES INDEX - CENTRALIZED EXPORTS
 * =============================================================================
 * 
 * WHAT IS THIS FILE?
 * A barrel file that re-exports all page components from a single location.
 * This makes imports cleaner throughout the application.
 * 
 * INSTEAD OF:
 * import LoginPage from './pages/LoginPage';
 * import RegisterPage from './pages/RegisterPage';
 * import DashboardPage from './pages/DashboardPage';
 * 
 * WE CAN DO:
 * import { LoginPage, RegisterPage, DashboardPage } from './pages';
 * 
 * =============================================================================
 */

export { default as LoginPage } from './LoginPage';
export { default as RegisterPage } from './RegisterPage';
export { default as DashboardPage } from './DashboardPage';
export { default as DocumentsPage } from './DocumentsPage';
export { default as UploadPage } from './UploadPage';
export { default as SearchPage } from './SearchPage';
export { default as ProfilePage } from './ProfilePage';
