/**
 * =============================================================================
 * AUTHENTICATION MIDDLEWARE - JWT VERIFICATION & ROLE-BASED ACCESS
 * =============================================================================
 * 
 * WHAT IS THIS FILE?
 * Middleware that protects routes by verifying JWT tokens and user roles.
 * 
 * WHAT IS AUTHENTICATION VS AUTHORIZATION?
 * - Authentication: "Who are you?" (verify identity via JWT)
 * - Authorization: "What can you do?" (check role permissions)
 * 
 * WHAT IS JWT (JSON Web Token)?
 * A secure way to transmit information between parties as a JSON object.
 * Structure: header.payload.signature
 * 
 * Example:
 * eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
 * eyJ1c2VySWQiOiIxMjMiLCJlbWFpbCI6InRlc3RAdGVzdC5jb20ifQ.
 * SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
 * 
 * JWT FLOW:
 * 1. User logs in with email/password
 * 2. Server verifies credentials
 * 3. Server creates JWT with user info
 * 4. Client stores JWT (localStorage/cookie)
 * 5. Client sends JWT with every request (Authorization header)
 * 6. Server verifies JWT on protected routes
 * 
 * WHY JWT OVER SESSIONS?
 * - Stateless: Server doesn't need to store sessions
 * - Scalable: Works across multiple servers
 * - Mobile-friendly: Works with APIs
 * - Self-contained: Contains user info
 * 
 * =============================================================================
 */

const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { AppError } = require('./errorHandler');
const logger = require('../utils/logger');

/**
 * protect()
 * 
 * WHAT: Middleware that verifies the user is authenticated
 * 
 * HOW IT WORKS:
 * 1. Extract JWT from Authorization header
 * 2. Verify the JWT signature
 * 3. Check if user still exists
 * 4. Check if password was changed after token was issued
 * 5. Attach user to request object
 * 
 * USAGE:
 * router.get('/protected-route', protect, (req, res) => {
 *   // req.user is available here
 * });
 * 
 * CALLED BY: Express router for protected routes
 * INPUT: req (Request), res (Response), next (NextFunction)
 * OUTPUT: Calls next() if authenticated, throws error if not
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // ----- STEP 1: EXTRACT TOKEN FROM HEADER -----
    /**
     * Authorization Header Format:
     * "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
     * 
     * We split by space and take the second part (the actual token)
     */
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    // If no token found, user is not authenticated
    if (!token) {
      return next(new AppError('You are not logged in. Please log in to access this resource.', 401));
    }

    // ----- STEP 2: VERIFY TOKEN -----
    /**
     * jwt.verify() does two things:
     * 1. Checks if the signature is valid (wasn't tampered with)
     * 2. Checks if the token hasn't expired
     * 
     * If verification fails, it throws an error that our error handler catches.
     */
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ----- STEP 3: CHECK IF USER STILL EXISTS -----
    /**
     * WHY?
     * The user might have been deleted after the token was issued.
     * We should not allow access with a token for a deleted user.
     */
    const currentUser = await User.findById(decoded.id);

    if (!currentUser) {
      return next(new AppError('The user belonging to this token no longer exists.', 401));
    }

    // ----- STEP 4: CHECK IF USER IS ACTIVE -----
    /**
     * WHY?
     * Deactivated users should not be able to access the system.
     */
    if (!currentUser.isActive) {
      return next(new AppError('Your account has been deactivated. Please contact support.', 401));
    }

    // ----- STEP 5: CHECK IF PASSWORD WAS CHANGED -----
    /**
     * WHY?
     * If the user changed their password after the token was issued,
     * the old token should be invalid.
     * 
     * This is a security feature: if someone's account is compromised,
     * changing the password invalidates all existing tokens.
     */
    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return next(new AppError('Password was recently changed. Please log in again.', 401));
    }

    // ----- STEP 6: GRANT ACCESS -----
    /**
     * Attach the user to the request object.
     * All subsequent middleware and route handlers can access req.user
     */
    req.user = currentUser;

    // Log the authenticated request (for debugging)
    logger.debug('User authenticated', {
      userId: currentUser._id,
      email: currentUser.email,
      role: currentUser.role,
    });

    next();
  } catch (error) {
    // Handle specific JWT errors
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token. Please log in again.', 401));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Your session has expired. Please log in again.', 401));
    }
    next(error);
  }
};

