/**
 * =============================================================================
 * USE PRIVILEGE HOOK - PRIVILEGE-BASED ACCESS CONTROL
 * =============================================================================
 * 
 * WHAT IS THIS FILE?
 * A custom React hook for checking user privileges in the frontend.
 * This enables privilege-based UI rendering - showing/hiding elements
 * based on what the user is allowed to do.
 * 
 * USAGE EXAMPLES:
 * 
 * 1. Check a single privilege:
 *    const canUpload = usePrivilege('upload_documents');
 *    if (canUpload) { ... }
 * 
 * 2. Check multiple privileges (ANY):
 *    const canManage = useHasAnyPrivilege(['manage_users', 'manage_roles']);
 * 
 * 3. Check multiple privileges (ALL):
 *    const canDoAll = useHasAllPrivileges(['view_documents', 'delete_documents']);
 * 
 * 4. Check if user is org admin:
 *    const isAdmin = useIsOrgAdmin();
 * 
 * PRIVILEGE LIST:
 * - upload_documents: Upload new documents
 * - view_documents: View document list and content
 * - edit_documents: Edit document metadata
 * - delete_documents: Delete documents
 * - query_ai: Ask AI questions
 * - view_search_history: View search history
 * - manage_users: Add/remove org users, change roles
 * - manage_roles: Create/edit/delete roles
 * - view_analytics: View organization analytics
 * - manage_organization: Edit organization settings
 * 
 * =============================================================================
 */

import { useAuth } from '../context/AuthContext';

/**
 * Check if user has a specific privilege
 * 
 * @param {string} privilege - The privilege to check
 * @returns {boolean} - True if user has the privilege
 * 
 * @example
 * const canUpload = usePrivilege('upload_documents');
 * return canUpload ? <UploadButton /> : null;
 */
export function usePrivilege(privilege) {
  const { user } = useAuth();
  
  if (!user) return false;
  
  // Org admins have all privileges
  if (user.isOrgAdmin) return true;
  
  // Check user's privileges array
  return user.privileges?.includes(privilege) || false;
}

/**
 * Check if user has ANY of the specified privileges
 * 
 * @param {string[]} privileges - Array of privileges to check
 * @returns {boolean} - True if user has at least one privilege
 * 
 * @example
 * const canManage = useHasAnyPrivilege(['manage_users', 'manage_roles']);
 */
export function useHasAnyPrivilege(privileges) {
  const { user } = useAuth();
  
  if (!user) return false;
  if (user.isOrgAdmin) return true;
  
  return privileges.some(priv => user.privileges?.includes(priv));
}

/**
 * Check if user has ALL of the specified privileges
 * 
 * @param {string[]} privileges - Array of privileges to check
 * @returns {boolean} - True if user has all privileges
 * 
 * @example
 * const canFullManage = useHasAllPrivileges(['view_documents', 'edit_documents', 'delete_documents']);
 */
export function useHasAllPrivileges(privileges) {
  const { user } = useAuth();
  
  if (!user) return false;
  if (user.isOrgAdmin) return true;
  
  return privileges.every(priv => user.privileges?.includes(priv));
}

/**
 * Check if user is an organization admin
 * 
 * @returns {boolean} - True if user is org admin
 * 
 * @example
 * const isAdmin = useIsOrgAdmin();
 * return isAdmin ? <AdminPanel /> : null;
 */
export function useIsOrgAdmin() {
  const { user } = useAuth();
  return user?.isOrgAdmin || false;
}

/**
 * Get all privileges for the current user
 * 
 * @returns {string[]} - Array of privilege strings
 * 
 * @example
 * const privileges = usePrivileges();
 * console.log('User can:', privileges);
 */
export function usePrivileges() {
  const { user } = useAuth();
  
  if (!user) return [];
  
  // If admin, return all known privileges
  if (user.isOrgAdmin) {
    return [
      'upload_documents',
      'view_documents',
      'edit_documents',
      'delete_documents',
      'query_ai',
      'view_search_history',
      'manage_users',
      'manage_roles',
      'view_analytics',
      'manage_organization'
    ];
  }
  
  return user.privileges || [];
}

/**
 * Component wrapper that only renders children if user has privilege
 * 
 * @param {Object} props
 * @param {string|string[]} props.require - Required privilege(s)
 * @param {boolean} props.all - If true, require all privileges. If false, require any.
 * @param {React.ReactNode} props.children - Children to render if authorized
 * @param {React.ReactNode} props.fallback - Optional fallback to render if unauthorized
 * 
 * @example
 * <RequirePrivilege require="upload_documents">
 *   <UploadButton />
 * </RequirePrivilege>
 * 
 * <RequirePrivilege require={['manage_users', 'manage_roles']} all={false}>
 *   <AdminMenu />
 * </RequirePrivilege>
 */
export function RequirePrivilege({ require, all = false, children, fallback = null }) {
  const { user } = useAuth();
  
  if (!user) return fallback;
  if (user.isOrgAdmin) return children;
  
  const privileges = Array.isArray(require) ? require : [require];
  
  const hasAccess = all
    ? privileges.every(priv => user.privileges?.includes(priv))
    : privileges.some(priv => user.privileges?.includes(priv));
  
  return hasAccess ? children : fallback;
}

/**
 * Component wrapper that only renders children if user is org admin
 * 
 * @example
 * <RequireOrgAdmin>
 *   <OrgSettingsPanel />
 * </RequireOrgAdmin>
 */
export function RequireOrgAdmin({ children, fallback = null }) {
  const { user } = useAuth();
  return user?.isOrgAdmin ? children : fallback;
}

// Default export for convenience
export default usePrivilege;
