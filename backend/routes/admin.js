// backend/routes/admin.js

const express = require("express");
const adminController = require("../controllers/adminController");
const { auth } = require("../middleware/auth");
const { adminOnly } = require("../middleware/roleGuard");

const router = express.Router();

// All admin routes require authentication and admin role
router.use(auth, adminOnly);

// Dashboard analytics
router.get("/dashboard", adminController.getDashboard);

// Get all users
router.get("/users", adminController.getAllUsers);

// Delete user
router.delete("/users/:userId", adminController.deleteUser);

// Get system logs
router.get("/logs", adminController.getSystemLogs);

// Get storage statistics
router.get("/storage/stats", adminController.getStorageStatistics);

// Get all files (admin override)
router.get("/files", adminController.getAllFiles);

// Delete any file (admin override)
router.delete("/files/:fileId", adminController.deleteFile);

module.exports = router;
