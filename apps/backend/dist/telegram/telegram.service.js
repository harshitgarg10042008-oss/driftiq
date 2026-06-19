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
        const telegramUserId = update.message?.from?.id?.toString();
        if (!telegramUserId)
            return { status: 'ignored' };
        if (update.message?.text?.startsWith('/link ')) {
            const code = update.message.text.replace('/link ', '').trim();
            try {
                const user = await this.usersService.linkTelegramByCode(code, telegramUserId);
                if (user) {
                    await this.sendTelegramMessage(telegramUserId, '✅ Account successfully linked! You can now send files here to upload them directly to DriftIQ.');
                    return { status: 'linked' };
                }
                else {
                    await this.sendTelegramMessage(telegramUserId, '❌ Invalid or expired link code. Please generate a new one from your Settings page.');
                    return { status: 'invalid_code' };
                }
            }
            catch (err) {
                await this.sendTelegramMessage(telegramUserId, '❌ Failed to link account due to an internal error.');
                return { status: 'error' };
            }
        }
        if (!update.message || !update.message.document) {
            return { status: 'ignored' };
        }
        const document = update.message.document;
        const { data: user, error: userError } = await this.supabase
            .getClient()
            .from('users')
            .select('id')
            .eq('telegram_user_id', telegramUserId)
            .single();
        if (userError || !user) {
            this.logger.warn(`File received from unknown Telegram user: ${telegramUserId}`);
            this.sendTelegramMessage(telegramUserId, 'Please link your account on DriftIQ before uploading files.');
            return { status: 'user_not_found' };
        }
        let folderId = null;
        try {
            const { data: folder, error: folderError } = await this.supabase
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
                const { data: newFolder, error: createFolderError } = await this.supabase
                    .getClient()
                    .from('folders')
                    .insert({
                    user_id: user.id,
                    name: 'Telegram Imports',
                    parent_id: null
                })
                    .select('id')
                    .single();
                if (createFolderError) {
                    this.logger.error(`Error creating folder: ${createFolderError.message}`);
                }
                else {
                    folderId = newFolder.id;
                }
            }
        }
        catch (folderErr) {
            this.logger.error(`Folder setup failed: ${folderErr.message}`);
        }
        const newFile = {
            user_id: user.id,
            folder_id: folderId,
            name: document.file_name || 'Unknown File',
            mime_type: document.mime_type || 'application/octet-stream',
            size: document.file_size,
            telegram_file_id: document.file_id,
            is_starred: false,
        };
        const { data: file, error: insertError } = await this.supabase
            .getClient()
            .from('files')
            .insert(newFile)
            .select()
            .single();
        if (insertError) {
            this.logger.error(`Error saving file: ${insertError.message}`);
            throw new common_1.InternalServerErrorException('Database insert failed');
        }
        this.realtimeGateway.notifyFileAdded(user.id, file);
        this.sendTelegramMessage(telegramUserId, `✅ File "${newFile.name}" successfully saved to DriftIQ!`);
        return { status: 'success', fileId: file.id };
    }
    async sendTelegramMessage(chatId, text) {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        if (!token)
            return;
        try {
            await axios_1.default.post(`https://api.telegram.org/bot${token}/sendMessage`, {
                chat_id: chatId,
                text,
            });
        }
        catch (e) {
            this.logger.error('Failed to send Telegram reply', e.message);
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