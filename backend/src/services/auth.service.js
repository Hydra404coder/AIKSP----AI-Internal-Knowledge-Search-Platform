/**
 * =============================================================================
 * AUTHENTICATION SERVICE - BUSINESS LOGIC FOR AUTH OPERATIONS
 * =============================================================================
 * 
 * WHAT IS THIS FILE?
 * The service layer handles business logic for authentication.
 * It sits between controllers (handle HTTP) and models (handle database).
 * 
 * WHY SEPARATE SERVICE FROM CONTROLLER?
 * - Separation of Concerns: Each layer has one job
 * - Reusability: Services can be used by multiple controllers
 * - Testability: Easier to unit test business logic
 * - Maintainability: Changes to logic don't affect HTTP handling
 * 
 * ARCHITECTURE PATTERN:
 * Request → Route → Controller → Service → Model → Database
 *                                   ↓
 *                              Response ← Controller ← Service
 * 
 * THIS SERVICE HANDLES:
 * - User registration
 * - User login (with brute force protection)
 * - JWT token generation
 * - Password operations
 * 
 * =============================================================================
 */

const jwt = require('jsonwebtoken');
const { User, Organization } = require('../models');
const { AppError } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');
const organizationService = require('./organization.service');

/**
 * signToken()
 * 
 * WHAT: Creates a JWT token for a user
 * 
 * JWT STRUCTURE:
 * {
 *   id: "user_id",        // Who this token belongs to
 *   iat: 1234567890,      // Issued at (automatic)
 *   exp: 1234567890       // Expires at (automatic from expiresIn)
 * }
 * 
 * SECURITY CONSIDERATIONS:
 * - Don't put sensitive data in JWT (it's base64, not encrypted)
 * - Keep secret key secure and long
 * - Use appropriate expiration
 * 
 * CALLED BY: register(), login()
 * INPUT: id - The user's MongoDB ObjectId
 * OUTPUT: Signed JWT string
 */
const signToken = (id) => {
  return jwt.sign(
    { id }, // Payload - data stored in token
    process.env.JWT_SECRET, // Secret key for signing
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } // Expiration
  );
};

/**
 * createSendToken()
 * 
 * WHAT: Creates a token and formats the response
 * 
 * WHY A HELPER?
 * Both register and login need to send a token.
 * This prevents code duplication.
 * 
 * CALLED BY: register(), login()
 * INPUT: user - The user document, statusCode - HTTP status to send
 * OUTPUT: Object with token and user data
 */
const createSendToken = (user, statusCode = 200) => {
  const token = signToken(user._id);

  // Remove sensitive data from user object
  const userResponse = {
    id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: user.fullName, // Virtual field combining first and last name
    email: user.email,
    role: user.role,
    orgRole: user.orgRole,
    department: user.department,
    avatar: user.avatar,
    isOrgAdmin: user.isOrgAdmin,
  };

  return {
    statusCode,
    data: {
      token,
      user: userResponse,
    },
  };
};

/**
 * register()
 * 
 * WHAT: Registers a new user
 * 
 * NOTE: This is the LEGACY register function kept for backward compatibility.
 * For new implementations, use:
 * - registerOrganization() for creating a new organization with admin
 * - registerEmployee() for joining an existing organization
 * 
 * FLOW:
 * 1. Check if email already exists
 * 2. Create user (password is hashed by model hook)
 * 3. Generate JWT token
 * 4. Return token and user data
 * 
 * SECURITY:
 * - Passwords are hashed before storage (bcrypt, 12 rounds)
 * - Email uniqueness is enforced
 * - JWT is returned for immediate authentication
 * 
 * CALLED BY: AuthController.register()
 * INPUT: { firstName, lastName, email, password, department, organizationId }
 * OUTPUT: { statusCode, data: { token, user } }
 */
const register = async ({ firstName, lastName, email, password, department, organizationId }) => {
  // Check if email already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  
  if (existingUser) {
    throw new AppError('A user with this email already exists.', 400);
  }

  // For legacy support, if no organization is provided, throw error
  if (!organizationId) {
    throw new AppError('Organization is required. Use organization signup or employee signup.', 400);
  }

  // Verify organization exists
  const organization = await Organization.findById(organizationId);
  if (!organization) {
    throw new AppError('Organization not found.', 404);
  }

  // Create new user
  // Note: Password hashing happens automatically in the User model pre-save hook
  const newUser = await User.create({
    firstName,
    lastName,
    email: email.toLowerCase(),
    password,
    department: department || 'General',
    organization: organizationId,
    orgRole: organization.defaultRole,
    isOrgAdmin: false,
  });

  // Update organization user count
  await organization.updateStats({
    userCount: organization.stats.userCount + 1,
  });

  logger.info('New user registered', { userId: newUser._id, email: newUser.email, orgId: organizationId });

  // Generate token and return response
  return createSendToken(newUser, 201);
};

