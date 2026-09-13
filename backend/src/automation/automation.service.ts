import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AutomationService {
  constructor(private readonly prisma: PrismaService) {}

  // Obtener el estado del remarketing del usuario
  async getStatus(userId: string) {
    // Busca o crea la automatización con valores por defecto
    let automation = await this.prisma.automation.findFirst({
      where: { userId, type: 'remarketing_3_dias' },
    });

    if (!automation) {
      automation = await this.prisma.automation.create({
        data: {
          userId,
          type: 'remarketing_3_dias',
          enabled: false,
          daysThreshold: 3,
        },
      });
    }

    return automation;
  }

  // Encender/apagar el remarketing
  async setEnabled(userId: string, enabled: boolean, daysThreshold?: number) {
    // Asegura que exista
    await this.getStatus(userId);

    return this.prisma.automation.updateMany({
      where: { userId, type: 'remarketing_3_dias' },
      data: {
        enabled,
        ...(daysThreshold ? { daysThreshold } : {}),
      },
    });
  }

  // Busca clientes "dormidos" (3+ días sin contacto) de TODOS los usuarios con remarketing activo
  async getSleepyClients() {
    // Usuarios con remarketing activado
    const automations = await this.prisma.automation.findMany({
      where: { type: 'remarketing_3_dias', enabled: true },
      include: { user: true },
    });

    if (automations.length === 0) return [];

    const results: Array<{
      userId: string;
      ownerId: string;
      ownerEmail: string;
      client: { id: string; name: string; phone: string };
      daysSince: number;
    }> = [];

    const now = Date.now();

    for (const automation of automations) {
      const thresholdMs = automation.daysThreshold * 24 * 60 * 60 * 1000;

      // Clientes de este usuario cuya última conversación sea vieja (o nunca hubo)
      const clients = await this.prisma.client.findMany({
        where: { userId: automation.userId },
      });

      for (const client of clients) {
        // Si nunca ha habido contacto (lastContact null) o ya superó el umbral
        const last = client.lastContact
          ? new Date(client.lastContact).getTime()
          : 0;
        const daysSince = Math.floor((now - last) / (24 * 60 * 60 * 1000));

        if (!client.lastContact || now - last >= thresholdMs) {
          results.push({
            userId: automation.userId,
            ownerId: automation.user.id,
            ownerEmail: automation.user.email,
            client: { id: client.id, name: client.name, phone: client.phone },
            daysSince,
          });
        }
      }
    }

    return results;
  }

  // Actualiza el lastContact del cliente (después de enviar el remarketing)
  async touchClient(clientId: string) {
    await this.prisma.client.update({
      where: { id: clientId },
      data: { lastContact: new Date() },
    });
  }
}
