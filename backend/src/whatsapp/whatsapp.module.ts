import { Module } from '@nestjs/common';
import { WhatsAppController } from './whatsapp.controller';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  controllers: [WhatsAppController],
})
export class WhatsAppModule {}
