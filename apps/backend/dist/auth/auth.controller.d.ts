import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ResetPasswordRequestDto, ResetPasswordConfirmDto } from './dto/reset-password.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(dto: RegisterDto): Promise<{
        access_token: string;
        refresh_token: string;
    }>;
    login(dto: LoginDto): Promise<{
        access_token: string;
        refresh_token: string;
    }>;
    refresh(dto: RefreshDto): Promise<{
        access_token: string;
        refresh_token: string;
    }>;
    logout(req: any): Promise<{
        message: string;
    }>;
    changePassword(req: any, dto: ChangePasswordDto): Promise<{
        message: string;
    }>;
    resetPasswordRequest(dto: ResetPasswordRequestDto): Promise<{
        message: string;
    }>;
    resetPasswordConfirm(dto: ResetPasswordConfirmDto): Promise<{
        message: string;
    }>;
    getProfile(req: any): Promise<any>;
    getTelegramLinkCode(req: any): Promise<{
        code: string;
    }>;
    getTelegramStatus(req: any): Promise<{
        connected: boolean;
        status: string;
    }>;
}
