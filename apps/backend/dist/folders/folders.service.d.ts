import { SupabaseService } from '../supabase/supabase.service';
export declare class FoldersService {
    private readonly supabase;
    constructor(supabase: SupabaseService);
    create(userId: string, name: string, parentId?: string): Promise<any>;
    findAll(userId: string, parentId?: string): Promise<any[]>;
    rename(userId: string, folderId: string, name: string): Promise<any>;
    move(userId: string, folderId: string, newParentId: string | null): Promise<any>;
    delete(userId: string, folderId: string): Promise<{
        success: boolean;
    }>;
}
