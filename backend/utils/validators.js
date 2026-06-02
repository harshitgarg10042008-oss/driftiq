// backend/utils/validators.js

const { body, validationResult } = require("express-validator");
const CONSTANTS = require("../config/constants");

// Validation middleware that catches errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(CONSTANTS.STATUS_CODES.UNPROCESSABLE).json({
      success: false,
      error: CONSTANTS.ERROR_MESSAGES.VALIDATION_ERROR,
      details: errors.array(),
    });
  }
  next();
};

// User validators
const validateRegister = () => [
  body("email").isEmail().normalizeEmail(),
  body("username").isLength({ min: 3, max: 100 }).trim().escape(),
  body("password")
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      "Password must contain uppercase, lowercase, number, and special character",
    ),
  body("full_name").optional().trim().escape(),
];

const validateLogin = () => [
  body("email").isEmail().normalizeEmail(),
  body("password").notEmpty().trim(),
];

const validatePasswordChange = () => [
  body("current_password").notEmpty().trim(),
  body("new_password")
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      "Password must contain uppercase, lowercase, number, and special character",
    ),
  body("confirm_password").custom((value, { req }) => {
    if (value !== req.body.new_password) {
      throw new Error("Passwords do not match");
    }
    return true;
  }),
];

const validatePasswordReset = () => [body("email").isEmail().normalizeEmail()];

const validatePasswordResetConfirm = () => [
  body("token").notEmpty(),
  body("new_password")
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/),
];

// File validators
const validateFileUpload = () => [
  body("folder_id").optional().isUUID().withMessage("Invalid folder ID"),
];

const validateFileRename = () => [body("name").notEmpty().trim().escape()];

const validateFileMove = () => [
  body("folder_id").notEmpty().isUUID().withMessage("Invalid folder ID"),
];

const validateFileSearch = () => [body("query").notEmpty().trim().escape()];

// Folder validators
const validateCreateFolder = () => [
  body("name").notEmpty().trim().escape(),
  body("parent_id").optional().isUUID().withMessage("Invalid parent folder ID"),
  body("color")
    .optional()
    .matches(/^#[0-9A-F]{6}$/i),
];

const validateRenameFolder = () => [body("name").notEmpty().trim().escape()];

const validateMoveFolder = () => [
  body("parent_id").optional().isUUID().withMessage("Invalid parent folder ID"),
];

// Share validators
const validateCreateShare = () => [
  body("file_id").notEmpty().isUUID().withMessage("Invalid file ID"),
  body("expires_at").optional().isISO8601(),
  body("password").optional().trim().escape(),
  body("download_limit").optional().isInt({ min: 1 }),
];

// Helper to validate UUID
const isValidUUID = (uuid) => {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// Helper to validate email
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Helper to validate file type
const isAllowedFileType = (mimeType) => {
  return CONSTANTS.ALLOWED_FILE_TYPES.includes(mimeType);
};

// Helper to validate file size
const isFileSizeValid = (size) => {
  return size <= CONSTANTS.MAX_FILE_SIZE;
};

module.exports = {
  handleValidationErrors,
  validateRegister,
  validateLogin,
  validatePasswordChange,
  validatePasswordReset,
  validatePasswordResetConfirm,
  validateFileUpload,
  validateFileRename,
  validateFileMove,
  validateFileSearch,
  validateCreateFolder,
  validateRenameFolder,
  validateMoveFolder,
  validateCreateShare,
  isValidUUID,
  isValidEmail,
  isAllowedFileType,
  isFileSizeValid,
};
