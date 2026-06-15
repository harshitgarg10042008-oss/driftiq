import { OnModuleInit } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
export declare class SupabaseService implements OnModuleInit {
    private client;
    onModuleInit(): void;
    getClient(): SupabaseClient;
}
