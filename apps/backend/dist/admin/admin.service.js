"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../supabase/supabase.service");
const users_service_1 = require("../users/users.service");
let AdminService = class AdminService {
    constructor(supabase, usersService) {
        this.supabase = supabase;
        this.usersService = usersService;
    }
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
    async getUsers(page, limit, search) {
        return this.usersService.findAll(page, limit, search);
    }
    async disableUser(id) {
        return this.usersService.setActive(id, false);
    }
    async enableUser(id) {
        return this.usersService.setActive(id, true);
    }
    async promoteUser(id) {
        return this.usersService.setRole(id, 'admin');
    }
    async demoteUser(id) {
        return this.usersService.setRole(id, 'user');
    }
    async deleteUser(id) {
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
        }
        query = query.range(from, from + limit - 1).order('created_at', { ascending: false });
        const { data, error, count } = await query;
        if (error)
            throw new common_1.InternalServerErrorException(error.message);
        return { files: data, total: count };
    }
    formatBytes(bytes) {
        if (bytes === 0)
            return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService,
        users_service_1.UsersService])
], AdminService);
//# sourceMappingURL=admin.service.js.map