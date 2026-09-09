import { Body, Controller, Get, Put } from '@nestjs/common';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';
import { AutomationService } from './automation.service';

@Controller('automation')
export class AutomationController {
  constructor(private readonly automationService: AutomationService) {}

  // Ver el estado actual
  @Get('remarketing')
  getStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.automationService.getStatus(user.id);
  }

  // Encender/apagar
  @Put('remarketing')
  setEnabled(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { enabled: boolean; daysThreshold?: number },
  ) {
    return this.automationService.setEnabled(
      user.id,
      body.enabled,
      body.daysThreshold,
    );
  }
}
