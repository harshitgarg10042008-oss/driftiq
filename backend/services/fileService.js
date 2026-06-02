// backend/services/fileService.js

const { supabase } = require("../config/database");
const CONSTANTS = require("../config/constants");
const logger = require("../utils/logger");
const {
  generateUUID,
  formatFileSize,
  getPaginationParams,
} = require("../utils/helpers");

// Upload file
const uploadFile = async (
  userId,
  fileName,
  fileSize,
  mimeType,
  folderId = null,
  telegramMessageId = null,
) => {
  try {
    // Check storage limit
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("storage_used, storage_limit")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      return { success: false, error: CONSTANTS.ERROR_MESSAGES.USER_NOT_FOUND };
    }

    if (user.storage_used + fileSize > user.storage_limit) {
      return {
        success: false,
        error: CONSTANTS.ERROR_MESSAGES.STORAGE_EXCEEDED,
      };
    }

    // Create file record
    const fileId = generateUUID();
    const { data: file, error } = await supabase
      .from("files")
      .insert([
        {
          id: fileId,
          user_id: userId,
          folder_id: folderId,
          name: fileName,
          original_name: fileName,
          mime_type: mimeType,
          size: fileSize,
          telegram_message_id: telegramMessageId,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      logger.error("Upload file error:", error);
      return { success: false, error: CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR };
    }

    // Update user storage
    await supabase
      .from("users")
      .update({ storage_used: user.storage_used + fileSize })
      .eq("id", userId);

    // Update storage stats
    const { data: stats } = await supabase
      .from("storage_stats")
      .select("*")
      .eq("user_id", userId)
      .single();

    await supabase
      .from("storage_stats")
      .update({
        total_files: (stats?.total_files || 0) + 1,
        total_size: (stats?.total_size || 0) + fileSize,
        last_updated: new Date().toISOString(),
      })
      .eq("user_id", userId);

    logger.info(`File uploaded: ${fileId} by user ${userId}`);

    return {
      success: true,
      data: file,
    };
  } catch (error) {
    logger.error("Upload file service error:", error);
    return { success: false, error: CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR };
  }
};

// Get user files
const getUserFiles = async (
  userId,
  page = 1,
  limit = 20,
  folderId = null,
  searchQuery = null,
) => {
  try {
    const { offset, limit: finalLimit } = getPaginationParams(page, limit);

    let query = supabase
      .from("files")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .range(offset, offset + finalLimit - 1);

    if (folderId) {
      query = query.eq("folder_id", folderId);
    } else {
      query = query.is("folder_id", null); // Only root files
    }

    if (searchQuery) {
      query = query.ilike("name", `%${searchQuery}%`);
    }

    const { data: files, error, count } = await query;

    if (error) {
      logger.error("Get files error:", error);
      return { success: false, error: CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR };
    }

    return {
      success: true,
      data: files || [],
      pagination: {
        total: count || 0,
        page,
        limit: finalLimit,
      },
    };
  } catch (error) {
    logger.error("Get files service error:", error);
    return { success: false, error: CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR };
  }
};

// Get file by ID
const getFileById = async (userId, fileId) => {
  try {
    const { data: file, error } = await supabase
      .from("files")
      .select("*")
      .eq("id", fileId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .single();

    if (error || !file) {
      return { success: false, error: CONSTANTS.ERROR_MESSAGES.FILE_NOT_FOUND };
    }

    return { success: true, data: file };
  } catch (error) {
    logger.error("Get file error:", error);
    return { success: false, error: CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR };
  }
};

// Rename file
const renameFile = async (userId, fileId, newName) => {
  try {
    const { data: file, error: getError } = await supabase
      .from("files")
      .select("*")
      .eq("id", fileId)
      .eq("user_id", userId)
      .single();

    if (getError || !file) {
      return { success: false, error: CONSTANTS.ERROR_MESSAGES.FILE_NOT_FOUND };
    }

    const { data: updatedFile, error } = await supabase
      .from("files")
      .update({ name: newName })
      .eq("id", fileId)
      .select()
      .single();

    if (error) {
      return { success: false, error: CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR };
    }

    logger.info(`File renamed: ${fileId} to ${newName}`);

    return { success: true, data: updatedFile };
  } catch (error) {
    logger.error("Rename file error:", error);
    return { success: false, error: CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR };
  }
};

// Move file to folder
const moveFileToFolder = async (userId, fileId, folderId) => {
  try {
    // Verify file exists and belongs to user
    const { data: file } = await supabase
      .from("files")
      .select("*")
      .eq("id", fileId)
      .eq("user_id", userId)
      .single();

    if (!file) {
      return { success: false, error: CONSTANTS.ERROR_MESSAGES.FILE_NOT_FOUND };
    }

    // Verify folder exists and belongs to user
    const { data: folder } = await supabase
      .from("folders")
      .select("*")
      .eq("id", folderId)
      .eq("user_id", userId)
      .single();

    if (!folder) {
      return {
        success: false,
        error: CONSTANTS.ERROR_MESSAGES.FOLDER_NOT_FOUND,
      };
    }

    // Move file
    const { data: updatedFile, error } = await supabase
      .from("files")
      .update({ folder_id: folderId })
      .eq("id", fileId)
      .select()
      .single();

    if (error) {
      return { success: false, error: CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR };
    }

    logger.info(`File moved: ${fileId} to folder ${folderId}`);

    return { success: true, data: updatedFile };
  } catch (error) {
    logger.error("Move file error:", error);
    return { success: false, error: CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR };
  }
};

// Delete file (soft delete)
const deleteFile = async (userId, fileId) => {
  try {
    const { data: file, error: getError } = await supabase
      .from("files")
      .select("*")
      .eq("id", fileId)
      .eq("user_id", userId)
      .single();

    if (getError || !file) {
      return { success: false, error: CONSTANTS.ERROR_MESSAGES.FILE_NOT_FOUND };
    }

    // Soft delete file
    const { error } = await supabase
      .from("files")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", fileId);

    if (error) {
      return { success: false, error: CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR };
    }

    // Update user storage
    const { data: user } = await supabase
      .from("users")
      .select("storage_used")
      .eq("id", userId)
      .single();

    await supabase
      .from("users")
      .update({ storage_used: Math.max(0, user.storage_used - file.size) })
      .eq("id", userId);

    // Update storage stats
    const { data: stats } = await supabase
      .from("storage_stats")
      .select("*")
      .eq("user_id", userId)
      .single();

    await supabase
      .from("storage_stats")
      .update({
        total_files: Math.max(0, (stats?.total_files || 1) - 1),
        total_size: Math.max(0, (stats?.total_size || file.size) - file.size),
        last_updated: new Date().toISOString(),
      })
      .eq("user_id", userId);

    logger.info(`File deleted: ${fileId}`);

    return { success: true, data: { message: "File deleted successfully" } };
  } catch (error) {
    logger.error("Delete file error:", error);
    return { success: false, error: CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR };
  }
};

// Get storage stats
const getStorageStats = async (userId) => {
  try {
    const { data: stats, error } = await supabase
      .from("storage_stats")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error || !stats) {
      return {
        success: true,
        data: {
          total_files: 0,
          total_size: 0,
          total_shares: 0,
          used_percent: 0,
        },
      };
    }

    const { data: user } = await supabase
      .from("users")
      .select("storage_limit")
      .eq("id", userId)
      .single();

    const usedPercent = Math.round(
      (stats.total_size / (user?.storage_limit || 1)) * 100,
    );

    return {
      success: true,
      data: {
        total_files: stats.total_files,
        total_size: stats.total_size,
        total_shares: stats.total_shares,
        used_percent: usedPercent,
        formatted_size: formatFileSize(stats.total_size),
      },
    };
  } catch (error) {
    logger.error("Get storage stats error:", error);
    return { success: false, error: CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR };
  }
};

// Search files
const searchFiles = async (userId, query, page = 1, limit = 20) => {
  try {
    const { offset, limit: finalLimit } = getPaginationParams(page, limit);

    const {
      data: files,
      error,
      count,
    } = await supabase
      .from("files")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .is("deleted_at", null)
      .ilike("name", `%${query}%`)
      .order("created_at", { ascending: false })
      .range(offset, offset + finalLimit - 1);

    if (error) {
      logger.error("Search files error:", error);
      return { success: false, error: CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR };
    }

    return {
      success: true,
      data: files || [],
      pagination: {
        total: count || 0,
        page,
        limit: finalLimit,
      },
    };
  } catch (error) {
    logger.error("Search files service error:", error);
    return { success: false, error: CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR };
  }
};

// Star/unstar file
const toggleStarFile = async (userId, fileId) => {
  try {
    const { data: file } = await supabase
      .from("files")
      .select("is_starred")
      .eq("id", fileId)
      .eq("user_id", userId)
      .single();

    if (!file) {
      return { success: false, error: CONSTANTS.ERROR_MESSAGES.FILE_NOT_FOUND };
    }

    const { data: updatedFile, error } = await supabase
      .from("files")
      .update({ is_starred: !file.is_starred })
      .eq("id", fileId)
      .select()
      .single();

    if (error) {
      return { success: false, error: CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR };
    }

    return { success: true, data: updatedFile };
  } catch (error) {
    logger.error("Toggle star file error:", error);
    return { success: false, error: CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR };
  }
};

module.exports = {
  uploadFile,
  getUserFiles,
  getFileById,
  renameFile,
  moveFileToFolder,
  deleteFile,
  getStorageStats,
  searchFiles,
  toggleStarFile,
};
