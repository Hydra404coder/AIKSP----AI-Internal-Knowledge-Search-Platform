/**
 * =============================================================================
 * ORGANIZATION SERVICE - BUSINESS LOGIC FOR ORGANIZATIONS
 * =============================================================================
 * 
 * WHAT IS THIS FILE?
 * Contains all business logic for organization operations:
 * - Creating organizations
 * - Managing users within organizations
 * - Managing roles and privileges
 * - Organization settings
 * 
 * SERVICE LAYER PATTERN:
 * Controllers handle HTTP → Services handle business logic → Models handle data
 * 
 * WHY A SEPARATE SERVICE?
 * - Keeps business logic separate from HTTP handling
 * - Reusable across different controllers
 * - Easier to test
 * - Cleaner code organization
 * 
 * =============================================================================
 */

const { Organization, User, ALL_PRIVILEGES } = require('../models');
const { AppError } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');
const bcrypt = require('bcryptjs');

// =============================================================================
// ORGANIZATION MANAGEMENT
// =============================================================================

/**
 * createOrganization()
 * 
 * WHAT: Creates a new organization with an admin user
 * 
 * FLOW:
 * 1. Generate secret key for the organization
 * 2. Create organization document
 * 3. Create admin user linked to organization
 * 4. Set admin user as organization owner
 * 5. Return org and plain secret key (show once to admin)
 * 
 * CALLED BY: Auth controller during organization signup
 * INPUT: orgData { name, description }, adminData { firstName, lastName, email, password }
 * OUTPUT: { organization, user, plainSecretKey }
 */
const createOrganization = async (orgData, adminData) => {
  // Check if organization name already exists
  const existingOrg = await Organization.findByName(orgData.name);
  if (existingOrg) {
    throw new AppError('An organization with this name already exists.', 400);
  }

  // Check if admin email already exists
  const existingUser = await User.findOne({ email: adminData.email.toLowerCase() });
  if (existingUser) {
    throw new AppError('A user with this email already exists.', 400);
  }

  // Generate secret key for the organization
  const { plainKey, hashedKey } = await Organization.generateSecretKey();

  // Create the organization (without owner first - we need user ID)
  const organization = new Organization({
    name: orgData.name,
    description: orgData.description || '',
    secretKey: hashedKey,
    secretKeyHint: orgData.secretKeyHint || '',
    // Owner will be set after user creation
  });

  // Create the admin user
  const adminUser = await User.create({
    firstName: adminData.firstName,
    lastName: adminData.lastName,
    email: adminData.email.toLowerCase(),
    password: adminData.password,
    department: adminData.department || 'Administration',
    organization: organization._id,
    orgRole: 'admin',
    isOrgAdmin: true,
    role: 'admin', // Legacy role field
  });

  // Set the owner and save organization
  organization.owner = adminUser._id;
  organization.admins = [adminUser._id];
  organization.stats.userCount = 1;
  await organization.save();

  logger.info('Organization created', {
    orgId: organization._id,
    orgName: organization.name,
    adminId: adminUser._id,
  });

  return {
    organization,
    user: adminUser,
    plainSecretKey: plainKey, // Return plain key to show to admin ONCE
  };
};

/**
 * getOrganizationById()
 * 
 * WHAT: Gets organization by ID
 * 
 * CALLED BY: Various services and controllers
 * INPUT: orgId
 * OUTPUT: Organization document
 */
const getOrganizationById = async (orgId) => {
  const organization = await Organization.findById(orgId);
  
  if (!organization) {
    throw new AppError('Organization not found.', 404);
  }

  return organization;
};

/**
 * updateOrganization()
 * 
 * WHAT: Updates organization settings
 * 
 * ALLOWED UPDATES:
 * - name (if unique)
 * - description
 * - settings
 * - defaultRole
 * 
 * CALLED BY: Organization controller
 * INPUT: orgId, updates
 * OUTPUT: Updated organization
 */
