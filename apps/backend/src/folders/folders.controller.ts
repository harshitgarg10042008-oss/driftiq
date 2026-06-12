import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { FoldersService } from './folders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('folders')
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  @Post()
  async create(@Request() req, @Body('name') name: string, @Body('parentId') parentId?: string) {
    return this.foldersService.create(req.user.id, name, parentId);
  }

  @Get()
  async findAll(@Request() req, @Query('parentId') parentId?: string) {
    return this.foldersService.findAll(req.user.id, parentId);
  }

  @Put(':id/rename')
  async rename(@Request() req, @Param('id') folderId: string, @Body('name') name: string) {
    return this.foldersService.rename(req.user.id, folderId, name);
  }

  @Post(':id/move')
  async move(@Request() req, @Param('id') folderId: string, @Body('parentId') parentId: string | null) {
    return this.foldersService.move(req.user.id, folderId, parentId);
  }

  @Delete(':id')
  async delete(@Request() req, @Param('id') folderId: string) {
    return this.foldersService.delete(req.user.id, folderId);
  }
}
