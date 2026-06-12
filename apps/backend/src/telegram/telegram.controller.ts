import { Controller, Post, Body, HttpCode, HttpStatus, Headers, UnauthorizedException, Logger } from '@nestjs/common';
import { TelegramService } from './telegram.service';

@Controller('telegram')
export class TelegramController {
  private readonly logger = new Logger(TelegramController.name);

  constructor(private readonly telegramService: TelegramService) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body() update: any,
    @Headers('x-telegram-bot-api-secret-token') secretToken: string,
  ) {
    if (secretToken !== process.env.TELEGRAM_WEBHOOK_SECRET) {
      this.logger.warn(`Suspicious webhook request blocked. Provided token: ${secretToken ? 'Yes' : 'No'}`);
      throw new UnauthorizedException('Invalid webhook secret');
    }
    
    // Telegram webhooks need 200 OK immediately or it will retry
    // We execute the logic. In a real highly-scaled system we might push to a queue.
    await this.telegramService.handleWebhook(update);
    return { status: 'ok' };
  }
}
