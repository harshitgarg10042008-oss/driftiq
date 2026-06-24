import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getHello() {
    return {
      status: 'ok',
      message: 'DriftIQ Backend is running successfully!',
      timestamp: new Date().toISOString(),
    };
  }
}
