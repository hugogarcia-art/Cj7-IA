import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class CampaignService implements OnModuleInit {
  private prisma = new PrismaClient();

  async onModuleInit() {
    await this.prisma.$connect();
  }

  // Listar campañas del usuario
  async getCampaigns(userId: string) {
    return this.prisma.campaign.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Crear campaña (borrador)
  async createCampaign(
    userId: string,
    data: { name: string; message: string; audience: string },
  ) {
    return this.prisma.campaign.create({
      data: {
        name: data.name,
        message: data.message,
        audience: data.audience || 'todos',
        userId,
      },
    });
  }

  // Obtener una campaña propia
  async getCampaignById(userId: string, id: string) {
    return this.prisma.campaign.findFirst({
      where: { id, userId },
    });
  }

  // Eliminar campaña
  async deleteCampaign(userId: string, id: string) {
    return this.prisma.campaign.deleteMany({
      where: { id, userId },
    });
  }

  /**
   * Filtra la audiencia según el criterio de la campaña.
   * audience = "todos" | "VIP" | "Nuevo" | "etiqueta:Mayorista" ...
   */
  async getAudience(userId: string, audience: string) {
    const where: any = { userId };

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
  }

  // Marca la campaña como enviada
  async markCompleted(campaignId: string) {
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'completada' },
    });
  }

  async markSending(campaignId: string) {
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'enviando' },
    });
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
}
