import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { UpsertStoreInfoDto } from './dto/store-info.dto';

@Injectable()
export class StoreInfoService {
  constructor(private readonly prisma: PrismaService) {}

  getStore(userId: string) {
    return this.prisma.storeInfo.findUnique({ where: { userId } });
  }

  async upsertStore(userId: string, data: UpsertStoreInfoDto) {
    const existing = await this.prisma.storeInfo.findUnique({
      where: { userId },
    });

    if (existing) {
      return this.prisma.storeInfo.update({ where: { userId }, data });
    }
    return this.prisma.storeInfo.create({ data: { ...data, userId } });
  }
}
