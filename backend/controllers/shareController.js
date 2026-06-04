// backend/controllers/shareController.js

const shareService = require("../services/shareService");
const telegramService = require("../services/telegramService");
const fileService = require("../services/fileService");
const CONSTANTS = require("../config/constants");
const logger = require("../utils/logger");

// Create share link
const createShare = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { file_id, expires_at, password, download_limit } = req.body;

    const result = await shareService.createShare(
      userId,
      file_id,
      expires_at,
      password,
      download_limit,
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

// Get user's shares
const getUserShares = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const result = await shareService.getUserShares(userId, page, limit);

    if (!result.success) {
      return res.status(CONSTANTS.STATUS_CODES.SERVER_ERROR).json({
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

// Get shared file (public)
const getSharedFile = async (req, res, next) => {
  try {
    const { token } = req.query;
    const password = (req.body && req.body.password) || req.query.password || null;

    if (!token) {
      return res.status(CONSTANTS.STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: "Share token required",
      });
    }

    const result = await shareService.getSharedFile(token, password);

    if (!result.success) {
      const statusCode = result.needsPassword
        ? CONSTANTS.STATUS_CODES.UNAUTHORIZED
        : CONSTANTS.STATUS_CODES.NOT_FOUND;
      return res.status(statusCode).json({
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

// Download shared file
const downloadSharedFile = async (req, res, next) => {
  try {
    const { token } = req.query;
    const password = (req.body && req.body.password) || req.query.password || null;

    if (!token) {
      return res.status(CONSTANTS.STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: "Share token required",
      });

    // Get shared file details
    const shareResult = await shareService.getSharedFile(token, password);

    if (!shareResult.success) {
      const statusCode = shareResult.needsPassword
        ? CONSTANTS.STATUS_CODES.UNAUTHORIZED
        : CONSTANTS.STATUS_CODES.NOT_FOUND;
      return res.status(statusCode).json({
        success: false,
        error: shareResult.error,
      });
    }

    const fileData = shareResult.data;

    // Download from Telegram
    const downloadResult = await telegramService.downloadFileFromTelegram(
      fileData.telegram_file_id || fileData.telegram_message_id,
    );

    if (!downloadResult.success) {
      return res.status(CONSTANTS.STATUS_CODES.SERVER_ERROR).json({
        success: false,
        error: "Failed to download file",
      });
    }

    // Log download
    await shareService.logDownload(
      fileData.share_id || token,
      req.ip,
      req.get("user-agent"),
    );

    // Send file
    res.set({
      "Content-Type": fileData.mime_type,
      "Content-Disposition": `attachment; filename="${fileData.file_name}"`,
    });
    res.send(downloadResult.data);
  } catch (error) {
    next(error);
  }
};

// Update share
const updateShare = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { shareId } = req.params;
    const updates = req.body;

    const result = await shareService.updateShare(userId, shareId, updates);

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

// Delete share
const deleteShare = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { shareId } = req.params;

    const result = await shareService.deleteShare(userId, shareId);

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

module.exports = {
  createShare,
  getUserShares,
  getSharedFile,
  downloadSharedFile,
  updateShare,
  deleteShare,
};
