import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class UsersService {
  constructor(private readonly supabase: SupabaseService) {}

  async findByEmail(email: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      console.error('[Supabase Error in findByEmail]:', error);
      throw new InternalServerErrorException(error.message);
    }
    return data;
  }

  async findByUsername(username: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('users')
      .select('*')
      .eq('username', username)
      .maybeSingle();

    if (error) throw new InternalServerErrorException(error.message);
    return data;
  }

  async findById(id: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new InternalServerErrorException(error.message);
    return data;
  }

  async findByTelegramUserId(telegramUserId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('users')
      .select('id, email')
      .eq('telegram_user_id', telegramUserId)
      .maybeSingle();

    if (error) throw new InternalServerErrorException(error.message);
    return data;
  }

  async create(user: any) {
    const { data, error } = await this.supabase
      .getClient()
      .from('users')
      .insert(user)
      .select()
      .single();

    if (error) throw new InternalServerErrorException(error.message);
    return data;
  }

  async updateRefreshToken(id: string, refreshToken: string | null) {
    const { error } = await this.supabase
      .getClient()
      .from('users')
      .update({ refresh_token: refreshToken })
      .eq('id', id);

    if (error) throw new InternalServerErrorException(error.message);
  }

  async updatePassword(id: string, hash: string) {
    const { error } = await this.supabase
      .getClient()
      .from('users')
      .update({ password_hash: hash })
      .eq('id', id);

    if (error) throw new InternalServerErrorException(error.message);
  }

  async updateLastLogin(id: string) {
    try {
      await this.supabase
        .getClient()
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', id);
    } catch {
      // Silently ignore — last_login update should never break login
    }
  }

  async setResetToken(id: string, token: string) {
    const { error } = await this.supabase
      .getClient()
      .from('users')
      .update({ password_reset_token: token })
      .eq('id', id);

    if (error) throw new InternalServerErrorException(error.message);
  }

  async clearResetToken(id: string) {
    const { error } = await this.supabase
      .getClient()
      .from('users')
      .update({ password_reset_token: null })
      .eq('id', id);

    if (error) throw new InternalServerErrorException(error.message);
  }

  async linkTelegram(userId: string, telegramUserId: string) {
    const { error } = await this.supabase
      .getClient()
      .from('users')
      .update({
        telegram_user_id: telegramUserId,
        telegram_status: 'connected',
        telegramconnected: true,
      })
      .eq('id', userId);

    if (error) throw new InternalServerErrorException(error.message);
  }

  async generateTelegramLinkCode(userId: string): Promise<string> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60000).toISOString(); // 10 mins

    const { error } = await this.supabase
      .getClient()
      .from('users')
      .update({
        telegram_link_code: code,
        telegram_link_code_expires_at: expiresAt,
      })
      .eq('id', userId);

    if (error) throw new InternalServerErrorException('Failed to generate link code');
    return code;
  }

  async setTelegramLinkCode(userId: string, code: string, expires: Date) {
    await this.supabase
      .getClient()
      .from('users')
      .update({
        telegram_link_code: code,
        telegram_link_code_expires_at: expires.toISOString(),
      })
      .eq('id', userId);
  }

  async linkTelegramByCode(code: string, telegramUserId: string): Promise<any> {
    // 1. Find user by valid code
    const { data: user, error } = await this.supabase
      .getClient()
      .from('users')
      .select('id, telegram_link_code_expires_at')
      .eq('telegram_link_code', code)
      .maybeSingle();

    if (error || !user) return null;

    // 2. Check expiry
    if (
      user.telegram_link_code_expires_at &&
      new Date(user.telegram_link_code_expires_at) < new Date()
    ) {
      return null; // Expired
    }

    // 3. Update user — link Telegram account
    const { error: updateError } = await this.supabase
      .getClient()
      .from('users')
      .update({
        telegram_user_id: telegramUserId,
        telegram_status: 'connected',
        telegramconnected: true,
        telegram_link_code: null,
        telegram_link_code_expires_at: null,
      })
      .eq('id', user.id);

    if (updateError) throw new InternalServerErrorException('Failed to link account');
    return user;
  }

  // Admin methods
  async findAll(page = 1, limit = 20, search = '') {
    let query = this.supabase
      .getClient()
      .from('users')
      .select(
        'id, email, username, full_name, role, is_active, storage_used, storage_limit, created_at, last_login, telegram_status',
        { count: 'exact' },
      );

    if (search) {
      query = query.or(`email.ilike.%${search}%,username.ilike.%${search}%`);
    }

    const from = (page - 1) * limit;
    query = query.range(from, from + limit - 1).order('created_at', { ascending: false });

    const { data, error, count } = await query;
    if (error) throw new InternalServerErrorException(error.message);
    return { users: data, total: count };
  }

  async setActive(id: string, isActive: boolean) {
    const { error } = await this.supabase
      .getClient()
      .from('users')
      .update({ is_active: isActive })
      .eq('id', id);

    if (error) throw new InternalServerErrorException(error.message);
    return { success: true };
  }

  async setRole(id: string, role: 'user' | 'admin') {
    const { error } = await this.supabase
      .getClient()
      .from('users')
      .update({ role })
      .eq('id', id);

    if (error) throw new InternalServerErrorException(error.message);
    return { success: true };
  }

  async deleteUser(id: string) {
    const { error } = await this.supabase
      .getClient()
      .from('users')
      .delete()
      .eq('id', id);

    if (error) throw new InternalServerErrorException(error.message);
    return { success: true };
  }

  async getStorageStats() {
    const { data, error } = await this.supabase
      .getClient()
      .from('users')
      .select('storage_used, storage_limit');

    if (error) throw new InternalServerErrorException(error.message);

    const totalUsed = data?.reduce((acc, u) => acc + (u.storage_used || 0), 0) || 0;
    const totalLimit = data?.reduce((acc, u) => acc + (u.storage_limit || 0), 0) || 0;

    return { totalUsed, totalLimit, userCount: data?.length || 0 };
  }
}
