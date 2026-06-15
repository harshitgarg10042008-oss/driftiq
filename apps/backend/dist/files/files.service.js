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
            throw new common_1.InternalServerErrorException('Telegram bot not configured');
        }
        const { data: storageUser } = await this.supabase
            .getClient()
            .from('users')
            .select('storage_used, storage_limit')
            .eq('id', userId)
            .single();
        if (storageUser && storageUser.storage_used + fileBuffer.length > storageUser.storage_limit) {
            throw new common_1.ForbiddenException('Storage limit exceeded');
        }
        const formData = new form_data_1.default();
        formData.append('chat_id', chatId);
        formData.append('document', fileBuffer, { filename: fileName, contentType: mimeType });
        formData.append('caption', `DriftIQ | user:${userId} | ${fileName}`);
        let telegramFileId;
        try {
            const response = await axios_1.default.post(`https://api.telegram.org/bot${botToken}/sendDocument`, formData, { headers: formData.getHeaders() });
            telegramFileId = response.data.result.document.file_id;
        }
        catch (err) {
            throw new common_1.InternalServerErrorException('Failed to upload to Telegram: ' + err.message);
        }
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
        if (error)
            throw new common_1.InternalServerErrorException(error.message);
        await this.supabase.getClient()
            .rpc('increment_storage_used', { user_id: userId, bytes: fileBuffer.length });
        return file;
    }
    async getDownloadUrl(userId, fileId) {
        const file = await this.findOne(userId, fileId);
        return {
            url: `/api/files/${fileId}/stream`,
            name: file.name,
            mimeType: file.mime_type
        };
    }
    async getFileStream(userId, fileId) {
        const file = await this.findOne(userId, fileId);
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        const response = await axios_1.default.get(`https://api.telegram.org/bot${botToken}/getFile?file_id=${file.telegram_file_id}`);
        const filePath = response.data.result.file_path;
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
    async getStarred(userId) {
        const { data, error } = await this.supabase
            .getClient()
            .from('files')
            .select('*')
            .eq('user_id', userId)
            .eq('is_starred', true)
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
            .eq('user_id', userId);
        return {
            storageUsed: user?.storage_used || 0,
            storageLimit: user?.storage_limit || 5368709120,
            fileCount: count || 0,
        };
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