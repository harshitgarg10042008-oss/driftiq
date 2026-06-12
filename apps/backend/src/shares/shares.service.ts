import {
  Injectable, InternalServerErrorException,
  NotFoundException, UnauthorizedException, BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import axios from 'axios';

@Injectable()
export class SharesService {
  constructor(private readonly supabase: SupabaseService) {}

  async createShare(userId: string, fileId: string, dto: {
    password?: string;
    expiresAt?: string;
    downloadLimit?: number;
  }) {
    const shareToken = uuidv4().replace(/-/g, '');

    let passwordHash: string | null = null;
    if (dto.password) {
      passwordHash = await bcrypt.hash(dto.password, 10);
    }

    const { data, error } = await this.supabase
      .getClient()
      .from('shares')
      .insert({
        user_id: userId,
        file_id: fileId,
        share_token: shareToken,
        password_hash: passwordHash,
        expires_at: dto.expiresAt || null,
        download_limit: dto.downloadLimit || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw new InternalServerErrorException(error.message);

    return {
      ...data,
      share_url: `${process.env.FRONTEND_URL}/share/${shareToken}`,
      qr_url: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${process.env.FRONTEND_URL}/share/${shareToken}`)}`,
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
    return data?.map(s => ({
      ...s,
      share_url: `${process.env.FRONTEND_URL}/share/${s.share_token}`,
      qr_url: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${process.env.FRONTEND_URL}/share/${s.share_token}`)}`,
    })) || [];
  }

  async accessShare(token: string, password?: string) {
    const { data: share, error } = await this.supabase
      .getClient()
      .from('shares')
      .select('*, files(*)')
      .eq('share_token', token)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !share) throw new NotFoundException('Share link not found or inactive');

    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      throw new UnauthorizedException('This share link has expired');
    }

    if (share.download_limit !== null && share.download_count >= share.download_limit) {
      throw new UnauthorizedException('Download limit reached');
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
      shareId: access.shareId,
    };
  }

  async recordDownload(shareId: string, ip: string, userAgent: string) {
    // Increment counter
    await this.supabase.getClient().rpc('increment_download_count', { share_id: shareId });

    // Analytics record
    await this.supabase.getClient().from('downloads').insert({
      share_id: shareId,
      ip_address: ip,
      user_agent: userAgent,
    });

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
