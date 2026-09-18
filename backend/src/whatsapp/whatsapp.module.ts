import { TestimonialModule } from '../testimonial/testimonial.module';
import { Module } from '@nestjs/common';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppService } from './whatsapp.service';
import { AiModule } from '../ai/ai.module';
import { PaymentModule } from '../payment/payment.module';
import { WhatsAppCredentialsModule } from '../whatsapp-credentials/whatsapp-credentials.module';
import { AgentConfigModule } from '../agent-config/agent-config.module';

@Module({
  imports: [
    AiModule,
    PaymentModule,
    TestimonialModule,
    WhatsAppCredentialsModule,
    AgentConfigModule,
  ],
  controllers: [WhatsAppController],
  providers: [WhatsAppService],
})
export class WhatsAppModule {}
