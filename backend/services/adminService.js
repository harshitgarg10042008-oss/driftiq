// backend/services/adminService.js

const { supabase } = require("../config/database");
const CONSTANTS = require("../config/constants");
const logger = require("../utils/logger");

// Get dashboard analytics
const getDashboardAnalytics = async () => {
  try {
    // Total users
    const { count: totalUsers } = await supabase
      .from("users")
      .select("*", { count: "exact" });

    // Active users (last 24h)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: activeUsers } = await supabase
      .from("users")
      .select("*", { count: "exact" })
      .gt("last_login", yesterday);

    // Total files
    const { count: totalFiles } = await supabase
      .from("files")
      .select("*", { count: "exact" })
      .is("deleted_at", null);

    // Total storage
    const { data: storageData } = await supabase
      .from("storage_stats")
      .select("total_size");

    const totalStorage = (storageData || []).reduce(
      (sum, s) => sum + (s.total_size || 0),
      0,
    );

    // Total shares
    const { count: totalShares } = await supabase
      .from("shares")
      .select("*", { count: "exact" })
      .eq("is_active", true);

    return {
      success: true,
      data: {
        total_users: totalUsers || 0,
        active_users: activeUsers || 0,
        total_files: totalFiles || 0,
        total_storage: totalStorage || 0,
        total_shares: totalShares || 0,
      },
    };
  } catch (error) {
    logger.error("Get dashboard analytics error:", error);
    return { success: false, error: CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR };
  }
};

// Get all users
const getAllUsers = async (page = 1, limit = 20, search = null) => {
  try {
    const offset = (page - 1) * limit;

    let query = supabase
      .from("users")
      .select(
        "id, email, username, full_name, role, storage_used, storage_limit, is_active, last_login, created_at",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(
        `email.ilike.%${search}%,username.ilike.%${search}%,full_name.ilike.%${search}%`,
      );
    }

    const { data: users, error, count } = await query;

    if (error) {
      logger.error("Get all users error:", error);
      return { success: false, error: CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR };
    }

    return {
      success: true,
      data: users || [],
      pagination: { total: count, page, limit },
    };
  } catch (error) {
    logger.error("Get all users service error:", error);
    return { success: false, error: CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR };
  }
};

// Delete user (admin)
const deleteUser = async (adminId, userId) => {
  try {
    // Verify user exists
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .single();

    if (!user) {
      return { success: false, error: CONSTANTS.ERROR_MESSAGES.USER_NOT_FOUND };
    }

    // Soft delete user
    await supabase
      .from("users")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", userId);

    // Log admin action
    await logAdminAction(adminId, "delete_user", null, userId, "User deleted");

    logger.info(`User deleted by admin ${adminId}: ${userId}`);

    return { success: true, data: { message: "User deleted successfully" } };
  } catch (error) {
    logger.error("Delete user error:", error);
    return { success: false, error: CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR };
  }
};

// Get system logs
const getSystemLogs = async (page = 1, limit = 50, action = null) => {
  try {
    const offset = (page - 1) * limit;

    let query = supabase
      .from("admin_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (action) {
      query = query.eq("action", action);
    }

    const { data: logs, error, count } = await query;

    if (error) {
      logger.error("Get logs error:", error);
      return { success: false, error: CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR };
    }

    return {
      success: true,
      data: logs || [],
      pagination: { total: count, page, limit },
    };
  } catch (error) {
    logger.error("Get system logs error:", error);
    return { success: false, error: CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR };
  }
};

// Log admin action
const logAdminAction = async (
  adminId,
  action,
  targetFileId = null,
  targetUserId = null,
  description = null,
  metadata = null,
) => {
  try {
    await supabase.from("admin_logs").insert([
      {
        admin_id: adminId,
        action,
        target_file_id: targetFileId,
        target_user_id: targetUserId,
        description,
        metadata: metadata ? JSON.stringify(metadata) : null,
        status: "success",
      },
    ]);
  } catch (error) {
    logger.error("Log admin action error:", error);
  }
};

// Get storage statistics
const getStorageStatistics = async () => {
  try {
    const { data: stats } = await supabase.from("storage_stats").select("*");

    const totalSize = (stats || []).reduce(
      (sum, s) => sum + (s.total_size || 0),
      0,
    );
    const totalFiles = (stats || []).reduce(
      (sum, s) => sum + (s.total_files || 0),
      0,
    );
    const averagePerUser =
      totalFiles > 0 ? totalSize / (stats?.length || 1) : 0;

    return {
      success: true,
      data: {
        total_users: stats?.length || 0,
        total_storage: totalSize,
        total_files: totalFiles,
        average_per_user: averagePerUser,
      },
    };
  } catch (error) {
    logger.error("Get storage statistics error:", error);
    return { success: false, error: CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR };
  }
};

// Get all uploaded files across all users (admin)
const getAllFiles = async (page = 1, limit = 50) => {
  try {
    const offset = (page - 1) * limit;
    
    const { data: files, error, count } = await supabase
      .from("files")
      .select("*, users(username, email)", { count: "exact" })
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error("Admin get all files error: " + error.message);
      return { success: false, error: CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR };
    }

    return {
      success: true,
      data: files || [],
      pagination: { total: count, page, limit }
    };
  } catch (err) {
    logger.error("Admin get all files service error: " + err.message);
    return { success: false, error: CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR };
  }
};

// Delete any file (admin)
const deleteAnyFile = async (adminId, fileId) => {
  try {
    const { data: file, error: getError } = await supabase
      .from("files")
      .select("*")
      .eq("id", fileId)
      .single();

    if (getError || !file) {
      return { success: false, error: CONSTANTS.ERROR_MESSAGES.FILE_NOT_FOUND };
    }

    // Soft delete file
    const { error: deleteErr } = await supabase
      .from("files")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", fileId);

    if (deleteErr) {
      return { success: false, error: CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR };
    }

    // Update the file owner's storage stats
    const userId = file.user_id;
    const { data: user } = await supabase
      .from("users")
      .select("storage_used")
      .eq("id", userId)
      .single();

    if (user) {
      await supabase
        .from("users")
        .update({ storage_used: Math.max(0, user.storage_used - file.size) })
        .eq("id", userId);
    }

    const { data: stats } = await supabase
      .from("storage_stats")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (stats) {
      await supabase
        .from("storage_stats")
        .update({
          total_files: Math.max(0, stats.total_files - 1),
          total_size: Math.max(0, stats.total_size - file.size),
          last_updated: new Date().toISOString(),
        })
        .eq("user_id", userId);
    }

    // Log admin action
    await logAdminAction(adminId, "delete_file", fileId, null, `Deleted file '${file.name}' owned by user ${userId}`);

    logger.info(`File ${fileId} deleted by admin ${adminId}`);
    return { success: true, data: { message: "File deleted successfully" } };
  } catch (error) {
    logger.error("Admin delete file service error: " + error.message);
    return { success: false, error: CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR };
  }
};

module.exports = {
  getDashboardAnalytics,
  getAllUsers,
  deleteUser,
  getSystemLogs,
  logAdminAction,
  getStorageStatistics,
  getAllFiles,
  deleteAnyFile,
};
