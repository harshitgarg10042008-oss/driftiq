import {
  Injectable, InternalServerErrorException,
  NotFoundException, UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import axios from 'axios';

@Injectable()
export class SharesService {
  constructor(private readonly supabase: SupabaseService) {}

  async createShare(
    userId: string,
    fileId: string,
    dto: {
      password?: string;
      expiresAt?: string;
      expiresIn?: number;
      downloadLimit?: number;
    },
  ) {
    const shareToken = uuidv4().replace(/-/g, '');

    let passwordHash: string | null = null;
    if (dto?.password) {
      passwordHash = await bcrypt.hash(dto.password, 10);
    }

    // Handle both expiresIn (seconds from now) and expiresAt (ISO date string)
    let expiresAt: string | null = null;
    if (dto?.expiresIn && dto.expiresIn > 0) {
      expiresAt = new Date(Date.now() + dto.expiresIn * 1000).toISOString();
    } else if (dto?.expiresAt) {
      expiresAt = dto.expiresAt;
    }

    const { data, error } = await this.supabase
      .getClient()
      .from('shares')
      .insert({
        user_id: userId,
        file_id: fileId,
        share_token: shareToken,
        password_hash: passwordHash,
        expires_at: expiresAt,
        download_limit: dto?.downloadLimit || null,
        is_active: true,
        download_count: 0,
      })
      .select()
      .single();

    if (error) throw new InternalServerErrorException(error.message);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const shareUrl = `${frontendUrl}/share/${shareToken}`;

    return {
      ...data,
      token: shareToken,
      share_url: shareUrl,
      qr_url: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`,
    };
  }

  async getMyShares(userId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('shares')
      .select('*, files(name, size, mime_type)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new InternalServerErrorException(error.message);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return (data || []).map((s) => {
      const shareUrl = `${frontendUrl}/share/${s.share_token}`;
      return {
        ...s,
        token: s.share_token,
        share_url: shareUrl,
        qr_url: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`,
      };
    });
  }

  async accessShare(token: string, password?: string) {
    const { data: share, error } = await this.supabase
      .getClient()
      .from('shares')
      .select('*, files(*)')
      .eq('share_token', token)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !share) {
      throw new NotFoundException('Share link not found or has been deleted');
    }

    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      throw new UnauthorizedException('This share link has expired');
    }

    if (
      share.download_limit !== null &&
      share.download_count >= share.download_limit
    ) {
      throw new UnauthorizedException(
        'Download limit reached for this share link',
      );
    }

    if (share.password_hash) {
      if (!password) throw new UnauthorizedException('Password required');
      const isMatch = await bcrypt.compare(password, share.password_hash);
      if (!isMatch) throw new UnauthorizedException('Invalid password');
    }

    return {
      file: share.files,
      shareId: share.id,
      hasPassword: !!share.password_hash,
      expiresAt: share.expires_at,
      downloadLimit: share.download_limit,
      downloadCount: share.download_count,
    };
  }

  async getShareStream(token: string, password?: string) {
    const access = await this.accessShare(token, password);
    const file = access.file;

    if (!file?.telegram_file_id) {
      throw new NotFoundException('File not found in storage');
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      throw new InternalServerErrorException('Telegram bot not configured');
    }

    try {
      const response = await axios.get(
        `https://api.telegram.org/bot${botToken}/getFile?file_id=${file.telegram_file_id}`,
      );
      const filePath = response.data?.result?.file_path;
      if (!filePath) {
        throw new InternalServerErrorException('Invalid Telegram file response');
      }
      const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
      const fileStreamResponse = await axios.get(downloadUrl, {
        responseType: 'stream',
      });

      return {
        stream: fileStreamResponse.data,
        name: file.name || 'download',
        mimeType: file.mime_type || 'application/octet-stream',
        size: file.size || 0,
        shareId: access.shareId,
      };
    } catch (err: any) {
      if (err?.status >= 400 || err?.response?.status >= 400) {
        throw err;
      }
      throw new InternalServerErrorException(
        'Failed to fetch file from Telegram: ' + (err?.message || 'Unknown error'),
      );
    }
  }

  async recordDownload(shareId: string, ip: string, userAgent: string) {
    try {
      await this.supabase
        .getClient()
        .rpc('increment_download_count', { share_id: shareId });
    } catch {
      // RPC may not exist yet — silently ignore
    }
    try {
      await this.supabase.getClient().from('downloads').insert({
        share_id: shareId,
        ip_address: ip,
        user_agent: userAgent,
      });
    } catch {
      // analytics table may not exist yet — silently ignore
    }
    return { success: true };
  }

  async updateShare(userId: string, shareId: string, updates: any) {
    const { data, error } = await this.supabase
      .getClient()
      .from('shares')
      .update(updates)
      .eq('id', shareId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new InternalServerErrorException(error.message);
    if (!data) throw new NotFoundException('Share not found');
    return data;
  }

  async deleteShare(userId: string, shareId: string) {
    const { error } = await this.supabase
      .getClient()
      .from('shares')
      .update({ is_active: false })
      .eq('id', shareId)
      .eq('user_id', userId);

    if (error) throw new InternalServerErrorException(error.message);
    return { success: true };
  }

  async getDownloadAnalytics(userId: string, shareId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('downloads')
      .select('*, shares!inner(user_id)')
      .eq('share_id', shareId)
      .eq('shares.user_id', userId)
      .order('downloaded_at', { ascending: false });

    if (error) throw new InternalServerErrorException(error.message);
    return data || [];
  }
}
