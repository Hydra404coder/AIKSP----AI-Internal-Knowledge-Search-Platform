/**
 * =============================================================================
 * ORGANIZATION ROUTES - API ENDPOINTS FOR ORGANIZATION MANAGEMENT
 * =============================================================================
 * 
 * WHAT IS THIS FILE?
 * Defines all HTTP routes for organization management.
 * 
 * ROUTES OVERVIEW:
 * 
 * ORGANIZATION:
 * GET    /api/organizations/me           - Get my organization
 * PATCH  /api/organizations/me           - Update organization settings
 * POST   /api/organizations/rotate-key   - Rotate secret key
 * 
 * USER MANAGEMENT:
 * GET    /api/organizations/users        - List users
 * POST   /api/organizations/users        - Add user
 * PATCH  /api/organizations/users/:id    - Update user
 * DELETE /api/organizations/users/:id    - Remove user
 * 
 * ROLE MANAGEMENT:
 * GET    /api/organizations/roles        - List roles
 * POST   /api/organizations/roles        - Create role
 * PATCH  /api/organizations/roles/:key   - Update role
 * DELETE /api/organizations/roles/:key   - Delete role
 * GET    /api/organizations/privileges   - List available privileges
 * 
 * ACCESS CONTROL:
 * - All routes require authentication (protect)
 * - All routes require organization context (loadOrganization)
 * - Some routes require admin privileges
 * - Some routes require specific privileges
 * 
 * =============================================================================
 */

const express = require('express');
const organizationController = require('../controllers/organization.controller');
const { protect } = require('../middlewares/auth');
const {
  loadOrganization,
  requireOrgAdmin,
  requirePrivilege,
  requireOrgOwner,
} = require('../middlewares/organization');
const {
  validateObjectId,
  handleValidationErrors,
} = require('../middlewares/validation');
const { body } = require('express-validator');

const router = express.Router();

// =============================================================================
// ALL ROUTES REQUIRE AUTHENTICATION AND ORGANIZATION
// =============================================================================

/**
 * Apply authentication and organization loading to all routes
 * 
 * MIDDLEWARE CHAIN:
 * 1. protect - Verify JWT, attach user to req
 * 2. loadOrganization - Load org, attach to req
 */
router.use(protect);
router.use(loadOrganization);

// =============================================================================
// ORGANIZATION ROUTES
// =============================================================================

/**
 * @route   GET /api/organizations/me
 * @desc    Get current user's organization
 * @access  Private (any authenticated user)
 * 
 * NOTE: All users can view their organization info.
 * Secret key is never returned.
 */
router.get('/me', organizationController.getMyOrganization);

/**
 * @route   PATCH /api/organizations/me
 * @desc    Update organization settings
 * @access  Private (Org Admin only)
 */
router.patch(
  '/me',
  requirePrivilege('manage_organization'),
  [
    body('name')
      .optional()
      .isLength({ min: 2, max: 100 })
      .withMessage('Organization name must be 2-100 characters'),
    body('description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters'),
    handleValidationErrors,
  ],
  organizationController.updateMyOrganization
);

/**
 * @route   POST /api/organizations/rotate-key
 * @desc    Generate a new secret key
 * @access  Private (Org Owner only)
 * 
 * NOTE: This is a sensitive operation. Only the org owner can do this.
 */
router.post(
  '/rotate-key',
  requireOrgOwner,
  organizationController.rotateSecretKey
);

// =============================================================================
// USER MANAGEMENT ROUTES
// =============================================================================

/**
 * @route   GET /api/organizations/users
 * @desc    List users in organization
 * @access  Private (Org Admin only - requires manage_users privilege)
 * 
 * QUERY PARAMS:
 * - page: Page number
 * - limit: Items per page
 * - search: Search term
 * - role: Filter by role
 * - department: Filter by department
 * - isActive: Filter by active status
 */
router.get(
  '/users',
  requireOrgAdmin,
  organizationController.getOrganizationUsers
);

/**
 * @route   POST /api/organizations/users
 * @desc    Add a new user to the organization
 * @access  Private (requires manage_users)
 */
router.post(
  '/users',
  requirePrivilege('manage_users'),
  [
    body('firstName')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('First name must be 2-50 characters'),
    body('lastName')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Last name must be 2-50 characters'),
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
    body('department')
      .optional()
      .trim()
      .isLength({ max: 100 }),
    body('orgRole')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 }),
    handleValidationErrors,
  ],
  organizationController.addUser
);

/**
 * @route   PATCH /api/organizations/users/:id
 * @desc    Update a user in the organization
 * @access  Private (requires manage_users)
 */
router.patch(
  '/users/:id',
  requirePrivilege('manage_users'),
  validateObjectId('id'),
  handleValidationErrors,
  organizationController.updateUser
);

/**
 * @route   DELETE /api/organizations/users/:id
 * @desc    Remove a user from the organization
 * @access  Private (requires manage_users)
 */
router.delete(
  '/users/:id',
  requirePrivilege('manage_users'),
  validateObjectId('id'),
  handleValidationErrors,
  organizationController.removeUser
);

// =============================================================================
// ROLE MANAGEMENT ROUTES
// =============================================================================

/**
 * @route   GET /api/organizations/roles
 * @desc    List all roles in the organization
 * @access  Private (any org member can view roles)
 */
router.get('/roles', organizationController.getRoles);

/**
 * @route   POST /api/organizations/roles
 * @desc    Create a new custom role
 * @access  Private (requires manage_roles)
 */
router.post(
  '/roles',
  requirePrivilege('manage_roles'),
  [
    body('key')
      .trim()
      .isLength({ min: 2, max: 50 })
      .matches(/^[a-z0-9_]+$/)
      .withMessage('Role key must be lowercase alphanumeric with underscores'),
    body('name')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Role name must be 2-50 characters'),
    body('description')
      .optional()
      .isLength({ max: 200 }),
    body('privileges')
      .isArray({ min: 1 })
      .withMessage('At least one privilege is required'),
    handleValidationErrors,
  ],
  organizationController.createRole
);

/**
 * @route   PATCH /api/organizations/roles/:key
 * @desc    Update a role
 * @access  Private (requires manage_roles)
 */
router.patch(
  '/roles/:key',
  requirePrivilege('manage_roles'),
  organizationController.updateRole
);

/**
 * @route   DELETE /api/organizations/roles/:key
 * @desc    Delete a custom role
 * @access  Private (requires manage_roles)
 * 
 * QUERY PARAMS:
 * - newRole: Role to assign to users who had the deleted role
 */
router.delete(
  '/roles/:key',
  requirePrivilege('manage_roles'),
  organizationController.deleteRole
);

/**
 * @route   GET /api/organizations/privileges
 * @desc    List all available privileges
 * @access  Private (any org member can view)
 * 
 * NOTE: This is useful for the admin UI when configuring roles.
 */
router.get('/privileges', organizationController.getPrivileges);

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = router;
