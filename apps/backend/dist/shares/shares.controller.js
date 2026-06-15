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
exports.SharesController = void 0;
const common_1 = require("@nestjs/common");
const shares_service_1 = require("./shares.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
let SharesController = class SharesController {
    constructor(sharesService) {
        this.sharesService = sharesService;
    }
    async createShare(req, fileId, password, expiresAt, downloadLimit) {
        return this.sharesService.createShare(req.user.id, fileId, { password, expiresAt, downloadLimit });
    }
    async getMyShares(req) {
        return this.sharesService.getMyShares(req.user.id);
    }
    async accessShare(token, password) {
        return this.sharesService.accessShare(token, password);
    }
    async downloadShare(token, password, ip, userAgent, res) {
        const { stream, name, mimeType, size, shareId } = await this.sharesService.getShareStream(token, password);
        await this.sharesService.recordDownload(shareId, ip || 'unknown', userAgent || '');
        if (res) {
            res.set({
                'Content-Type': mimeType,
                'Content-Disposition': `attachment; filename="${name}"`,
                'Content-Length': size.toString(),
            });
        }
        return new common_1.StreamableFile(stream);
    }
    async updateShare(req, shareId, updates) {
        return this.sharesService.updateShare(req.user.id, shareId, updates);
    }
    async deleteShare(req, shareId) {
        return this.sharesService.deleteShare(req.user.id, shareId);
    }
    async getAnalytics(req, shareId) {
        return this.sharesService.getDownloadAnalytics(req.user.id, shareId);
    }
};
exports.SharesController = SharesController;
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)('fileId')),
    __param(2, (0, common_1.Body)('password')),
    __param(3, (0, common_1.Body)('expiresAt')),
    __param(4, (0, common_1.Body)('downloadLimit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, Number]),
    __metadata("design:returntype", Promise)
], SharesController.prototype, "createShare", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('mine'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SharesController.prototype, "getMyShares", null);
__decorate([
    (0, common_1.Post)('public/:token'),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Body)('password')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SharesController.prototype, "accessShare", null);
__decorate([
    (0, common_1.Post)('public/:token/download-url'),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Body)('password')),
    __param(2, (0, common_1.Headers)('x-forwarded-for')),
    __param(3, (0, common_1.Headers)('user-agent')),
    __param(4, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, Object]),
    __metadata("design:returntype", Promise)
], SharesController.prototype, "downloadShare", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], SharesController.prototype, "updateShare", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], SharesController.prototype, "deleteShare", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)(':id/analytics'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], SharesController.prototype, "getAnalytics", null);
exports.SharesController = SharesController = __decorate([
    (0, common_1.Controller)('shares'),
    __metadata("design:paramtypes", [shares_service_1.SharesService])
], SharesController);
//# sourceMappingURL=shares.controller.js.map