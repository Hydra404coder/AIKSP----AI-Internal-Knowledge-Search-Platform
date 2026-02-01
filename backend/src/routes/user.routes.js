/**
 * =============================================================================
 * USER ROUTES - URL ENDPOINTS FOR USER MANAGEMENT
 * =============================================================================
 * 
 * Admin-only routes for managing users.
 * 
 * ROUTES:
 * GET    /api/users       - List all users
 * GET    /api/users/stats - Get user statistics
 * GET    /api/users/:id   - Get single user
 * PATCH  /api/users/:id   - Update user
 * DELETE /api/users/:id   - Deactivate user
 * 
 * =============================================================================
 */

const express = require('express');
const userController = require('../controllers/user.controller');
const { protect, restrictTo } = require('../middlewares/auth');
const {
  validateAdminUserUpdate,
  validateObjectId,
  handleValidationErrors,
} = require('../middlewares/validation');

const router = express.Router();

// All user routes require authentication and admin role
router.use(protect);
router.use(restrictTo('admin', 'super_admin'));

/**
 * @route   GET /api/users
 * @desc    Get all users
 * @access  Private (Admin only)
 */
router.get('/', userController.getAllUsers);

/**
 * @route   GET /api/users/stats
 * @desc    Get user statistics
 * @access  Private (Admin only)
 */
router.get('/stats', userController.getUserStats);

/**
 * @route   GET /api/users/:id
 * @desc    Get single user
 * @access  Private (Admin only)
 */
router.get(
  '/:id',
  validateObjectId('id'),
  handleValidationErrors,
  userController.getUser
);

/**
 * @route   PATCH /api/users/:id
 * @desc    Update user
 * @access  Private (Admin only)
 */
router.patch(
  '/:id',
  validateObjectId('id'),
  validateAdminUserUpdate,
  handleValidationErrors,
  userController.updateUser
);

/**
 * @route   DELETE /api/users/:id
 * @desc    Deactivate user
 * @access  Private (Admin only)
 */
router.delete(
  '/:id',
  validateObjectId('id'),
  handleValidationErrors,
  userController.deleteUser
);

module.exports = router;
