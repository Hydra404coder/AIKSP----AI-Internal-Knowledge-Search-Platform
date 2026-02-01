/**
 * =============================================================================
 * ORGANIZATION MIDDLEWARE - MULTI-TENANCY ACCESS CONTROL
 * =============================================================================
 * 
 * WHAT IS THIS FILE?
 * Middleware for enforcing organization-based access control.
 * Ensures users can only access their organization's data.
 * 
 * WHAT IS MULTI-TENANCY?
 * A software architecture where a single instance serves multiple
 * organizations (tenants), with complete data isolation between them.
 * 
 * MIDDLEWARE IN THIS FILE:
 * 1. loadOrganization - Loads the user's organization
 * 2. requirePrivilege - Checks if user has specific privilege
 * 3. requireOrgAdmin - Checks if user is an org admin
 * 4. scopeToOrganization - Adds org filter to queries
 * 
 * HOW ORGANIZATION ACCESS CONTROL WORKS:
 * 
 * REQUEST FLOW:
 * 1. User makes request with JWT token
 * 2. protect() middleware verifies JWT, attaches user to req
 * 3. loadOrganization() loads user's org, attaches to req
 * 4. requirePrivilege('action') checks if user can perform action
 * 5. Route handler executes with org-scoped data
 * 
 * EXAMPLE ROUTE:
 * router.post(
 *   '/documents',
 *   protect,                              // Verify user is logged in
 *   loadOrganization,                     // Load their organization
 *   requirePrivilege('upload_documents'), // Check they can upload
 *   uploadDocument                        // Handle the request
 * );
 * 
 * DATA ISOLATION:
 * Every query must include the organization filter.
 * Document.find({ organization: req.organization._id, ... })
 * This prevents users from seeing other organizations' data.
 * 
 * =============================================================================
 */

const { Organization, ALL_PRIVILEGES } = require('../models');
const { AppError } = require('./errorHandler');
const logger = require('../utils/logger');

/**
 * loadOrganization()
 * 
 * WHAT: Loads the user's organization and attaches it to the request
 * 
 * WHY?
 * - Organization data is needed for privilege checks
 * - Reduces repeated database queries
 * - Makes org data available to all downstream handlers
 * 
 * ATTACHES TO REQ:
 * - req.organization: The full organization document
 * - req.userPrivileges: Array of user's privileges
 * 
 * PREREQUISITES:
 * - protect() must run first (provides req.user)
 * 
 * ERROR CASES:
 * - User has no organization
 * - Organization doesn't exist
 * - Organization is inactive
 */
