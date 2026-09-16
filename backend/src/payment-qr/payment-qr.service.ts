import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService, type UploadedImage } from '../storage/storage.service';
import type { CreatePaymentQrDto, UpdatePaymentQrDto } from './dto/payment-qr.dto';

/** "379" → 379 | "" o undefined → null (QR libre de cualquier monto). */
function toAmount(value: string | undefined | null): number | null {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

@Injectable()
export class PaymentQrService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  getQrs(userId: string) {
    return this.prisma.paymentQR.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createQr(
    userId: string,
    data: CreatePaymentQrDto,
    file: UploadedImage | undefined,
  ) {
    if (!file) {
      throw new BadRequestException('La imagen del QR es obligatoria.');
    }
    await this.validateAccount(userId, data.accountId);

    // StorageService convierte a JPG y agrega la extensión .jpg
    const imageUrl = await this.storageService.uploadImage(
      file,
      `${userId}/qr-${Date.now()}`,
    );

    const count = await this.prisma.paymentQR.count({ where: { userId } });
    const isDefault = data.isDefault ?? count === 0;

    return this.prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.paymentQR.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }
      return tx.paymentQR.create({
        data: {
          label: data.label,
          amount: toAmount(data.amount),
          imageUrl,
          accountId: data.accountId || null,
          isDefault,
          userId,
        },
      });
    });
  }

  async updateQr(
    userId: string,
    id: string,
    data: UpdatePaymentQrDto,
    file: UploadedImage | undefined,
  ) {
    const existing = await this.prisma.paymentQR.findFirst({
      where: { id, userId },
    });
    if (!existing) throw new NotFoundException('QR no encontrado');
    await this.validateAccount(userId, data.accountId);

    let imageUrl: string | undefined = undefined;
    if (file) {
      imageUrl = await this.storageService.uploadImage(
        file,
        `${userId}/qr-${Date.now()}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.paymentQR.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }
      return tx.paymentQR.update({
        where: { id },
        data: {
          ...(data.label !== undefined ? { label: data.label } : {}),
          ...(data.amount !== undefined
            ? { amount: toAmount(data.amount) }
            : {}),
          ...(data.accountId !== undefined
            ? { accountId: data.accountId || null }
            : {}),
          ...(data.isDefault !== undefined
            ? { isDefault: data.isDefault }
            : {}),
          ...(imageUrl ? { imageUrl } : {}),
        },
      });
    });
  }

  async deleteQr(userId: string, id: string) {
    const result = await this.prisma.paymentQR.deleteMany({
      where: { id, userId },
    });
    if (result.count === 0) throw new NotFoundException('QR no encontrado');
    return { deleted: true, id };
  }

  /** Nadie puede vincular un QR a una cuenta ajena. */
  private async validateAccount(userId: string, accountId?: string) {
    if (!accountId) return;
    const account = await this.prisma.bankAccount.findFirst({
      where: { id: accountId, userId },
      select: { id: true },
    });
    if (!account) {
      throw new BadRequestException(
        'La cuenta vinculada no existe o no te pertenece.',
      );
    }
  }
}
