// backend/middleware/auth.js

const jwt = require("jsonwebtoken");
const CONSTANTS = require("../config/constants");
const logger = require("../utils/logger");

// Authentication middleware
const auth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(CONSTANTS.STATUS_CODES.UNAUTHORIZED).json({
        success: false,
        error: CONSTANTS.ERROR_MESSAGES.INVALID_TOKEN,
      });
    }

    const token = authHeader.split(" ")[1]; // Bearer token
    if (!token) {
      return res.status(CONSTANTS.STATUS_CODES.UNAUTHORIZED).json({
        success: false,
        error: CONSTANTS.ERROR_MESSAGES.INVALID_TOKEN,
      });
    }

    const decoded = jwt.verify(token, CONSTANTS.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    logger.error("Auth error:", error);
    if (error.name === "TokenExpiredError") {
      return res.status(CONSTANTS.STATUS_CODES.UNAUTHORIZED).json({
        success: false,
        error: "Token expired",
      });
    }
    return res.status(CONSTANTS.STATUS_CODES.UNAUTHORIZED).json({
      success: false,
      error: CONSTANTS.ERROR_MESSAGES.INVALID_TOKEN,
    });
  }
};

// Optional auth (user data available but not required)
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, CONSTANTS.JWT_SECRET);
      req.user = decoded;
    }
  } catch (error) {
    // Silently ignore auth errors for optional auth
  }
  next();
};

module.exports = {
  auth,
  optionalAuth,
};
