// backend/controllers/authController.js

const authService = require("../services/authService");
const CONSTANTS = require("../config/constants");
const logger = require("../utils/logger");

// Register
const register = async (req, res, next) => {
  try {
    const { email, username, password, full_name } = req.body;

    const result = await authService.register(
      email,
      username,
      password,
      full_name,
    );

    if (!result.success) {
      return res.status(CONSTANTS.STATUS_CODES.CONFLICT).json({
        success: false,
        error: result.error,
      });
    }

    res.status(CONSTANTS.STATUS_CODES.CREATED).json(result.data);
  } catch (error) {
    next(error);
  }
};

// Login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const result = await authService.login(email, password);

    if (!result.success) {
      return res.status(CONSTANTS.STATUS_CODES.UNAUTHORIZED).json({
        success: false,
        error: result.error,
      });
    }

    res.json(result.data);
  } catch (error) {
    next(error);
  }
};

// Logout (client-side token removal - just return success)
const logout = (req, res) => {
  res.json({ success: true, message: "Logged out successfully" });
};

// Request password reset
const requestPasswordReset = async (req, res, next) => {
  try {
    const { email } = req.body;

    const result = await authService.requestPasswordReset(email);

    res.json(result.data);
  } catch (error) {
    next(error);
  }
};

// Confirm password reset
const confirmPasswordReset = async (req, res, next) => {
  try {
    const { token, new_password } = req.body;

    const result = await authService.confirmPasswordReset(token, new_password);

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

// Change password (authenticated)
const changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    const userId = req.user.id;

    const result = await authService.changePassword(
      userId,
      current_password,
      new_password,
    );

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

// Get user profile
const getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await authService.getUserById(userId);

    if (!result.success) {
      return res.status(CONSTANTS.STATUS_CODES.NOT_FOUND).json({
        success: false,
        error: result.error,
      });
    }

    res.json(result.data);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  logout,
  requestPasswordReset,
  confirmPasswordReset,
  changePassword,
  getProfile,
};
