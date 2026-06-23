import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

// Load .env from project root
const envPath = path.join(__dirname, '../../../../.env');
dotenv.config({ path: envPath });

async function getNgrokUrl() {
  try {
    const res = await axios.get('http://127.0.0.1:4040/api/tunnels');
    const tunnels = res.data.tunnels;
    const httpsTunnel = tunnels.find((t: any) => t.public_url.startsWith('https://'));
    if (httpsTunnel) return httpsTunnel.public_url;
  } catch {
    // ngrok not running or not reachable
  }
  return null;
}

async function setupWebhook() {
  // Support both BOT_TOKEN and TELEGRAM_BOT_TOKEN
  const botToken = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
  
  if (!botToken) {
    console.error('❌ Neither TELEGRAM_BOT_TOKEN nor BOT_TOKEN is set in .env');
    process.exit(1);
  }

  // Generate a secret if none exists
  let webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!webhookSecret) {
    webhookSecret = crypto.randomBytes(32).toString('hex');
    console.log(`ℹ️ Generated new TELEGRAM_WEBHOOK_SECRET.`);
    try {
      fs.appendFileSync(envPath, `\nTELEGRAM_WEBHOOK_SECRET=${webhookSecret}\n`);
      console.log(`✅ Appended TELEGRAM_WEBHOOK_SECRET to .env`);
    } catch (err) {
      console.warn('⚠️ Could not save secret to .env, webhook may fail verification later.');
    }
  }

  // Find webhook URL
  let webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
  
  // If it's a placeholder or missing, try ngrok
  if (!webhookUrl || webhookUrl.includes('<your-ngrok-url>')) {
    const ngrokUrl = await getNgrokUrl();
    if (ngrokUrl) {
      webhookUrl = `${ngrokUrl.replace(/\/$/, '')}/api/telegram/webhook`;
      console.log(`✅ Found ngrok URL: ${ngrokUrl}`);
    } else {
      const backendUrl = process.env.BACKEND_URL || process.env.RENDER_EXTERNAL_URL;
      if (backendUrl) {
        webhookUrl = `${backendUrl.replace(/\/$/, '')}/api/telegram/webhook`;
      }
    }
  }

  if (!webhookUrl || webhookUrl.includes('<your-ngrok-url>')) {
    console.error('❌ Could not determine webhook URL. Make sure ngrok is running or set TELEGRAM_WEBHOOK_URL in .env');
    process.exit(1);
  }

  try {
    console.log(`Setting Telegram webhook to: ${webhookUrl}`);
    const response = await axios.post(`https://api.telegram.org/bot${botToken}/setWebhook`, {
      url: webhookUrl,
      secret_token: webhookSecret,
      allowed_updates: ['message']
    });

    if (response.data.ok) {
      console.log('✅ Webhook set successfully:', response.data.description);
      console.log('🎉 Your bot is now connected to DriftIQ!');
    } else {
      console.error('❌ Failed to set webhook:', response.data);
    }
  } catch (err: any) {
    console.error('❌ Error setting webhook:', err?.response?.data || err.message);
    process.exit(1);
  }
}

setupWebhook();
