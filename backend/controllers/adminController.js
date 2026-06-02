// backend/controllers/adminController.js

const adminService = require("../services/adminService");
const CONSTANTS = require("../config/constants");
const logger = require("../utils/logger");

// Get dashboard analytics
const getDashboard = async (req, res, next) => {
  try {
    const result = await adminService.getDashboardAnalytics();

    if (!result.success) {
      return res.status(CONSTANTS.STATUS_CODES.SERVER_ERROR).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
};

// Get all users
const getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search } = req.query;

    const result = await adminService.getAllUsers(page, limit, search);

    if (!result.success) {
      return res.status(CONSTANTS.STATUS_CODES.SERVER_ERROR).json({
        success: false,
        error: result.error,
      });
    }

    res.header("X-Total-Count", result.pagination.total);
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

// Delete user
const deleteUser = async (req, res, next) => {
  try {
    const adminId = req.user.id;
    const { userId } = req.params;

    const result = await adminService.deleteUser(adminId, userId);

    if (!result.success) {
      return res.status(CONSTANTS.STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: result.error,
      });
    }

    res.json(result.data);
  } catch (error) {
    next(error);
  }
};

// Get system logs
const getSystemLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, action } = req.query;

    const result = await adminService.getSystemLogs(page, limit, action);

    if (!result.success) {
      return res.status(CONSTANTS.STATUS_CODES.SERVER_ERROR).json({
        success: false,
        error: result.error,
      });
    }

    res.header("X-Total-Count", result.pagination.total);
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

// Get storage statistics
const getStorageStatistics = async (req, res, next) => {
  try {
    const result = await adminService.getStorageStatistics();

    if (!result.success) {
      return res.status(CONSTANTS.STATUS_CODES.SERVER_ERROR).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboard,
  getAllUsers,
  deleteUser,
  getSystemLogs,
  getStorageStatistics,
};
