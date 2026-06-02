// backend/services/folderService.js

const { supabase } = require("../config/database");
const CONSTANTS = require("../config/constants");
const logger = require("../utils/logger");
const { generateUUID, getPaginationParams } = require("../utils/helpers");

// Create folder
const createFolder = async (userId, name, parentId = null, color = null) => {
  try {
    // If parent folder specified, verify it exists
    if (parentId) {
      const { data: parentFolder } = await supabase
        .from("folders")
        .select("id")
        .eq("id", parentId)
        .eq("user_id", userId)
        .single();

      if (!parentFolder) {
        return {
          success: false,
          error: CONSTANTS.ERROR_MESSAGES.FOLDER_NOT_FOUND,
        };
      }
    }

    const folderId = generateUUID();
    const { data: folder, error } = await supabase
      .from("folders")
      .insert([
        {
          id: folderId,
          user_id: userId,
          name,
          parent_id: parentId,
          color,
        },
      ])
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return {
          success: false,
          error: "Folder with this name already exists",
        };
      }
      logger.error("Create folder error:", error);
      return { success: false, error: CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR };
    }

    logger.info(`Folder created: ${folderId} by user ${userId}`);

    return { success: true, data: folder };
  } catch (error) {
    logger.error("Create folder service error:", error);
    return { success: false, error: CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR };
  }
};

// Get user folders (tree structure)
const getUserFolders = async (userId, parentId = null) => {
  try {
    let query = supabase
      .from("folders")
      .select("*")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("name", { ascending: true });

    if (parentId) {
      query = query.eq("parent_id", parentId);
    } else {
      query = query.is("parent_id", null);
    }

    const { data: folders, error } = await query;

    if (error) {
      logger.error("Get folders error:", error);
      return { success: false, error: CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR };
    }

    return { success: true, data: folders || [] };
  } catch (error) {
    logger.error("Get folders service error:", error);
    return { success: false, error: CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR };
  }
};

// Get folder by ID with its contents
const getFolderById = async (userId, folderId) => {
  try {
    const { data: folder, error } = await supabase
      .from("folders")
      .select("*")
      .eq("id", folderId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .single();

    if (error || !folder) {
      return {
        success: false,
        error: CONSTANTS.ERROR_MESSAGES.FOLDER_NOT_FOUND,
      };
    }

    // Get subfolders
    const { data: subfolders } = await supabase
      .from("folders")
      .select("*")
      .eq("parent_id", folderId)
      .is("deleted_at", null)
      .order("name");

    // Get files in folder
    const { data: files } = await supabase
      .from("files")
      .select("*")
      .eq("folder_id", folderId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    return {
      success: true,
      data: {
        folder,
        subfolders: subfolders || [],
        files: files || [],
      },
    };
  } catch (error) {
    logger.error("Get folder error:", error);
    return { success: false, error: CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR };
  }
};

// Rename folder
const renameFolder = async (userId, folderId, newName) => {
  try {
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

    const { data: updatedFolder, error } = await supabase
      .from("folders")
      .update({ name: newName })
      .eq("id", folderId)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return {
          success: false,
          error: "Folder with this name already exists",
        };
      }
      return { success: false, error: CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR };
    }

    logger.info(`Folder renamed: ${folderId} to ${newName}`);

    return { success: true, data: updatedFolder };
  } catch (error) {
    logger.error("Rename folder error:", error);
    return { success: false, error: CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR };
  }
};

// Move folder
const moveFolder = async (userId, folderId, newParentId) => {
  try {
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

    // Check for circular reference
    if (newParentId) {
      const { data: parentFolder } = await supabase
        .from("folders")
        .select("*")
        .eq("id", newParentId)
        .eq("user_id", userId)
        .single();

      if (!parentFolder) {
        return {
          success: false,
          error: CONSTANTS.ERROR_MESSAGES.FOLDER_NOT_FOUND,
        };
      }

      // Check if moving folder to itself
      if (folderId === newParentId) {
        return { success: false, error: "Cannot move folder to itself" };
      }
    }

    const { data: updatedFolder, error } = await supabase
      .from("folders")
      .update({ parent_id: newParentId })
      .eq("id", folderId)
      .select()
      .single();

    if (error) {
      return { success: false, error: CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR };
    }

    logger.info(`Folder moved: ${folderId}`);

    return { success: true, data: updatedFolder };
  } catch (error) {
    logger.error("Move folder error:", error);
    return { success: false, error: CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR };
  }
};

// Delete folder (cascade delete)
const deleteFolder = async (userId, folderId) => {
  try {
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

    // Get all files in folder and subfolders recursively
    const { data: allFiles } = await supabase.rpc(
      "get_folder_files_recursive",
      { folder_id: folderId },
    );

    // Calculate total size to delete
    let totalSize = 0;
    if (allFiles && Array.isArray(allFiles)) {
      totalSize = allFiles.reduce((sum, file) => sum + (file.size || 0), 0);
    }

    // Soft delete all files
    if (allFiles && Array.isArray(allFiles)) {
      await supabase
        .from("files")
        .update({ deleted_at: new Date().toISOString() })
        .in(
          "id",
          allFiles.map((f) => f.id),
        );
    }

    // Soft delete folder and all subfolders
    await supabase
      .from("folders")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", folderId);

    // Update user storage
    if (totalSize > 0) {
      const { data: user } = await supabase
        .from("users")
        .select("storage_used")
        .eq("id", userId)
        .single();

      await supabase
        .from("users")
        .update({ storage_used: Math.max(0, user.storage_used - totalSize) })
        .eq("id", userId);
    }

    logger.info(`Folder deleted: ${folderId}`);

    return { success: true, data: { message: "Folder deleted successfully" } };
  } catch (error) {
    logger.error("Delete folder error:", error);
    return { success: false, error: CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR };
  }
};

// Get folder tree (for navigation)
const getFolderTree = async (userId) => {
  try {
    const { data: folders, error } = await supabase
      .from("folders")
      .select("*")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("name");

    if (error) {
      return { success: false, error: CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR };
    }

    // Build tree structure
    const tree = buildFolderTree(folders || []);

    return { success: true, data: tree };
  } catch (error) {
    logger.error("Get folder tree error:", error);
    return { success: false, error: CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR };
  }
};

// Helper to build tree structure
const buildFolderTree = (folders) => {
  const map = {};
  const roots = [];

  folders.forEach((folder) => {
    map[folder.id] = { ...folder, children: [] };
  });

  folders.forEach((folder) => {
    if (folder.parent_id && map[folder.parent_id]) {
      map[folder.parent_id].children.push(map[folder.id]);
    } else {
      roots.push(map[folder.id]);
    }
  });

  return roots;
};

module.exports = {
  createFolder,
  getUserFolders,
  getFolderById,
  renameFolder,
  moveFolder,
  deleteFolder,
  getFolderTree,
};
