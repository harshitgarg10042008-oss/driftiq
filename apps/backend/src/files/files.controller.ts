import {
  Controller, Get, Put, Post, Delete, Body, Param,
  UseGuards, Request, Query, UseInterceptors,
  UploadedFile, BadRequestException, StreamableFile, Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    }),
  )
  async upload(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
    @Body('folderId') folderId?: string,
  ) {
    console.log('--- UPLOAD REQUEST REACHED CONTROLLER ---');
    console.log('Folder ID:', folderId);
    console.log('File exists?', !!file);
    if (file) {
      console.log('File Name:', file.originalname);
      console.log('File Mime:', file.mimetype);
      console.log('File Size:', file.size);
      console.log('Buffer exists?', !!file.buffer);
    }
    if (!file) throw new BadRequestException('No file provided');

    return this.filesService.uploadToTelegram(
      req.user.id,
      file.buffer,
      file.originalname,
      file.mimetype,
      folderId,
    );
  }

  @Get()
  async findAll(@Request() req, @Query('folderId') folderId?: string) {
    return this.filesService.findAll(req.user.id, folderId);
  }

  @Get('starred')
  async getStarred(@Request() req) {
    return this.filesService.getStarred(req.user.id);
  }

  @Get('deleted')
  async getDeleted(@Request() req) {
    return this.filesService.getDeleted(req.user.id);
  }

  @Delete('trash/empty')
  async emptyTrash(@Request() req) {
    return this.filesService.emptyTrash(req.user.id);
  }

  @Get('search')
  async search(@Request() req, @Query('q') query: string) {
    return this.filesService.search(req.user.id, query || '');
  }

  @Get('stats')
  async getStats(@Request() req) {
    return this.filesService.getStorageStats(req.user.id);
  }

  @Get(':id/download')
  async getDownloadUrl(@Request() req, @Param('id') fileId: string) {
    return this.filesService.getDownloadUrl(req.user.id, fileId);
  }

  @Get(':id/stream')
  async streamFile(
    @Request() req,
    @Param('id') fileId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { stream, name, mimeType, size } = await this.filesService.getFileStream(
      req.user.id,
      fileId,
    );

    const safeName = (name || 'download').replace(/[^\w\s.\-]/g, '_');
    const encodedName = encodeURIComponent(name || 'download')
      .replace(/'/g, '%27')
      .replace(/\(/g, '%28')
      .replace(/\)/g, '%29');

    res.set({
      'Content-Type': mimeType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${safeName}"; filename*=UTF-8''${encodedName}`,
      'Content-Length': size?.toString() || '0',
      'Cache-Control': 'no-cache',
    });

    return new StreamableFile(stream);
  }

  @Put(':id/rename')
  async rename(
    @Request() req,
    @Param('id') fileId: string,
    @Body('name') name: string,
  ) {
    return this.filesService.rename(req.user.id, fileId, name);
  }

  @Post(':id/move')
  async move(
    @Request() req,
    @Param('id') fileId: string,
    @Body('folderId') folderId: string | null,
  ) {
    return this.filesService.move(req.user.id, fileId, folderId);
  }

  @Put(':id/star')
  async toggleStar(
    @Request() req,
    @Param('id') fileId: string,
    @Body('isStarred') isStarred: boolean,
  ) {
    return this.filesService.toggleStar(req.user.id, fileId, isStarred);
  }

  @Delete(':id')
  async delete(@Request() req, @Param('id') fileId: string) {
    return this.filesService.delete(req.user.id, fileId);
  }

  @Post(':id/restore')
  async restore(@Request() req, @Param('id') fileId: string) {
    return this.filesService.restore(req.user.id, fileId);
  }

  @Post(':id/share')
  async createShareLink(
    @Request() req,
    @Param('id') fileId: string,
    @Body('password') password?: string,
    @Body('expiresIn') expiresIn?: number,
  ) {
    return this.filesService.createShareLink(
      req.user.id,
      fileId,
      password,
      expiresIn,
    );
  }
}
