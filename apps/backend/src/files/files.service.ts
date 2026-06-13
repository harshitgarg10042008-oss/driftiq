import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import axios from 'axios';
import FormData from 'form-data';

@Injectable()
export class FilesService {
  constructor(private readonly supabase: SupabaseService) {}

  // FLOW 1: Website → NestJS → Telegram → save file_id → Supabase
  async uploadToTelegram(
    userId: string,
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    folderId?: string,
  ) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_STORAGE_CHAT_ID; // A private channel/chat that acts as storage

    if (!botToken || !chatId) {
      throw new InternalServerErrorException('Telegram bot not configured');
    }

    // Upload file to Telegram
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('document', fileBuffer, { filename: fileName, contentType: mimeType });
    formData.append('caption', `DriftIQ | user:${userId} | ${fileName}`);

    let telegramFileId: string;
    try {
      const response = await axios.post(
        `https://api.telegram.org/bot${botToken}/sendDocument`,
        formData,
        { headers: formData.getHeaders() },
      );
      telegramFileId = response.data.result.document.file_id;
    } catch (err) {
      throw new InternalServerErrorException('Failed to upload to Telegram: ' + err.message);
    }

    // Save file metadata in Supabase
    const { data: file, error } = await this.supabase
      .getClient()
      .from('files')
      .insert({
        user_id: userId,
        folder_id: folderId || null,
        name: fileName,
        mime_type: mimeType,
        size: fileBuffer.length,
        telegram_file_id: telegramFileId,
        is_starred: false,
      })
      .select()
      .single();

    if (error) throw new InternalServerErrorException(error.message);

    // Update storage_used on user
    await this.supabase.getClient()
      .from('users')
      .update({ storage_used: await this.getUserStorageUsed(userId) + fileBuffer.length })
      .eq('id', userId);

    return file;
  }

  async getDownloadUrl(userId: string, fileId: string) {
    const file = await this.findOne(userId, fileId);
    return { 
      url: `/api/files/${fileId}/stream`, 
      name: file.name, 
      mimeType: file.mime_type 
    };
  }

  async getFileStream(userId: string, fileId: string) {
    const file = await this.findOne(userId, fileId);
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    const response = await axios.get(
      `https://api.telegram.org/bot${botToken}/getFile?file_id=${file.telegram_file_id}`
    );
    const filePath = response.data.result.file_path;
    const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;

    const fileStreamResponse = await axios.get(downloadUrl, {
      responseType: 'stream',
    });

    return {
      stream: fileStreamResponse.data,
      name: file.name,
      mimeType: file.mime_type,
      size: file.size,
    };
  }

  async findAll(userId: string, folderId?: string) {
    let query = this.supabase
      .getClient()
      .from('files')
      .select('*')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (folderId) {
      query = query.eq('folder_id', folderId);
    } else {
      query = query.is('folder_id', null);
    }

    const { data, error } = await query;
    if (error) throw new InternalServerErrorException(error.message);
    return data || [];
  }

  async findOne(userId: string, fileId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('files')
      .select('*')
      .eq('id', fileId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw new InternalServerErrorException(error.message);
    if (!data) throw new NotFoundException('File not found');
    return data;
  }

  async rename(userId: string, fileId: string, newName: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('files')
      .update({ name: newName })
      .eq('id', fileId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new InternalServerErrorException(error.message);
    if (!data) throw new NotFoundException('File not found');
    return data;
  }

  async move(userId: string, fileId: string, folderId: string | null) {
    const { data, error } = await this.supabase
      .getClient()
      .from('files')
      .update({ folder_id: folderId })
      .eq('id', fileId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new InternalServerErrorException(error.message);
    if (!data) throw new NotFoundException('File not found');
    return data;
  }

  async toggleStar(userId: string, fileId: string, isStarred: boolean) {
    const { data, error } = await this.supabase
      .getClient()
      .from('files')
      .update({ is_starred: isStarred })
      .eq('id', fileId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new InternalServerErrorException(error.message);
    if (!data) throw new NotFoundException('File not found');
    return data;
  }

  async delete(userId: string, fileId: string) {
    const { error } = await this.supabase
      .getClient()
      .from('files')
      .update({ is_deleted: true })
      .eq('id', fileId)
      .eq('user_id', userId);

    if (error) throw new InternalServerErrorException(error.message);
    return { success: true };
  }

  async restore(userId: string, fileId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('files')
      .update({ is_deleted: false })
      .eq('id', fileId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new InternalServerErrorException(error.message);
    if (!data) throw new NotFoundException('File not found');
    return data;
  }

  async getDeleted(userId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('files')
      .select('*')
      .eq('user_id', userId)
      .eq('is_deleted', true)
      .order('created_at', { ascending: false });

    if (error) throw new InternalServerErrorException(error.message);
    return data || [];
  }

  async getStarred(userId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('files')
      .select('*')
      .eq('user_id', userId)
      .eq('is_starred', true)
      .order('created_at', { ascending: false });

    if (error) throw new InternalServerErrorException(error.message);
    return data || [];
  }

  async search(userId: string, query: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('files')
      .select('*')
      .eq('user_id', userId)
      .ilike('name', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw new InternalServerErrorException(error.message);
    return data || [];
  }

  async getStorageStats(userId: string) {
    const { data: user } = await this.supabase
      .getClient()
      .from('users')
      .select('storage_used, storage_limit')
      .eq('id', userId)
      .single();

    const { count } = await this.supabase
      .getClient()
      .from('files')
      .select('id', { count: 'exact' })
      .eq('user_id', userId);

    return {
      storageUsed: user?.storage_used || 0,
      storageLimit: user?.storage_limit || 5368709120,
      fileCount: count || 0,
    };
  }

  private async getUserStorageUsed(userId: string): Promise<number> {
    const { data } = await this.supabase
      .getClient()
      .from('users')
      .select('storage_used')
      .eq('id', userId)
      .single();
    return data?.storage_used || 0;
  }
}
