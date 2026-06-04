// backend/routes/files.js

const express = require("express");
const multer = require("multer");
const fileController = require("../controllers/fileController");
const { auth } = require("../middleware/auth");
const {
  handleValidationErrors,
  validateFileUpload,
  validateFileRename,
  validateFileMove,
} = require("../utils/validators");
const { body } = require("express-validator");

const router = express.Router();

// Multer setup
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 * 1024 }, // 5GB
});

// Middleware to protect all routes
router.use(auth);

// Upload file
router.post(
  "/upload",
  upload.single("file"),
  validateFileUpload(),
  handleValidationErrors,
  fileController.uploadFile,
);

// Get files
router.get("/", fileController.getFiles);

// Get file details
router.get("/:fileId", fileController.getFileDetails);

// Download file
router.get("/:fileId/download", fileController.downloadFile);

// Search files
router.get("/search/query", fileController.searchFiles);

// Rename file
router.put(
  "/:fileId/rename",
  [body("name").notEmpty().trim().escape()],
  handleValidationErrors,
  fileController.renameFile,
);

// Move file
router.post(
  "/:fileId/move",
  validateFileMove(),
  handleValidationErrors,
  fileController.moveFile,
);

// Delete file
router.delete("/:fileId", fileController.deleteFile);

// Get storage stats
router.get("/stats/usage", fileController.getStorageStats);

// Toggle star
router.patch("/:fileId/star", fileController.toggleStar);

// Restore file
router.patch("/:fileId/restore", fileController.restoreFile);

// Purge file
router.delete("/:fileId/purge", fileController.hardDeleteFile);

module.exports = router;
