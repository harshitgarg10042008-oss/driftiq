// backend/routes/folders.js

const express = require("express");
const { body } = require("express-validator");
const folderController = require("../controllers/folderController");
const { auth } = require("../middleware/auth");
const {
  handleValidationErrors,
  validateCreateFolder,
  validateRenameFolder,
  validateMoveFolder,
} = require("../utils/validators");

const router = express.Router();

// Middleware to protect all routes
router.use(auth);

// Create folder
router.post(
  "/",
  validateCreateFolder(),
  handleValidationErrors,
  folderController.createFolder,
);

// Get folders
router.get("/", folderController.getFolders);

// Get folder tree
router.get("/tree/structure", folderController.getFolderTree);

// Get folder details
router.get("/:folderId", folderController.getFolderDetails);

// Rename folder
router.put(
  "/:folderId/rename",
  validateRenameFolder(),
  handleValidationErrors,
  folderController.renameFolder,
);

// Move folder
router.post(
  "/:folderId/move",
  validateMoveFolder(),
  handleValidationErrors,
  folderController.moveFolder,
);

// Delete folder
router.delete("/:folderId", folderController.deleteFolder);

module.exports = router;
