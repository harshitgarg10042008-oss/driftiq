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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilesController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const files_service_1 = require("./files.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
let FilesController = class FilesController {
    constructor(filesService) {
        this.filesService = filesService;
    }
    async upload(req, file, folderId) {
        if (!file)
            throw new common_1.BadRequestException('No file provided');
        return this.filesService.uploadToTelegram(req.user.id, file.buffer, file.originalname, file.mimetype, folderId);
    }
    async findAll(req, folderId) {
        return this.filesService.findAll(req.user.id, folderId);
    }
    async getStarred(req) {
        return this.filesService.getStarred(req.user.id);
    }
    async getDeleted(req) {
        return this.filesService.getDeleted(req.user.id);
    }
    async emptyTrash(req) {
        return this.filesService.emptyTrash(req.user.id);
    }
    async search(req, query) {
        return this.filesService.search(req.user.id, query || '');
    }
    async getStats(req) {
        return this.filesService.getStorageStats(req.user.id);
    }
    async getDownloadUrl(req, fileId) {
        return this.filesService.getDownloadUrl(req.user.id, fileId);
    }
    async streamFile(req, fileId, res) {
        const { stream, name, mimeType, size } = await this.filesService.getFileStream(req.user.id, fileId);
        res.set({
            'Content-Type': mimeType,
            'Content-Disposition': `attachment; filename="${name}"`,
            'Content-Length': size.toString(),
        });
        return new common_1.StreamableFile(stream);
    }
    async rename(req, fileId, name) {
        return this.filesService.rename(req.user.id, fileId, name);
    }
    async move(req, fileId, folderId) {
        return this.filesService.move(req.user.id, fileId, folderId);
    }
    async toggleStar(req, fileId, isStarred) {
        return this.filesService.toggleStar(req.user.id, fileId, isStarred);
    }
    async delete(req, fileId) {
        return this.filesService.delete(req.user.id, fileId);
    }
    async restore(req, fileId) {
        return this.filesService.restore(req.user.id, fileId);
    }
    async createShareLink(req, fileId, password, expiresIn) {
        return this.filesService.createShareLink(req.user.id, fileId, password, expiresIn);
    }
    async getSharedFile(token, password) {
        return this.filesService.getSharedFile(token, password);
    }
    async streamSharedFile(token, res, password) {
        const { stream, name, mimeType, size } = await this.filesService.streamSharedFile(token, password);
        res.set({
            'Content-Type': mimeType,
            'Content-Disposition': `attachment; filename="${name}"`,
            'Content-Length': size.toString(),
        });
        return new common_1.StreamableFile(stream);
    }
};
exports.FilesController = FilesController;
__decorate([
    (0, common_1.Post)('upload'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        limits: { fileSize: 50 * 1024 * 1024 },
    })),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Body)('folderId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", Promise)
], FilesController.prototype, "upload", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('folderId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], FilesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('starred'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FilesController.prototype, "getStarred", null);
__decorate([
    (0, common_1.Get)('deleted'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FilesController.prototype, "getDeleted", null);
__decorate([
    (0, common_1.Delete)('trash/empty'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FilesController.prototype, "emptyTrash", null);
__decorate([
    (0, common_1.Get)('search'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], FilesController.prototype, "search", null);
__decorate([
    (0, common_1.Get)('stats'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FilesController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)(':id/download'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], FilesController.prototype, "getDownloadUrl", null);
__decorate([
    (0, common_1.Get)(':id/stream'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], FilesController.prototype, "streamFile", null);
__decorate([
    (0, common_1.Put)(':id/rename'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)('name')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], FilesController.prototype, "rename", null);
__decorate([
    (0, common_1.Post)(':id/move'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)('folderId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], FilesController.prototype, "move", null);
__decorate([
    (0, common_1.Put)(':id/star'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)('isStarred')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Boolean]),
    __metadata("design:returntype", Promise)
], FilesController.prototype, "toggleStar", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], FilesController.prototype, "delete", null);
__decorate([
    (0, common_1.Post)(':id/restore'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], FilesController.prototype, "restore", null);
__decorate([
    (0, common_1.Post)(':id/share'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)('password')),
    __param(3, (0, common_1.Body)('expiresIn')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Number]),
    __metadata("design:returntype", Promise)
], FilesController.prototype, "createShareLink", null);
__decorate([
    (0, common_1.Get)('shared/:token'),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Query)('password')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], FilesController.prototype, "getSharedFile", null);
__decorate([
    (0, common_1.Get)('shared/:token/stream'),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __param(2, (0, common_1.Query)('password')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], FilesController.prototype, "streamSharedFile", null);
exports.FilesController = FilesController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('files'),
    __metadata("design:paramtypes", [files_service_1.FilesService])
], FilesController);
//# sourceMappingURL=files.controller.js.map