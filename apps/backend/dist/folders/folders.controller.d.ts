import { FoldersService } from './folders.service';
export declare class FoldersController {
    private readonly foldersService;
    constructor(foldersService: FoldersService);
    create(req: any, name: string, parentId?: string): Promise<any>;
    findAll(req: any, parentId?: string): Promise<any[]>;
    rename(req: any, folderId: string, name: string): Promise<any>;
    move(req: any, folderId: string, parentId: string | null): Promise<any>;
    delete(req: any, folderId: string): Promise<{
        success: boolean;
    }>;
}
