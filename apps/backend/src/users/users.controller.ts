import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('telegram-link-code')
  async getTelegramLinkCode(@Request() req) {
    const code = await this.usersService.generateTelegramLinkCode(req.user.id);
    return { code };
  }
}