/**
 * restrictTo()
 * 
 * WHAT: Middleware factory that restricts access to certain roles
 * 
 * HOW IT WORKS:
 * Takes a list of allowed roles and returns a middleware function.
 * The middleware checks if the user's role is in the allowed list.
 * 
 * USAGE:
 * // Only admins can access
 * router.delete('/users/:id', protect, restrictTo('admin', 'super_admin'), deleteUser);
 * 
 * // Only the user themselves or admin can access
 * router.get('/profile', protect, restrictTo('user', 'admin'), getProfile);
 * 
 * WHY A FACTORY FUNCTION?
 * We need to pass the allowed roles as parameters.
 * A factory function returns a new middleware with those roles "baked in".
 * 
 * CALLED BY: Express router for role-protected routes
 * INPUT: ...roles - Spread of allowed role strings
 * OUTPUT: Middleware function
 */
const restrictTo = (...roles) => {
  /**
   * The returned middleware function
   * This has access to 'roles' via closure
   */
  return (req, res, next) => {
    // Check if user's role is in the allowed roles
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action.', 403)
      );
    }
    next();
  };
};

/**
 * optionalAuth()
 * 
 * WHAT: Middleware that optionally authenticates the user
 * 
 * WHY?
 * Some routes work differently for logged-in vs anonymous users.
 * For example, search might show personalized results for logged-in users.
 * 
 * HOW IT WORKS:
 * - If token exists and is valid: attach user to request
 * - If no token or invalid: continue without user (no error)
 * 
 * USAGE:
 * router.get('/public-route', optionalAuth, (req, res) => {
 *   if (req.user) {
 *     // Personalized response
 *   } else {
 *     // Generic response
 *   }
 * });
 * 
 * CALLED BY: Express router for routes with optional authentication
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    // Extract token from header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    // If no token, just continue without user
    if (!token) {
      return next();
    }

    // Try to verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUser = await User.findById(decoded.id);

    // If user exists and is active, attach to request
    if (currentUser && currentUser.isActive) {
      req.user = currentUser;
    }

    next();
  } catch (error) {
    // If token verification fails, just continue without user
    // Don't throw an error for optional auth
    next();
  }
};

/**
 * isResourceOwner()
 * 
 * WHAT: Middleware factory that checks if user owns a resource
 * 
 * WHY?
 * Users should only be able to edit/delete their own resources.
 * Admins can edit any resource.
 * 
 * HOW IT WORKS:
 * Takes a function that extracts the owner ID from the request.
 * Compares it with the current user's ID.
 * 
 * USAGE:
 * router.delete('/documents/:id', 
 *   protect, 
 *   isResourceOwner(async (req) => {
 *     const doc = await Document.findById(req.params.id);
 *     return doc?.uploadedBy;
 *   }), 
 *   deleteDocument
 * );
 * 
 * CALLED BY: Express router for owner-protected routes
 * INPUT: getOwnerId - Async function that returns the resource owner's ID
 * OUTPUT: Middleware function
 */
const isResourceOwner = (getOwnerId) => {
  return async (req, res, next) => {
    try {
      // Admins can access any resource
      if (req.user.role === 'admin' || req.user.role === 'super_admin') {
        return next();
      }

      // Get the owner ID using the provided function
      const ownerId = await getOwnerId(req);

      // If no owner found, resource doesn't exist
      if (!ownerId) {
        return next(new AppError('Resource not found.', 404));
      }

      // Check if current user is the owner
      if (ownerId.toString() !== req.user._id.toString()) {
        return next(
          new AppError('You do not have permission to access this resource.', 403)
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// =============================================================================
// EXPORTS
// =============================================================================
module.exports = {
  protect,
  restrictTo,
  optionalAuth,
  isResourceOwner,
};
