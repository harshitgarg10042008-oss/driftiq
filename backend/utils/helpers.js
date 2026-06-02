// backend/utils/helpers.js

const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");

// Generate random token
const generateToken = (length = 32) => {
  return crypto.randomBytes(length).toString("hex");
};

// Generate share token
const generateShareToken = () => {
  return crypto.randomBytes(24).toString("base64url");
};

// Hash password helper
const hashPassword = (password) => {
  return crypto.createHash("sha256").update(password).digest("hex");
};

// Calculate file hash
const calculateFileHash = (buffer) => {
  return crypto.createHash("sha256").update(buffer).digest("hex");
};

// Generate UUID
const generateUUID = () => {
  return uuidv4();
};

// Format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};

// Check if date is in past
const isExpired = (date) => {
  return new Date(date) < new Date();
};

// Get file extension
const getFileExtension = (filename) => {
  return filename.split(".").pop().toLowerCase();
};

// Get file type category
const getFileCategory = (mimeType) => {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.includes("pdf")) return "pdf";
  if (
    mimeType.includes("document") ||
    mimeType.includes("word") ||
    mimeType.includes("text")
  )
    return "document";
  if (mimeType.includes("sheet") || mimeType.includes("excel"))
    return "spreadsheet";
  if (mimeType.includes("zip") || mimeType.includes("rar")) return "archive";
  return "other";
};

// Create success response
const successResponse = (data, message = "Success", statusCode = 200) => {
  return {
    success: true,
    statusCode,
    message,
    data,
  };
};

// Create error response
const errorResponse = (message = "Error", error = null, statusCode = 500) => {
  return {
    success: false,
    statusCode,
    message,
    error: process.env.NODE_ENV === "production" ? undefined : error,
  };
};

// Sleep helper for async operations
const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

// Pagination helper
const getPaginationParams = (page = 1, limit = 20) => {
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
  const offset = (pageNum - 1) * limitNum;
  return { offset, limit: limitNum, page: pageNum };
};

module.exports = {
  generateToken,
  generateShareToken,
  hashPassword,
  calculateFileHash,
  generateUUID,
  formatFileSize,
  isExpired,
  getFileExtension,
  getFileCategory,
  successResponse,
  errorResponse,
  sleep,
  getPaginationParams,
};
