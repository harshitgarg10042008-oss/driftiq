// backend/services/authService.js

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { supabase } = require("../config/database");
const CONSTANTS = require("../config/constants");
const logger = require("../utils/logger");
const { generateToken } = require("../utils/helpers");

// Hash password
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

// Compare password
const comparePassword = async (plainPassword, hashedPassword) => {
  return bcrypt.compare(plainPassword, hashedPassword);
};

// Generate JWT token
const generateJWT = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    },
    CONSTANTS.JWT_SECRET,
    { expiresIn: CONSTANTS.JWT_EXPIRY },
  );
};

// Register new user
const register = async (email, username, password, fullName = null) => {
  try {
    // Check if user exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (existingUser) {
      return {
        success: false,
        error: CONSTANTS.ERROR_MESSAGES.USER_EXISTS,
      };
    }

    // Check if username exists
    const { data: existingUsername } = await supabase
      .from("users")
      .select("id")
      .eq("username", username)
      .single();

    if (existingUsername) {
      return {
        success: false,
        error: "Username already taken",
      };
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const { data: newUser, error } = await supabase
      .from("users")
      .insert([
        {
          email,
          username,
          password_hash: hashedPassword,
          full_name: fullName,
        },
      ])
      .select()
      .single();

    if (error) {
      logger.error("Register error:", error);
      return {
        success: false,
        error: CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR,
      };
    }

    // Create storage stats entry
    await supabase
      .from("storage_stats")
      .insert([{ user_id: newUser.id, total_files: 0, total_size: 0 }]);

    const token = generateJWT(newUser);

    return {
      success: true,
      data: {
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          username: newUser.username,
          role: newUser.role,
        },
      },
    };
  } catch (error) {
    logger.error("Register service error:", error);
    return {
      success: false,
      error: CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR,
    };
  }
};

// Login user
const login = async (email, password) => {
  try {
    // Get user
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (error || !user) {
      return {
        success: false,
        error: CONSTANTS.ERROR_MESSAGES.INVALID_CREDENTIALS,
      };
    }

    // Check if user is active
    if (!user.is_active) {
      return {
        success: false,
        error: "Account has been deactivated",
      };
    }

    // Compare password
    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      return {
        success: false,
        error: CONSTANTS.ERROR_MESSAGES.INVALID_CREDENTIALS,
      };
    }

    // Update last login
    await supabase
      .from("users")
      .update({ last_login: new Date().toISOString() })
      .eq("id", user.id);

    // Generate JWT
    const token = generateJWT(user);

    return {
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          full_name: user.full_name,
          avatar_url: user.avatar_url,
          storage_limit: user.storage_limit,
          storage_used: user.storage_used,
        },
      },
    };
  } catch (error) {
    logger.error("Login service error:", error);
    return {
      success: false,
      error: CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR,
    };
  }
};

// Request password reset
const requestPasswordReset = async (email) => {
  try {
    const { data: user, error } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (error || !user) {
      // Don't reveal if email exists (security)
      return {
        success: true,
        data: { message: "If email exists, reset link has been sent" },
      };
    }

    // Generate reset token
    const resetToken = generateToken(32);
    const expiresAt = new Date(
      Date.now() + CONSTANTS.PASSWORD_RESET_TOKEN_EXPIRY,
    );

    // Store token in database
    await supabase
      .from("users")
      .update({
        password_reset_token: resetToken,
        password_reset_expires: expiresAt.toISOString(),
      })
      .eq("id", user.id);

    // TODO: Send email with reset link
    // const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    // await emailService.sendPasswordReset(email, resetLink);

    logger.info(`Password reset requested for ${email}`);

    return {
      success: true,
      data: {
        message: "If email exists, reset link has been sent",
        // TODO: Remove in production - only for development
        token: process.env.NODE_ENV === "development" ? resetToken : undefined,
      },
    };
  } catch (error) {
    logger.error("Password reset request error:", error);
    return {
      success: false,
      error: CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR,
    };
  }
};

// Confirm password reset
const confirmPasswordReset = async (token, newPassword) => {
  try {
    // Find user with valid token
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("password_reset_token", token)
      .single();

    if (error || !user) {
      return {
        success: false,
        error: "Invalid reset token",
      };
    }

    // Check token expiry
    if (new Date(user.password_reset_expires) < new Date()) {
      return {
        success: false,
        error: "Reset token has expired",
      };
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password and clear reset token
    await supabase
      .from("users")
      .update({
        password_hash: hashedPassword,
        password_reset_token: null,
        password_reset_expires: null,
      })
      .eq("id", user.id);

    logger.info(`Password reset completed for user ${user.id}`);

    return {
      success: true,
      data: { message: "Password reset successful" },
    };
  } catch (error) {
    logger.error("Password reset confirm error:", error);
    return {
      success: false,
      error: CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR,
    };
  }
};

// Change password (authenticated)
const changePassword = async (userId, currentPassword, newPassword) => {
  try {
    // Get user
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (error || !user) {
      return {
        success: false,
        error: CONSTANTS.ERROR_MESSAGES.USER_NOT_FOUND,
      };
    }

    // Verify current password
    const isMatch = await comparePassword(currentPassword, user.password_hash);
    if (!isMatch) {
      return {
        success: false,
        error: "Current password is incorrect",
      };
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await supabase
      .from("users")
      .update({ password_hash: hashedPassword })
      .eq("id", userId);

    logger.info(`Password changed for user ${userId}`);

    return {
      success: true,
      data: { message: "Password changed successfully" },
    };
  } catch (error) {
    logger.error("Change password error:", error);
    return {
      success: false,
      error: CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR,
    };
  }
};

// Get user by ID
const getUserById = async (userId) => {
  try {
    const { data: user, error } = await supabase
      .from("users")
      .select(
        "id, email, username, full_name, avatar_url, role, storage_limit, storage_used, telegram_status, created_at",
      )
      .eq("id", userId)
      .single();

    if (error || !user) {
      return {
        success: false,
        error: CONSTANTS.ERROR_MESSAGES.USER_NOT_FOUND,
      };
    }

    return {
      success: true,
      data: user,
    };
  } catch (error) {
    logger.error("Get user error:", error);
    return {
      success: false,
      error: CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR,
    };
  }
};

module.exports = {
  hashPassword,
  comparePassword,
  generateJWT,
  register,
  login,
  requestPasswordReset,
  confirmPasswordReset,
  changePassword,
  getUserById,
};
