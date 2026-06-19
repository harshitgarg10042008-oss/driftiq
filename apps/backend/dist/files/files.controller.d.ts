import { StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { FilesService } from './files.service';
export declare class FilesController {
    private readonly filesService;
    constructor(filesService: FilesService);
    upload(req: any, file: Express.Multer.File, folderId?: string): Promise<any>;
    findAll(req: any, folderId?: string): Promise<any[]>;
    getStarred(req: any): Promise<any[]>;
    getDeleted(req: any): Promise<any[]>;
    emptyTrash(req: any): Promise<{
        success: boolean;
        count: number;
    }>;
    search(req: any, query: string): Promise<any[]>;
    getStats(req: any): Promise<{
        storageUsed: any;
        storageLimit: any;
        fileCount: number;
    }>;
    getDownloadUrl(req: any, fileId: string): Promise<{
        url: string;
        name: any;
        mimeType: any;
    }>;
    streamFile(req: any, fileId: string, res: Response): Promise<StreamableFile>;
    rename(req: any, fileId: string, name: string): Promise<any>;
    move(req: any, fileId: string, folderId: string | null): Promise<any>;
    toggleStar(req: any, fileId: string, isStarred: boolean): Promise<any>;
    delete(req: any, fileId: string): Promise<{
        success: boolean;
    }>;
    restore(req: any, fileId: string): Promise<any>;
}
