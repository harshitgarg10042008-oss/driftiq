import { AdminService } from './admin.service';
export declare class AdminController {
    private readonly adminService;
    constructor(adminService: AdminService);
    getDashboard(): Promise<{
        totalUsers: number;
        totalFiles: number;
        activeShares: number;
        storageUsedBytes: number;
        storageUsedFormatted: string;
    }>;
    getUsers(page?: string, limit?: string, search?: string): Promise<{
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
    getFiles(page?: string, limit?: string): Promise<{
        files: any[];
        total: number;
    }>;
}
