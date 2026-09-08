import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './auth/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  getHello() {
    return this.appService.getStatus();
  }

  /** Health check para Render (y para saber si el servicio despertó). */
  @Public()
  @Get('health')
  getHealth() {
    return this.appService.getStatus();
  }
}
