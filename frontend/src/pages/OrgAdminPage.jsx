/**
 * =============================================================================
 * ORGANIZATION ADMIN PAGE - MANAGE ORGANIZATION USERS AND ROLES
 * =============================================================================
 * 
 * WHAT IS THIS FILE?
 * The admin dashboard for organization administrators to manage:
 * - Organization settings
 * - Users (invite, update roles, remove)
 * - Roles and privileges
 * - Secret key rotation
 * 
 * ACCESS CONTROL:
 * This page is only accessible to organization admins (isOrgAdmin = true).
 * Regular users will see an "Access Denied" message.
 * 
 * =============================================================================
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  Users,
  Shield,
  Key,
  Building2,
  Settings,
  UserPlus,
  UserMinus,
  Edit2,
  Trash2,
  Copy,
  Check,
  AlertCircle,
  RefreshCcw,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle
} from 'lucide-react';

function OrgAdminPage() {
  const { user } = useAuth();
  
  // State
  const [activeTab, setActiveTab] = useState('users');
  const [organization, setOrganization] = useState(null);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [availablePrivileges, setAvailablePrivileges] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [collectionRequests, setCollectionRequests] = useState([]);
  
  // Secret key state
  const [newSecretKey, setNewSecretKey] = useState('');
  const [keyCopied, setKeyCopied] = useState(false);
  const [isRotatingKey, setIsRotatingKey] = useState(false);
  
  // Modal states
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);

  /**
   * Fetch organization data on mount
   */
  useEffect(() => {
    fetchOrganizationData();
  }, []);

  const fetchOrganizationData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch all data in parallel
      const [orgResponse, usersResponse, rolesResponse, privilegesResponse, requestsResponse] = await Promise.all([
        api.get('/organizations/me'),
        api.get('/organizations/users'),
        api.get('/organizations/roles'),
        api.get('/organizations/privileges'),
        api.get('/collections/requests')
      ]);
      
      // The API response interceptor returns response.data directly
      // So orgResponse = { success: true, data: {...} }
      if (orgResponse.success && orgResponse.data) {
        setOrganization(orgResponse.data);
      }

      // Users endpoint may return a paginated object { users, total, page, pages }
      // or an array of users depending on the API. Handle both shapes defensively.
      if (usersResponse.success && usersResponse.data) {
        const raw = usersResponse.data;
        const usersArray = Array.isArray(raw)
          ? raw
          : Array.isArray(raw.users)
            ? raw.users
            : [];
        setUsers(usersArray);
      }
      
      if (rolesResponse.success && rolesResponse.data) {
        setRoles(rolesResponse.data);
      }
      
      if (privilegesResponse.success && privilegesResponse.data) {
        setAvailablePrivileges(privilegesResponse.data);
      }

      if (requestsResponse.success && requestsResponse.data) {
        setCollectionRequests(Array.isArray(requestsResponse.data) ? requestsResponse.data : []);
      }
    } catch (err) {
      console.error('Failed to fetch organization data:', err);
      setError('Failed to load organization data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Rotate secret key
   */
  const handleRotateKey = async () => {
    if (!window.confirm('Are you sure you want to rotate the secret key? The old key will no longer work.')) {
      return;
    }
    
    try {
      setIsRotatingKey(true);
      setError(null);
      
      const response = await api.post('/organizations/rotate-key');
      
      if (response.success && response.data) {
        setNewSecretKey(response.data.secretKey);
        setSuccessMessage('Secret key rotated successfully. Save the new key!');
      }
    } catch (err) {
      setError('Failed to rotate secret key. Please try again.');
    } finally {
      setIsRotatingKey(false);
    }
  };

  /**
   * Copy secret key to clipboard
   */
  const copySecretKey = async () => {
    try {
      await navigator.clipboard.writeText(newSecretKey);
      setKeyCopied(true);
      setTimeout(() => setKeyCopied(false), 2000);
    } catch (err) {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = newSecretKey;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setKeyCopied(true);
      setTimeout(() => setKeyCopied(false), 2000);
    }
  };

  /**
   * Update user role
   */
  const handleUpdateUserRole = async (userId, newRole) => {
    try {
      setError(null);
      
      const response = await api.patch(`/organizations/users/${userId}`, { orgRole: newRole });
      
      if (response.success) {
        // Update local state
        setUsers(users.map(u => u._id === userId ? { ...u, orgRole: newRole } : u));
        setSuccessMessage('User role updated successfully.');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err) {
      setError('Failed to update user role. Please try again.');
    }
  };

  /**
   * Remove user from organization
   */
  const handleRemoveUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to remove ${userName} from the organization?`)) {
      return;
    }
    
    try {
      setError(null);
      
      const response = await api.delete(`/organizations/users/${userId}`);
      
      if (response.success) {
        setUsers(users.filter(u => u._id !== userId));
        setSuccessMessage('User removed from organization.');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err) {
      setError('Failed to remove user. Please try again.');
    }
  };

  const handleApproveCollection = async (collectionId) => {
    try {
      setError(null);
      const response = await api.post(`/collections/${collectionId}/approve`);
      if (response.success) {
        setCollectionRequests(prev => prev.filter(r => r._id !== collectionId));
        setSuccessMessage('Collection approved and made public.');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err) {
      setError('Failed to approve collection. Please try again.');
    }
  };

  const handleRejectCollection = async (collectionId) => {
    try {
      setError(null);
      const response = await api.post(`/collections/${collectionId}/reject`, {
        reason: 'Rejected by admin',
      });
      if (response.success) {
        setCollectionRequests(prev => prev.filter(r => r._id !== collectionId));
        setSuccessMessage('Collection request rejected.');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err) {
      setError('Failed to reject collection. Please try again.');
    }
  };

  // Check if user is admin
  if (!user?.isOrgAdmin) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-800 mb-2">Access Denied</h2>
          <p className="text-red-600">
            You don't have permission to access organization settings. 
            Please contact your organization admin.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Organization Settings
          </h1>
          <p className="text-gray-600">
            Manage your organization, users, and roles
          </p>
        </div>
        <button
          onClick={fetchOrganizationData}
          className="btn btn-secondary"
        >
          <RefreshCcw className="h-4 w-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
          <AlertCircle className="h-5 w-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      
      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start">
          <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-green-700">{successMessage}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('users')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'users'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Users className="inline h-5 w-5 mr-2" />
            Users
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'roles'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Shield className="inline h-5 w-5 mr-2" />
            Roles
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'settings'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Settings className="inline h-5 w-5 mr-2" />
            Settings
          </button>
        </nav>
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">
              Organization Members ({users.length})
            </h2>
          </div>
          
          <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((member) => (
                  <tr key={member._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <span className="text-primary-600 font-medium text-sm">
                            {member.firstName?.[0]}{member.lastName?.[0]}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {member.firstName} {member.lastName}
                            {member.isOrgAdmin && (
                              <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded">
                                Admin
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">{member.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={member.orgRole}
                        onChange={(e) => handleUpdateUserRole(member._id, e.target.value)}
                        disabled={member._id === user._id}
                        className="text-sm border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      >
                        {roles.map((role) => (
                          <option key={role.key} value={role.key}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.department || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        member.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {member.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {member._id !== user._id && (
                        <button
                          onClick={() => handleRemoveUser(member._id, `${member.firstName} ${member.lastName}`)}
                          className="text-red-600 hover:text-red-900"
                          title="Remove from organization"
                        >
                          <UserMinus className="h-5 w-5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Roles Tab */}
      {activeTab === 'roles' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">
              Organization Roles ({roles.length})
            </h2>
          </div>
          
          <div className="grid gap-4">
            {roles.map((role) => (
              <div key={role.key} className="bg-white shadow-sm border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900">{role.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{role.description}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded ${
                    role.isDefault 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {role.isDefault ? 'Default' : 'Custom'}
                  </span>
                </div>
                <div className="mt-3">
                  <p className="text-xs text-gray-500 mb-2">Privileges:</p>
                  <div className="flex flex-wrap gap-2">
                    {role.privileges.map((priv) => (
                      <span 
                        key={priv} 
                        className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                      >
                        {priv.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Organization Info */}
          <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              <Building2 className="inline h-5 w-5 mr-2" />
              Organization Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Name</label>
                <p className="mt-1 text-gray-900">{organization?.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Created</label>
                <p className="mt-1 text-gray-900">
                  {organization?.createdAt ? new Date(organization.createdAt).toLocaleDateString() : '-'}
                </p>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-500">Description</label>
                <p className="mt-1 text-gray-900">{organization?.description || 'No description'}</p>
              </div>
            </div>
          </div>

          {/* Secret Key Management */}
          <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              <Key className="inline h-5 w-5 mr-2" />
              Secret Key Management
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              The secret key is used by employees to join your organization. 
              Rotate it if you suspect it has been compromised.
            </p>
            
            {newSecretKey ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-800 mb-2">
                  <strong>New Secret Key Generated!</strong> Save this key - it won't be shown again.
                </p>
                <div className="bg-white border border-yellow-300 rounded-md p-3 flex items-center justify-between">
                  <code className="text-lg font-mono font-bold text-gray-900">
                    {newSecretKey}
                  </code>
                  <button
                    onClick={copySecretKey}
                    className="ml-4 p-2 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-100 rounded-md transition-colors"
                  >
                    {keyCopied ? (
                      <Check className="h-5 w-5 text-green-600" />
                    ) : (
                      <Copy className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            ) : null}
            
            <button
              onClick={handleRotateKey}
              disabled={isRotatingKey}
              className="btn btn-secondary"
            >
              {isRotatingKey ? (
                <>
                  <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
                  Rotating...
                </>
              ) : (
                <>
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  Rotate Secret Key
                </>
              )}
            </button>
          </div>

          {/* Collection Requests */}
          <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              <Key className="inline h-5 w-5 mr-2" />
              Collection Public Requests
            </h3>
            {collectionRequests.length === 0 ? (
              <p className="text-sm text-gray-600">No pending requests.</p>
            ) : (
              <div className="space-y-3">
                {collectionRequests.map((request) => (
                  <div key={request._id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{request.name}</p>
                        <p className="text-xs text-gray-500">
                          Requested by {request.requestedBy?.firstName} {request.requestedBy?.lastName}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleApproveCollection(request._id)}
                          className="px-3 py-1 rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                          title="Approve"
                        >
                          ✅ Approve
                        </button>
                        <button
                          onClick={() => handleRejectCollection(request._id)}
                          className="px-3 py-1 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700"
                          title="Reject"
                        >
                          ❌ Reject
                        </button>
                      </div>
                    </div>
                    {Array.isArray(request.documents) && request.documents.length > 0 && (
                      <div className="mt-3 text-xs text-gray-600">
                        <p className="font-medium mb-1">Documents:</p>
                        <ul className="list-disc ml-4 space-y-1">
                          {request.documents.map((doc) => (
                            <li key={doc._id}>{doc.title}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Organization Stats */}
          <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Organization Statistics
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-3xl font-bold text-primary-600">{users.length}</p>
                <p className="text-sm text-gray-500">Total Users</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-3xl font-bold text-primary-600">{roles.length}</p>
                <p className="text-sm text-gray-500">Roles</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-3xl font-bold text-primary-600">
                  {organization?.stats?.documentCount || 0}
                </p>
                <p className="text-sm text-gray-500">Documents</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrgAdminPage;
