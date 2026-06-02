// backend/routes/telegram.js

const express = require("express");
const { supabase } = require("../config/database");
const logger = require("../utils/logger");

const router = express.Router();

// Webhook endpoint
router.post("/webhook", async (req, res) => {
  try {
    const update = req.body;
    logger.info("Received Telegram webhook update: " + JSON.stringify(update));

    const message = update.message || update.channel_post;
    if (!message) {
      return res.status(200).json({ success: true });
    }

    // Get document or media
    const document = message.document || 
                     (message.photo && message.photo[message.photo.length - 1]) || 
                     message.video || 
                     message.audio;

    if (!document) {
      return res.status(200).json({ success: true });
    }

    // Extract file details
    const fileId = document.file_id;
    // For photos, document.file_name might be missing. We generate a default name.
    let fileName = document.file_name || message.caption;
    if (!fileName) {
      const ext = document.mime_type ? document.mime_type.split("/")[1] : "bin";
      fileName = `telegram_file_${message.message_id}.${ext}`;
    }

    const fileSize = document.file_size || 0;
    const mimeType = document.mime_type || "application/octet-stream";
    const telegramMessageId = message.message_id.toString();

    // Check if this file is already indexed in Supabase (to avoid double entry)
    const { data: existingFile } = await supabase
      .from("files")
      .select("id")
      .eq("telegram_message_id", telegramMessageId)
      .maybeSingle();

    if (existingFile) {
      logger.info(`File with message ID ${telegramMessageId} is already indexed.`);
      return res.status(200).json({ success: true });
    }

    // Assign owner: Default to the Admin User ID!
    const adminId = "685f655e-b26a-4ad1-80c5-629674812204"; // Seed Admin UID

    // Create file record in Supabase
    const { data: newFile, error: insertError } = await supabase
      .from("files")
      .insert([
        {
          user_id: adminId,
          name: fileName,
          size: fileSize,
          mime_type: mimeType,
          telegram_file_id: fileId,
          telegram_message_id: telegramMessageId,
          folder_id: null,
        }
      ])
      .select()
      .single();

    if (insertError) {
      logger.error("Error inserting webhook file metadata to Supabase: " + JSON.stringify(insertError));
    } else {
      logger.info(`Successfully synced Telegram file: ${fileName} via webhook.`);
      
      // Update admin user storage stats
      const { data: stats } = await supabase
        .from("storage_stats")
        .select("*")
        .eq("user_id", adminId)
        .maybeSingle();

      if (stats) {
        await supabase
          .from("storage_stats")
          .update({
            total_files: (stats.total_files || 0) + 1,
            total_size: (stats.total_size || 0) + fileSize,
            updated_at: new Date().toISOString()
          })
          .eq("user_id", adminId);
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    logger.error("Telegram webhook error: " + error.message);
    return res.status(200).json({ success: true }); // Always return 200 to Telegram to prevent retry loops
  }
});

// Setup/Verification helper route (Admin only status)
router.get("/status", async (req, res) => {
  try {
    const { BOT_TOKEN, CHANNEL_ID } = require("../config/telegram");
    const response = await require("axios").get(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
    return res.json({
      success: true,
      bot: response.data?.result?.username || "connected",
      channelId: CHANNEL_ID
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
