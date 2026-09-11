import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { AutomationService } from './automation.service';
import { AiService } from '../ai/ai.service';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class RemarketingService implements OnModuleInit {
  private readonly logger = new Logger(RemarketingService.name);
  private prisma = new PrismaClient();

  constructor(
    private readonly automationService: AutomationService,
    private readonly aiService: AiService,
  ) {}

  async onModuleInit() {
    await this.prisma.$connect();
    // Ejecuta una revisión al arrancar (tras 10 segundos para no chocar con el arranque)
    setTimeout(() => void this.runRemarketing(), 10_000);
  }

  // ⏰ EL DESPERTADOR: corre cada 24 horas (y al arrancar)
  @Interval(24 * 60 * 60 * 1000)
  async runRemarketing() {
    try {
      const sleepyClients = await this.automationService.getSleepyClients();

      if (sleepyClients.length === 0) {
        this.logger.log(
          '😴 Remarketing: no hay clientes dormidos que despertar.',
        );
        return;
      }

      this.logger.log(
        `🤖 Remarketing: ${sleepyClients.length} clientes para despertar`,
      );

      for (const item of sleepyClients) {
        await this.sendRemarketingToClient(item);
        // Pausa anti-baneo entre mensajes
        await new Promise((r) => setTimeout(r, 3000));
      }

      this.logger.log('✅ Remarketing: ronda completada');
    } catch (error) {
      this.logger.error('❌ Error en remarketing:', error);
    }
  }

  private async sendRemarketingToClient(item: {
    userId: string;
    ownerEmail: string;
    client: { id: string; name: string; phone: string };
    daysSince: number;
  }) {
    try {
      // 1. Lee el catálogo real del dueño
      const products = await this.prisma.product.findMany({
        where: { userId: item.userId, status: 'Activo' },
        orderBy: [
          { offerPrice: { sort: 'asc', nulls: 'first' } },
          { createdAt: 'desc' },
        ],
        take: 3,
      });

      const catalog = products
        .map((p) => `- ${p.name} (Precio: ${p.offerPrice ?? p.price} Bs)`)
        .join('\n');

      // 2. La IA genera un mensaje de seguimiento personalizado
      const message = await this.aiService.generateWhatsAppResponse(
        `Genera un mensaje corto de seguimiento (máximo 3 líneas, con 1 emoji) para volver a contactar a este cliente que lleva ${item.daysSince} días sin comprar. Salúdalo por su nombre, menciona 1 producto del catálogo con su precio y pregunta si le interesa.`,
        item.client.name,
        catalog,
      );

      // 3. Envía por WhatsApp
      const sent = await this.aiService.sendWhatsAppMessage(
        item.client.phone,
        message,
      );

      if (sent) {
        this.logger.log(`📤 Remarketing enviado a ${item.client.phone}`);

        // 4. Actualiza el lastContact
        await this.automationService.touchClient(item.client.id);

        // 5. Registra en el historial de mensajes
        await this.prisma.message.create({
          data: {
            phone: item.client.phone,
            sender: 'ai',
            content: message,
          },
        });
      } else {
        this.logger.warn(
          `⚠️ No se pudo enviar remarketing a ${item.client.phone} (fuera de ventana 24h)`,
        );
      }
    } catch (error) {
      this.logger.error(
        `❌ Error en remarketing para ${item.client.phone}:`,
        error,
      );
    }
  }
}
