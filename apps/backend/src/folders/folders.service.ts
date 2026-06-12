import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class FoldersService {
  constructor(private readonly supabase: SupabaseService) {}

  async create(userId: string, name: string, parentId?: string) {
    const { data, error } = await this.supabase.getClient()
      .from('folders')
      .insert({
        user_id: userId,
        name,
        parent_id: parentId || null
      })
      .select()
      .single();

    if (error) throw new InternalServerErrorException(error.message);
    return data;
  }

  async findAll(userId: string, parentId?: string) {
    let query = this.supabase.getClient()
      .from('folders')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (parentId) {
      query = query.eq('parent_id', parentId);
    } else {
      query = query.is('parent_id', null);
    }

    const { data, error } = await query;
    if (error) throw new InternalServerErrorException(error.message);
    return data;
  }

  async rename(userId: string, folderId: string, name: string) {
    const { data, error } = await this.supabase.getClient()
      .from('folders')
      .update({ name })
      .eq('id', folderId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new InternalServerErrorException(error.message);
    if (!data) throw new NotFoundException('Folder not found');
    return data;
  }

  async move(userId: string, folderId: string, newParentId: string | null) {
    const { data, error } = await this.supabase.getClient()
      .from('folders')
      .update({ parent_id: newParentId })
      .eq('id', folderId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new InternalServerErrorException(error.message);
    if (!data) throw new NotFoundException('Folder not found');
    return data;
  }

  async delete(userId: string, folderId: string) {
    const { error } = await this.supabase.getClient()
      .from('folders')
      .delete()
      .eq('id', folderId)
      .eq('user_id', userId);

    if (error) throw new InternalServerErrorException(error.message);
    return { success: true };
  }
}
