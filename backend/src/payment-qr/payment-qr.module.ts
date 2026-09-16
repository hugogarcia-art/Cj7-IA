import { Module } from '@nestjs/common';
import { PaymentQrController } from './payment-qr.controller';
import { PaymentQrService } from './payment-qr.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [PaymentQrController],
  providers: [PaymentQrService],
  exports: [PaymentQrService],
})
export class PaymentQrModule {}
