/**
 * =============================================================================
 * AUTHENTICATION CONTROLLER - HTTP REQUEST HANDLING FOR AUTH
 * =============================================================================
 * 
 * WHAT IS THIS FILE?
 * The controller layer handles HTTP requests and responses.
 * It receives requests from routes, calls services, and sends responses.
 * 
 * CONTROLLER RESPONSIBILITIES:
 * - Parse request data (body, params, query)
 * - Call appropriate service methods
 * - Format and send HTTP responses
 * - Handle errors (pass to error middleware)
 * 
 * WHAT CONTROLLERS DON'T DO:
 * - Business logic (that's in services)
 * - Database operations (that's in models)
 * - Data validation (that's in middleware)
 * 
 * ARCHITECTURE PATTERN:
 * HTTP Request → Route → Controller → Service → Model → Database
 * HTTP Response ← Controller ← Service ← Model ←
 * 
 * =============================================================================
 */

const authService = require('../services/auth.service');
const logger = require('../utils/logger');

/**
 * asyncHandler()
 * 
 * WHAT: A wrapper that catches async errors
 * 
 * WHY?
 * In Express, async errors aren't caught automatically.
 * You'd normally need try/catch in every async function.
 * This wrapper does it for you.
 * 
 * WITHOUT THIS:
 * const register = async (req, res, next) => {
 *   try {
 *     // ... code
 *   } catch (error) {
 *     next(error);
 *   }
 * };
 * 
 * WITH THIS:
 * const register = asyncHandler(async (req, res) => {
 *   // ... code - errors are caught automatically
 * });
 * 
 * CALLED BY: All controller functions
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * register()
 * 
 * WHAT: Handles user registration requests
 * 
 * HTTP: POST /api/auth/register
 * 
 * REQUEST BODY:
 * {
 *   "name": "John Doe",
 *   "email": "john@example.com",
 *   "password": "Password123",
 *   "department": "Engineering"  // optional
 * }
 * 
 * SUCCESS RESPONSE (201):
 * {
 *   "success": true,
 *   "message": "Registration successful",
 *   "data": {
 *     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 *     "user": {
 *       "id": "507f1f77bcf86cd799439011",
 *       "name": "John Doe",
 *       "email": "john@example.com",
 *       "role": "user",
 *       "department": "Engineering"
 *     }
 *   }
 * }
 * 
 * DATA FLOW:
 * 1. Route calls this controller
 * 2. Controller extracts data from req.body
 * 3. Controller calls authService.register()
 * 4. Service creates user and generates token
 * 5. Controller sends formatted response
 * 
 * CALLED BY: POST /api/auth/register route
 */
const register = asyncHandler(async (req, res) => {

  const { firstName, lastName, email, password, department, organizationId } = req.body;

  const result = await authService.register({
    firstName,
    lastName,
    email,
    password,
    department,
    organizationId,
  });

  res.status(result.statusCode).json({
    success: true,
    message: 'Registration successful',
    data: result.data,
  });
});

/**
 * registerOrganization()
 * 
 * WHAT: Handles organization signup (Admin creates new organization)
 * 
 * HTTP: POST /api/auth/register/organization
 * 
 * REQUEST BODY:
 * {
 *   "organizationName": "Acme Corp",
 *   "organizationDescription": "Tech company", (optional)
 *   "firstName": "John",
 *   "lastName": "Doe",
 *   "email": "john@acme.com",
 *   "password": "Password123",
 *   "department": "Administration" (optional)
 * }
 * 
 * SUCCESS RESPONSE (201):
 * {
 *   "success": true,
 *   "message": "Organization created successfully",
 *   "data": {
 *     "token": "...",
 *     "user": { ... },
 *     "organization": { ... },
 *     "secretKey": "ORG-XXXX-XXXX-XXXX-XXXX" // SHOW ONCE!
 *   }
 * }
 * 
 * IMPORTANT:
 * The secretKey is returned ONLY ONCE. The admin must save it
 * to share with employees for signup.
 */
const registerOrganization = asyncHandler(async (req, res) => {
  const {
    organizationName,
    organizationDescription,
    firstName,
    lastName,
    email,
    password,
    department,
  } = req.body;

  const result = await authService.registerOrganization({
    organizationName,
    organizationDescription,
    firstName,
    lastName,
    email,
    password,
    department,
  });

  res.status(result.statusCode).json({
    success: true,
    message: 'Organization created successfully. Save the secret key - it will not be shown again!',
    data: result.data,
  });
});

/**
 * registerEmployee()
 * 
 * WHAT: Handles employee signup (User joins existing organization)
 * 
 * HTTP: POST /api/auth/register/employee
 * 
 * REQUEST BODY:
 * {
 *   "organizationName": "Acme Corp",
 *   "secretKey": "ORG-XXXX-XXXX-XXXX-XXXX",
 *   "firstName": "Jane",
 *   "lastName": "Smith",
 *   "email": "jane@acme.com",
 *   "password": "Password123",
 *   "department": "Engineering" (optional)
 * }
 * 
 * SUCCESS RESPONSE (201):
 * {
 *   "success": true,
 *   "message": "Registration successful",
 *   "data": {
 *     "token": "...",
 *     "user": { ... },
 *     "organization": { ... }
 *   }
 * }
 * 
 * ERROR CASES:
 * - Invalid organization name (404)
 * - Invalid secret key (401)
 * - Self-registration disabled (403)
 * - User limit reached (403)
 * - Email already exists (400)
 */
const registerEmployee = asyncHandler(async (req, res) => {
  const {
    organizationName,
    secretKey,
    firstName,
    lastName,
    email,
    password,
    department,
  } = req.body;

  const result = await authService.registerEmployee({
    organizationName,
    secretKey,
    firstName,
    lastName,
    email,
    password,
    department,
  });

  res.status(result.statusCode).json({
    success: true,
    message: 'Registration successful. Welcome to ' + result.data.organization.name + '!',
    data: result.data,
  });
});

