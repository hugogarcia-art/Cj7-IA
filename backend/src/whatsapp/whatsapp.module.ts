import { TestimonialModule } from '../testimonial/testimonial.module';
import { Module } from '@nestjs/common';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppService } from './whatsapp.service';
import { AiModule } from '../ai/ai.module';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [AiModule, PaymentModule, TestimonialModule],
  controllers: [WhatsAppController],
  providers: [WhatsAppService],
})
export class WhatsAppModule {}
