import { Module } from '@nestjs/common';
import { WhatsAppCredentialsController } from './whatsapp-credentials.controller';
import { WhatsAppCredentialsService } from './whatsapp-credentials.service';

@Module({
  controllers: [WhatsAppCredentialsController],
  providers: [WhatsAppCredentialsService],
  exports: [WhatsAppCredentialsService],
})
export class WhatsAppCredentialsModule {}
