// backend/controllers/folderController.js

const folderService = require("../services/folderService");
const CONSTANTS = require("../config/constants");
const logger = require("../utils/logger");

// Create folder
const createFolder = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name, parent_id, color } = req.body;

    const result = await folderService.createFolder(
      userId,
      name,
      parent_id,
      color,
    );

    if (!result.success) {
      return res.status(CONSTANTS.STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: result.error,
      });
    }

    res.status(CONSTANTS.STATUS_CODES.CREATED).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
};

// Get folders
const getFolders = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { parent_id } = req.query;

    const result = await folderService.getUserFolders(userId, parent_id);

    if (!result.success) {
      return res.status(CONSTANTS.STATUS_CODES.SERVER_ERROR).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
};

// Get folder details with contents
const getFolderDetails = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { folderId } = req.params;

    const result = await folderService.getFolderById(userId, folderId);

    if (!result.success) {
      return res.status(CONSTANTS.STATUS_CODES.NOT_FOUND).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
};

// Rename folder
const renameFolder = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { folderId } = req.params;
    const { name } = req.body;

    const result = await folderService.renameFolder(userId, folderId, name);

    if (!result.success) {
      return res.status(CONSTANTS.STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
};

// Move folder
const moveFolder = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { folderId } = req.params;
    const { parent_id } = req.body;

    const result = await folderService.moveFolder(userId, folderId, parent_id);

    if (!result.success) {
      return res.status(CONSTANTS.STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
};

// Delete folder
const deleteFolder = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { folderId } = req.params;

    const result = await folderService.deleteFolder(userId, folderId);

    if (!result.success) {
      return res.status(CONSTANTS.STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: result.error,
      });
    }

    res.json(result.data);
  } catch (error) {
    next(error);
  }
};

// Get folder tree (for navigation)
const getFolderTree = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await folderService.getFolderTree(userId);

    if (!result.success) {
      return res.status(CONSTANTS.STATUS_CODES.SERVER_ERROR).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createFolder,
  getFolders,
  getFolderDetails,
  renameFolder,
  moveFolder,
  deleteFolder,
  getFolderTree,
};
