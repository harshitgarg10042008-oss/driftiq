// backend/middleware/cors.js

const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";

const corsOptions = {
  origin: CORS_ORIGIN.split(","),
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["X-Total-Count"],
  maxAge: 86400, // 24 hours
};

module.exports = corsOptions;
