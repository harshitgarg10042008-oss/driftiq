// backend/routes/shares.js

const express = require("express");
const { body } = require("express-validator");
const shareController = require("../controllers/shareController");
const { auth, optionalAuth } = require("../middleware/auth");
const {
  handleValidationErrors,
  validateCreateShare,
} = require("../utils/validators");

const router = express.Router();

// Create share (authenticated)
router.post(
  "/create",
  auth,
  validateCreateShare(),
  handleValidationErrors,
  shareController.createShare,
);

// Get user's shares (authenticated)
router.get("/my-shares", auth, shareController.getUserShares);

// Get shared file (public)
router.post("/public/access", shareController.getSharedFile);

// Download shared file (public)
router.post("/public/download", shareController.downloadSharedFile);

// Update share (authenticated)
router.put(
  "/:shareId",
  auth,
  [
    body("expires_at").optional().isISO8601(),
    body("password").optional().trim(),
    body("download_limit").optional().isInt({ min: 1 }),
    body("is_active").optional().isBoolean(),
  ],
  handleValidationErrors,
  shareController.updateShare,
);

// Delete share (authenticated)
router.delete("/:shareId", auth, shareController.deleteShare);

module.exports = router;
