/**
 * =============================================================================
 * ORGANIZATION CONTROLLER - HTTP HANDLERS FOR ORGANIZATION OPERATIONS
 * =============================================================================
 * 
 * WHAT IS THIS FILE?
 * Handles HTTP requests for organization management.
 * 
 * ENDPOINTS:
 * - GET    /api/organizations/me          - Get current user's organization
 * - PATCH  /api/organizations/me          - Update organization settings
 * - POST   /api/organizations/rotate-key  - Rotate secret key
 * - GET    /api/organizations/users       - List users in organization
 * - POST   /api/organizations/users       - Add user to organization
 * - PATCH  /api/organizations/users/:id   - Update user
 * - DELETE /api/organizations/users/:id   - Remove user
 * - GET    /api/organizations/roles       - List roles
 * - POST   /api/organizations/roles       - Create role
 * - PATCH  /api/organizations/roles/:key  - Update role
 * - DELETE /api/organizations/roles/:key  - Delete role
 * - GET    /api/organizations/privileges  - List available privileges
 * 
 * =============================================================================
 */

const organizationService = require('../services/organization.service');
const logger = require('../utils/logger');

/**
 * asyncHandler - Wraps async functions to catch errors
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// =============================================================================
// ORGANIZATION MANAGEMENT
// =============================================================================

/**
 * getMyOrganization()
 * 
 * HTTP: GET /api/organizations/me
 * 
 * WHAT: Gets the current user's organization details
 * 
 * RESPONSE:
 * - Organization info (name, settings, stats)
 * - User's role and privileges
 * - Does NOT include secret key
 */
const getMyOrganization = asyncHandler(async (req, res) => {
  const organization = req.organization;
  
  // Build response with user context
  const response = {
    id: organization._id,
    name: organization.name,
    slug: organization.slug,
    description: organization.description,
    settings: organization.settings,
    stats: organization.stats,
    defaultRole: organization.defaultRole,
    secretKeyHint: organization.secretKeyHint,
    secretKeyLastRotated: organization.secretKeyLastRotated,
    isOwner: organization.owner.toString() === req.user._id.toString(),
    createdAt: organization.createdAt,
    // Include user's context
    userRole: req.user.orgRole,
    userPrivileges: req.userPrivileges,
    isAdmin: req.user.isOrgAdmin,
  };

  res.status(200).json({
    success: true,
    data: response,
  });
});

/**
 * updateMyOrganization()
 * 
 * HTTP: PATCH /api/organizations/me
 * 
 * WHAT: Updates organization settings
 * 
 * REQUEST BODY:
 * - name (optional)
 * - description (optional)
 * - settings (optional)
 * - defaultRole (optional)
 * - secretKeyHint (optional)
 */
const updateMyOrganization = asyncHandler(async (req, res) => {
  const organization = await organizationService.updateOrganization(
    req.organization._id,
    req.body
  );

  res.status(200).json({
    success: true,
    message: 'Organization updated successfully',
    data: organization,
  });
});

/**
 * rotateSecretKey()
 * 
 * HTTP: POST /api/organizations/rotate-key
 * 
 * WHAT: Generates a new secret key
 * 
 * IMPORTANT: The new key is returned ONCE.
 * Make sure the admin saves it.
 */
const rotateSecretKey = asyncHandler(async (req, res) => {
  const plainKey = await organizationService.rotateSecretKey(
    req.organization._id
  );

  res.status(200).json({
    success: true,
    message: 'Secret key rotated successfully. Save this key - it will not be shown again.',
    data: {
      secretKey: plainKey,
    },
  });
});

// =============================================================================
// USER MANAGEMENT
// =============================================================================

/**
 * getOrganizationUsers()
 * 
 * HTTP: GET /api/organizations/users
 * 
 * QUERY PARAMS:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 * - search: Search by name/email
 * - role: Filter by role
 * - department: Filter by department
 * - isActive: Filter by active status
 */
