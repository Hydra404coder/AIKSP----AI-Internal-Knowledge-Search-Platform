/**
 * =============================================================================
 * USER SERVICE - BUSINESS LOGIC FOR USER MANAGEMENT
 * =============================================================================
 * 
 * WHAT IS THIS FILE?
 * Handles user management operations (mostly for admins).
 * 
 * =============================================================================
 */

const { User } = require('../models');
const { AppError } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');

/**
 * getAllUsers()
 * 
 * WHAT: Gets all users (admin only)
 */
const getAllUsers = async (filters = {}, options = {}) => {
  const {
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = options;

  // Build query
  const query = {};

  if (filters.role) {
    query.role = filters.role;
  }

  if (filters.department) {
    query.department = filters.department;
  }

  if (filters.isActive !== undefined) {
    query.isActive = filters.isActive;
  }

  // Count total
  const total = await User.countDocuments(query);

  // Get users
  const users = await User.find(query)
    .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .select('-__v');

  return {
    users,
    total,
    page,
    pages: Math.ceil(total / limit),
  };
};

/**
 * getUserById()
 * 
 * WHAT: Gets a single user by ID
 */
const getUserById = async (userId) => {
  const user = await User.findById(userId).select('-__v');

  if (!user) {
    throw new AppError('User not found.', 404);
  }

  return user;
};

/**
 * updateUser()
 * 
 * WHAT: Updates a user (admin only)
 */
const updateUser = async (userId, updateData, adminRole) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError('User not found.', 404);
  }

  // Prevent super_admin demotion by non-super_admins
  if (user.role === 'super_admin' && adminRole !== 'super_admin') {
    throw new AppError('Only super admins can modify super admin accounts.', 403);
  }

  // Only allow certain fields to be updated
  const allowedUpdates = ['name', 'department', 'role', 'isActive'];
  
  for (const key of allowedUpdates) {
    if (updateData[key] !== undefined) {
      user[key] = updateData[key];
    }
  }

  await user.save();

  logger.info('User updated by admin', {
    updatedUserId: userId,
  });

  return user;
};

/**
 * deleteUser()
 * 
 * WHAT: Deactivates a user (soft delete)
 */
const deleteUser = async (userId, adminRole) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError('User not found.', 404);
  }

  // Prevent deleting super_admins
  if (user.role === 'super_admin') {
    throw new AppError('Super admin accounts cannot be deleted.', 403);
  }

  user.isActive = false;
  await user.save();

  logger.info('User deactivated', { userId });

  return { message: 'User deactivated successfully' };
};

/**
 * getUserStats()
 * 
 * WHAT: Gets user statistics
 */
const getUserStats = async () => {
  const stats = await User.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        activeUsers: {
          $sum: { $cond: ['$isActive', 1, 0] },
        },
        adminCount: {
          $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] },
        },
      },
    },
  ]);

  const byDepartment = await User.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: '$department',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);

  const byRole = await User.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 },
      },
    },
  ]);

  return {
    ...stats[0],
    byDepartment,
    byRole,
  };
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUserStats,
};
