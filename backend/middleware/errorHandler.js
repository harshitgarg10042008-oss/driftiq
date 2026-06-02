// backend/middleware/errorHandler.js

const logger = require("../utils/logger");
const CONSTANTS = require("../config/constants");

// Global error handler
const errorHandler = (err, req, res, next) => {
  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  // Multer errors
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(CONSTANTS.STATUS_CODES.BAD_REQUEST).json({
      success: false,
      error: CONSTANTS.ERROR_MESSAGES.FILE_TOO_LARGE,
    });
  }

  if (err.code === "LIMIT_FILE_COUNT") {
    return res.status(CONSTANTS.STATUS_CODES.BAD_REQUEST).json({
      success: false,
      error: "Too many files uploaded",
    });
  }

  // Default error
  const statusCode = err.statusCode || CONSTANTS.STATUS_CODES.SERVER_ERROR;
  const message = err.message || CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR;

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV !== "production" && { details: err.message }),
  });
};

// 404 handler
const notFoundHandler = (req, res) => {
  res.status(CONSTANTS.STATUS_CODES.NOT_FOUND).json({
    success: false,
    error: "Endpoint not found",
  });
};

module.exports = {
  errorHandler,
  notFoundHandler,
};
