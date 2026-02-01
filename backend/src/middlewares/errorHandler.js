/**
 * =============================================================================
 * ERROR HANDLER MIDDLEWARE - CENTRALIZED ERROR PROCESSING
 * =============================================================================
 * 
 * WHAT IS THIS FILE?
 * This is the global error handling middleware for Express.
 * ALL errors in the application flow through here.
 * 
 * HOW DOES IT WORK?
 * 1. Route handler throws an error or calls next(error)
 * 2. Express skips all remaining middleware
 * 3. Express finds the first middleware with 4 parameters (err, req, res, next)
 * 4. That's this middleware!
 * 
 * WHY CENTRALIZED ERROR HANDLING?
 * - Consistent error response format across all routes
 * - Single place to log all errors
 * - Can handle different error types differently
 * - Prevents error details from leaking in production
 * 
 * ERROR TYPES WE HANDLE:
 * - ValidationError: Mongoose validation failed
 * - CastError: Invalid MongoDB ObjectId
 * - 11000: Duplicate key (unique constraint violation)
 * - JsonWebTokenError: Invalid JWT
 * - TokenExpiredError: JWT expired
 * - Custom AppError: Our own error class
 * 
 * =============================================================================
 */

const logger = require('../utils/logger');

/**
 * AppError - Custom Error Class
 * 
 * WHAT?
 * A custom error class that includes HTTP status code.
 * 
 * WHY?
 * The default Error class only has a message.
 * We need to include the HTTP status code so the error handler
 * knows what status to send (400, 401, 404, 500, etc.)
 * 
 * USAGE:
 * throw new AppError('User not found', 404);
 * throw new AppError('Invalid password', 401);
 * 
 * CALLED BY: Controllers, services, anywhere errors need to be thrown
 * INPUT: message (string), statusCode (number)
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // Distinguishes from programming errors
    
    // Captures the stack trace, excluding this constructor
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * handleCastError()
 * 
 * WHAT: Handles MongoDB CastError (invalid ObjectId)
 * WHEN: When someone passes an invalid ID like "abc" instead of "507f1f77bcf86cd799439011"
 * 
 * CALLED BY: Error handler middleware
 * INPUT: err (CastError object)
 * OUTPUT: AppError with user-friendly message
 */
const handleCastError = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

/**
 * handleDuplicateKeyError()
 * 
 * WHAT: Handles MongoDB duplicate key error
 * WHEN: Trying to create a document with a duplicate unique field (like email)
 * 
 * CALLED BY: Error handler middleware
 * INPUT: err (MongoDB error with code 11000)
 * OUTPUT: AppError with user-friendly message
 */
const handleDuplicateKeyError = (err) => {
  // Extract the duplicate field value from the error message
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/);
  const message = `Duplicate field value: ${value ? value[0] : 'unknown'}. Please use another value.`;
  return new AppError(message, 400);
};

/**
 * handleValidationError()
 * 
 * WHAT: Handles Mongoose validation errors
 * WHEN: A document fails schema validation (required field missing, invalid format, etc.)
 * 
 * CALLED BY: Error handler middleware
 * INPUT: err (ValidationError object)
 * OUTPUT: AppError with combined validation messages
 */
const handleValidationError = (err) => {
  // Extract all validation error messages
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data: ${errors.join('. ')}`;
  return new AppError(message, 400);
};

/**
 * handleJWTError()
 * 
 * WHAT: Handles invalid JWT errors
 * WHEN: JWT is malformed or has invalid signature
 * 
 * CALLED BY: Error handler middleware
 * INPUT: None (we know what happened)
 * OUTPUT: AppError with user-friendly message
 */
const handleJWTError = () => {
  return new AppError('Invalid token. Please log in again.', 401);
};

/**
 * handleJWTExpiredError()
 * 
 * WHAT: Handles expired JWT errors
 * WHEN: JWT was valid but has expired
 * 
 * CALLED BY: Error handler middleware
 * INPUT: None (we know what happened)
 * OUTPUT: AppError with user-friendly message
 */
const handleJWTExpiredError = () => {
  return new AppError('Your session has expired. Please log in again.', 401);
};

/**
 * sendErrorDev()
 * 
 * WHAT: Sends detailed error response in development
 * WHY: In development, we want ALL the details to debug
 * 
 * CALLED BY: Error handler middleware
 * INPUT: err (Error object), res (Express response)
 * OUTPUT: JSON response with full error details
 */
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    success: false,
    status: err.status,
    message: err.message,
    stack: err.stack,
    error: err,
  });
};

/**
 * sendErrorProd()
 * 
 * WHAT: Sends limited error response in production
 * WHY: In production, we hide internal details for security
 * 
 * CALLED BY: Error handler middleware
 * INPUT: err (Error object), res (Express response)
 * OUTPUT: JSON response with safe error message
 */
const sendErrorProd = (err, res) => {
  // Operational errors: we know what happened, safe to send message
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      status: err.status,
      message: err.message,
    });
  } else {
    // Programming errors: don't leak details to client
    logger.error('UNEXPECTED ERROR:', err);
    
    res.status(500).json({
      success: false,
      status: 'error',
      message: 'Something went wrong. Please try again later.',
    });
  }
};

/**
 * errorHandler - The Main Error Handling Middleware
 * 
 * WHAT?
 * The Express error handling middleware. It has 4 parameters
 * (err, req, res, next) which tells Express it's an error handler.
 * 
 * HOW IT WORKS:
 * 1. Receives the error
 * 2. Identifies the error type
 * 3. Converts to AppError if needed
 * 4. Sends appropriate response based on environment
 * 
 * CALLED BY: Express (automatically when next(error) is called)
 * INPUT: err (Error), req (Request), res (Response), next (NextFunction)
 * OUTPUT: JSON error response to client
 */
const errorHandler = (err, req, res, next) => {
  // Default values if not set
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log the error
  logger.error(`${err.statusCode} - ${err.message}`, {
    url: req.originalUrl,
    method: req.method,
    body: req.body,
    user: req.user ? req.user.id : 'anonymous',
  });

  if (process.env.NODE_ENV === 'development') {
    // In development, send full error details
    sendErrorDev(err, res);
  } else {
    // In production, process errors and send safe messages
    let error = { ...err };
    error.message = err.message;

    // Handle specific error types
    if (err.name === 'CastError') error = handleCastError(err);
    if (err.code === 11000) error = handleDuplicateKeyError(err);
    if (err.name === 'ValidationError') error = handleValidationError(err);
    if (err.name === 'JsonWebTokenError') error = handleJWTError();
    if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, res);
  }
};

// -----------------------------------------------------------------------------
// EXPORTS
// -----------------------------------------------------------------------------
module.exports = errorHandler;
module.exports.AppError = AppError;