const updateOrganization = async (orgId, updates) => {
  const organization = await Organization.findById(orgId);
  
  if (!organization) {
    throw new AppError('Organization not found.', 404);
  }

  // Check if new name is unique
  if (updates.name && updates.name !== organization.name) {
    const existingOrg = await Organization.findByName(updates.name);
    if (existingOrg) {
      throw new AppError('An organization with this name already exists.', 400);
    }
  }

  // Apply updates
  const allowedUpdates = ['name', 'description', 'settings', 'defaultRole', 'secretKeyHint'];
  allowedUpdates.forEach(field => {
    if (updates[field] !== undefined) {
      if (field === 'settings') {
        // Merge settings
        organization.settings = { ...organization.settings, ...updates.settings };
      } else {
        organization[field] = updates[field];
      }
    }
  });

  await organization.save();

  logger.info('Organization updated', {
    orgId: organization._id,
    updates: Object.keys(updates),
  });

  return organization;
};

/**
 * rotateSecretKey()
 * 
 * WHAT: Generates a new secret key for the organization
 * 
 * WHEN TO USE:
 * - Security breach suspected
 * - Periodic rotation (best practice)
 * - Employee with key access left
 * 
 * CALLED BY: Organization controller
 * INPUT: orgId
 * OUTPUT: New plain secret key (show to admin once)
 */
const rotateSecretKey = async (orgId) => {
  const organization = await Organization.findById(orgId).select('+secretKey');
  
  if (!organization) {
    throw new AppError('Organization not found.', 404);
  }

  const plainKey = await organization.rotateSecretKey();

  logger.info('Organization secret key rotated', {
    orgId: organization._id,
  });

  return plainKey;
};

// =============================================================================
// USER MANAGEMENT
// =============================================================================

/**
 * addUserToOrganization()
 * 
 * WHAT: Creates a new user in an organization
 * 
 * FLOW:
 * 1. Validate organization exists and is active
 * 2. Check user limits
 * 3. Create user with organization link
 * 4. Update organization user count
 * 
 * CALLED BY: Admin dashboard user creation
 * INPUT: orgId, userData, creatorId
 * OUTPUT: Created user
 */
const addUserToOrganization = async (orgId, userData, creatorId) => {
  const organization = await Organization.findById(orgId);
  
  if (!organization) {
    throw new AppError('Organization not found.', 404);
  }

  if (!organization.isActive) {
    throw new AppError('Organization is not active.', 403);
  }

  const maxUsers = organization.settings?.maxUsers ?? 0;
  const userCount = organization.stats?.userCount ?? 0;

  // Check user limit
  if (maxUsers > 0 && userCount >= maxUsers) {
    throw new AppError('Organization has reached maximum user limit.', 403);
  }

  // Check if email exists
  const existingUser = await User.findOne({ email: userData.email.toLowerCase() });
  if (existingUser) {
    throw new AppError('A user with this email already exists.', 400);
  }

  // Validate role exists in organization
  const role = organization.getRole(userData.orgRole || organization.defaultRole);
  if (!role) {
    throw new AppError('Invalid role specified.', 400);
  }

  // Create the user
  const user = await User.create({
    firstName: userData.firstName,
    lastName: userData.lastName,
    email: userData.email.toLowerCase(),
    password: userData.password,
    department: userData.department || 'General',
    organization: organization._id,
    orgRole: userData.orgRole || organization.defaultRole,
    privileges: userData.privileges || [],
    isOrgAdmin: userData.isOrgAdmin || false,
  });

  // Update organization stats
  await organization.updateStats({
    userCount: userCount + 1,
  });

  logger.info('User added to organization', {
    userId: user._id,
    orgId: organization._id,
    createdBy: creatorId,
    role: user.orgRole,
  });

  return user;
};

/**
 * joinOrganization()
 * 
 * WHAT: Allows a user to join an organization using the secret key
 * 
 * FLOW:
 * 1. Find organization by name
 * 2. Verify secret key
 * 3. Check self-registration is allowed
 * 4. Create user with default role
 * 
 * CALLED BY: Employee signup flow
 * INPUT: orgName, secretKey, userData
 * OUTPUT: Created user and organization
 */