/**
 * login()
 * 
 * WHAT: Handles user login requests
 * 
 * HTTP: POST /api/auth/login
 * 
 * REQUEST BODY:
 * {
 *   "email": "john@example.com",
 *   "password": "Password123"
 * }
 * 
 * SUCCESS RESPONSE (200):
 * {
 *   "success": true,
 *   "message": "Login successful",
 *   "data": {
 *     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 *     "user": { ... }
 *   }
 * }
 * 
 * ERROR RESPONSES:
 * - 401: Invalid credentials
 * - 423: Account locked (too many attempts)
 * 
 * CALLED BY: POST /api/auth/login route
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const result = await authService.login({ email, password });

  res.status(result.statusCode).json({
    success: true,
    message: 'Login successful',
    data: result.data,
  });
});

/**
 * getProfile()
 * 
 * WHAT: Gets the current user's profile
 * 
 * HTTP: GET /api/auth/profile
 * 
 * HEADERS:
 * Authorization: Bearer <token>
 * 
 * SUCCESS RESPONSE (200):
 * {
 *   "success": true,
 *   "data": {
 *     "id": "507f1f77bcf86cd799439011",
 *     "name": "John Doe",
 *     "email": "john@example.com",
 *     "role": "user",
 *     "department": "Engineering",
 *     "lastLogin": "2024-01-21T10:30:00.000Z"
 *   }
 * }
 * 
 * NOTE: req.user is set by the protect middleware
 * 
 * CALLED BY: GET /api/auth/profile route
 */
const getProfile = asyncHandler(async (req, res) => {
  // req.user is set by the protect middleware
  const profile = await authService.getProfile(req.user._id);

  res.status(200).json({
    success: true,
    data: profile,
  });
});

/**
 * updateProfile()
 * 
 * WHAT: Updates the current user's profile
 * 
 * HTTP: PATCH /api/auth/profile
 * 
 * REQUEST BODY:
 * {
 *   "name": "John Smith",        // optional
 *   "department": "Marketing",   // optional
 *   "avatar": "https://..."      // optional
 * }
 * 
 * SUCCESS RESPONSE (200):
 * {
 *   "success": true,
 *   "message": "Profile updated successfully",
 *   "data": { ... updated user ... }
 * }
 * 
 * CALLED BY: PATCH /api/auth/profile route
 */
const updateProfile = asyncHandler(async (req, res) => {
  const updatedUser = await authService.updateProfile(req.user._id, req.body);

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: updatedUser,
  });
});

/**
 * changePassword()
 * 
 * WHAT: Changes the user's password
 * 
 * HTTP: POST /api/auth/change-password
 * 
 * REQUEST BODY:
 * {
 *   "currentPassword": "OldPassword123",
 *   "newPassword": "NewPassword123",
 *   "confirmPassword": "NewPassword123"
 * }
 * 
 * SUCCESS RESPONSE (200):
 * {
 *   "success": true,
 *   "message": "Password changed successfully",
 *   "data": {
 *     "token": "new_token_here",  // New token (old one is invalidated)
 *     "user": { ... }
 *   }
 * }
 * 
 * WHY RETURN NEW TOKEN?
 * When password changes, passwordChangedAt is updated.
 * All existing tokens become invalid.
 * The new token lets the user stay logged in.
 * 
 * CALLED BY: POST /api/auth/change-password route
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const result = await authService.changePassword(
    req.user._id,
    currentPassword,
    newPassword
  );

  res.status(result.statusCode).json({
    success: true,
    message: 'Password changed successfully',
    data: result.data,
  });
});

/**
 * logout()
 * 
 * WHAT: Logs out the user
 * 
 * HTTP: POST /api/auth/logout
 * 
 * NOTE:
 * With JWT, there's no server-side session to destroy.
 * The token is stored on the client, and the client should delete it.
 * This endpoint exists for:
 * - Logging the logout event
 * - Clearing HTTP-only cookies (if used)
 * - Consistency with traditional auth patterns
 * 
 * SUCCESS RESPONSE (200):
 * {
 *   "success": true,
 *   "message": "Logged out successfully"
 * }
 * 
 * CALLED BY: POST /api/auth/logout route
 */
const logout = asyncHandler(async (req, res) => {
  // Log the logout event
  logger.info('User logged out', {
    userId: req.user._id,
    email: req.user.email,
  });

  // If using cookies, clear them here:
  // res.cookie('jwt', 'loggedout', {
  //   expires: new Date(Date.now() + 10 * 1000),
  //   httpOnly: true,
  // });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});

/**
 * verifyToken()
 * 
 * WHAT: Verifies if a token is still valid
 * 
 * HTTP: GET /api/auth/verify
 * 
 * USE CASE:
 * Frontend can call this on app load to check if stored token is valid.
 * If valid, user stays logged in. If not, redirect to login.
 * 
 * SUCCESS RESPONSE (200):
 * {
 *   "success": true,
 *   "message": "Token is valid",
 *   "data": { ... user ... }
 * }
 * 
 * CALLED BY: GET /api/auth/verify route
 */
const verifyToken = asyncHandler(async (req, res) => {
  // If we reach here, the protect middleware already verified the token
  // and attached the user to req
  const profile = await authService.getProfile(req.user._id);

  res.status(200).json({
    success: true,
    message: 'Token is valid',
    data: profile,
  });
});

// =============================================================================
// EXPORTS
// =============================================================================
module.exports = {
  register,
  registerOrganization,
  registerEmployee,
  login,
  getProfile,
  updateProfile,
  changePassword,
  logout,
  verifyToken,
};
