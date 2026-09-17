import { Body, Controller, Get, Put } from '@nestjs/common';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';
import { AgentConfigService } from './agent-config.service';
import { UpsertAgentConfigDto } from './dto/agent-config.dto';

@Controller('agent-config')
export class AgentConfigController {
  constructor(private readonly agentConfigService: AgentConfigService) {}

  @Get()
  getConfig(@CurrentUser() user: AuthenticatedUser) {
    return this.agentConfigService.getConfig(user.id);
  }

  @Put()
  upsertConfig(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpsertAgentConfigDto,
  ) {
    return this.agentConfigService.upsertConfig(user.id, body);
  }
}
