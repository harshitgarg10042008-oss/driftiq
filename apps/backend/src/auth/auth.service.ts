import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import axios from 'axios';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const existingUser = await this.usersService.findByUsername(dto.username);
    if (existingUser) {
      throw new ConflictException('Username already taken');
    }

    const password_hash = await bcrypt.hash(dto.password, 10);

    // RULE: All new registrations MUST always become role = user. Never admin.
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

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.is_active) {
      throw new UnauthorizedException('Account is disabled. Contact support.');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last_login
    await this.usersService.updateLastLogin(user.id);

    return this.generateTokens(user.id, user.email, user.role);
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'super_secret_refresh_key',
      });

      const user = await this.usersService.findById(payload.sub);

      if (!user || user.refresh_token !== refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }
      if (!user.is_active) {
        throw new UnauthorizedException('Account is disabled');
      }

      // Token rotation: issue new pair
      return this.generateTokens(user.id, user.email, user.role);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(userId: string) {
    await this.usersService.updateRefreshToken(userId, null);
    return { message: 'Logged out successfully' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const isMatch = await bcrypt.compare(dto.currentPassword, user.password_hash);
    if (!isMatch) {
      throw new BadRequestException('Current password is incorrect');
    }

    const newHash = await bcrypt.hash(dto.newPassword, 10);
    await this.usersService.updatePassword(userId, newHash);
    // Invalidate all sessions after password change
    await this.usersService.updateRefreshToken(userId, null);

    return { message: 'Password changed successfully. Please log in again.' };
  }

  async resetPasswordRequest(email: string) {
    const user = await this.usersService.findByEmail(email);
    // Always return success to prevent email enumeration
    if (!user) return { message: 'If that email exists, a reset link has been sent.' };

    const resetToken = await this.jwtService.signAsync(
      { sub: user.id, type: 'password_reset' },
      {
        secret: process.env.JWT_SECRET || 'super_secret_jwt_key',
        expiresIn: '1h',
      },
    );

    await this.usersService.setResetToken(user.id, resetToken);

    // Send email with resetToken link using Resend
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      console.warn('RESEND_API_KEY not configured. Password reset email cannot be sent.');
      return { message: 'If that email exists, a reset link has been sent.' };
    }

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    try {
      await axios.post(
        'https://api.resend.com/emails',
        {
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
        },
        { headers: { Authorization: `Bearer ${resendKey}` } }
      );
    } catch (e: any) {
      console.error('Failed to send reset email:', e.response?.data || e.message);
    }

    return { message: 'If that email exists, a reset link has been sent.' };
  }

  async resetPasswordConfirm(token: string, newPassword: string) {
    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'super_secret_jwt_key',
      });

      if (payload.type !== 'password_reset') {
        throw new BadRequestException('Invalid reset token');
      }

      const user = await this.usersService.findById(payload.sub);
      if (!user || user.password_reset_token !== token) {
        throw new BadRequestException('Invalid or expired reset token');
      }

      const newHash = await bcrypt.hash(newPassword, 10);
      await this.usersService.updatePassword(user.id, newHash);
      await this.usersService.clearResetToken(user.id);
      await this.usersService.updateRefreshToken(user.id, null);

      return { message: 'Password reset successfully. Please log in.' };
    } catch {
      throw new BadRequestException('Invalid or expired reset token');
    }
  }

  private async generateTokens(userId: string, email: string, role: string) {
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
}
