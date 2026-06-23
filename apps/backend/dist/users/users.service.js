"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../supabase/supabase.service");
let UsersService = class UsersService {
    constructor(supabase) {
        this.supabase = supabase;
    }
    async findByEmail(email) {
        const { data, error } = await this.supabase
            .getClient()
            .from('users')
            .select('*')
            .eq('email', email)
            .maybeSingle();
        if (error) {
            console.error('[Supabase Error in findByEmail]:', error);
            throw new common_1.InternalServerErrorException(error.message);
        }
        return data;
    }
    async findByUsername(username) {
        const { data, error } = await this.supabase
            .getClient()
            .from('users')
            .select('*')
            .eq('username', username)
            .maybeSingle();
        if (error)
            throw new common_1.InternalServerErrorException(error.message);
        return data;
    }
    async findById(id) {
        const { data, error } = await this.supabase
            .getClient()
            .from('users')
            .select('*')
            .eq('id', id)
            .maybeSingle();
        if (error)
            throw new common_1.InternalServerErrorException(error.message);
        return data;
    }
    async findByTelegramUserId(telegramUserId) {
        const { data, error } = await this.supabase
            .getClient()
            .from('users')
            .select('id, email')
            .eq('telegram_user_id', telegramUserId)
            .maybeSingle();
        if (error)
            throw new common_1.InternalServerErrorException(error.message);
        return data;
    }
    async create(user) {
        const { data, error } = await this.supabase
            .getClient()
            .from('users')
            .insert(user)
            .select()
            .single();
        if (error)
            throw new common_1.InternalServerErrorException(error.message);
        return data;
    }
    async updateRefreshToken(id, refreshToken) {
        const { error } = await this.supabase
            .getClient()
            .from('users')
            .update({ refresh_token: refreshToken })
            .eq('id', id);
        if (error)
            throw new common_1.InternalServerErrorException(error.message);
    }
    async updatePassword(id, hash) {
        const { error } = await this.supabase
            .getClient()
            .from('users')
            .update({ password_hash: hash })
            .eq('id', id);
        if (error)
            throw new common_1.InternalServerErrorException(error.message);
    }
    async updateLastLogin(id) {
        try {
            await this.supabase
                .getClient()
                .from('users')
                .update({ last_login: new Date().toISOString() })
                .eq('id', id);
        }
        catch {
        }
    }
    async setResetToken(id, token) {
        const { error } = await this.supabase
            .getClient()
            .from('users')
            .update({ password_reset_token: token })
            .eq('id', id);
        if (error)
            throw new common_1.InternalServerErrorException(error.message);
    }
    async clearResetToken(id) {
        const { error } = await this.supabase
            .getClient()
            .from('users')
            .update({ password_reset_token: null })
            .eq('id', id);
        if (error)
            throw new common_1.InternalServerErrorException(error.message);
    }
    async linkTelegram(userId, telegramUserId) {
        const { error } = await this.supabase
            .getClient()
            .from('users')
            .update({
            telegram_user_id: telegramUserId,
            telegram_status: 'connected',
            telegramconnected: true,
        })
            .eq('id', userId);
        if (error)
            throw new common_1.InternalServerErrorException(error.message);
    }
    async generateTelegramLinkCode(userId) {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60000).toISOString();
        const { error } = await this.supabase
            .getClient()
            .from('users')
            .update({
            telegram_link_code: code,
            telegram_link_code_expires_at: expiresAt,
        })
            .eq('id', userId);
        if (error)
            throw new common_1.InternalServerErrorException('Failed to generate link code');
        return code;
    }
    async setTelegramLinkCode(userId, code, expires) {
        await this.supabase
            .getClient()
            .from('users')
            .update({
            telegram_link_code: code,
            telegram_link_code_expires_at: expires.toISOString(),
        })
            .eq('id', userId);
    }
    async linkTelegramByCode(code, telegramUserId) {
        const { data: user, error } = await this.supabase
            .getClient()
            .from('users')
            .select('id, telegram_link_code_expires_at')
            .eq('telegram_link_code', code)
            .maybeSingle();
        if (error || !user)
            return null;
        if (user.telegram_link_code_expires_at &&
            new Date(user.telegram_link_code_expires_at) < new Date()) {
            return null;
        }
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
        if (updateError)
            throw new common_1.InternalServerErrorException('Failed to link account');
        return user;
    }
    async findAll(page = 1, limit = 20, search = '') {
        let query = this.supabase
            .getClient()
            .from('users')
            .select('id, email, username, full_name, role, is_active, storage_used, storage_limit, created_at, last_login, telegram_status', { count: 'exact' });
        if (search) {
            query = query.or(`email.ilike.%${search}%,username.ilike.%${search}%`);
        }
        const from = (page - 1) * limit;
        query = query.range(from, from + limit - 1).order('created_at', { ascending: false });
        const { data, error, count } = await query;
        if (error)
            throw new common_1.InternalServerErrorException(error.message);
        return { users: data, total: count };
    }
    async setActive(id, isActive) {
        const { error } = await this.supabase
            .getClient()
            .from('users')
            .update({ is_active: isActive })
            .eq('id', id);
        if (error)
            throw new common_1.InternalServerErrorException(error.message);
        return { success: true };
    }
    async setRole(id, role) {
        const { error } = await this.supabase
            .getClient()
            .from('users')
            .update({ role })
            .eq('id', id);
        if (error)
            throw new common_1.InternalServerErrorException(error.message);
        return { success: true };
    }
    async deleteUser(id) {
        const { error } = await this.supabase
            .getClient()
            .from('users')
            .delete()
            .eq('id', id);
        if (error)
            throw new common_1.InternalServerErrorException(error.message);
        return { success: true };
    }
    async getStorageStats() {
        const { data, error } = await this.supabase
            .getClient()
            .from('users')
            .select('storage_used, storage_limit');
        if (error)
            throw new common_1.InternalServerErrorException(error.message);
        const totalUsed = data?.reduce((acc, u) => acc + (u.storage_used || 0), 0) || 0;
        const totalLimit = data?.reduce((acc, u) => acc + (u.storage_limit || 0), 0) || 0;
        return { totalUsed, totalLimit, userCount: data?.length || 0 };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], UsersService);
//# sourceMappingURL=users.service.js.map