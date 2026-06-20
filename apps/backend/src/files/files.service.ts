import { Injectable, InternalServerErrorException, NotFoundException, ForbiddenException } from '@nestjs/common';
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

    // Check storage limit before uploading
    const { data: storageUser } = await this.supabase
      .getClient()
      .from('users')
      .select('storage_used, storage_limit')
      .eq('id', userId)
      .single();

    if (storageUser && storageUser.storage_used + fileBuffer.length > storageUser.storage_limit) {
      throw new ForbiddenException('Storage limit exceeded');
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

    // Atomically increment storage_used via RPC (avoids read-modify-write race condition)
    await this.supabase.getClient()
      .rpc('increment_storage_used', { user_id: userId, bytes: fileBuffer.length });

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
      .eq('is_deleted', false)
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

  async emptyTrash(userId: string) {
    // 1. Find all deleted files to calculate size
    const { data: filesToDelete, error: fetchError } = await this.supabase
      .getClient()
      .from('files')
      .select('id, size')
      .eq('user_id', userId)
      .eq('is_deleted', true);

    if (fetchError) throw new InternalServerErrorException(fetchError.message);
    if (!filesToDelete || filesToDelete.length === 0) return { success: true, count: 0 };

    const totalSizeToFree = filesToDelete.reduce((acc, f) => acc + Number(f.size), 0);

    // 2. Delete the files from DB
    const { error: deleteError } = await this.supabase
      .getClient()
      .from('files')
      .delete()
      .eq('user_id', userId)
      .eq('is_deleted', true);

    if (deleteError) throw new InternalServerErrorException(deleteError.message);

    // 3. Decrement storage_used by passing a negative byte value to the RPC
    if (totalSizeToFree > 0) {
      await this.supabase.getClient()
        .rpc('increment_storage_used', { user_id: userId, bytes: -totalSizeToFree });
    }

    return { success: true, count: filesToDelete.length };
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

  async createShareLink(
    userId: string,
    fileId: string,
    password?: string,
    expiresIn?: number,
  ) {
    const file = await this.findOne(userId, fileId);
    const token = Math.random().toString(36).substring(2) + 
                  Date.now().toString(36);
    
    const shareData: any = {
      file_id: fileId,
      user_id: userId,
      token,
      created_at: new Date().toISOString(),
    };

    if (password) {
      const bcrypt = await import('bcrypt');
      shareData.password_hash = await bcrypt.hash(password, 10);
    }

    if (expiresIn) {
      shareData.expires_at = new Date(
        Date.now() + expiresIn * 1000
      ).toISOString();
    }

    const { data, error } = await this.supabase
      .getClient()
      .from('shared_links')
      .insert(shareData)
      .select()
      .single();

    if (error) throw new InternalServerErrorException(error.message);

    return {
      token,
      url: `${process.env.FRONTEND_URL}/share/${token}`,
      fileName: file.name,
    };
  }

  async getSharedFile(token: string, password?: string) {
    const { data: share, error } = await this.supabase
      .getClient()
      .from('shared_links')
      .select('*, files(*)')
      .eq('token', token)
      .maybeSingle();

    if (error || !share) throw new NotFoundException('Share link not found');

    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      throw new ForbiddenException('Share link has expired');
    }

    if (share.password_hash) {
      if (!password) throw new ForbiddenException('Password required');
      const bcrypt = await import('bcrypt');
      const match = await bcrypt.compare(password, share.password_hash);
      if (!match) throw new ForbiddenException('Incorrect password');
    }

    return share.files;
  }

  async streamSharedFile(token: string, password?: string) {
    const file = await this.getSharedFile(token, password);
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
