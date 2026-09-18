import { Body, Controller, Get, Post, Put } from '@nestjs/common';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';
import { AgentConfigService } from './agent-config.service';
import {
  SetOpenAiKeyDto,
  SetPromptModeDto,
  UpsertAgentConfigDto,
} from './dto/agent-config.dto';

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

  // ── Suscripción ──
  @Get('subscription')
  getSubscription(@CurrentUser() user: AuthenticatedUser) {
    return this.agentConfigService.getSubscription(user.id);
  }

  // ── BYOK OpenAI ──
  @Post('openai-key')
  setOpenAiKey(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: SetOpenAiKeyDto,
  ) {
    return this.agentConfigService.setOpenAiKey(user.id, body.apiKey);
  }

  // ── Prompt: oficial o personalizado ──
  @Put('prompt-mode')
  setPromptMode(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: SetPromptModeDto,
  ) {
    return this.agentConfigService.upsertConfig(user.id, {
      category: 'custom',
      agentName: 'Alex', // se conserva el existente en upsert si ya hay config
      promptMode: body.promptMode,
      ...(body.customPrompt ? { customPrompt: body.customPrompt } : {}),
    } as UpsertAgentConfigDto);
  }
}
