import { SupabaseService } from '../supabase/supabase.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
export declare class TelegramService {
    private readonly supabase;
    private readonly realtimeGateway;
    private readonly logger;
    constructor(supabase: SupabaseService, realtimeGateway: RealtimeGateway);
    handleWebhook(update: any): Promise<{
        status: string;
        fileId?: undefined;
    } | {
        status: string;
        fileId: any;
    }>;
    private sendTelegramMessage;
}
