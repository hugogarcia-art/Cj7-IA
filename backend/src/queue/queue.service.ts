import { Injectable, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

@Injectable()
export class QueueService implements OnModuleInit {
  private whatsappQueue: Queue;

  onModuleInit() {
    const connection = new IORedis(
      `rediss://default:${process.env.REDIS_TOKEN}@${process.env.REDIS_URL}:6379`,
      {
        maxRetriesPerRequest: null,
        tls: {},
        enableOfflineQueue: false,
      },
    );

    connection.on('error', (err) => {
      console.error(
        '⚠️ Redis no disponible (no bloquea WhatsApp):',
        err.message,
      );
    });

    this.whatsappQueue = new Queue('whatsapp-messages', { connection });
  }
  async addMassiveMessage(data: { phone: string; message: string }) {
    await this.whatsappQueue.add('send', data);
    console.log(`📨 Mensaje encolado para ${data.phone}`);
  }
}
