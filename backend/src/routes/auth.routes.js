/**
 * =============================================================================
 * AUTHENTICATION ROUTES - URL ENDPOINTS FOR AUTH OPERATIONS
 * =============================================================================
 * 
 * WHAT IS THIS FILE?
 * Defines the URL endpoints (routes) for authentication operations.
 * Maps HTTP methods + URLs to controller functions.
 * 
 * WHAT IS A ROUTE?
 * A route defines:
 * - HTTP method (GET, POST, PUT, DELETE, PATCH)
 * - URL path (/login, /register)
 * - Middleware to run (validation, authentication)
 * - Controller function to handle the request
 * 
 * ROUTE STRUCTURE:
 * router.method('/path', ...middleware, controller);
 * 
 * EXAMPLE:
 * router.post('/login', validateLogin, handleValidationErrors, authController.login);
 * 
 * This means:
 * - When POST request comes to /api/auth/login
 * - First run validateLogin middleware
 * - Then run handleValidationErrors middleware
 * - Finally run authController.login
 * 
 * ROUTES IN THIS FILE:
 * - POST /api/auth/register - Create new user
 * - POST /api/auth/login - Authenticate user
 * - GET /api/auth/profile - Get current user profile
 * - PATCH /api/auth/profile - Update profile
 * - POST /api/auth/change-password - Change password
 * - POST /api/auth/logout - Logout user
 * - GET /api/auth/verify - Verify token
 * 
 * =============================================================================
 */

const express = require('express');
const authController = require('../controllers/auth.controller');
const { protect } = require('../middlewares/auth');
const {
  validateRegistration,
  validateLogin,
  validatePasswordChange,
  validateUserUpdate,
  validateOrganizationSignup,
  validateEmployeeSignup,
  handleValidationErrors,
} = require('../middlewares/validation');

// Create a new router instance
// This router will be mounted at /api/auth in app.js
const router = express.Router();

/**
 * =============================================================================
 * PUBLIC ROUTES (No authentication required)
 * =============================================================================
 * These routes are accessible without being logged in.
 * They're used for registration and login.
 */

/**
 * @route   POST /api/auth/register/organization
 * @desc    Create a new organization and admin user
 * @access  Public
 * 
 * WHAT THIS DOES:
 * 1. Creates a new organization with default roles
 * 2. Generates a secret key (shown only once)
 * 3. Creates the admin user as organization owner
 * 4. Returns token + organization details + secret key
 * 
 * REQUEST BODY:
 * {
 *   "organizationName": "Acme Corp",
 *   "organizationDescription": "Enterprise solutions company" (optional),
 *   "firstName": "John",
 *   "lastName": "Doe",
 *   "email": "john@acme.com",
 *   "password": "Password123",
 *   "department": "IT" (optional)
 * }
 * 
 * RESPONSE:
 * - user: The created admin user
 * - token: JWT for authentication
 * - organization: Organization details
 * - secretKey: ORG-XXXX-XXXX-XXXX-XXXX (SAVE THIS - shown only once!)
 */
router.post(
  '/register/organization',
  validateOrganizationSignup,
  handleValidationErrors,
  authController.registerOrganization
);

/**
 * @route   POST /api/auth/register/employee
 * @desc    Register as employee in an existing organization
 * @access  Public
 * 
 * WHAT THIS DOES:
 * 1. Validates organization name and secret key
 * 2. Creates user as member of the organization
 * 3. Assigns default 'employee' role with basic privileges
 * 4. Returns token + user details
 * 
 * REQUEST BODY:
 * {
 *   "organizationName": "Acme Corp",
 *   "secretKey": "ORG-XXXX-XXXX-XXXX-XXXX",
 *   "firstName": "Jane",
 *   "lastName": "Smith",
 *   "email": "jane@acme.com",
 *   "password": "Password123",
 *   "department": "Sales" (optional)
 * }
 */
router.post(
  '/register/employee',
  validateEmployeeSignup,
  handleValidationErrors,
  authController.registerEmployee
);

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user (legacy - requires organization context)
 * @access  Public
 * 
 * NOTE: This is the legacy registration endpoint.
 * For new implementations, use:
 * - POST /register/organization - To create a new organization
 * - POST /register/employee - To join an existing organization
 * 
 * MIDDLEWARE CHAIN:
 * 1. validateRegistration - Validates name, email, password
 * 2. handleValidationErrors - Returns 400 if validation fails
 * 3. authController.register - Creates user and returns token
 * 
 * REQUEST BODY:
 * {
 *   "firstName": "John",
 *   "lastName": "Doe",
 *   "email": "john@example.com",
 *   "password": "Password123",
 *   "department": "Engineering" (optional),
 *   "organizationId": "..." (required - organization to join)
 * }
 */
router.post(
  '/register',
  validateRegistration,
  handleValidationErrors,
  authController.register
);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and get token
 * @access  Public
 * 
 * MIDDLEWARE CHAIN:
 * 1. validateLogin - Validates email and password presence
 * 2. handleValidationErrors - Returns 400 if validation fails
 * 3. authController.login - Verifies credentials, returns token
 * 
 * REQUEST BODY:
 * {
 *   "email": "john@example.com",
 *   "password": "Password123"
 * }
 */
router.post(
  '/login',
  validateLogin,
  handleValidationErrors,
  authController.login
);

/**
 * =============================================================================
 * PROTECTED ROUTES (Authentication required)
 * =============================================================================
 * These routes require a valid JWT token.
 * The 'protect' middleware verifies the token and attaches user to req.
 */

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user's profile
 * @access  Private
 * 
 * HEADERS:
 * Authorization: Bearer <token>
 * 
 * MIDDLEWARE CHAIN:
 * 1. protect - Verifies JWT, attaches user to req
 * 2. authController.getProfile - Returns user profile
 */
router.get('/profile', protect, authController.getProfile);

/**
 * @route   PATCH /api/auth/profile
 * @desc    Update current user's profile
 * @access  Private
 * 
 * HEADERS:
 * Authorization: Bearer <token>
 * 
 * REQUEST BODY (all fields optional):
 * {
 *   "name": "John Smith",
 *   "department": "Marketing",
 *   "avatar": "https://..."
 * }
 * 
 * NOTE: Cannot update email, password, or role through this endpoint
 */
router.patch(
  '/profile',
  protect,
  validateUserUpdate,
  handleValidationErrors,
  authController.updateProfile
);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change current user's password
 * @access  Private
 * 
 * REQUEST BODY:
 * {
 *   "currentPassword": "OldPassword123",
 *   "newPassword": "NewPassword123",
 *   "confirmPassword": "NewPassword123"
 * }
 * 
 * NOTE: Returns a new token (old tokens become invalid)
 */
router.post(
  '/change-password',
  protect,
  validatePasswordChange,
  handleValidationErrors,
  authController.changePassword
);

/**
 * @route   POST /api/auth/logout
 * @desc    Log out current user
 * @access  Private
 * 
 * NOTE: With JWT, logout is mainly client-side (delete token).
 * This endpoint logs the event and can clear cookies if used.
 */
router.post('/logout', protect, authController.logout);

/**
 * @route   GET /api/auth/verify
 * @desc    Verify if token is still valid
 * @access  Private
 * 
 * USE CASE:
 * Frontend calls this on app load to check if stored token is valid.
 * If valid, user data is returned. If not, 401 error.
 */
router.get('/verify', protect, authController.verifyToken);

// =============================================================================
// EXPORT ROUTER
// =============================================================================
module.exports = router;
