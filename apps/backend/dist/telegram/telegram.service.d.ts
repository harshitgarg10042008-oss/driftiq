import { SupabaseService } from '../supabase/supabase.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { UsersService } from '../users/users.service';
export declare class TelegramService {
    private readonly supabase;
    private readonly realtimeGateway;
    private readonly usersService;
    private readonly logger;
    constructor(supabase: SupabaseService, realtimeGateway: RealtimeGateway, usersService: UsersService);
    handleWebhook(update: any): Promise<{
        status: string;
        fileId?: undefined;
    } | {
        status: string;
        fileId: any;
    }>;
    private sendTelegramMessage;
}
