import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CampaignService {
  constructor(private readonly prisma: PrismaService) {}

  // Listar campañas del usuario
  getCampaigns(userId: string) {
    //* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
    return this.prisma.campaign.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    //* eslint-enable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
  }

  // Crear campaña (borrador)
  createCampaign(
    userId: string,
    data: { name: string; message: string; audience: string },
  ) {
    //* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
    return this.prisma.campaign.create({
      data: {
        name: data.name,
        message: data.message,
        audience: data.audience || 'todos',
        userId,
      },
    });
    //* eslint-enable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
  }

  // Obtener una campaña propia
  getCampaignById(userId: string, id: string) {
    //* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
    return this.prisma.campaign.findFirst({
      where: { id, userId },
    });
    //* eslint-enable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
  }

  // Eliminar campaña
  deleteCampaign(userId: string, id: string) {
    //* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
    return this.prisma.campaign.deleteMany({
      where: { id, userId },
    });
    //* eslint-enable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
  }

  /**
   * Filtra la audiencia según el criterio de la campaña.
   * audience = "todos" | "VIP" | "Nuevo" | "etiqueta:Mayorista" ...
   */
  async getAudience(userId: string, audience: string) {
    const where: Prisma.ClientWhereInput = { userId };

    if (audience === 'todos') {
      // sin filtro adicional
    } else if (audience.startsWith('etiqueta:')) {
      const tag = audience.replace('etiqueta:', '');
      where.tags = { has: tag };
    } else {
      // Estado directo: Nuevo, VIP, En Proceso, Inactivo
      where.status = audience;
    }

    return this.prisma.client.findMany({ where });
  }

  /**
   * Personaliza el mensaje con las variables dinámicas.
   * {{nombre}}, {{producto}}, {{precio}}
   */
  personalize(
    template: string,
    client: { name: string },
    product?: { name: string; price: number },
  ) {
    const firstName = client.name.split(' ')[0] || client.name;
    return template
      .replace(/{{\s*nombre\s*}}/gi, firstName)
      .replace(/{{\s*producto\s*}}/gi, product?.name ?? 'nuestros productos')
      .replace(/{{\s*precio\s*}}/gi, product ? `${product.price} Bs` : '');
  }

  /**
   * Registra el resultado de cada envío en la campaña.
   */
  async recordResult(campaignId: string, sent: boolean) {
    //* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
    if (sent) {
      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: { totalSent: { increment: 1 } },
      });
    } else {
      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: { totalFailed: { increment: 1 } },
      });
    }
    //* eslint-enable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
  }

  // Marca la campaña como enviada
  async markCompleted(campaignId: string) {
    //* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'completada' },
    });
    //* eslint-enable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
  }

  async markSending(campaignId: string) {
    //* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'enviando' },
    });
    //* eslint-enable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
  }

  // Productos para las variables {{producto}} y {{precio}}
  async getProductsForCampaign(userId: string) {
    return this.prisma.product.findMany({
      where: { userId, status: 'Activo' },
      orderBy: [
        { offerPrice: { sort: 'asc', nulls: 'first' } },
        { createdAt: 'desc' },
      ],
      take: 1,
    });
  }
  // Campañas programadas cuya hora ya llegó
  getScheduledCampaignsDue() {
    return this.prisma.campaign.findMany({
      where: {
        status: 'programada',
        scheduledAt: { lte: new Date() },
      },
    });
  }

  // Re-programa una campaña recurrente para su siguiente ronda
  reschedule(campaignId: string, recurrenceDays: number) {
    const next = new Date();
    next.setDate(next.getDate() + recurrenceDays);
    return this.prisma.campaign.update({
      where: { id: campaignId },
      data: { scheduledAt: next, status: 'programada' },
    });
  }

  // Versión de createCampaign que acepta imagen/programación/recurrencia
  async createCampaignAdvanced(
    userId: string,
    data: {
      name: string;
      message: string;
      audience: string;
      imageUrl?: string;
      scheduledAt?: string | Date;
      recurrenceDays?: number;
    },
  ) {
    // Guardamos el scheduledAt SIEMPRE que llegue.
    // El cron decidirá después si ya es hora de enviar.
    const scheduledAtDate = data.scheduledAt
      ? new Date(data.scheduledAt)
      : null;
    const isScheduled =
      scheduledAtDate !== null && !isNaN(scheduledAtDate.getTime());

    return this.prisma.campaign.create({
      data: {
        name: data.name,
        message: data.message,
        audience: data.audience || 'todos',
        imageUrl: data.imageUrl,
        scheduledAt: scheduledAtDate,
        recurrenceDays: data.recurrenceDays || null,
        status: isScheduled ? 'programada' : 'borrador',
        userId,
      },
    });
  }
}
