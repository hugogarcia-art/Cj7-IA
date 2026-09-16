import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';
import { PaymentQrService } from './payment-qr.service';
import { CreatePaymentQrDto, UpdatePaymentQrDto } from './dto/payment-qr.dto';
import {
  MAX_IMAGE_BYTES,
  type UploadedImage,
} from '../storage/storage.service';

const qrImageUpload = FileInterceptor('image', {
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
});

@Controller('payment-qr')
export class PaymentQrController {
  constructor(private readonly paymentQrService: PaymentQrService) {}

  @Get()
  getQrs(@CurrentUser() user: AuthenticatedUser) {
    return this.paymentQrService.getQrs(user.id);
  }

  @Post()
  @UseInterceptors(qrImageUpload)
  createQr(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreatePaymentQrDto,
    @UploadedFile() image: UploadedImage | undefined,
  ) {
    return this.paymentQrService.createQr(user.id, body, image);
  }

  @Put(':id')
  @UseInterceptors(qrImageUpload)
  updateQr(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdatePaymentQrDto,
    @UploadedFile() image: UploadedImage | undefined,
  ) {
    return this.paymentQrService.updateQr(user.id, id, body, image);
  }

  @Delete(':id')
  deleteQr(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.paymentQrService.deleteQr(user.id, id);
  }
}
