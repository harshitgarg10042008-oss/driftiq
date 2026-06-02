// backend/config/telegram.js

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

if (!BOT_TOKEN) {
  throw new Error("Missing BOT_TOKEN in environment variables");
}

if (!CHANNEL_ID) {
  throw new Error("Missing TELEGRAM_CHANNEL_ID in environment variables");
}

module.exports = {
  BOT_TOKEN,
  CHANNEL_ID,
  WEBHOOK_SECRET,
  TELEGRAM_API_URL: "https://api.telegram.org",
};
