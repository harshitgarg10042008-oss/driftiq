import { SupabaseService } from '../supabase/supabase.service';
export declare class UsersService {
    private readonly supabase;
    constructor(supabase: SupabaseService);
    findByEmail(email: string): Promise<any>;
    findByUsername(username: string): Promise<{
        id: any;
    }>;
    findById(id: string): Promise<any>;
    findByTelegramUserId(telegramUserId: string): Promise<{
        id: any;
        email: any;
    }>;
    create(user: any): Promise<any>;
    updateRefreshToken(id: string, refreshToken: string | null): Promise<void>;
    updatePassword(id: string, hash: string): Promise<void>;
    updateLastLogin(id: string): Promise<void>;
    setResetToken(id: string, token: string): Promise<void>;
    clearResetToken(id: string): Promise<void>;
    linkTelegram(userId: string, telegramUserId: string): Promise<void>;
    generateTelegramLinkCode(userId: string): Promise<string>;
    linkTelegramByCode(code: string, telegramUserId: string): Promise<any>;
    findAll(page?: number, limit?: number, search?: string): Promise<{
        users: {
            id: any;
            email: any;
            username: any;
            full_name: any;
            role: any;
            is_active: any;
            storage_used: any;
            storage_limit: any;
            created_at: any;
            last_login: any;
            telegram_status: any;
        }[];
        total: number;
    }>;
    setActive(id: string, isActive: boolean): Promise<{
        success: boolean;
    }>;
    setRole(id: string, role: 'user' | 'admin'): Promise<{
        success: boolean;
    }>;
    deleteUser(id: string): Promise<{
        success: boolean;
    }>;
    getStorageStats(): Promise<{
        totalUsed: any;
        totalLimit: any;
        userCount: number;
    }>;
}
