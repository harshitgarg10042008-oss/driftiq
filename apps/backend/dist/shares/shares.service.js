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
exports.SharesService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../supabase/supabase.service");
const uuid_1 = require("uuid");
const bcrypt = __importStar(require("bcrypt"));
const axios_1 = __importDefault(require("axios"));
let SharesService = class SharesService {
    constructor(supabase) {
        this.supabase = supabase;
    }
    async createShare(userId, fileId, dto) {
        const shareToken = (0, uuid_1.v4)().replace(/-/g, '');
        let passwordHash = null;
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
        if (error)
            throw new common_1.InternalServerErrorException(error.message);
        return {
            ...data,
            share_url: `${process.env.FRONTEND_URL}/share/${shareToken}`,
            qr_url: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${process.env.FRONTEND_URL}/share/${shareToken}`)}`,
        };
    }
    async getMyShares(userId) {
        const { data, error } = await this.supabase
            .getClient()
            .from('shares')
            .select('*, files(name, size, mime_type)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (error)
            throw new common_1.InternalServerErrorException(error.message);
        return data?.map(s => ({
            ...s,
            share_url: `${process.env.FRONTEND_URL}/share/${s.share_token}`,
            qr_url: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${process.env.FRONTEND_URL}/share/${s.share_token}`)}`,
        })) || [];
    }
    async accessShare(token, password) {
        const { data: share, error } = await this.supabase
            .getClient()
            .from('shares')
            .select('*, files(*)')
            .eq('share_token', token)
            .eq('is_active', true)
            .maybeSingle();
        if (error || !share)
            throw new common_1.NotFoundException('Share link not found or inactive');
        if (share.expires_at && new Date(share.expires_at) < new Date()) {
            throw new common_1.UnauthorizedException('This share link has expired');
        }
        if (share.download_limit !== null && share.download_count >= share.download_limit) {
            throw new common_1.UnauthorizedException('Download limit reached');
        }
        if (share.password_hash) {
            if (!password)
                throw new common_1.UnauthorizedException('Password required');
            const isMatch = await bcrypt.compare(password, share.password_hash);
            if (!isMatch)
                throw new common_1.UnauthorizedException('Invalid password');
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
    async getShareStream(token, password) {
        const access = await this.accessShare(token, password);
        const file = access.file;
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
            shareId: access.shareId,
        };
    }
    async recordDownload(shareId, ip, userAgent) {
        await this.supabase.getClient().rpc('increment_download_count', { share_id: shareId });
        await this.supabase.getClient().from('downloads').insert({
            share_id: shareId,
            ip_address: ip,
            user_agent: userAgent,
        });
        return { success: true };
    }
    async updateShare(userId, shareId, updates) {
        const { data, error } = await this.supabase
            .getClient()
            .from('shares')
            .update(updates)
            .eq('id', shareId)
            .eq('user_id', userId)
            .select()
            .single();
        if (error)
            throw new common_1.InternalServerErrorException(error.message);
        if (!data)
            throw new common_1.NotFoundException('Share not found');
        return data;
    }
    async deleteShare(userId, shareId) {
        const { error } = await this.supabase
            .getClient()
            .from('shares')
            .update({ is_active: false })
            .eq('id', shareId)
            .eq('user_id', userId);
        if (error)
            throw new common_1.InternalServerErrorException(error.message);
        return { success: true };
    }
    async getDownloadAnalytics(userId, shareId) {
        const { data, error } = await this.supabase
            .getClient()
            .from('downloads')
            .select('*, shares!inner(user_id)')
            .eq('share_id', shareId)
            .eq('shares.user_id', userId)
            .order('downloaded_at', { ascending: false });
        if (error)
            throw new common_1.InternalServerErrorException(error.message);
        return data || [];
    }
};
exports.SharesService = SharesService;
exports.SharesService = SharesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], SharesService);
//# sourceMappingURL=shares.service.js.map