const loadOrganization = async (req, res, next) => {
  try {
    // Ensure user is authenticated
    if (!req.user) {
      return next(new AppError('Authentication required.', 401));
    }

    // Check if user has an organization
    if (!req.user.organization) {
      return next(new AppError('User is not associated with any organization.', 403));
    }

    // Load the organization with roles
    const organization = await Organization.findById(req.user.organization);

    if (!organization) {
      return next(new AppError('Organization not found.', 404));
    }

    if (!organization.isActive) {
      return next(new AppError('Your organization has been deactivated. Please contact support.', 403));
    }

    // Attach organization to request
    req.organization = organization;

    // Calculate and attach user's privileges for quick access
    req.userPrivileges = req.user.getAllPrivileges(organization);

    // Log for debugging
    logger.debug('Organization loaded', {
      userId: req.user._id,
      orgId: organization._id,
      orgName: organization.name,
      userRole: req.user.orgRole,
      privilegeCount: req.userPrivileges.length,
    });

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * requirePrivilege()
 * 
 * WHAT: Middleware factory that checks if user has a specific privilege
 * 
 * HOW IT WORKS:
 * 1. Takes privilege name(s) as parameter
 * 2. Returns middleware that checks if user has ANY of those privileges
 * 3. If not, returns 403 Forbidden
 * 
 * PRIVILEGE SOURCES:
 * 1. User's role privileges (from organization)
 * 2. User's direct privileges
 * 3. Org admin always passes
 * 
 * USAGE:
 * // Single privilege
 * router.post('/upload', requirePrivilege('upload_documents'), uploadHandler);
 * 
 * // Multiple privileges (user needs ANY one)
 * router.get('/stats', requirePrivilege('view_analytics', 'manage_organization'), statsHandler);
 * 
 * PREREQUISITES:
 * - loadOrganization() must run first (provides req.organization, req.userPrivileges)
 * 
 * @param {...string} privileges - One or more privilege names
 * @returns {Function} Express middleware
 */
const requirePrivilege = (...privileges) => {
  return (req, res, next) => {
    // Ensure organization is loaded
    if (!req.organization) {
      return next(new AppError('Organization context required. Use loadOrganization middleware first.', 500));
    }

    // Org admins bypass privilege checks
    if (req.user.isOrgAdmin) {
      logger.debug('Privilege check bypassed for org admin', {
        userId: req.user._id,
        requiredPrivileges: privileges,
      });
      return next();
    }

    // Check if user has ANY of the required privileges
    const hasPrivilege = privileges.some(privilege => 
      req.userPrivileges.includes(privilege)
    );

    if (!hasPrivilege) {
      logger.warn('Privilege check failed', {
        userId: req.user._id,
        requiredPrivileges: privileges,
        userPrivileges: req.userPrivileges,
      });

      return next(new AppError(
        `You don't have permission to perform this action. Required: ${privileges.join(' or ')}`,
        403
      ));
    }

    logger.debug('Privilege check passed', {
      userId: req.user._id,
      requiredPrivileges: privileges,
    });

    next();
  };
};

/**
 * requireAllPrivileges()
 * 
 * WHAT: Checks if user has ALL specified privileges
 * 
 * DIFFERENT FROM requirePrivilege():
 * - requirePrivilege: User needs ANY one privilege
 * - requireAllPrivileges: User needs ALL privileges
 * 
 * USAGE:
 * router.delete(
 *   '/user/:id',
 *   requireAllPrivileges('manage_users', 'delete_users'),
 *   deleteUser
 * );
 * 
 * @param {...string} privileges - Privileges user must have ALL of
 * @returns {Function} Express middleware
 */
const requireAllPrivileges = (...privileges) => {
  return (req, res, next) => {
    if (!req.organization) {
      return next(new AppError('Organization context required.', 500));
    }

    // Org admins bypass
    if (req.user.isOrgAdmin) {
      return next();
    }

    // Check if user has ALL required privileges
    const missingPrivileges = privileges.filter(
      privilege => !req.userPrivileges.includes(privilege)
    );

    if (missingPrivileges.length > 0) {
      logger.warn('All privileges check failed', {
        userId: req.user._id,
        requiredPrivileges: privileges,
        missingPrivileges,
      });

      return next(new AppError(
        `Missing required permissions: ${missingPrivileges.join(', ')}`,
        403
      ));
    }

    next();
  };
};

/**
 * requireOrgAdmin()
 * 
 * WHAT: Ensures user is an organization admin
 * 
 * USE CASES:
 * - Managing users
 * - Changing organization settings
 * - Managing roles
 * 
 * USAGE:
 * router.post('/users', requireOrgAdmin, createUser);
 * 
 * PREREQUISITES:
 * - loadOrganization() must run first
 */
const requireOrgAdmin = (req, res, next) => {
  if (!req.organization) {
    return next(new AppError('Organization context required.', 500));
  }

  if (!req.user.isOrgAdmin) {
    logger.warn('Org admin check failed', {
      userId: req.user._id,
      orgId: req.organization._id,
    });

    return next(new AppError(
      'This action requires organization administrator privileges.',
      403
    ));
  }

  next();
};

/**
 * requireOrgOwner()
 * 
 * WHAT: Ensures user is the organization owner
 * 
 * USE CASES:
 * - Deleting the organization
 * - Transferring ownership
 * - Critical settings changes
 * 
 * OWNER VS ADMIN:
 * - Owner: Created the org, cannot be removed
 * - Admin: Added by owner, can be removed
 * 
 * USAGE:
 * router.delete('/organization', requireOrgOwner, deleteOrganization);
 */
const requireOrgOwner = (req, res, next) => {
  if (!req.organization) {
    return next(new AppError('Organization context required.', 500));
  }

  const isOwner = req.organization.owner.toString() === req.user._id.toString();

  if (!isOwner) {
    logger.warn('Org owner check failed', {
      userId: req.user._id,
      ownerId: req.organization.owner,
    });

    return next(new AppError(
      'This action can only be performed by the organization owner.',
      403
    ));
  }

  next();
};

/**
 * scopeToOrganization()
 * 
 * WHAT: Helper that adds organization filter to queries
 * 
 * WHY?
 * Ensures data isolation by adding org filter to all queries.
 * 
 * USAGE:
 * const query = { status: 'active' };
 * scopeToOrganization(query, req);
 * // query is now { status: 'active', organization: req.organization._id }
 * 
 * @param {Object} query - MongoDB query object
 * @param {Object} req - Express request with organization attached
 * @returns {Object} Query with organization filter added
 */
const scopeToOrganization = (query, req) => {
  if (!req.organization) {
    throw new Error('Organization not loaded. Cannot scope query.');
  }
  
  return {
    ...query,
    organization: req.organization._id,
  };
};

/**
 * addOrgToBody()
 * 
 * WHAT: Middleware that adds organization ID to request body
 * 
 * WHY?
 * When creating new documents/records, we need to associate
 * them with the user's organization.
 * 
 * USAGE:
 * router.post('/documents', addOrgToBody, createDocument);
 * // req.body now includes organization: req.organization._id
 */
const addOrgToBody = (req, res, next) => {
  if (!req.organization) {
    return next(new AppError('Organization context required.', 500));
  }

  req.body.organization = req.organization._id;
  next();
};

/**
 * validatePrivilege()
 * 
 * WHAT: Validates that a privilege name is valid
 * 
 * WHY?
 * Prevents typos and invalid privilege names in role configuration.
 * 
 * @param {string} privilege - Privilege name to validate
 * @returns {boolean} True if valid
 */
const validatePrivilege = (privilege) => {
  return ALL_PRIVILEGES.includes(privilege);
};

/**
 * checkResourceOwnership()
 * 
 * WHAT: Middleware factory for checking resource ownership
 * 
 * WHY?
 * Some actions require user to own the resource (e.g., edit own profile)
 * or be an admin.
 * 
 * USAGE:
 * router.patch(
 *   '/users/:id',
 *   checkResourceOwnership('params.id', 'manage_users'),
 *   updateUser
 * );
 * 
 * @param {string} userIdPath - Path to user ID in request (e.g., 'params.id', 'body.userId')
 * @param {string} adminPrivilege - Privilege that allows non-owners to access
 * @returns {Function} Express middleware
 */
const checkResourceOwnership = (userIdPath, adminPrivilege) => {
  return (req, res, next) => {
    // Get the user ID from the specified path
    const pathParts = userIdPath.split('.');
    let resourceUserId = req;
    for (const part of pathParts) {
      resourceUserId = resourceUserId[part];
    }

    // Check if user owns the resource
    const isOwner = resourceUserId?.toString() === req.user._id.toString();

    if (isOwner) {
      return next();
    }

    // Check if user has admin privilege
    if (adminPrivilege && req.userPrivileges.includes(adminPrivilege)) {
      return next();
    }

    // Org admins can access any resource in their org
    if (req.user.isOrgAdmin) {
      return next();
    }

    return next(new AppError(
      'You can only access your own resources.',
      403
    ));
  };
};

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  loadOrganization,
  requirePrivilege,
  requireAllPrivileges,
  requireOrgAdmin,
  requireOrgOwner,
  scopeToOrganization,
  addOrgToBody,
  validatePrivilege,
  checkResourceOwnership,
};
