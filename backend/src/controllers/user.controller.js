/**
 * =============================================================================
 * USER CONTROLLER - HTTP REQUEST HANDLING FOR USER MANAGEMENT
 * =============================================================================
 * 
 * Admin-only endpoints for managing users.
 * 
 * =============================================================================
 */

const userService = require('../services/user.service');

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * getAllUsers()
 * 
 * HTTP: GET /api/users
 */
const getAllUsers = asyncHandler(async (req, res) => {
  const filters = {
    role: req.query.role,
    department: req.query.department,
    isActive: req.query.isActive === 'true' ? true : 
              req.query.isActive === 'false' ? false : undefined,
  };

  const options = {
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 10,
    sortBy: req.query.sortBy || 'createdAt',
    sortOrder: req.query.sortOrder || 'desc',
  };

  const result = await userService.getAllUsers(filters, options);

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * getUser()
 * 
 * HTTP: GET /api/users/:id
 */
const getUser = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.params.id);

  res.status(200).json({
    success: true,
    data: user,
  });
});

/**
 * updateUser()
 * 
 * HTTP: PATCH /api/users/:id
 */
const updateUser = asyncHandler(async (req, res) => {
  const user = await userService.updateUser(
    req.params.id,
    req.body,
    req.user.role
  );

  res.status(200).json({
    success: true,
    message: 'User updated successfully',
    data: user,
  });
});

/**
 * deleteUser()
 * 
 * HTTP: DELETE /api/users/:id
 */
const deleteUser = asyncHandler(async (req, res) => {
  await userService.deleteUser(req.params.id, req.user.role);

  res.status(200).json({
    success: true,
    message: 'User deactivated successfully',
  });
});

/**
 * getUserStats()
 * 
 * HTTP: GET /api/users/stats
 */
const getUserStats = asyncHandler(async (req, res) => {
  const stats = await userService.getUserStats();

  res.status(200).json({
    success: true,
    data: stats,
  });
});

module.exports = {
  getAllUsers,
  getUser,
  updateUser,
  deleteUser,
  getUserStats,
};
