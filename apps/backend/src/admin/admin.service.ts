import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly usersService: UsersService,
  ) {}

  async getDashboardStats() {
    const [usersData, filesData, sharesData, storageData] = await Promise.all([
      this.supabase.getClient().from('users').select('id', { count: 'exact', head: true }),
      this.supabase.getClient().from('files').select('id', { count: 'exact', head: true }),
      this.supabase.getClient().from('shares').select('id', { count: 'exact', head: true }).eq('is_active', true),
      this.supabase.getClient().rpc('get_total_storage_used'),
    ]);

    const totalStorageUsed = Number(storageData.data) || 0;

    return {
      totalUsers: usersData.count || 0,
      totalFiles: filesData.count || 0,
      activeShares: sharesData.count || 0,
      storageUsedBytes: totalStorageUsed,
      storageUsedFormatted: this.formatBytes(totalStorageUsed),
    };
  }

  async getUsers(page: number, limit: number, search: string) {
    return this.usersService.findAll(page, limit, search);
  }

  async disableUser(id: string) {
    return this.usersService.setActive(id, false);
  }

  async enableUser(id: string) {
    return this.usersService.setActive(id, true);
  }

  async promoteUser(id: string) {
    return this.usersService.setRole(id, 'admin');
  }

  async demoteUser(id: string) {
    return this.usersService.setRole(id, 'user');
  }

  async deleteUser(id: string) {
    return this.usersService.deleteUser(id);
  }

  async getAdminFiles(page = 1, limit = 50, search = '') {
    const from = (page - 1) * limit;
    
    let query = this.supabase
      .getClient()
      .from('files')
      .select('*, users!inner(email, username)', { count: 'exact' });

    if (search) {
      query = query.ilike('name', `%${search}%`);
      // Note: Supabase JS client doesn't support generic OR across tables easily without raw SQL or views, 
      // but we can search by file name here. For email/username search, a view is better. 
      // We will just do file name search for simplicity.
    }

    query = query.range(from, from + limit - 1).order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) throw new InternalServerErrorException(error.message);
    return { files: data, total: count };
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }
}
