/**
 * =============================================================================
 * VALIDATION MIDDLEWARE - REQUEST DATA VALIDATION
 * =============================================================================
 * 
 * WHAT IS THIS FILE?
 * Middleware for validating incoming request data using express-validator.
 * 
 * WHY VALIDATE INPUT?
 * - Security: Prevent SQL injection, XSS, etc.
 * - Data Integrity: Ensure data is in expected format
 * - User Experience: Provide clear error messages
 * - Prevent Bugs: Catch issues early
 * 
 * EXPRESS-VALIDATOR EXPLAINED:
 * A library that provides validation and sanitization functions.
 * It uses a "chain" pattern:
 * body('email').isEmail().normalizeEmail()
 * 
 * VALIDATION FLOW:
 * 1. Request comes in
 * 2. Validation middleware runs (checks + sanitizes)
 * 3. handleValidationErrors runs (checks for errors)
 * 4. If errors: Return 400 with error messages
 * 5. If valid: Continue to controller
 * 
 * =============================================================================
 */

const { body, param, query, validationResult } = require('express-validator');
const { AppError } = require('./errorHandler');

/**
 * handleValidationErrors()
 * 
 * WHAT: Middleware that checks for validation errors
 * 
 * HOW:
 * After validation middleware runs, errors are stored in the request.
 * This middleware extracts them and returns a formatted error response.
 * 
 * USAGE:
 * router.post('/users', 
 *   validateUserRegistration, 
 *   handleValidationErrors, 
 *   createUser
 * );
 * 
 * CALLED BY: Express router after validation middleware
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    // Format errors for response
    const formattedErrors = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
      value: err.value,
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formattedErrors,
    });
  }
  
  next();
};

// =============================================================================
// AUTHENTICATION VALIDATORS
// =============================================================================

/**
 * validateRegistration
 * 
 * WHAT: Validates user registration data
 * 
 * VALIDATES:
 * - firstName: Required, 2-50 characters
 * - lastName: Required, 2-50 characters
 * - email: Required, valid email format
 * - password: Required, 8+ characters, contains uppercase, lowercase, number
 * - department: Optional, string
 */
const validateRegistration = [
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .escape(), // Sanitize to prevent XSS

  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters')
    .escape(), // Sanitize to prevent XSS

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(), // Sanitize email

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),

  body('department')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Department cannot exceed 50 characters')
    .escape(),
];

/**
 * validateLogin
 * 
 * WHAT: Validates login credentials
 * 
 * VALIDATES:
 * - email: Required, valid email format
 * - password: Required
 */
const validateLogin = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

/**
 * validatePasswordChange
 * 
 * WHAT: Validates password change request
 * 
 * VALIDATES:
 * - currentPassword: Required
 * - newPassword: Required, 8+ characters, meets complexity requirements
 * - confirmPassword: Must match newPassword
 */
const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),

  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),

  body('confirmPassword')
    .notEmpty()
    .withMessage('Please confirm your new password')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
];

// =============================================================================
// DOCUMENT VALIDATORS
// =============================================================================

/**
 * validateDocumentUpload
 * 
 * WHAT: Validates document upload metadata
 * 
 * VALIDATES:
 * - title: Required, 1-200 characters
 * - description: Optional, max 1000 characters
 * - category: Must be valid category
 * - tags: Optional array of strings
 * - accessLevel: Must be valid access level
 */
const validateDocumentUpload = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Document title is required')
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters')
    .escape(),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),

  body('category')
    .optional()
    .isIn(['policy', 'procedure', 'technical', 'hr', 'finance', 'legal', 'training', 'marketing', 'product', 'other'])
    .withMessage('Invalid category'),

  body('tags')
    .optional()
    .custom((value) => Array.isArray(value) || typeof value === 'string')
    .withMessage('Tags must be an array or a comma-separated string'),

  body('tags.*')
    .if(body('tags').isArray())
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Each tag cannot exceed 50 characters')
    .escape(),

  body('version')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Version cannot exceed 50 characters')
    .escape(),

  body('accessLevel')
    .optional()
    .isIn(['public', 'department', 'private'])
    .withMessage('Access level must be public, department, or private'),

  body('department')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Department cannot exceed 50 characters')
    .escape(),
];

/**
 * validateDocumentUpdate
 * 
 * WHAT: Validates document update data
 * Same as upload but all fields optional
 */
const validateDocumentUpdate = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters')
    .escape(),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),

  body('category')
    .optional()
    .isIn(['policy', 'procedure', 'technical', 'hr', 'finance', 'legal', 'training', 'marketing', 'product', 'other'])
    .withMessage('Invalid category'),

  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),

  body('accessLevel')
    .optional()
    .isIn(['public', 'department', 'private'])
    .withMessage('Access level must be public, department, or private'),
];

// =============================================================================
// SEARCH VALIDATORS
// =============================================================================

