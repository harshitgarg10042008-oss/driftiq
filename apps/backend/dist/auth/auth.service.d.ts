import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
export declare class AuthService {
    private readonly usersService;
    private readonly jwtService;
    constructor(usersService: UsersService, jwtService: JwtService);
    register(dto: RegisterDto): Promise<{
        access_token: string;
        refresh_token: string;
    }>;
    login(dto: LoginDto): Promise<{
        access_token: string;
        refresh_token: string;
    }>;
    refresh(refreshToken: string): Promise<{
        access_token: string;
        refresh_token: string;
    }>;
    logout(userId: string): Promise<{
        message: string;
    }>;
    changePassword(userId: string, dto: ChangePasswordDto): Promise<{
        message: string;
    }>;
    resetPasswordRequest(email: string): Promise<{
        message: string;
    }>;
    resetPasswordConfirm(token: string, newPassword: string): Promise<{
        message: string;
    }>;
    getTelegramLinkCode(userId: string): Promise<{
        code: string;
    }>;
    getTelegramStatus(userId: string): Promise<{
        connected: boolean;
        status: string;
    }>;
    private generateTokens;
}
