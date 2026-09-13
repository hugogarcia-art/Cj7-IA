import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SaleService {
  constructor(private readonly prisma: PrismaService) {}

  // Crear venta (valida que el cliente sea del usuario)
  async createSale(
    userId: string,
    data: {
      clientId: string;
      total: number;
      paymentMethod?: string;
      notes?: string;
      status?: string;
    },
  ) {
    // Verifica que el cliente exista y pertenezca al usuario
    const client = await this.prisma.client.findFirst({
      where: { id: data.clientId, userId },
    });
    if (!client) {
      throw new Error('El cliente no existe o no te pertenece.');
    }

    return this.prisma.sale.create({
      data: {
        clientId: data.clientId,
        total: data.total,
        paymentMethod: data.paymentMethod,
        notes: data.notes,
        status: data.status || 'Nuevo',
      },
      include: { client: true },
    });
  }

  // Listar ventas del usuario (con el cliente incluido)
  async getSales(userId: string) {
    return this.prisma.sale.findMany({
      where: { client: { userId } },
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { id: true, name: true, phone: true } },
      },
    });
  }

  // Cambiar estado (el Pipeline: Nuevo → Pagado → Enviado → ...)
  async updateStatus(userId: string, id: string, status: string) {
    const VALID_STATUSES = [
      'Nuevo',
      'Pendiente',
      'En Proceso',
      'Pagado',
      'Enviado',
      'Completado',
      'Cancelado',
    ];

    if (!VALID_STATUSES.includes(status)) {
      throw new Error(`Estado no válido: ${status}`);
    }

    // updateMany con userId: nadie mueve ventas ajenas
    const result = await this.prisma.sale.updateMany({
      where: { id, client: { userId } },
      data: { status },
    });

    if (result.count === 0) {
      throw new Error('Venta no encontrada o no te pertenece.');
    }

    return this.prisma.sale.findFirst({
      where: { id },
      include: { client: { select: { id: true, name: true, phone: true } } },
    });
  }

  // Eliminar venta
  async deleteSale(userId: string, id: string) {
    return this.prisma.sale.deleteMany({
      where: { id, client: { userId } },
    });
  }

  // 📊 MÉTRICAS REALES (alimenta el Dashboard)
  async getMetrics(userId: string) {
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [salesToday, salesMonth, allSales, newClients] = await Promise.all([
      // Ventas de hoy
      this.prisma.sale.findMany({
        where: {
          client: { userId },
          createdAt: { gte: startOfDay },
          status: { not: 'Cancelado' },
        },
      }),
      // Ventas del mes
      this.prisma.sale.findMany({
        where: {
          client: { userId },
          createdAt: { gte: startOfMonth },
          status: { not: 'Cancelado' },
        },
      }),
      // Todas las ventas no canceladas
      this.prisma.sale.findMany({
        where: { client: { userId }, status: { not: 'Cancelado' } },
      }),
      // Clientes nuevos este mes
      this.prisma.client.count({
        where: { userId, createdAt: { gte: startOfMonth } },
      }),
    ]);

    const revenueToday = salesToday.reduce((sum, s) => sum + s.total, 0);
    const revenueMonth = salesMonth.reduce((sum, s) => sum + s.total, 0);
    const revenueTotal = allSales.reduce((sum, s) => sum + s.total, 0);
    const ticketAverage =
      allSales.length > 0 ? revenueTotal / allSales.length : 0;

    return {
      salesToday: salesToday.length,
      revenueToday,
      salesMonth: salesMonth.length,
      revenueMonth,
      revenueTotal,
      ticketAverage: Math.round(ticketAverage * 100) / 100,
      newClients,
      totalSales: allSales.length,
    };
  }
  // 📊 DATOS PARA GRÁFICOS — últimas 4 semanas
  async getAnalytics(userId: string) {
    const now = new Date();
    const start30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Ventas de los últimos 30 días (para la línea de tiempo)
    const sales30 = await this.prisma.sale.findMany({
      where: {
        client: { userId },
        createdAt: { gte: start30 },
        status: { not: 'Cancelado' },
      },
      select: {
        total: true,
        createdAt: true,
        paymentMethod: true,
        notes: true,
        status: true,
      },
    });

    // Agrupa por día
    const dailyMap = new Map<string, number>();
    for (let i = 0; i < 30; i++) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      dailyMap.set(d.toISOString().split('T')[0], 0);
    }
    for (const sale of sales30) {
      const key = new Date(sale.createdAt).toISOString().split('T')[0];
      dailyMap.set(key, (dailyMap.get(key) || 0) + sale.total);
    }

    const salesTimeline = Array.from(dailyMap.entries())
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Ingresos por método de pago
    const paymentMap = new Map<string, number>();
    for (const sale of sales30) {
      const method = sale.paymentMethod || 'Sin especificar';
      paymentMap.set(method, (paymentMap.get(method) || 0) + sale.total);
    }
    const byPaymentMethod = Array.from(paymentMap.entries()).map(
      ([method, total]) => ({ method, total }),
    );

    // Distribución del Pipeline por estado
    const allSales = await this.prisma.sale.findMany({
      where: { client: { userId } },
      select: {
        status: true,
        clientId: true,
        total: true,
        client: { select: { name: true } },
      },
    });
    const statusMap = new Map<string, number>();
    for (const sale of allSales) {
      statusMap.set(sale.status, (statusMap.get(sale.status) || 0) + 1);
    }
    const byStatus = Array.from(statusMap.entries()).map(([status, count]) => ({
      status,
      count,
    }));

    // Top clientes por total comprado
    const topClientsMap = new Map<string, { name: string; total: number }>();
    for (const sale of allSales) {
      const entry = topClientsMap.get(sale.clientId);
      if (entry) entry.total += sale.total;
      else
        topClientsMap.set(sale.clientId, {
          name: sale.client.name,
          total: sale.total,
        });
    }
    const topClients = Array.from(topClientsMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return {
      salesTimeline,
      byPaymentMethod,
      byStatus,
      topClients,
    };
  }
}
