import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { UsersService } from '../users/users.service';
import axios from 'axios';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly usersService: UsersService,
  ) {}

  async handleWebhook(update: any) {
    const telegramUserId = update?.message?.from?.id?.toString();
    if (!telegramUserId) return { status: 'ignored' };

    const text = update?.message?.text || '';

    // ── /start command ────────────────────────────────────────────────────────
    if (text === '/start') {
      await this.sendTelegramMessage(
        telegramUserId,
        `👋 Welcome to DriftIQ Bot!\n\n` +
          `To link your account:\n` +
          `1. Go to the DriftIQ website\n` +
          `2. Click "Connect Telegram"\n` +
          `3. Copy your 6-digit code\n` +
          `4. Send it here (just the code, or use /link YOUR_CODE)\n\n` +
          `After linking, you can send files directly here to upload them to DriftIQ! 🚀`,
      );
      return { status: 'start' };
    }

    // ── /link CODE or plain 6-digit code ─────────────────────────────────────
    const linkMatch =
      text.match(/^\/link\s+(\S+)$/) || text.match(/^(\d{6})$/);
    if (linkMatch) {
      const code = linkMatch[1];
      try {
        const user = await this.usersService.linkTelegramByCode(
          code,
          telegramUserId,
        );
        if (user) {
          await this.sendTelegramMessage(
            telegramUserId,
            `✅ Account linked successfully!\n\n` +
              `You can now send files here to upload them to DriftIQ.\n` +
              `Supported: documents, images, videos, audio files 📁`,
          );
          return { status: 'linked' };
        } else {
          await this.sendTelegramMessage(
            telegramUserId,
            `❌ Invalid or expired code.\n` +
              `Please generate a new code from DriftIQ Settings.`,
          );
          return { status: 'invalid_code' };
        }
      } catch (err: any) {
        this.logger.error('linkTelegramByCode error:', err?.message);
        await this.sendTelegramMessage(
          telegramUserId,
          `❌ Failed to link. Please try again.`,
        );
        return { status: 'error' };
      }
    }

    // ── File upload handling ──────────────────────────────────────────────────
    const msg = update?.message;
    const hasFile =
      msg?.document || msg?.photo || msg?.video || msg?.audio;

    if (!hasFile) {
      return { status: 'ignored' };
    }

    // Get file info (document, photo, video, audio)
    let fileInfo: any = null;
    if (msg.document) {
      fileInfo = { ...msg.document };
      fileInfo.file_name = fileInfo.file_name || 'document';
      fileInfo.mime_type = fileInfo.mime_type || 'application/octet-stream';
    } else if (msg.photo) {
      // photos are arrays: last element is highest resolution
      const photo = msg.photo[msg.photo.length - 1];
      fileInfo = {
        ...photo,
        file_name: 'photo.jpg',
        mime_type: 'image/jpeg',
      };
    } else if (msg.video) {
      fileInfo = { ...msg.video };
      fileInfo.file_name = fileInfo.file_name || 'video.mp4';
      fileInfo.mime_type = fileInfo.mime_type || 'video/mp4';
    } else if (msg.audio) {
      fileInfo = { ...msg.audio };
      fileInfo.file_name =
        fileInfo.file_name || fileInfo.title || 'audio.mp3';
      fileInfo.mime_type = fileInfo.mime_type || 'audio/mpeg';
    }

    if (!fileInfo) return { status: 'ignored' };

    // Find user by telegram_user_id
    const { data: user, error: userError } = await this.supabase
      .getClient()
      .from('users')
      .select('id')
      .eq('telegram_user_id', telegramUserId)
      .maybeSingle();

    if (userError || !user) {
      this.logger.warn(`File received from unlinked Telegram user: ${telegramUserId}`);
      await this.sendTelegramMessage(
        telegramUserId,
        `⚠️ Account not linked yet!\n` +
          `Send your 6-digit code from DriftIQ to link your account first.`,
      );
      return { status: 'user_not_found' };
    }

    // Files from Telegram should go directly to the root drive
    const folderId = null;

    // Save file record to DB
    const newFile = {
      user_id: user.id,
      folder_id: folderId,
      name: fileInfo.file_name || 'Unknown File',
      mime_type: fileInfo.mime_type || 'application/octet-stream',
      size: fileInfo.file_size || 0,
      telegram_file_id: fileInfo.file_id,
      is_starred: false,
      is_deleted: false,
    };

    const { data: file, error: insertError } = await this.supabase
      .getClient()
      .from('files')
      .insert(newFile)
      .select()
      .single();

    if (insertError) {
      this.logger.error(`File save error: ${insertError.message}`);
      await this.sendTelegramMessage(
        telegramUserId,
        `❌ Failed to save file. Please try again.`,
      );
      return { status: 'error' };
    }

    // Notify frontend via WebSocket
    try {
      this.realtimeGateway.notifyFileAdded(user.id, file);
    } catch {}

    await this.sendTelegramMessage(
      telegramUserId,
      `✅ "${newFile.name}" saved to DriftIQ!\n📁 Folder: My Drive (Root)`,
    );

    return { status: 'success', fileId: file.id };
  }

  private async sendTelegramMessage(chatId: string, text: string) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return;
    try {
      await axios.post(
        `https://api.telegram.org/bot${token}/sendMessage`,
        { chat_id: chatId, text },
        { timeout: 10000 },
      );
    } catch (e: any) {
      this.logger.error('Failed to send Telegram reply:', e?.message);
    }
  }
}
