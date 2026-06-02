// backend/middleware/roleGuard.js

const CONSTANTS = require("../config/constants");

// Check if user is admin
const adminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(CONSTANTS.STATUS_CODES.UNAUTHORIZED).json({
      success: false,
      error: CONSTANTS.ERROR_MESSAGES.UNAUTHORIZED,
    });
  }

  if (req.user.role !== CONSTANTS.ROLES.ADMIN) {
    return res.status(CONSTANTS.STATUS_CODES.FORBIDDEN).json({
      success: false,
      error: CONSTANTS.ERROR_MESSAGES.UNAUTHORIZED,
    });
  }

  next();
};

// Check if user has specific role
const hasRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(CONSTANTS.STATUS_CODES.UNAUTHORIZED).json({
        success: false,
        error: CONSTANTS.ERROR_MESSAGES.UNAUTHORIZED,
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(CONSTANTS.STATUS_CODES.FORBIDDEN).json({
        success: false,
        error: CONSTANTS.ERROR_MESSAGES.UNAUTHORIZED,
      });
    }

    next();
  };
};

module.exports = {
  adminOnly,
  hasRole,
};
