"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilesService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../supabase/supabase.service");
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
let FilesService = class FilesService {
    constructor(supabase) {
        this.supabase = supabase;
    }
    async uploadToTelegram(userId, fileBuffer, fileName, mimeType, folderId) {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_STORAGE_CHAT_ID;
        if (!botToken || !chatId) {
            console.error('❌ UPLOAD FAILED: TELEGRAM_BOT_TOKEN or TELEGRAM_STORAGE_CHAT_ID is not set in .env');
            throw new common_1.InternalServerErrorException('Telegram bot not configured. Check your .env file.');
        }
        try {
            const { data: storageUser } = await this.supabase
                .getClient()
                .from('users')
                .select('storage_used, storage_limit')
                .eq('id', userId)
                .maybeSingle();
            if (storageUser &&
                storageUser.storage_used != null &&
                storageUser.storage_limit != null &&
                storageUser.storage_used + fileBuffer.length > storageUser.storage_limit) {
                throw new common_1.ForbiddenException('Storage limit exceeded. Please delete some files to free up space.');
            }
        }
        catch (storageErr) {
            if (storageErr?.status === 403)
                throw storageErr;
            console.warn('⚠️  Storage check skipped (column may not exist yet):', storageErr?.message);
        }
        const formData = new form_data_1.default();
        formData.append('chat_id', chatId);
        formData.append('document', fileBuffer, {
            filename: fileName,
            contentType: mimeType,
        });
        formData.append('caption', `DriftIQ | user:${userId} | ${fileName}`);
        let telegramFileId;
        try {
            console.log(`📤 Uploading "${fileName}" (${fileBuffer.length} bytes) to Telegram chat ${chatId}...`);
            const response = await axios_1.default.post(`https://api.telegram.org/bot${botToken}/sendDocument`, formData, { headers: formData.getHeaders(), timeout: 60000 });
            telegramFileId = response.data?.result?.document?.file_id;
            if (!telegramFileId) {
                console.error('❌ Telegram response missing file_id:', JSON.stringify(response.data));
                throw new common_1.InternalServerErrorException('Telegram did not return a file_id. Check bot permissions.');
            }
            console.log(`✅ Telegram upload successful. file_id: ${telegramFileId}`);
        }
        catch (err) {
            const telegramError = err?.response?.data?.description || err?.message || 'Unknown error';
            const status = err?.response?.status;
            console.error(`❌ Telegram upload failed [HTTP ${status}]:`, telegramError);
            if (status === 400) {
                throw new common_1.InternalServerErrorException(`Telegram rejected the request: ${telegramError}. Ensure the bot is added to the storage channel as Admin.`);
            }
            if (status === 403) {
                throw new common_1.InternalServerErrorException('Bot does not have permission to send messages in the storage channel. Add the bot as Admin.');
            }
            throw new common_1.InternalServerErrorException(`Failed to upload to Telegram: ${telegramError}`);
        }
        console.log(`💾 Saving file metadata to Supabase...`);
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
            is_deleted: false,
        })
            .select()
            .single();
        if (error) {
            console.error('❌ Supabase insert failed:', error.message, '| Code:', error.code, '| Details:', error.details);
            throw new common_1.InternalServerErrorException(`Database error: ${error.message}. Run the SQL migration in database/schema.sql in your Supabase SQL Editor.`);
        }
        console.log(`✅ File saved to database. id: ${file?.id}`);
        try {
            await this.supabase
                .getClient()
                .rpc('increment_storage_used', { user_id: userId, bytes: fileBuffer.length });
        }
        catch (rpcErr) {
            console.warn('Storage RPC failed silently (non-fatal):', rpcErr?.message);
        }
        return file;
    }
    async getDownloadUrl(userId, fileId) {
        const file = await this.findOne(userId, fileId);
        return {
            url: `/api/files/${fileId}/stream`,
            name: file.name,
            mimeType: file.mime_type,
        };
    }
    async getFileStream(userId, fileId) {
        const file = await this.findOne(userId, fileId);
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (!botToken) {
            throw new common_1.InternalServerErrorException('Telegram bot not configured');
        }
        try {
            const response = await axios_1.default.get(`https://api.telegram.org/bot${botToken}/getFile?file_id=${file.telegram_file_id}`);
            const filePath = response.data?.result?.file_path;
            if (!filePath) {
                throw new common_1.InternalServerErrorException('Invalid Telegram file response');
            }
            const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
            const fileStreamResponse = await axios_1.default.get(downloadUrl, {
                responseType: 'stream',
            });
            return {
                stream: fileStreamResponse.data,
                name: file.name || 'download',
                mimeType: file.mime_type || 'application/octet-stream',
                size: file.size || 0,
            };
        }
        catch (err) {
            if (err?.status >= 400 || err?.response?.status >= 400)
                throw err;
            throw new common_1.InternalServerErrorException('Failed to fetch from Telegram: ' + (err?.message || 'Unknown error'));
        }
    }
    async findAll(userId, folderId) {
        let query = this.supabase
            .getClient()
            .from('files')
            .select('*')
            .eq('user_id', userId)
            .eq('is_deleted', false)
            .order('created_at', { ascending: false });
        if (folderId) {
            query = query.eq('folder_id', folderId);
        }
        else {
            query = query.is('folder_id', null);
        }
        const { data, error } = await query;
        if (error)
            throw new common_1.InternalServerErrorException(error.message);
        return data || [];
    }
    async findOne(userId, fileId) {
        const { data, error } = await this.supabase
            .getClient()
            .from('files')
            .select('*')
            .eq('id', fileId)
            .eq('user_id', userId)
            .eq('is_deleted', false)
            .maybeSingle();
        if (error)
            throw new common_1.InternalServerErrorException(error.message);
        if (!data)
            throw new common_1.NotFoundException('File not found');
        return data;
    }
    async rename(userId, fileId, newName) {
        const { data, error } = await this.supabase
            .getClient()
            .from('files')
            .update({ name: newName })
            .eq('id', fileId)
            .eq('user_id', userId)
            .select()
            .single();
        if (error)
            throw new common_1.InternalServerErrorException(error.message);
        if (!data)
            throw new common_1.NotFoundException('File not found');
        return data;
    }
    async move(userId, fileId, folderId) {
        const { data, error } = await this.supabase
            .getClient()
            .from('files')
            .update({ folder_id: folderId })
            .eq('id', fileId)
            .eq('user_id', userId)
            .select()
            .single();
        if (error)
            throw new common_1.InternalServerErrorException(error.message);
        if (!data)
            throw new common_1.NotFoundException('File not found');
        return data;
    }
    async toggleStar(userId, fileId, isStarred) {
        const { data, error } = await this.supabase
            .getClient()
            .from('files')
            .update({ is_starred: isStarred })
            .eq('id', fileId)
            .eq('user_id', userId)
            .select()
            .single();
        if (error)
            throw new common_1.InternalServerErrorException(error.message);
        if (!data)
            throw new common_1.NotFoundException('File not found');
        return data;
    }
    async delete(userId, fileId) {
        const { error } = await this.supabase
            .getClient()
            .from('files')
            .update({ is_deleted: true })
            .eq('id', fileId)
            .eq('user_id', userId);
        if (error)
            throw new common_1.InternalServerErrorException(error.message);
        return { success: true };
    }
    async restore(userId, fileId) {
        const { data, error } = await this.supabase
            .getClient()
            .from('files')
            .update({ is_deleted: false })
            .eq('id', fileId)
            .eq('user_id', userId)
            .select()
            .single();
        if (error)
            throw new common_1.InternalServerErrorException(error.message);
        if (!data)
            throw new common_1.NotFoundException('File not found');
        return data;
    }
    async getDeleted(userId) {
        const { data, error } = await this.supabase
            .getClient()
            .from('files')
            .select('*')
            .eq('user_id', userId)
            .eq('is_deleted', true)
            .order('created_at', { ascending: false });
        if (error)
            throw new common_1.InternalServerErrorException(error.message);
        return data || [];
    }
    async emptyTrash(userId) {
        const { data: filesToDelete, error: fetchError } = await this.supabase
            .getClient()
            .from('files')
            .select('id, size')
            .eq('user_id', userId)
            .eq('is_deleted', true);
        if (fetchError)
            throw new common_1.InternalServerErrorException(fetchError.message);
        if (!filesToDelete || filesToDelete.length === 0) {
            return { success: true, count: 0 };
        }
        const totalSizeToFree = filesToDelete.reduce((acc, f) => acc + Number(f.size || 0), 0);
        const { error: deleteError } = await this.supabase
            .getClient()
            .from('files')
            .delete()
            .eq('user_id', userId)
            .eq('is_deleted', true);
        if (deleteError)
            throw new common_1.InternalServerErrorException(deleteError.message);
        if (totalSizeToFree > 0) {
            try {
                await this.supabase
                    .getClient()
                    .rpc('increment_storage_used', { user_id: userId, bytes: -totalSizeToFree });
            }
            catch (rpcErr) {
                console.warn('Storage decrement RPC failed silently:', rpcErr?.message);
            }
        }
        return { success: true, count: filesToDelete.length };
    }
    async getStarred(userId) {
        const { data, error } = await this.supabase
            .getClient()
            .from('files')
            .select('*')
            .eq('user_id', userId)
            .eq('is_starred', true)
            .eq('is_deleted', false)
            .order('created_at', { ascending: false });
        if (error)
            throw new common_1.InternalServerErrorException(error.message);
        return data || [];
    }
    async search(userId, query) {
        const { data, error } = await this.supabase
            .getClient()
            .from('files')
            .select('*')
            .eq('user_id', userId)
            .eq('is_deleted', false)
            .ilike('name', `%${query}%`)
            .order('created_at', { ascending: false })
            .limit(50);
        if (error)
            throw new common_1.InternalServerErrorException(error.message);
        return data || [];
    }
    async getStorageStats(userId) {
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
            .eq('user_id', userId)
            .eq('is_deleted', false);
        return {
            storageUsed: user?.storage_used || 0,
            storageLimit: user?.storage_limit || 5368709120,
            fileCount: count || 0,
        };
    }
    async createShareLink(userId, fileId, password, expiresIn) {
        const file = await this.findOne(userId, fileId);
        const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
        const shareData = {
            file_id: fileId,
            user_id: userId,
            share_token: token,
            is_active: true,
            download_count: 0,
        };
        if (password) {
            const bcrypt = await Promise.resolve().then(() => __importStar(require('bcrypt')));
            shareData.password_hash = await bcrypt.hash(password, 10);
        }
        if (expiresIn) {
            shareData.expires_at = new Date(Date.now() + expiresIn * 1000).toISOString();
        }
        const { data, error } = await this.supabase
            .getClient()
            .from('shares')
            .insert(shareData)
            .select()
            .single();
        if (error)
            throw new common_1.InternalServerErrorException(error.message);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        return {
            ...data,
            token,
            url: `${frontendUrl}/share/${token}`,
            share_url: `${frontendUrl}/share/${token}`,
            fileName: file.name,
        };
    }
    async getSharedFile(token, password) {
        const { data: share, error } = await this.supabase
            .getClient()
            .from('shares')
            .select('*, files(*)')
            .eq('share_token', token)
            .eq('is_active', true)
            .maybeSingle();
        if (error || !share)
            throw new common_1.NotFoundException('Share link not found');
        if (share.expires_at && new Date(share.expires_at) < new Date()) {
            throw new common_1.ForbiddenException('Share link has expired');
        }
        if (share.password_hash) {
            if (!password)
                throw new common_1.ForbiddenException('Password required');
            const bcrypt = await Promise.resolve().then(() => __importStar(require('bcrypt')));
            const match = await bcrypt.compare(password, share.password_hash);
            if (!match)
                throw new common_1.ForbiddenException('Incorrect password');
        }
        return share.files;
    }
    async streamSharedFile(token, password) {
        const file = await this.getSharedFile(token, password);
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        try {
            const response = await axios_1.default.get(`https://api.telegram.org/bot${botToken}/getFile?file_id=${file.telegram_file_id}`);
            const filePath = response.data?.result?.file_path;
            const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
            const fileStreamResponse = await axios_1.default.get(downloadUrl, {
                responseType: 'stream',
            });
            return {
                stream: fileStreamResponse.data,
                name: file.name,
                mimeType: file.mime_type,
                size: file.size,
            };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException('Failed to stream file: ' + (err?.message || 'Unknown error'));
        }
    }
    async getUserStorageUsed(userId) {
        const { data } = await this.supabase
            .getClient()
            .from('users')
            .select('storage_used')
            .eq('id', userId)
            .single();
        return data?.storage_used || 0;
    }
};
exports.FilesService = FilesService;
exports.FilesService = FilesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], FilesService);
//# sourceMappingURL=files.service.js.map