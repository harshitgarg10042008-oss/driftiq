import { SupabaseService } from '../supabase/supabase.service';
import { UsersService } from '../users/users.service';
export declare class AdminService {
    private readonly supabase;
    private readonly usersService;
    constructor(supabase: SupabaseService, usersService: UsersService);
    getDashboardStats(): Promise<{
        totalUsers: number;
        totalFiles: number;
        activeShares: number;
        storageUsedBytes: number;
        storageUsedFormatted: string;
    }>;
    getUsers(page: number, limit: number, search: string): Promise<{
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
    disableUser(id: string): Promise<{
        success: boolean;
    }>;
    enableUser(id: string): Promise<{
        success: boolean;
    }>;
    promoteUser(id: string): Promise<{
        success: boolean;
    }>;
    demoteUser(id: string): Promise<{
        success: boolean;
    }>;
    deleteUser(id: string): Promise<{
        success: boolean;
    }>;
    getAdminFiles(page?: number, limit?: number, search?: string): Promise<{
        files: any[];
        total: number;
    }>;
    private formatBytes;
}
