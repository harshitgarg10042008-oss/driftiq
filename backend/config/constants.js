// backend/config/constants.js

module.exports = {
  // JWT Configuration
  JWT_SECRET: process.env.JWT_SECRET || "your-super-secret-jwt-key",
  JWT_EXPIRY: "24h",
  REFRESH_TOKEN_EXPIRY: "7d",

  // Password Reset
  PASSWORD_RESET_TOKEN_EXPIRY: 60 * 60 * 1000, // 1 hour in milliseconds
  PASSWORD_RESET_TOKEN_LENGTH: 32,

  // File Configuration
  MAX_FILE_SIZE: 5 * 1024 * 1024 * 1024, // 5GB
  ALLOWED_FILE_TYPES: [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "text/plain",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "video/mp4",
    "audio/mpeg",
    "application/zip",
  ],

  // Storage Limits (in bytes)
  FREE_USER_STORAGE: 5 * 1024 * 1024 * 1024, // 5GB
  PREMIUM_USER_STORAGE: 100 * 1024 * 1024 * 1024, // 100GB

  // Rate Limiting
  RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100, // per window
  LOGIN_RATE_LIMIT: 5, // attempts
  LOGIN_RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes

  // Share Token
  SHARE_TOKEN_LENGTH: 32,

  // Roles
  ROLES: {
    ADMIN: "admin",
    USER: "user",
  },

  // Telegram
  TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET,

  // API Status Codes
  STATUS_CODES: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE: 422,
    RATE_LIMITED: 429,
    SERVER_ERROR: 500,
  },

  // Error Messages
  ERROR_MESSAGES: {
    INVALID_CREDENTIALS: "Invalid email or password",
    USER_EXISTS: "User already exists",
    USER_NOT_FOUND: "User not found",
    FILE_NOT_FOUND: "File not found",
    FOLDER_NOT_FOUND: "Folder not found",
    SHARE_NOT_FOUND: "Share not found",
    UNAUTHORIZED: "Unauthorized access",
    INVALID_TOKEN: "Invalid or expired token",
    INVALID_FILE_TYPE: "File type not allowed",
    FILE_TOO_LARGE: "File size exceeds limit",
    STORAGE_EXCEEDED: "Storage limit exceeded",
    RATE_LIMITED: "Too many requests. Please try again later",
    INTERNAL_ERROR: "Internal server error",
    VALIDATION_ERROR: "Validation error",
  },

  // Email Configuration
  EMAIL_FROM: process.env.EMAIL_FROM || "noreply@driftiq.com",
};
