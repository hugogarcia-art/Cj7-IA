import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';
import { CampaignService } from './campaign.service';
import { CampaignSenderService } from './campaign-sender.service';

@Controller('campaigns')
export class CampaignController {
  constructor(
    private readonly campaignService: CampaignService,
    private readonly campaignSender: CampaignSenderService,
  ) {}

  @Get()
  getCampaigns(@CurrentUser() user: AuthenticatedUser) {
    return this.campaignService.getCampaigns(user.id);
  }

  @Post()
  createCampaign(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: { name: string; message: string; audience?: string },
  ) {
    return this.campaignService.createCampaign(user.id, {
      name: body.name,
      message: body.message,
      audience: body.audience || 'todos',
    });
  }

  // ⭐ LA RUTA ESTRELLA: dispara el envío masivo en segundo plano
  @Post(':id/send')
  sendCampaign(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.campaignSender.sendCampaign(user.id, id);
  }

  @Delete(':id')
  deleteCampaign(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.campaignService.deleteCampaign(user.id, id);
  }
}
