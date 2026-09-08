import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { optionalEnv } from '../common/env';

/**
 * Módulo opcional (está comentado en AppModule). Si no hay REDIS_URL,
 * no se conecta y encolar es un no-op en vez de reventar el arranque.
 */
@Injectable()
export class QueueService implements OnModuleInit {
  private readonly logger = new Logger(QueueService.name);
  private whatsappQueue: Queue | null = null;

  onModuleInit() {
    const redisUrl = optionalEnv('REDIS_URL');
    if (!redisUrl) {
      this.logger.warn(
        'REDIS_URL sin configurar: la cola queda deshabilitada.',
      );
      return;
    }

    // La URL completa (con credenciales) viene de la variable de entorno; así
    // no armamos strings con el token a mano ni acaba en los logs.
    const connection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
    });

    connection.on('error', (err) => {
      this.logger.warn(`Redis no disponible: ${err.message}`);
    });

    this.whatsappQueue = new Queue('whatsapp-messages', { connection });
  }

  async addMassiveMessage(data: { phone: string; message: string }) {
    if (!this.whatsappQueue) {
      this.logger.warn('Cola deshabilitada: el mensaje no se encoló.');
      return;
    }
    await this.whatsappQueue.add('send', data);
  }
}
