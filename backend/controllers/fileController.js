// backend/controllers/fileController.js

const fileService = require("../services/fileService");
const telegramService = require("../services/telegramService");
const CONSTANTS = require("../config/constants");
const logger = require("../utils/logger");

// Upload file
const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(CONSTANTS.STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: "No file provided",
      });
    }

    const { folder_id } = req.body;
    const userId = req.user.id;
    const fileName = req.file.originalname;
    const fileSize = req.file.size;
    const mimeType = req.file.mimetype;

    // Validate file size
    if (fileSize > CONSTANTS.MAX_FILE_SIZE) {
      return res.status(CONSTANTS.STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: CONSTANTS.ERROR_MESSAGES.FILE_TOO_LARGE,
      });
    }

    // Validate file type
    if (!CONSTANTS.ALLOWED_FILE_TYPES.includes(mimeType)) {
      return res.status(CONSTANTS.STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: CONSTANTS.ERROR_MESSAGES.INVALID_FILE_TYPE,
      });
    }

    // Upload to Telegram
    const telegramResult = await telegramService.uploadFileToTelegram(
      req.file.buffer,
      fileName,
      mimeType
    );

    if (!telegramResult.success) {
      return res.status(CONSTANTS.STATUS_CODES.SERVER_ERROR).json({
        success: false,
        error: "Failed to upload file",
      });
    }

    // Save file metadata
    const fileResult = await fileService.uploadFile(
      userId,
      fileName,
      fileSize,
      mimeType,
      folder_id || null,
      telegramResult.data.telegram_message_id
    );

    if (!fileResult.success) {
      return res.status(CONSTANTS.STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: fileResult.error,
      });
    }

    res.status(CONSTANTS.STATUS_CODES.CREATED).json({
      success: true,
      data: fileResult.data,
    });
  } catch (error) {
    next(error);
  }
};

// Get files
const getFiles = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, folder_id, search } = req.query;

    const result = await fileService.getUserFiles(
      userId,
      page,
      limit,
      folder_id,
      search
    );

    if (!result.success) {
      return res.status(CONSTANTS.STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: result.error,
      });
    }

    res.header("X-Total-Count", result.pagination.total);
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

// Get file details
const getFileDetails = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { fileId } = req.params;

    const result = await fileService.getFileById(userId, fileId);

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

// Download file
const downloadFile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { fileId } = req.params;

    // Get file details
    const fileResult = await fileService.getFileById(userId, fileId);

    if (!fileResult.success) {
      return res.status(CONSTANTS.STATUS_CODES.NOT_FOUND).json({
        success: false,
        error: fileResult.error,
      });
    }

    const file = fileResult.data;

    // Download from Telegram
    const downloadResult = await telegramService.downloadFileFromTelegram(
      file.telegram_message_id
    );

    if (!downloadResult.success) {
      return res.status(CONSTANTS.STATUS_CODES.SERVER_ERROR).json({
        success: false,
        error: "Failed to download file",
      });
    }

    // Send file
    res.set({
      "Content-Type": file.mime_type,
      "Content-Disposition": `attachment; filename="${file.name}"`,
    });
    res.send(downloadResult.data);
  } catch (error) {
    next(error);
  }
};

// Rename file
const renameFile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { fileId } = req.params;
    const { name } = req.body;

    const result = await fileService.renameFile(userId, fileId, name);

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

// Move file
const moveFile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { fileId } = req.params;
    const { folder_id } = req.body;

    const result = await fileService.moveFileToFolder(userId, fileId, folder_id);

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

// Delete file
const deleteFile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { fileId } = req.params;

    const result = await fileService.deleteFile(userId, fileId);

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

// Get storage stats
const getStorageStats = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await fileService.getStorageStats(userId);

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

// Search files
const searchFiles = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { query, page = 1, limit = 20 } = req.query;

    if (!query) {
      return res.status(CONSTANTS.STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: "Search query required",
      });
    }

    const result = await fileService.searchFiles(userId, query, page, limit);

    if (!result.success) {
      return res.status(CONSTANTS.STATUS_CODES.SERVER_ERROR).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

// Toggle star file
const toggleStar = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { fileId } = req.params;

    const result = await fileService.toggleStarFile(userId, fileId);

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

module.exports = {
  uploadFile,
  getFiles,
  getFileDetails,
  downloadFile,
  renameFile,
  moveFile,
  deleteFile,
  getStorageStats,
  searchFiles,
  toggleStar,
};
