// backend/services/telegramService.js

const axios = require("axios");
const {
  BOT_TOKEN,
  CHANNEL_ID,
  TELEGRAM_API_URL,
} = require("../config/telegram");
const CONSTANTS = require("../config/constants");
const logger = require("../utils/logger");

const TELEGRAM_BASE_URL = `${TELEGRAM_API_URL}/bot${BOT_TOKEN}`;

// Upload file to Telegram
const uploadFileToTelegram = async (fileBuffer, fileName, mimeType) => {
  try {
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: mimeType });
    formData.append("document", blob, fileName);
    formData.append("chat_id", CHANNEL_ID);
    formData.append("caption", fileName);

    const response = await axios.post(
      `${TELEGRAM_BASE_URL}/sendDocument`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    if (response.data.ok) {
      const messageId = response.data.result.message_id;
      const fileId = response.data.result.document?.file_id;

      logger.info(`File uploaded to Telegram: ${messageId}`);

      return {
        success: true,
        data: {
          telegram_message_id: messageId.toString(),
          telegram_file_id: fileId,
        },
      };
    }

    return { success: false, error: "Failed to upload to Telegram" };
  } catch (error) {
    logger.error("Upload to Telegram error:", error);
    return { success: false, error: "Failed to upload to Telegram" };
  }
};

// Download file from Telegram
const downloadFileFromTelegram = async (telegramMessageId) => {
  try {
    // Get file info
    const response = await axios.get(`${TELEGRAM_BASE_URL}/getMessage`, {
      params: {
        chat_id: CHANNEL_ID,
        message_id: telegramMessageId,
      },
    });

    if (!response.data.ok) {
      return { success: false, error: "Failed to get file info" };
    }

    const document = response.data.result?.document;
    if (!document) {
      return { success: false, error: "Document not found" };
    }

    // Get file path
    const fileResponse = await axios.get(`${TELEGRAM_BASE_URL}/getFile`, {
      params: {
        file_id: document.file_id,
      },
    });

    if (!fileResponse.data.ok) {
      return { success: false, error: "Failed to get file path" };
    }

    const filePath = fileResponse.data.result.file_path;

    // Download file
    const downloadResponse = await axios.get(
      `${TELEGRAM_API_URL}/file/bot${BOT_TOKEN}/${filePath}`,
      {
        responseType: "arraybuffer",
      },
    );

    logger.info(`File downloaded from Telegram: ${telegramMessageId}`);

    return {
      success: true,
      data: Buffer.from(downloadResponse.data),
    };
  } catch (error) {
    logger.error("Download from Telegram error:", error);
    return { success: false, error: "Failed to download file" };
  }
};

// Delete file from Telegram
const deleteFileFromTelegram = async (telegramMessageId) => {
  try {
    const response = await axios.post(`${TELEGRAM_BASE_URL}/deleteMessage`, {
      chat_id: CHANNEL_ID,
      message_id: telegramMessageId,
    });

    if (response.data.ok) {
      logger.info(`File deleted from Telegram: ${telegramMessageId}`);
      return { success: true };
    }

    return { success: false, error: "Failed to delete file" };
  } catch (error) {
    logger.error("Delete from Telegram error:", error);
    return { success: false, error: "Failed to delete file" };
  }
};

// Verify Telegram webhook
const verifyWebhook = async (message) => {
  try {
    // Verify webhook secret if provided
    if (CONSTANTS.TELEGRAM_WEBHOOK_SECRET) {
      // Implement HMAC verification here if needed
    }

    return { success: true };
  } catch (error) {
    logger.error("Webhook verification error:", error);
    return { success: false };
  }
};

module.exports = {
  uploadFileToTelegram,
  downloadFileFromTelegram,
  deleteFileFromTelegram,
  verifyWebhook,
};
