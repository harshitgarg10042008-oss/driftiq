// backend/routes/auth.js

const express = require("express");
const { body, validationResult } = require("express-validator");
const authController = require("../controllers/authController");
const { auth } = require("../middleware/auth");
const {
  handleValidationErrors,
  validateRegister,
  validateLogin,
  validatePasswordChange,
  validatePasswordReset,
  validatePasswordResetConfirm,
} = require("../utils/validators");

const router = express.Router();

// Register
router.post(
  "/register",
  validateRegister(),
  handleValidationErrors,
  authController.register,
);

// Login
router.post(
  "/login",
  validateLogin(),
  handleValidationErrors,
  authController.login,
);

// Logout
router.post("/logout", auth, authController.logout);

// Request password reset
router.post(
  "/password-reset/request",
  validatePasswordReset(),
  handleValidationErrors,
  authController.requestPasswordReset,
);

// Confirm password reset
router.post(
  "/password-reset/confirm",
  validatePasswordResetConfirm(),
  handleValidationErrors,
  authController.confirmPasswordReset,
);

// Change password (authenticated)
router.post(
  "/password-change",
  auth,
  validatePasswordChange(),
  handleValidationErrors,
  authController.changePassword,
);

// Get profile
router.get("/profile", auth, authController.getProfile);

module.exports = router;
