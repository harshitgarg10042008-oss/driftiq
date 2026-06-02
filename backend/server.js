// backend/server.js

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const compression = require("compression");

const { testConnection } = require("./config/database");
const corsOptions = require("./middleware/cors");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");
const logger = require("./utils/logger");

// Import routes
const authRoutes = require("./routes/auth");
const fileRoutes = require("./routes/files");
const folderRoutes = require("./routes/folders");
const shareRoutes = require("./routes/shares");
const adminRoutes = require("./routes/admin");
const telegramRoutes = require("./routes/telegram");

const app = express();

// ============ SECURITY MIDDLEWARE ============
app.use(helmet());
app.use(cors(corsOptions));

// ============ COMPRESSION ============
app.use(compression());

// ============ RATE LIMITING ============
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests, please try again later",
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // limit auth attempts
  skipSuccessfulRequests: true,
  message: "Too many login attempts, please try again later",
});

app.use("/api/", generalLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

// ============ BODY PARSERS ============
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// ============ STATIC FILES ============
app.use(express.static("public"));

// ============ HEALTH CHECK ============
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ============ API ROUTES ============
app.use("/api/auth", authRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/folders", folderRoutes);
app.use("/api/shares", shareRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/telegram", telegramRoutes);

// ============ ERROR HANDLING ============
app.use(notFoundHandler);
app.use(errorHandler);

// ============ SERVER STARTUP ============
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // Test database connection
    const isConnected = await testConnection();
    if (!isConnected) {
      logger.error(
        "Database connection failed. Check your Supabase credentials.",
      );
      process.exit(1);
    }

    app.listen(PORT, async () => {
      logger.info(`Server running on http://localhost:${PORT}`);
      console.log("🚀 DriftIQ Server started successfully!");
      console.log(`📡 API: http://localhost:${PORT}/api`);
      console.log(`🏥 Health: http://localhost:${PORT}/health`);

      // Set up Telegram webhook automatically on startup
      const baseUrl = process.env.RENDER_EXTERNAL_URL || process.env.BASE_URL;
      if (baseUrl) {
        const { BOT_TOKEN } = require("./config/telegram");
        const axios = require("axios");
        const webhookUrl = `${baseUrl}/api/telegram/webhook`;
        try {
          await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
            url: webhookUrl
          });
          logger.info(`✓ Telegram webhook registered to: ${webhookUrl}`);
          console.log(`✓ Telegram webhook registered to: ${webhookUrl}`);
        } catch (webhookErr) {
          logger.error("Failed to register Telegram webhook: " + webhookErr.message);
        }
      } else {
        console.log("⚠️ No BASE_URL or RENDER_EXTERNAL_URL found, skipping Telegram webhook auto-registration.");
      }
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

// ============ GRACEFUL SHUTDOWN ============
process.on("SIGTERM", () => {
  logger.info("SIGTERM signal received: closing HTTP server");
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("SIGINT signal received: closing HTTP server");
  process.exit(0);
});

module.exports = app;
