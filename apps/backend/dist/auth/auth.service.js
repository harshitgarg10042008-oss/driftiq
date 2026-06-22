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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const users_service_1 = require("../users/users.service");
const bcrypt = __importStar(require("bcrypt"));
const axios_1 = __importDefault(require("axios"));
let AuthService = class AuthService {
    constructor(usersService, jwtService) {
        this.usersService = usersService;
        this.jwtService = jwtService;
    }
    async register(dto) {
        const existing = await this.usersService.findByEmail(dto.email);
        if (existing) {
            throw new common_1.ConflictException('Email already in use');
        }
        const existingUser = await this.usersService.findByUsername(dto.username);
        if (existingUser) {
            throw new common_1.ConflictException('Username already taken');
        }
        const password_hash = await bcrypt.hash(dto.password, 10);
        const newUser = {
            email: dto.email,
            username: dto.username,
            full_name: dto.fullName,
            password_hash,
            role: 'user',
            is_active: true,
        };
        const user = await this.usersService.create(newUser);
        return this.generateTokens(user.id, user.email, user.role);
    }
    async login(dto) {
        let user = await this.usersService.findByEmail(dto.email);
        if (!user) {
            user = await this.usersService.findByUsername(dto.email);
        }
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        if (!user.is_active) {
            throw new common_1.UnauthorizedException('Account is disabled. Contact support.');
        }
        const isMatch = await bcrypt.compare(dto.password, user.password_hash);
        if (!isMatch) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        await this.usersService.updateLastLogin(user.id);
        return this.generateTokens(user.id, user.email, user.role);
    }
    async refresh(refreshToken) {
        try {
            const payload = this.jwtService.verify(refreshToken, {
                secret: process.env.JWT_REFRESH_SECRET || 'super_secret_refresh_key',
            });
            const user = await this.usersService.findById(payload.sub);
            if (!user || user.refresh_token !== refreshToken) {
                throw new common_1.UnauthorizedException('Invalid refresh token');
            }
            if (!user.is_active) {
                throw new common_1.UnauthorizedException('Account is disabled');
            }
            return this.generateTokens(user.id, user.email, user.role);
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid or expired refresh token');
        }
    }
    async logout(userId) {
        await this.usersService.updateRefreshToken(userId, null);
        return { message: 'Logged out successfully' };
    }
    async changePassword(userId, dto) {
        const user = await this.usersService.findById(userId);
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const isMatch = await bcrypt.compare(dto.currentPassword, user.password_hash);
        if (!isMatch) {
            throw new common_1.BadRequestException('Current password is incorrect');
        }
        const newHash = await bcrypt.hash(dto.newPassword, 10);
        await this.usersService.updatePassword(userId, newHash);
        await this.usersService.updateRefreshToken(userId, null);
        return { message: 'Password changed successfully. Please log in again.' };
    }
    async resetPasswordRequest(email) {
        const user = await this.usersService.findByEmail(email);
        if (!user)
            return { message: 'If that email exists, a reset link has been sent.' };
        const resetToken = await this.jwtService.signAsync({ sub: user.id, type: 'password_reset' }, {
            secret: process.env.JWT_SECRET || 'super_secret_jwt_key',
            expiresIn: '1h',
        });
        await this.usersService.setResetToken(user.id, resetToken);
        const resendKey = process.env.RESEND_API_KEY;
        if (!resendKey) {
            console.warn('RESEND_API_KEY not configured. Password reset email cannot be sent.');
            return { message: 'If that email exists, a reset link has been sent.' };
        }
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
        try {
            await axios_1.default.post('https://api.resend.com/emails', {
                from: 'DriftIQ Security <onboarding@resend.dev>',
                to: [user.email],
                subject: 'Reset Your DriftIQ Password',
                html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Reset Your Password</h2>
              <p>We received a request to reset your DriftIQ password. Click the button below to choose a new password.</p>
              <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #7c3aed; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">Reset Password</a>
              <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
              <p style="color: #666; font-size: 14px; margin-top: 32px;">The DriftIQ Team</p>
            </div>
          `,
            }, { headers: { Authorization: `Bearer ${resendKey}` } });
        }
        catch (e) {
            console.error('Failed to send reset email:', e.response?.data || e.message);
        }
        return { message: 'If that email exists, a reset link has been sent.' };
    }
    async resetPasswordConfirm(token, newPassword) {
        try {
            const payload = this.jwtService.verify(token, {
                secret: process.env.JWT_SECRET || 'super_secret_jwt_key',
            });
            if (payload.type !== 'password_reset') {
                throw new common_1.BadRequestException('Invalid reset token');
            }
            const user = await this.usersService.findById(payload.sub);
            if (!user || user.password_reset_token !== token) {
                throw new common_1.BadRequestException('Invalid or expired reset token');
            }
            const newHash = await bcrypt.hash(newPassword, 10);
            await this.usersService.updatePassword(user.id, newHash);
            await this.usersService.clearResetToken(user.id);
            await this.usersService.updateRefreshToken(user.id, null);
            return { message: 'Password reset successfully. Please log in.' };
        }
        catch {
            throw new common_1.BadRequestException('Invalid or expired reset token');
        }
    }
    async getTelegramLinkCode(userId) {
        const code = 'DQ-' + Math.random().toString(36).substring(2, 6).toUpperCase();
        const expires = new Date(Date.now() + 10 * 60 * 1000);
        await this.usersService.setTelegramLinkCode(userId, code, expires);
        return { code };
    }
    async getTelegramStatus(userId) {
        const user = await this.usersService.findById(userId);
        return {
            connected: user?.telegramconnected === true || user?.telegram_status === 'connected',
            status: (user?.telegramconnected || user?.telegram_status === 'connected') ? 'connected' : 'pending',
        };
    }
    async generateTokens(userId, email, role) {
        const payload = { sub: userId, email, role };
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload, {
                secret: process.env.JWT_SECRET || 'super_secret_jwt_key',
                expiresIn: '15m',
            }),
            this.jwtService.signAsync(payload, {
                secret: process.env.JWT_REFRESH_SECRET || 'super_secret_refresh_key',
                expiresIn: '7d',
            }),
        ]);
        await this.usersService.updateRefreshToken(userId, refreshToken);
        return { access_token: accessToken, refresh_token: refreshToken };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map