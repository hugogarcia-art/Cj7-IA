import { Module } from '@nestjs/common';
import { AutomationController } from './automation.controller';
import { AutomationService } from './automation.service';
import { RemarketingService } from './remarketing.service';
import { AiModule } from '../ai/ai.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [AiModule, ScheduleModule.forRoot()],
  controllers: [AutomationController],
  providers: [AutomationService, RemarketingService],
})
export class AutomationModule {}
