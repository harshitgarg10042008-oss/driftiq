import { SupabaseService } from '../supabase/supabase.service';
export declare class FilesService {
    private readonly supabase;
    constructor(supabase: SupabaseService);
    uploadToTelegram(userId: string, fileBuffer: Buffer, fileName: string, mimeType: string, folderId?: string): Promise<any>;
    getDownloadUrl(userId: string, fileId: string): Promise<{
        url: string;
        name: any;
        mimeType: any;
    }>;
    getFileStream(userId: string, fileId: string): Promise<{
        stream: any;
        name: any;
        mimeType: any;
        size: any;
    }>;
    findAll(userId: string, folderId?: string): Promise<any[]>;
    findOne(userId: string, fileId: string): Promise<any>;
    rename(userId: string, fileId: string, newName: string): Promise<any>;
    move(userId: string, fileId: string, folderId: string | null): Promise<any>;
    toggleStar(userId: string, fileId: string, isStarred: boolean): Promise<any>;
    delete(userId: string, fileId: string): Promise<{
        success: boolean;
    }>;
    restore(userId: string, fileId: string): Promise<any>;
    getDeleted(userId: string): Promise<any[]>;
    getStarred(userId: string): Promise<any[]>;
    search(userId: string, query: string): Promise<any[]>;
    getStorageStats(userId: string): Promise<{
        storageUsed: any;
        storageLimit: any;
        fileCount: number;
    }>;
    private getUserStorageUsed;
}