const joinOrganization = async (orgName, secretKey, userData) => {
  // Find organization by name
  const organization = await Organization.findByName(orgName);
  
  if (!organization) {
    throw new AppError('Organization not found.', 404);
  }

  if (!organization.isActive) {
    throw new AppError('This organization is not accepting new members.', 403);
  }

  const allowSelfRegistration = organization.settings?.allowSelfRegistration ?? true;

  // Check if self-registration is allowed
  if (!allowSelfRegistration) {
    throw new AppError('This organization does not allow self-registration. Please contact your administrator.', 403);
  }

  // Verify secret key
  const isValidKey = await organization.verifySecretKey(secretKey);
  if (!isValidKey) {
    logger.warn('Invalid organization key attempt', {
      orgId: organization._id,
      email: userData.email,
    });
    throw new AppError('Invalid organization key.', 401);
  }

  const joinMaxUsers = organization.settings?.maxUsers ?? 0;
  const joinUserCount = organization.stats?.userCount ?? 0;

  // Check user limit
  if (joinMaxUsers > 0 && joinUserCount >= joinMaxUsers) {
    throw new AppError('Organization has reached maximum user limit.', 403);
  }

  // Check if email exists
  const existingUser = await User.findOne({ email: userData.email.toLowerCase() });
  if (existingUser) {
    throw new AppError('A user with this email already exists.', 400);
  }

  // Create user with default role
  const user = await User.create({
    firstName: userData.firstName,
    lastName: userData.lastName,
    email: userData.email.toLowerCase(),
    password: userData.password,
    department: userData.department || 'General',
    organization: organization._id,
    orgRole: organization.defaultRole,
    privileges: [],
    isOrgAdmin: false,
  });

  // Update organization stats
  await organization.updateStats({
    userCount: joinUserCount + 1,
  });

  logger.info('User joined organization', {
    userId: user._id,
    orgId: organization._id,
    role: user.orgRole,
  });

  return { user, organization };
};

/**
 * getOrganizationUsers()
 * 
 * WHAT: Gets all users in an organization
 * 
 * FEATURES:
 * - Pagination
 * - Search by name/email
 * - Filter by role, department, status
 * 
 * CALLED BY: Admin dashboard
 * INPUT: orgId, options { page, limit, search, role, department, isActive }
 * OUTPUT: { users, total, page, pages }
 */
const getOrganizationUsers = async (orgId, options = {}) => {
  const {
    page = 1,
    limit = 20,
    search = '',
    role = '',
    department = '',
    isActive = null,
  } = options;

  // Build query
  const query = { organization: orgId };

  // Search by name or email
  if (search) {
    const searchRegex = new RegExp(search, 'i');
    query.$or = [
      { firstName: searchRegex },
      { lastName: searchRegex },
      { email: searchRegex },
    ];
  }

  // Filter by role
  if (role) {
    query.orgRole = role;
  }

  // Filter by department
  if (department) {
    query.department = department;
  }

  // Filter by active status
  if (isActive !== null) {
    query.isActive = isActive;
  }

  // Execute query with pagination
  const skip = (page - 1) * limit;
  
  const [users, total] = await Promise.all([
    User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(query),
  ]);

  return {
    users,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / limit),
  };
};

/**
 * updateOrganizationUser()
 * 
 * WHAT: Updates a user within an organization
 * 
 * ALLOWED UPDATES BY ADMIN:
 * - firstName, lastName
 * - department
 * - orgRole
 * - privileges
 * - isOrgAdmin
 * - isActive
 * 
 * RESTRICTIONS:
 * - Cannot modify org owner's admin status
 * - Cannot change organization
 * 
 * CALLED BY: Admin dashboard
 * INPUT: orgId, userId, updates, updaterId
 * OUTPUT: Updated user
 */
