import { StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { SharesService } from './shares.service';
export declare class SharesController {
    private readonly sharesService;
    constructor(sharesService: SharesService);
    createShare(req: any, fileId: string, password?: string, expiresAt?: string, expiresIn?: number, downloadLimit?: number): Promise<any>;
    getMyShares(req: any): Promise<any[]>;
    accessShare(token: string, password?: string): Promise<{
        file: any;
        shareId: any;
        hasPassword: boolean;
        expiresAt: any;
        downloadLimit: any;
        downloadCount: any;
    }>;
    downloadShare(token: string, password?: string, ip?: string, userAgent?: string, res?: Response): Promise<StreamableFile>;
    updateShare(req: any, shareId: string, updates: any): Promise<any>;
    deleteShare(req: any, shareId: string): Promise<{
        success: boolean;
    }>;
    getAnalytics(req: any, shareId: string): Promise<any[]>;
}
