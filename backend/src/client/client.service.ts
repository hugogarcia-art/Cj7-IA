import { Injectable, OnModuleInit, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class ClientService implements OnModuleInit {
  private prisma = new PrismaClient();

  async onModuleInit() {
    await this.prisma.$connect();
  }

  async getClients() {
    return this.prisma.client.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
  async getClientById(id: string) {
    return this.prisma.client.findUnique({ where: { id } });
  }

  async getClientsForExport(ids: string[]) {
    if (ids.length === 0) {
      return this.prisma.client.findMany();
    }
    return this.prisma.client.findMany({
      where: { id: { in: ids } },
    });
  }

  async createClient(data: {
    name: string;
    phone: string;
    email?: string;
    tags?: string[];
    notes?: string;
  }) {
    let adminUser = await this.prisma.user.findFirst();
    if (!adminUser) {
      adminUser = await this.prisma.user.create({
        data: {
          username: 'admin',
          email: 'admin@cj7ia.com',
          password: 'password_seguro_123',
          clientCode: 1,
        },
      });
    }
    try {
      return await this.prisma.client.create({
        data: {
          name: data.name,
          phone: data.phone,
          email: data.email,
          tags: data.tags || [],
          notes: data.notes,
          userId: adminUser.id,
        },
      });
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        typeof (error as { code?: unknown }).code === 'string' &&
        (error as { code?: string }).code === 'P2002'
      ) {
        throw new BadRequestException(
          'El número de teléfono ya está registrado.',
        );
      }
      throw error;
    }
  }

  // NUEVA FUNCIÓN: Actualizar cliente
  async updateClient(
    id: string,
    data: {
      name?: string;
      phone?: string;
      email?: string;
      status?: string;
      tags?: string[];
      notes?: string;
      lastContact?: string;
    },
  ) {
    return this.prisma.client.update({
      where: { id },
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email,
        status: data.status,
        tags: data.tags || [],
        notes: data.notes,
        lastContact: data.lastContact ? new Date(data.lastContact) : undefined,
      },
    });
  }

  // NUEVA FUNCIÓN: Eliminar cliente
  async deleteClient(id: string) {
    return this.prisma.client.delete({
      where: { id },
    });
  }

  // IMPORTACIÓN MASIVA: Acepta texto con líneas "nombre,telefono" o solo telefonos
  async importClients(rawText: string) {
    let adminUser = await this.prisma.user.findFirst();
    if (!adminUser) {
      adminUser = await this.prisma.user.create({
        data: {
          username: 'admin',
          email: 'admin@cj7ia.com',
          password: 'password_seguro_123',
          clientCode: 0,
        },
      });
    }

    const lines = rawText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const results = { imported: 0, skipped: 0, errors: 0 };

    for (const line of lines) {
      // Ignora encabezados tipo "nombre,telefono"
      if (/nombre|name|telefono|phone/i.test(line) && !/\d{7,}/.test(line)) {
        continue;
      }

      const parts = line.split(/[,;\t]/).map((p) => p.trim());
      const name = parts[0] || '';
      const phone = (parts[1] || parts[0] || '').replace(/[^0-9]/g, '');

      if (!phone || phone.length < 7) {
        results.errors++;
        continue;
      }

      try {
        await this.prisma.client.create({
          data: {
            name: name || `Contacto ${phone}`,
            phone: phone,
            userId: adminUser.id,
          },
        });
        results.imported++;
      } catch {
        results.skipped++; // Duplicados (teléfono ya existe)
      }
    }

    return results;
  }
}