/**
 * registerOrganization()
 * 
 * WHAT: Creates a new organization with an admin user
 * 
 * FLOW:
 * 1. Create organization with secret key
 * 2. Create admin user linked to organization
 * 3. Return org, user, and secret key (show once)
 * 
 * USE CASE:
 * When a company wants to use the platform, their admin signs up here.
 * They get a secret key to share with employees.
 * 
 * CALLED BY: AuthController.registerOrganization()
 * INPUT: { organizationName, organizationDescription, firstName, lastName, email, password, department }
 * OUTPUT: { statusCode, data: { token, user, organization, secretKey } }
 */
const registerOrganization = async ({
  organizationName,
  organizationDescription,
  firstName,
  lastName,
  email,
  password,
  department,
}) => {
  // Use organization service to create org + admin user
  const { organization, user, plainSecretKey } = await organizationService.createOrganization(
    {
      name: organizationName,
      description: organizationDescription || '',
    },
    {
      firstName,
      lastName,
      email,
      password,
      department: department || 'Administration',
    }
  );

  logger.info('Organization registered', {
    orgId: organization._id,
    orgName: organization.name,
    adminId: user._id,
  });

  // Generate token
  const token = signToken(user._id);

  return {
    statusCode: 201,
    data: {
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        orgRole: user.orgRole,
        department: user.department,
        isOrgAdmin: user.isOrgAdmin,
        privileges: user.getAllPrivileges(organization),
      },
      organization: {
        id: organization._id,
        name: organization.name,
        slug: organization.slug,
      },
      // IMPORTANT: Show secret key ONCE
      // Admin must save this to share with employees
      secretKey: plainSecretKey,
    },
  };
};

/**
 * registerEmployee()
 * 
 * WHAT: Registers an employee to an existing organization
 * 
 * FLOW:
 * 1. Find organization by name
 * 2. Verify secret key
 * 3. Create user with default role
 * 4. Return token and user data
 * 
 * USE CASE:
 * When an employee wants to join their company's platform.
 * They need the organization name and secret key from their admin.
 * 
 * CALLED BY: AuthController.registerEmployee()
 * INPUT: { organizationName, secretKey, firstName, lastName, email, password, department }
 * OUTPUT: { statusCode, data: { token, user, organization } }
 */
const registerEmployee = async ({
  organizationName,
  secretKey,
  firstName,
  lastName,
  email,
  password,
  department,
}) => {
  // Use organization service to join org
  const { user, organization } = await organizationService.joinOrganization(
    organizationName,
    secretKey,
    {
      firstName,
      lastName,
      email,
      password,
      department,
    }
  );

  logger.info('Employee registered', {
    userId: user._id,
    email: user.email,
    orgId: organization._id,
  });

  // Generate token
  const token = signToken(user._id);

  return {
    statusCode: 201,
    data: {
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        orgRole: user.orgRole,
        department: user.department,
        isOrgAdmin: user.isOrgAdmin,
        privileges: user.getAllPrivileges(organization),
      },
      organization: {
        id: organization._id,
        name: organization.name,
        slug: organization.slug,
      },
    },
  };
};;

/**
 * login()
 * 
 * WHAT: Authenticates a user and returns a token
 * 
 * FLOW:
 * 1. Find user by email (include password field)
 * 2. Check if account is locked
 * 3. Verify password
 * 4. If wrong: increment login attempts
 * 5. If correct: reset login attempts, update lastLogin
 * 6. Generate and return JWT
 * 
 * BRUTE FORCE PROTECTION:
 * - Tracks failed login attempts
 * - Locks account after 5 failed attempts
 * - Account unlocks after 15 minutes
 * 
 * CALLED BY: AuthController.login()
 * INPUT: { email, password }
 * OUTPUT: { statusCode, data: { token, user } }
 */
