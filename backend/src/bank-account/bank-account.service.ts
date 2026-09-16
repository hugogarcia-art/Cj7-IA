import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CreateBankAccountDto,
  UpdateBankAccountDto,
} from './dto/bank-account.dto';

@Injectable()
export class BankAccountService {
  constructor(private readonly prisma: PrismaService) {}

  getAccounts(userId: string) {
    return this.prisma.bankAccount.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createAccount(userId: string, data: CreateBankAccountDto) {
    // La primera cuenta del usuario queda como default automáticamente
    const count = await this.prisma.bankAccount.count({ where: { userId } });
    const isDefault = data.isDefault ?? count === 0;

    return this.prisma.$transaction(async (tx) => {
      // Solo una cuenta puede ser la default
      if (isDefault) {
        await tx.bankAccount.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }
      return tx.bankAccount.create({
        data: { ...data, isDefault, userId },
      });
    });
  }

  async updateAccount(userId: string, id: string, data: UpdateBankAccountDto) {
    const existing = await this.prisma.bankAccount.findFirst({
      where: { id, userId },
    });
    if (!existing) throw new NotFoundException('Cuenta no encontrada');

    return this.prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.bankAccount.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }
      return tx.bankAccount.update({ where: { id }, data });
    });
  }

  async deleteAccount(userId: string, id: string) {
    const result = await this.prisma.bankAccount.deleteMany({
      where: { id, userId },
    });
    if (result.count === 0) throw new NotFoundException('Cuenta no encontrada');
    return { deleted: true, id };
  }
}