const getOrganizationUsers = asyncHandler(async (req, res) => {
  const result = await organizationService.getOrganizationUsers(
    req.organization._id,
    {
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search,
      role: req.query.role,
      department: req.query.department,
      isActive: req.query.isActive === 'true' ? true : 
                req.query.isActive === 'false' ? false : null,
    }
  );

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * addUser()
 * 
 * HTTP: POST /api/organizations/users
 * 
 * REQUEST BODY:
 * - firstName (required)
 * - lastName (required)
 * - email (required)
 * - password (required)
 * - department (optional)
 * - orgRole (optional, defaults to org default)
 * - privileges (optional)
 * - isOrgAdmin (optional)
 */
const addUser = asyncHandler(async (req, res) => {
  const user = await organizationService.addUserToOrganization(
    req.organization._id,
    req.body,
    req.user._id
  );

  res.status(201).json({
    success: true,
    message: 'User added successfully',
    data: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      department: user.department,
      orgRole: user.orgRole,
      isOrgAdmin: user.isOrgAdmin,
    },
  });
});

/**
 * updateUser()
 * 
 * HTTP: PATCH /api/organizations/users/:id
 * 
 * REQUEST BODY:
 * Any of: firstName, lastName, department, orgRole, privileges, isOrgAdmin, isActive
 */
const updateUser = asyncHandler(async (req, res) => {
  const user = await organizationService.updateOrganizationUser(
    req.organization._id,
    req.params.id,
    req.body,
    req.user._id
  );

  res.status(200).json({
    success: true,
    message: 'User updated successfully',
    data: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      department: user.department,
      orgRole: user.orgRole,
      isOrgAdmin: user.isOrgAdmin,
      isActive: user.isActive,
    },
  });
});

/**
 * removeUser()
 * 
 * HTTP: DELETE /api/organizations/users/:id
 * 
 * WHAT: Deactivates a user (soft delete)
 */
const removeUser = asyncHandler(async (req, res) => {
  await organizationService.removeUserFromOrganization(
    req.organization._id,
    req.params.id,
    req.user._id
  );

  res.status(200).json({
    success: true,
    message: 'User removed successfully',
  });
});

// =============================================================================
// ROLE MANAGEMENT
// =============================================================================

/**
 * getRoles()
 * 
 * HTTP: GET /api/organizations/roles
 * 
 * WHAT: Lists all roles in the organization
 */
const getRoles = asyncHandler(async (req, res) => {
  const roles = await organizationService.getRoles(req.organization._id);

  res.status(200).json({
    success: true,
    data: roles,
  });
});

/**
 * createRole()
 * 
 * HTTP: POST /api/organizations/roles
 * 
 * REQUEST BODY:
 * - key (required): Unique identifier
 * - name (required): Display name
 * - description (optional)
 * - privileges (required): Array of privilege keys
 */
const createRole = asyncHandler(async (req, res) => {
  const roles = await organizationService.createRole(
    req.organization._id,
    req.body
  );

  res.status(201).json({
    success: true,
    message: 'Role created successfully',
    data: roles,
  });
});

/**
 * updateRole()
 * 
 * HTTP: PATCH /api/organizations/roles/:key
 * 
 * REQUEST BODY:
 * Any of: name, description, privileges, isDefault
 */
const updateRole = asyncHandler(async (req, res) => {
  const roles = await organizationService.updateRole(
    req.organization._id,
    req.params.key,
    req.body
  );

  res.status(200).json({
    success: true,
    message: 'Role updated successfully',
    data: roles,
  });
});

/**
 * deleteRole()
 * 
 * HTTP: DELETE /api/organizations/roles/:key
 * 
 * QUERY PARAMS:
 * - newRole: Role to assign to users who had the deleted role
 */
const deleteRole = asyncHandler(async (req, res) => {
  const roles = await organizationService.deleteRole(
    req.organization._id,
    req.params.key,
    req.query.newRole
  );

  res.status(200).json({
    success: true,
    message: 'Role deleted successfully',
    data: roles,
  });
});

/**
 * getPrivileges()
 * 
 * HTTP: GET /api/organizations/privileges
 * 
 * WHAT: Lists all available privileges
 */
const getPrivileges = asyncHandler(async (req, res) => {
  const privileges = organizationService.getAvailablePrivileges();

  res.status(200).json({
    success: true,
    data: privileges,
  });
});

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  // Organization
  getMyOrganization,
  updateMyOrganization,
  rotateSecretKey,
  
  // Users
  getOrganizationUsers,
  addUser,
  updateUser,
  removeUser,
  
  // Roles
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  getPrivileges,
};
