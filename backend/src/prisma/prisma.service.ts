import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Cliente Prisma compartido por toda la app.
 *
 * Antes cada servicio hacía `new PrismaClient()`, lo que abría un pool de
 * conexiones por servicio y agotaba el límite de Postgres en planes free.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Base de datos conectada');
    } catch {
      this.logger.error(
        'Base de datos no disponible al arrancar; se conectará cuando se use.',
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
