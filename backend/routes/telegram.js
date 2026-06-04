// backend/routes/telegram.js

const express = require("express");
const { supabase } = require("../config/database");
const logger = require("../utils/logger");
const { auth } = require("../middleware/auth");

const router = express.Router();

// In-memory registry for pending Telegram code-linking requests
const pendingConnections = new Map();

// Webhook endpoint
router.post("/webhook", async (req, res) => {
  try {
    const update = req.body;
    logger.info("Received Telegram webhook update: " + JSON.stringify(update));

    const message = update.message || update.channel_post;
    if (!message) {
      return res.status(200).json({ success: true });
    }

    // Handle Start message for account connections
    const text = message.text || "";
    if (text.startsWith("/start ")) {
      const code = text.split(" ")[1];
      const userId = pendingConnections.get(code);
      if (userId) {
        // Connect user in database
        const { error: updateErr } = await supabase
          .from("users")
          .update({ telegram_status: "connected" })
          .eq("id", userId);
        
        if (updateErr) {
          logger.error("Failed to update user telegram status: " + updateErr.message);
        } else {
          pendingConnections.delete(code);
          
          // Send a message back to the user via Telegram Bot API
          const { BOT_TOKEN } = require("../config/telegram");
          const axios = require("axios");
          try {
            await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
              chat_id: message.chat.id,
              text: "✅ DriftIQ connected successfully! You can now send files here to upload them to your vault."
            });
          } catch (e) {
            logger.error("Failed to send telegram confirmation message: " + e.message);
          }
        }
      }
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

// Generate Telegram connection code for individual user (JWT Auth required)
router.get("/code", auth, (req, res) => {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  pendingConnections.set(code, req.user.id);
  // Link expires in 5 minutes
  setTimeout(() => pendingConnections.delete(code), 5 * 60 * 1000);
  
  res.json({
    success: true,
    code
  });
});

// Setup/Verification helper route (Admin only status OR user connection status if auth header is present)
router.get("/status", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const jwt = require("jsonwebtoken");
    const CONSTANTS = require("../config/constants");
    try {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, CONSTANTS.JWT_SECRET);
      
      const { data: user, error } = await supabase
        .from("users")
        .select("telegram_status")
        .eq("id", decoded.id)
        .single();

      if (error || !user) {
        return res.status(404).json({ success: false, error: "User not found" });
      }

      return res.json({
        success: true,
        connected: user.telegram_status === "connected",
        status: user.telegram_status
      });
    } catch (err) {
      return res.status(401).json({ success: false, error: "Invalid token" });
    }
  }

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