const updateOrganizationUser = async (orgId, userId, updates, updaterId) => {
  const organization = await Organization.findById(orgId);
  
  if (!organization) {
    throw new AppError('Organization not found.', 404);
  }

  const user = await User.findOne({
    _id: userId,
    organization: orgId,
  });

  if (!user) {
    throw new AppError('User not found in this organization.', 404);
  }

  // Cannot modify org owner's admin status
  if (organization.owner.toString() === userId && updates.isOrgAdmin === false) {
    throw new AppError('Cannot remove admin status from organization owner.', 403);
  }

  // Validate role if changing
  if (updates.orgRole) {
    const role = organization.getRole(updates.orgRole);
    if (!role) {
      throw new AppError('Invalid role specified.', 400);
    }
  }

  // Validate privileges if changing
  if (updates.privileges) {
    const invalidPrivileges = updates.privileges.filter(p => !ALL_PRIVILEGES.includes(p));
    if (invalidPrivileges.length > 0) {
      throw new AppError(`Invalid privileges: ${invalidPrivileges.join(', ')}`, 400);
    }
  }

  // Apply updates
  const allowedUpdates = [
    'firstName', 'lastName', 'department', 'orgRole', 
    'privileges', 'isOrgAdmin', 'isActive',
  ];

  allowedUpdates.forEach(field => {
    if (updates[field] !== undefined) {
      user[field] = updates[field];
    }
  });

  // Handle admin list in organization
  if (updates.isOrgAdmin !== undefined) {
    if (updates.isOrgAdmin) {
      // Add to admins if not already there
      if (!organization.admins.includes(user._id)) {
        organization.admins.push(user._id);
        await organization.save();
      }
    } else {
      // Remove from admins (unless owner)
      organization.admins = organization.admins.filter(
        id => id.toString() !== user._id.toString()
      );
      await organization.save();
    }
  }

  await user.save();

  logger.info('Organization user updated', {
    userId: user._id,
    orgId: organization._id,
    updatedBy: updaterId,
    updates: Object.keys(updates),
  });

  return user;
};

/**
 * removeUserFromOrganization()
 * 
 * WHAT: Removes (deactivates) a user from an organization
 * 
 * NOTE: We don't delete users, we deactivate them for audit purposes.
 * 
 * RESTRICTIONS:
 * - Cannot remove organization owner
 * - Cannot remove yourself
 * 
 * CALLED BY: Admin dashboard
 * INPUT: orgId, userId, removerId
 * OUTPUT: Deactivated user
 */
const removeUserFromOrganization = async (orgId, userId, removerId) => {
  const organization = await Organization.findById(orgId);
  
  if (!organization) {
    throw new AppError('Organization not found.', 404);
  }

  // Cannot remove owner
  if (organization.owner.toString() === userId) {
    throw new AppError('Cannot remove organization owner.', 403);
  }

  // Cannot remove yourself
  if (userId === removerId) {
    throw new AppError('Cannot remove yourself. Ask another admin.', 403);
  }

  const user = await User.findOne({
    _id: userId,
    organization: orgId,
  });

  if (!user) {
    throw new AppError('User not found in this organization.', 404);
  }

  // Deactivate user
  user.isActive = false;
  user.isOrgAdmin = false;
  await user.save();

  // Remove from admins list
  organization.admins = organization.admins.filter(
    id => id.toString() !== user._id.toString()
  );
  await organization.updateStats({
    userCount: Math.max(0, organization.stats.userCount - 1),
  });

  logger.info('User removed from organization', {
    userId: user._id,
    orgId: organization._id,
    removedBy: removerId,
  });

  return user;
};

// =============================================================================
// ROLE MANAGEMENT
// =============================================================================

/**
 * getRoles()
 * 
 * WHAT: Gets all roles for an organization
 * 
 * CALLED BY: Admin dashboard
 * INPUT: orgId
 * OUTPUT: Array of roles
 */
const getRoles = async (orgId) => {
  const organization = await Organization.findById(orgId);
  
  if (!organization) {
    throw new AppError('Organization not found.', 404);
  }

  return organization.roles;
};

