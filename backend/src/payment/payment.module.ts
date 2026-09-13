import { Module } from '@nestjs/common';
import { PaymentVisionService } from './payment.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  providers: [PaymentVisionService],
  exports: [PaymentVisionService],
})
export class PaymentModule {}
