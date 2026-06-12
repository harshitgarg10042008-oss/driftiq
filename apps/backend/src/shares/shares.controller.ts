import { Controller, Post, Get, Put, Delete, Body, Param, UseGuards, Request, Headers, Res, StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { SharesService } from './shares.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('shares')
export class SharesController {
  constructor(private readonly sharesService: SharesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async createShare(
    @Request() req,
    @Body('fileId') fileId: string,
    @Body('password') password?: string,
    @Body('expiresAt') expiresAt?: string,
    @Body('downloadLimit') downloadLimit?: number,
  ) {
    return this.sharesService.createShare(req.user.id, fileId, { password, expiresAt, downloadLimit });
  }

  @UseGuards(JwtAuthGuard)
  @Get('mine')
  async getMyShares(@Request() req) {
    return this.sharesService.getMyShares(req.user.id);
  }

  // Public access — no auth required
  @Post('public/:token')
  async accessShare(
    @Param('token') token: string,
    @Body('password') password?: string,
  ) {
    return this.sharesService.accessShare(token, password);
  }

  @Post('public/:token/download-url')
  async downloadShare(
    @Param('token') token: string,
    @Body('password') password?: string,
    @Headers('x-forwarded-for') ip?: string,
    @Headers('user-agent') userAgent?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const { stream, name, mimeType, size, shareId } = await this.sharesService.getShareStream(token, password);
    
    // Record the download analytics
    await this.sharesService.recordDownload(shareId, ip || 'unknown', userAgent || '');

    if (res) {
      res.set({
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${name}"`,
        'Content-Length': size.toString(),
      });
    }

    return new StreamableFile(stream);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async updateShare(@Request() req, @Param('id') shareId: string, @Body() updates: any) {
    return this.sharesService.updateShare(req.user.id, shareId, updates);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteShare(@Request() req, @Param('id') shareId: string) {
    return this.sharesService.deleteShare(req.user.id, shareId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/analytics')
  async getAnalytics(@Request() req, @Param('id') shareId: string) {
    return this.sharesService.getDownloadAnalytics(req.user.id, shareId);
  }
}