/**
 * createRole()
 * 
 * WHAT: Creates a new custom role
 * 
 * CALLED BY: Admin dashboard
 * INPUT: orgId, roleData { key, name, description, privileges }
 * OUTPUT: Updated organization with new role
 */
const createRole = async (orgId, roleData) => {
  const organization = await Organization.findById(orgId);
  
  if (!organization) {
    throw new AppError('Organization not found.', 404);
  }

  await organization.addRole(roleData);

  logger.info('Role created', {
    orgId: organization._id,
    roleKey: roleData.key,
  });

  return organization.roles;
};

/**
 * updateRole()
 * 
 * WHAT: Updates an existing role
 * 
 * CALLED BY: Admin dashboard
 * INPUT: orgId, roleKey, updates { name, description, privileges, isDefault }
 * OUTPUT: Updated roles array
 */
const updateRole = async (orgId, roleKey, updates) => {
  const organization = await Organization.findById(orgId);
  
  if (!organization) {
    throw new AppError('Organization not found.', 404);
  }

  await organization.updateRole(roleKey, updates);

  logger.info('Role updated', {
    orgId: organization._id,
    roleKey,
    updates: Object.keys(updates),
  });

  return organization.roles;
};

/**
 * deleteRole()
 * 
 * WHAT: Deletes a custom role
 * 
 * RESTRICTIONS:
 * - Cannot delete system roles
 * - Users with this role will need to be reassigned
 * 
 * CALLED BY: Admin dashboard
 * INPUT: orgId, roleKey, newRoleForUsers
 * OUTPUT: Updated roles array
 */
const deleteRole = async (orgId, roleKey, newRoleForUsers = null) => {
  const organization = await Organization.findById(orgId);
  
  if (!organization) {
    throw new AppError('Organization not found.', 404);
  }

  const role = organization.getRole(roleKey);
  if (!role) {
    throw new AppError('Role not found.', 404);
  }

  // Check if any users have this role
  const usersWithRole = await User.countDocuments({
    organization: orgId,
    orgRole: roleKey,
  });

  if (usersWithRole > 0) {
    if (!newRoleForUsers) {
      throw new AppError(
        `Cannot delete role. ${usersWithRole} users have this role. Provide a replacement role.`,
        400
      );
    }

    // Validate replacement role exists
    if (!organization.getRole(newRoleForUsers)) {
      throw new AppError('Replacement role not found.', 400);
    }

    // Update users to new role
    await User.updateMany(
      { organization: orgId, orgRole: roleKey },
      { orgRole: newRoleForUsers }
    );
  }

  await organization.deleteRole(roleKey);

  logger.info('Role deleted', {
    orgId: organization._id,
    roleKey,
    usersReassigned: usersWithRole,
    newRole: newRoleForUsers,
  });

  return organization.roles;
};

/**
 * getAvailablePrivileges()
 * 
 * WHAT: Returns all available privileges
 * 
 * WHY?
 * For UI to show all options when configuring roles.
 * 
 * CALLED BY: Admin dashboard
 * OUTPUT: Array of privilege objects with descriptions
 */
const getAvailablePrivileges = () => {
  const privilegeDescriptions = {
    upload_documents: 'Upload new documents to the knowledge base',
    view_documents: 'View and read documents',
    edit_documents: 'Edit document metadata and content',
    delete_documents: 'Delete documents from the system',
    query_ai: 'Use AI-powered search and Q&A',
    view_search_history: 'View search and query history',
    manage_users: 'Add, edit, and remove users',
    manage_roles: 'Create and modify roles and privileges',
    view_analytics: 'View analytics and reports',
    manage_organization: 'Modify organization settings',
  };

  return ALL_PRIVILEGES.map(key => ({
    key,
    name: key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    description: privilegeDescriptions[key] || '',
  }));
};

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  // Organization management
  createOrganization,
  getOrganizationById,
  updateOrganization,
  rotateSecretKey,
  
  // User management
  addUserToOrganization,
  joinOrganization,
  getOrganizationUsers,
  updateOrganizationUser,
  removeUserFromOrganization,
  
  // Role management
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  getAvailablePrivileges,
};
