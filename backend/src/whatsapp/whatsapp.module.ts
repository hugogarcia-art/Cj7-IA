import { TestimonialModule } from '../testimonial/testimonial.module';
import { Module } from '@nestjs/common';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppService } from './whatsapp.service';
import { AiModule } from '../ai/ai.module';
import { PaymentModule } from '../payment/payment.module';
import { WhatsAppCredentialsModule } from '../whatsapp-credentials/whatsapp-credentials.module';

@Module({
  imports: [
    AiModule,
    PaymentModule,
    TestimonialModule,
    WhatsAppCredentialsModule,
  ],
  controllers: [WhatsAppController],
  providers: [WhatsAppService],
})
export class WhatsAppModule {}
