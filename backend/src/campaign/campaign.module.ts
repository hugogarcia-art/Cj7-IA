import { Module } from '@nestjs/common';
import { CampaignController } from './campaign.controller';
import { CampaignService } from './campaign.service';
import { CampaignSenderService } from './campaign-sender.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  controllers: [CampaignController],
  providers: [CampaignService, CampaignSenderService],
})
export class CampaignModule {}
