// backend/services/shareService.js

const { supabase } = require("../config/database");
const CONSTANTS = require("../config/constants");
const logger = require("../utils/logger");
const { generateShareToken } = require("../utils/helpers");
const bcrypt = require("bcryptjs");

// Create share link
const createShare = async (
  userId,
  fileId,
  expiresAt = null,
  password = null,
  downloadLimit = null,
) => {
  try {
    // Verify file exists and belongs to user
    const { data: file } = await supabase
      .from("files")
      .select("id, name, size")
      .eq("id", fileId)
      .eq("user_id", userId)
      .single();

    if (!file) {
      return { success: false, error: CONSTANTS.ERROR_MESSAGES.FILE_NOT_FOUND };
    }

    // Generate share token
    const shareToken = generateShareToken();
    let passwordHash = null;

    if (password) {
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(password, salt);
    }

    const { data: share, error } = await supabase
      .from("shares")
      .insert([
        {
          file_id: fileId,
          user_id: userId,
          share_token: shareToken,
          password_hash: passwordHash,
          expires_at: expiresAt,
          download_limit: downloadLimit,
          is_active: true,
        },
      ])
      .select()
      .single();

    if (error) {
      logger.error("Create share error:", error);
      return { success: false, error: CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR };
    }

    logger.info(`Share created: ${share.id} for file ${fileId}`);

    return {
      success: true,
      data: {
        id: share.id,
        share_token: share.share_token,
        share_url: `${process.env.FRONTEND_URL}/shared?token=${share.share_token}`,
        expires_at: share.expires_at,
        is_password_protected: !!password,
        download_limit: share.download_limit,
      },
    };
  } catch (error) {
    logger.error("Create share service error:", error);
    return { success: false, error: CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR };
  }
};

// Get user's shares
const getUserShares = async (userId, page = 1, limit = 20) => {
  try {
    const offset = (page - 1) * limit;

    const {
      data: shares,
      error,
      count,
    } = await supabase
      .from("shares")
      .select("*, files(id, name, size, created_at)", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error("Get shares error:", error);
      return { success: false, error: CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR };
    }

    const formattedShares = (shares || []).map((share) => ({
      id: share.id,
      file_name: share.files?.[0]?.name,
      file_size: share.files?.[0]?.size,
      share_token: share.share_token,
      share_url: `${process.env.FRONTEND_URL}/shared?token=${share.share_token}`,
      is_password_protected: !!share.password_hash,
      download_count: share.download_count,
      download_limit: share.download_limit,
      expires_at: share.expires_at,
      is_active: share.is_active,
      created_at: share.created_at,
    }));

    return {
      success: true,
      data: formattedShares,
      pagination: { total: count, page, limit },
    };
  } catch (error) {
    logger.error("Get user shares service error:", error);
    return { success: false, error: CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR };
  }
};

// Get shared file (public access)
const getSharedFile = async (shareToken, password = null) => {
  try {
    const { data: share, error } = await supabase
      .from("shares")
      .select("*, files(*)")
      .eq("share_token", shareToken)
      .eq("is_active", true)
      .single();

    if (error || !share) {
      return { success: false, error: "Share link not found or expired" };
    }

    // Check if expired
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return { success: false, error: "Share link has expired" };
    }

    // Check if download limit reached
    if (share.download_limit && share.download_count >= share.download_limit) {
      return { success: false, error: "Download limit reached" };
    }

    // Check password if required
    if (share.password_hash) {
      if (!password) {
        return {
          success: false,
          error: "Password required",
          needsPassword: true,
        };
      }

      const isPasswordMatch = await bcrypt.compare(
        password,
        share.password_hash,
      );
      if (!isPasswordMatch) {
        return { success: false, error: "Invalid password" };
      }
    }

    const file = share.files?.[0];

    return {
      success: true,
      data: {
        file_id: file.id,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.mime_type,
        telegram_message_id: file.telegram_message_id,
        download_count: share.download_count,
        download_limit: share.download_limit,
      },
    };
  } catch (error) {
    logger.error("Get shared file error:", error);
    return { success: false, error: CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR };
  }
};

// Update share (expiry, password, limit)
const updateShare = async (userId, shareId, updates) => {
  try {
    // Verify share belongs to user
    const { data: share } = await supabase
      .from("shares")
      .select("id")
      .eq("id", shareId)
      .eq("user_id", userId)
      .single();

    if (!share) {
      return {
        success: false,
        error: CONSTANTS.ERROR_MESSAGES.SHARE_NOT_FOUND,
      };
    }

    const updateData = {};

    if (updates.expires_at !== undefined) {
      updateData.expires_at = updates.expires_at;
    }

    if (updates.download_limit !== undefined) {
      updateData.download_limit = updates.download_limit;
    }

    if (updates.password !== undefined) {
      if (updates.password) {
        const salt = await bcrypt.genSalt(10);
        updateData.password_hash = await bcrypt.hash(updates.password, salt);
      } else {
        updateData.password_hash = null;
      }
    }

    if (updates.is_active !== undefined) {
      updateData.is_active = updates.is_active;
    }

    const { data: updatedShare, error } = await supabase
      .from("shares")
      .update(updateData)
      .eq("id", shareId)
      .select()
      .single();

    if (error) {
      return { success: false, error: CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR };
    }

    logger.info(`Share updated: ${shareId}`);

    return { success: true, data: updatedShare };
  } catch (error) {
    logger.error("Update share error:", error);
    return { success: false, error: CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR };
  }
};

// Delete share
const deleteShare = async (userId, shareId) => {
  try {
    const { data: share } = await supabase
      .from("shares")
      .select("id")
      .eq("id", shareId)
      .eq("user_id", userId)
      .single();

    if (!share) {
      return {
        success: false,
        error: CONSTANTS.ERROR_MESSAGES.SHARE_NOT_FOUND,
      };
    }

    const { error } = await supabase.from("shares").delete().eq("id", shareId);

    if (error) {
      return { success: false, error: CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR };
    }

    logger.info(`Share deleted: ${shareId}`);

    return { success: true, data: { message: "Share deleted successfully" } };
  } catch (error) {
    logger.error("Delete share error:", error);
    return { success: false, error: CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR };
  }
};

// Log download
const logDownload = async (shareId, ipAddress = null, userAgent = null) => {
  try {
    const { data: share } = await supabase
      .from("shares")
      .select("download_count, download_limit")
      .eq("id", shareId)
      .single();

    if (!share) {
      return {
        success: false,
        error: CONSTANTS.ERROR_MESSAGES.SHARE_NOT_FOUND,
      };
    }

    // Increment download count
    await supabase
      .from("shares")
      .update({
        download_count: share.download_count + 1,
      })
      .eq("id", shareId);

    // Log download
    await supabase.from("downloads").insert([
      {
        share_id: shareId,
        ip_address: ipAddress,
        user_agent: userAgent,
      },
    ]);

    return { success: true };
  } catch (error) {
    logger.error("Log download error:", error);
    return { success: false };
  }
};

module.exports = {
  createShare,
  getUserShares,
  getSharedFile,
  updateShare,
  deleteShare,
  logDownload,
};
