import { SupabaseService } from '../supabase/supabase.service';
export declare class SharesService {
    private readonly supabase;
    constructor(supabase: SupabaseService);
    createShare(userId: string, fileId: string, dto: {
        password?: string;
        expiresAt?: string;
        expiresIn?: number;
        downloadLimit?: number;
    }): Promise<any>;
    getMyShares(userId: string): Promise<any[]>;
    accessShare(token: string, password?: string): Promise<{
        file: any;
        shareId: any;
        hasPassword: boolean;
        expiresAt: any;
        downloadLimit: any;
        downloadCount: any;
    }>;
    getShareStream(token: string, password?: string): Promise<{
        stream: any;
        name: any;
        mimeType: any;
        size: any;
        shareId: any;
    }>;
    recordDownload(shareId: string, ip: string, userAgent: string): Promise<{
        success: boolean;
    }>;
    updateShare(userId: string, shareId: string, updates: any): Promise<any>;
    deleteShare(userId: string, shareId: string): Promise<{
        success: boolean;
    }>;
    getDownloadAnalytics(userId: string, shareId: string): Promise<any[]>;
}
