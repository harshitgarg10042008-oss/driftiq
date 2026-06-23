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
var TelegramService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../supabase/supabase.service");
const realtime_gateway_1 = require("../realtime/realtime.gateway");
const users_service_1 = require("../users/users.service");
const axios_1 = __importDefault(require("axios"));
let TelegramService = TelegramService_1 = class TelegramService {
    constructor(supabase, realtimeGateway, usersService) {
        this.supabase = supabase;
        this.realtimeGateway = realtimeGateway;
        this.usersService = usersService;
        this.logger = new common_1.Logger(TelegramService_1.name);
    }
    async handleWebhook(update) {
        const telegramUserId = update?.message?.from?.id?.toString();
        if (!telegramUserId)
            return { status: 'ignored' };
        const text = update?.message?.text || '';
        if (text === '/start') {
            await this.sendTelegramMessage(telegramUserId, `👋 Welcome to DriftIQ Bot!\n\n` +
                `To link your account:\n` +
                `1. Go to the DriftIQ website\n` +
                `2. Click "Connect Telegram"\n` +
                `3. Copy your 6-digit code\n` +
                `4. Send it here (just the code, or use /link YOUR_CODE)\n\n` +
                `After linking, you can send files directly here to upload them to DriftIQ! 🚀`);
            return { status: 'start' };
        }
        const linkMatch = text.match(/^\/link\s+(\S+)$/) || text.match(/^(\d{6})$/);
        if (linkMatch) {
            const code = linkMatch[1];
            try {
                const user = await this.usersService.linkTelegramByCode(code, telegramUserId);
                if (user) {
                    await this.sendTelegramMessage(telegramUserId, `✅ Account linked successfully!\n\n` +
                        `You can now send files here to upload them to DriftIQ.\n` +
                        `Supported: documents, images, videos, audio files 📁`);
                    return { status: 'linked' };
                }
                else {
                    await this.sendTelegramMessage(telegramUserId, `❌ Invalid or expired code.\n` +
                        `Please generate a new code from DriftIQ Settings.`);
                    return { status: 'invalid_code' };
                }
            }
            catch (err) {
                this.logger.error('linkTelegramByCode error:', err?.message);
                await this.sendTelegramMessage(telegramUserId, `❌ Failed to link. Please try again.`);
                return { status: 'error' };
            }
        }
        const msg = update?.message;
        const hasFile = msg?.document || msg?.photo || msg?.video || msg?.audio;
        if (!hasFile) {
            return { status: 'ignored' };
        }
        let fileInfo = null;
        if (msg.document) {
            fileInfo = { ...msg.document };
            fileInfo.file_name = fileInfo.file_name || 'document';
            fileInfo.mime_type = fileInfo.mime_type || 'application/octet-stream';
        }
        else if (msg.photo) {
            const photo = msg.photo[msg.photo.length - 1];
            fileInfo = {
                ...photo,
                file_name: 'photo.jpg',
                mime_type: 'image/jpeg',
            };
        }
        else if (msg.video) {
            fileInfo = { ...msg.video };
            fileInfo.file_name = fileInfo.file_name || 'video.mp4';
            fileInfo.mime_type = fileInfo.mime_type || 'video/mp4';
        }
        else if (msg.audio) {
            fileInfo = { ...msg.audio };
            fileInfo.file_name =
                fileInfo.file_name || fileInfo.title || 'audio.mp3';
            fileInfo.mime_type = fileInfo.mime_type || 'audio/mpeg';
        }
        if (!fileInfo)
            return { status: 'ignored' };
        const { data: user, error: userError } = await this.supabase
            .getClient()
            .from('users')
            .select('id')
            .eq('telegram_user_id', telegramUserId)
            .maybeSingle();
        if (userError || !user) {
            this.logger.warn(`File received from unlinked Telegram user: ${telegramUserId}`);
            await this.sendTelegramMessage(telegramUserId, `⚠️ Account not linked yet!\n` +
                `Send your 6-digit code from DriftIQ to link your account first.`);
            return { status: 'user_not_found' };
        }
        let folderId = null;
        try {
            const { data: folder } = await this.supabase
                .getClient()
                .from('folders')
                .select('id')
                .eq('user_id', user.id)
                .eq('name', 'Telegram Imports')
                .is('parent_id', null)
                .maybeSingle();
            if (folder) {
                folderId = folder.id;
            }
            else {
                const { data: newFolder } = await this.supabase
                    .getClient()
                    .from('folders')
                    .insert({ user_id: user.id, name: 'Telegram Imports', parent_id: null })
                    .select('id')
                    .single();
                folderId = newFolder?.id || null;
            }
        }
        catch (folderErr) {
            this.logger.error('Folder setup failed:', folderErr?.message);
        }
        const newFile = {
            user_id: user.id,
            folder_id: folderId,
            name: fileInfo.file_name || 'Unknown File',
            mime_type: fileInfo.mime_type || 'application/octet-stream',
            size: fileInfo.file_size || 0,
            telegram_file_id: fileInfo.file_id,
            is_starred: false,
            is_deleted: false,
        };
        const { data: file, error: insertError } = await this.supabase
            .getClient()
            .from('files')
            .insert(newFile)
            .select()
            .single();
        if (insertError) {
            this.logger.error(`File save error: ${insertError.message}`);
            await this.sendTelegramMessage(telegramUserId, `❌ Failed to save file. Please try again.`);
            return { status: 'error' };
        }
        try {
            this.realtimeGateway.notifyFileAdded(user.id, file);
        }
        catch { }
        await this.sendTelegramMessage(telegramUserId, `✅ "${newFile.name}" saved to DriftIQ!\n📁 Folder: Telegram Imports`);
        return { status: 'success', fileId: file.id };
    }
    async sendTelegramMessage(chatId, text) {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        if (!token)
            return;
        try {
            await axios_1.default.post(`https://api.telegram.org/bot${token}/sendMessage`, { chat_id: chatId, text }, { timeout: 10000 });
        }
        catch (e) {
            this.logger.error('Failed to send Telegram reply:', e?.message);
        }
    }
};
exports.TelegramService = TelegramService;
exports.TelegramService = TelegramService = TelegramService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService,
        realtime_gateway_1.RealtimeGateway,
        users_service_1.UsersService])
], TelegramService);
//# sourceMappingURL=telegram.service.js.map