/**
 * validateSearch
 * 
 * WHAT: Validates search query
 * 
 * VALIDATES:
 * - q: Required, 1-500 characters
 * - category: Optional, valid category
 * - department: Optional, string
 * - page: Optional, positive integer
 * - limit: Optional, 1-100
 */
const validateSearch = [
  query('q')
    .trim()
    .notEmpty()
    .withMessage('Search query is required')
    .isLength({ min: 1, max: 500 })
    .withMessage('Search query must be between 1 and 500 characters'),

  query('category')
    .optional()
    .isIn(['policy', 'procedure', 'technical', 'hr', 'finance', 'legal', 'training', 'marketing', 'product', 'other'])
    .withMessage('Invalid category'),

  query('department')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Department cannot exceed 50 characters'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
];

/**
 * validateQuestion
 * 
 * WHAT: Validates AI question
 * 
 * VALIDATES:
 * - question: Required, 5-2000 characters
 */
const validateQuestion = [
  body('question')
    .trim()
    .notEmpty()
    .withMessage('Question is required')
    .isLength({ min: 5, max: 2000 })
    .withMessage('Question must be between 5 and 2000 characters'),

  body('selectedDocumentIds')
    .optional()
    .isArray({ min: 1, max: 2 })
    .withMessage('You can select 1 or 2 documents'),

  body('selectedDocumentIds.*')
    .optional()
    .isMongoId()
    .withMessage('Each selected document ID must be a valid ObjectId'),
];

// =============================================================================
// PARAMETER VALIDATORS
// =============================================================================

/**
 * validateObjectId
 * 
 * WHAT: Validates MongoDB ObjectId parameters
 * 
 * USAGE:
 * router.get('/documents/:id', validateObjectId('id'), getDocument);
 */
const validateObjectId = (paramName) => [
  param(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName} format`),
];

/**
 * validateFeedback
 * 
 * WHAT: Validates feedback submission
 */
const validateFeedback = [
  body('feedback')
    .isIn(['helpful', 'not_helpful', 'incorrect'])
    .withMessage('Invalid feedback type'),

  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5')
    .toInt(),

  body('comment')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Comment cannot exceed 500 characters'),
];

// =============================================================================
// USER VALIDATORS
// =============================================================================

/**
 * validateUserUpdate
 * 
 * WHAT: Validates user profile update
 */
const validateUserUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .escape(),

  body('department')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Department cannot exceed 50 characters')
    .escape(),

  body('avatar')
    .optional()
    .isURL()
    .withMessage('Avatar must be a valid URL'),
];

/**
 * validateAdminUserUpdate
 * 
 * WHAT: Validates admin updating a user
 * Includes role and active status
 */
const validateAdminUserUpdate = [
  ...validateUserUpdate,

  body('role')
    .optional()
    .isIn(['user', 'admin', 'super_admin'])
    .withMessage('Invalid role'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
];

// =============================================================================
// ORGANIZATION VALIDATORS
// =============================================================================

/**
 * validateOrganizationSignup
 * 
 * WHAT: Validates organization signup (admin creating new org)
 * 
 * VALIDATES:
 * - organizationName: Required, 2-100 characters
 * - organizationDescription: Optional, max 500 characters
 * - firstName, lastName, email, password: Same as registration
 * - department: Optional
 */
const validateOrganizationSignup = [
  body('organizationName')
    .trim()
    .notEmpty()
    .withMessage('Organization name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Organization name must be between 2 and 100 characters'),

  body('organizationDescription')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),

  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .escape(),

  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters')
    .escape(),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),

  body('department')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Department cannot exceed 50 characters')
    .escape(),
];

/**
 * validateEmployeeSignup
 * 
 * WHAT: Validates employee signup (joining existing org)
 * 
 * VALIDATES:
 * - organizationName: Required
 * - secretKey: Required, in format ORG-XXXX-XXXX-XXXX-XXXX
 * - firstName, lastName, email, password: Same as registration
 * - department: Optional
 */
const validateEmployeeSignup = [
  body('organizationName')
    .trim()
    .notEmpty()
    .withMessage('Organization name is required'),

  body('secretKey')
    .trim()
    .notEmpty()
    .withMessage('Organization secret key is required')
    .matches(/^ORG-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/)
    .withMessage('Invalid secret key format. Expected: ORG-XXXX-XXXX-XXXX-XXXX'),

  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .escape(),

  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters')
    .escape(),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),

  body('department')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Department cannot exceed 50 characters')
    .escape(),
];

// =============================================================================
// EXPORTS
// =============================================================================
module.exports = {
  handleValidationErrors,
  validateRegistration,
  validateLogin,
  validatePasswordChange,
  validateDocumentUpload,
  validateDocumentUpdate,
  validateSearch,
  validateQuestion,
  validateObjectId,
  validateFeedback,
  validateUserUpdate,
  validateAdminUserUpdate,
  validateOrganizationSignup,
  validateEmployeeSignup,
};
