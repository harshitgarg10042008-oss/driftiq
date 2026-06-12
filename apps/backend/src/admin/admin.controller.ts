import { Controller, Get, Delete, Put, Param, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  async getDashboard() {
    return this.adminService.getDashboardStats();
  }

  @Get('users')
  async getUsers(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('search') search = '',
  ) {
    return this.adminService.getUsers(Number(page), Number(limit), search);
  }

  @Put('users/:id/disable')
  async disableUser(@Param('id') id: string) {
    return this.adminService.disableUser(id);
  }

  @Put('users/:id/enable')
  async enableUser(@Param('id') id: string) {
    return this.adminService.enableUser(id);
  }

  @Put('users/:id/promote')
  async promoteUser(@Param('id') id: string) {
    return this.adminService.promoteUser(id);
  }

  @Put('users/:id/demote')
  async demoteUser(@Param('id') id: string) {
    return this.adminService.demoteUser(id);
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  @Get('files')
  async getFiles(
    @Query('page') page = '1',
    @Query('limit') limit = '50',
  ) {
    return this.adminService.getAdminFiles(Number(page), Number(limit));
  }
}
