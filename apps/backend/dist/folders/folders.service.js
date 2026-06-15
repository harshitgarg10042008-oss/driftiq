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
exports.FoldersService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../supabase/supabase.service");
let FoldersService = class FoldersService {
    constructor(supabase) {
        this.supabase = supabase;
    }
    async create(userId, name, parentId) {
        const { data, error } = await this.supabase.getClient()
            .from('folders')
            .insert({
            user_id: userId,
            name,
            parent_id: parentId || null
        })
            .select()
            .single();
        if (error)
            throw new common_1.InternalServerErrorException(error.message);
        return data;
    }
    async findAll(userId, parentId) {
        let query = this.supabase.getClient()
            .from('folders')
            .select('*')
            .eq('user_id', userId)
            .order('name', { ascending: true });
        if (parentId) {
            query = query.eq('parent_id', parentId);
        }
        else {
            query = query.is('parent_id', null);
        }
        const { data, error } = await query;
        if (error)
            throw new common_1.InternalServerErrorException(error.message);
        return data;
    }
    async rename(userId, folderId, name) {
        const { data, error } = await this.supabase.getClient()
            .from('folders')
            .update({ name })
            .eq('id', folderId)
            .eq('user_id', userId)
            .select()
            .single();
        if (error)
            throw new common_1.InternalServerErrorException(error.message);
        if (!data)
            throw new common_1.NotFoundException('Folder not found');
        return data;
    }
    async move(userId, folderId, newParentId) {
        const { data, error } = await this.supabase.getClient()
            .from('folders')
            .update({ parent_id: newParentId })
            .eq('id', folderId)
            .eq('user_id', userId)
            .select()
            .single();
        if (error)
            throw new common_1.InternalServerErrorException(error.message);
        if (!data)
            throw new common_1.NotFoundException('Folder not found');
        return data;
    }
    async delete(userId, folderId) {
        const { error } = await this.supabase.getClient()
            .from('folders')
            .delete()
            .eq('id', folderId)
            .eq('user_id', userId);
        if (error)
            throw new common_1.InternalServerErrorException(error.message);
        return { success: true };
    }
};
exports.FoldersService = FoldersService;
exports.FoldersService = FoldersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], FoldersService);
//# sourceMappingURL=folders.service.js.map