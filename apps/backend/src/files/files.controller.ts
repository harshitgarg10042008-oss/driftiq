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
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  }))
  async upload(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
    @Body('folderId') folderId?: string,
  ) {
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
  async streamFile(@Request() req, @Param('id') fileId: string, @Res({ passthrough: true }) res: Response) {
    const { stream, name, mimeType, size } = await this.filesService.getFileStream(req.user.id, fileId);
    
    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${name}"`,
      'Content-Length': size.toString(),
    });

    return new StreamableFile(stream);
  }

  @Put(':id/rename')
  async rename(@Request() req, @Param('id') fileId: string, @Body('name') name: string) {
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
}