const login = async ({ email, password }) => {
  // Find user and explicitly include password field
  const user = await User.findByEmail(email);

  // Check if user exists
  if (!user) {
    throw new AppError('Invalid email or password.', 401);
  }

  // Check if account is active
  if (!user.isActive) {
    throw new AppError('Your account has been deactivated. Please contact support.', 401);
  }

  // Check if account is locked
  if (user.isLocked) {
    const lockTime = Math.ceil((user.lockUntil - Date.now()) / 1000 / 60);
    throw new AppError(
      `Account is locked due to too many failed login attempts. Try again in ${lockTime} minutes.`,
      423 // 423 Locked
    );
  }

  // Check password
  const isPasswordCorrect = await user.comparePassword(password);

  if (!isPasswordCorrect) {
    // Increment failed attempts
    await user.incrementLoginAttempts();
    
    // Check if this attempt caused a lock
    if (user.loginAttempts + 1 >= 5) {
      throw new AppError(
        'Too many failed login attempts. Account locked for 15 minutes.',
        423
      );
    }

    throw new AppError('Invalid email or password.', 401);
  }

  // Login successful - reset attempts and update lastLogin
  await user.resetLoginAttempts();

  logger.info('User logged in', { userId: user._id, email: user.email });

  // Generate token and return response
  return createSendToken(user);
};

/**
 * changePassword()
 * 
 * WHAT: Changes a user's password
 * 
 * FLOW:
 * 1. Get user with current password
 * 2. Verify current password
 * 3. Update to new password (hashed by model hook)
 * 4. Generate new token (old tokens become invalid)
 * 
 * SECURITY:
 * - Requires current password (not just being logged in)
 * - Invalidates all existing tokens (via passwordChangedAt)
 * - Returns new token for continued access
 * 
 * CALLED BY: AuthController.changePassword()
 * INPUT: userId, currentPassword, newPassword
 * OUTPUT: { statusCode, data: { token, user } }
 */
const changePassword = async (userId, currentPassword, newPassword) => {
  // Get user with password
  const user = await User.findById(userId).select('+password');

  if (!user) {
    throw new AppError('User not found.', 404);
  }

  // Verify current password
  const isPasswordCorrect = await user.comparePassword(currentPassword);

  if (!isPasswordCorrect) {
    throw new AppError('Current password is incorrect.', 401);
  }

  // Update password (pre-save hook will hash it)
  user.password = newPassword;
  await user.save();

  logger.info('User changed password', { userId: user._id });

  // Generate new token (old ones are now invalid)
  return createSendToken(user);
};

/**
 * getProfile()
 * 
 * WHAT: Gets the current user's profile
 * 
 * CALLED BY: AuthController.getProfile()
 * INPUT: userId
 * OUTPUT: User object without sensitive data
 */
const getProfile = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError('User not found.', 404);
  }

  return {
    id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: user.fullName, // Virtual field
    email: user.email,
    role: user.role,
    department: user.department,
    avatar: user.avatar,
    isActive: user.isActive,
    lastLogin: user.lastLogin,
    createdAt: user.createdAt,
  };
};

/**
 * updateProfile()
 * 
 * WHAT: Updates the current user's profile
 * 
 * WHAT CAN BE UPDATED:
 * - firstName
 * - lastName
 * - department
 * - avatar
 * 
 * WHAT CANNOT BE UPDATED:
 * - email (for security)
 * - password (use changePassword)
 * - role (admin only)
 * 
 * CALLED BY: AuthController.updateProfile()
 * INPUT: userId, updateData
 * OUTPUT: Updated user object
 */
const updateProfile = async (userId, updateData) => {
  // Only allow specific fields to be updated
  const allowedUpdates = ['firstName', 'lastName', 'department', 'avatar'];
  const filteredData = {};

  for (const key of allowedUpdates) {
    if (updateData[key] !== undefined) {
      filteredData[key] = updateData[key];
    }
  }

  const user = await User.findByIdAndUpdate(
    userId,
    filteredData,
    { new: true, runValidators: true }
  );

  if (!user) {
    throw new AppError('User not found.', 404);
  }

  logger.info('User updated profile', { userId: user._id });

  return {
    id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: user.fullName, // Virtual field
    email: user.email,
    role: user.role,
    department: user.department,
    avatar: user.avatar,
  };
};

// =============================================================================
// EXPORTS
// =============================================================================
module.exports = {
  register,
  registerOrganization,
  registerEmployee,
  login,
  changePassword,
  getProfile,
  updateProfile,
};
