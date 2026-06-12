import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import axios from 'axios';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async handleWebhook(update: any) {
    if (!update.message || !update.message.document) {
      return { status: 'ignored' };
    }

    const telegramUserId = update.message.from.id.toString();
    const document = update.message.document;

    // 1. Map telegram_user_id to Website User
    const { data: user, error: userError } = await this.supabase
      .getClient()
      .from('users')
      .select('id')
      .eq('telegram_user_id', telegramUserId)
      .single();

    if (userError || !user) {
      this.logger.warn(`File received from unknown Telegram user: ${telegramUserId}`);
      this.sendTelegramMessage(telegramUserId, 'Please link your account on DriftIQ before uploading files.');
      return { status: 'user_not_found' };
    }

    // 2. Find or create "/Telegram Imports" folder
    let folderId: string | null = null;
    try {
      const { data: folder, error: folderError } = await this.supabase
        .getClient()
        .from('folders')
        .select('id')
        .eq('user_id', user.id)
        .eq('name', 'Telegram Imports')
        .is('parent_id', null)
        .maybeSingle();

      if (folder) {
        folderId = folder.id;
      } else {
        const { data: newFolder, error: createFolderError } = await this.supabase
          .getClient()
          .from('folders')
          .insert({
            user_id: user.id,
            name: 'Telegram Imports',
            parent_id: null
          })
          .select('id')
          .single();

        if (createFolderError) {
          this.logger.error(`Error creating folder: ${createFolderError.message}`);
        } else {
          folderId = newFolder.id;
        }
      }
    } catch (folderErr) {
      this.logger.error(`Folder setup failed: ${folderErr.message}`);
    }

    // 3. Insert File into /Telegram Imports
    const newFile = {
      user_id: user.id,
      folder_id: folderId,
      name: document.file_name || 'Unknown File',
      mime_type: document.mime_type || 'application/octet-stream',
      size: document.file_size,
      telegram_file_id: document.file_id,
      is_starred: false,
    };

    const { data: file, error: insertError } = await this.supabase
      .getClient()
      .from('files')
      .insert(newFile)
      .select()
      .single();

    if (insertError) {
      this.logger.error(`Error saving file: ${insertError.message}`);
      throw new InternalServerErrorException('Database insert failed');
    }

    // 3. Real-time sync to the frontend
    this.realtimeGateway.notifyFileAdded(user.id, file);
    
    // Reply on telegram
    this.sendTelegramMessage(telegramUserId, `✅ File "${newFile.name}" successfully saved to DriftIQ!`);

    return { status: 'success', fileId: file.id };
  }

  private async sendTelegramMessage(chatId: string, text: string) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return;
    try {
      await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: chatId,
        text,
      });
    } catch (e) {
      this.logger.error('Failed to send Telegram reply', e.message);
    }
  }
}
