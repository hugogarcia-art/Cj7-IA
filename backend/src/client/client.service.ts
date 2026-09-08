import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateClientDto, UpdateClientDto } from './dto/client.dto';

/** Solo se guardan dígitos: así "+591 700-11223" y "59170011223" no se duplican. */
function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, '');
}

@Injectable()
export class ClientService {
  constructor(private readonly prisma: PrismaService) {}

  getClients(userId: string) {
    return this.prisma.client.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getClientById(userId: string, id: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, userId },
    });
    if (!client) throw new NotFoundException('Cliente no encontrado');
    return client;
  }

  getClientsForExport(userId: string, ids: string[]) {
    return this.prisma.client.findMany({
      // Sin ids seleccionados exportamos todo, pero siempre acotado al dueño.
      where: ids.length > 0 ? { userId, id: { in: ids } } : { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createClient(userId: string, data: CreateClientDto) {
    try {
      return await this.prisma.client.create({
        data: {
          name: data.name,
          phone: normalizePhone(data.phone),
          email: data.email,
          // Si no llega, Prisma aplica el valor por defecto del esquema.
          status: data.status,
          tags: data.tags ?? [],
          notes: data.notes,
          userId,
        },
      });
    } catch (error: unknown) {
      if (isUniqueConstraintError(error)) {
        throw new BadRequestException(
          'El número de teléfono ya está registrado.',
        );
      }
      throw error;
    }
  }

  async updateClient(userId: string, id: string, data: UpdateClientDto) {
    // updateMany en vez de update: filtra por userId, así nadie edita
    // un cliente ajeno adivinando su id.
    const result = await this.prisma.client
      .updateMany({
        where: { id, userId },
        data: {
          name: data.name,
          phone: data.phone ? normalizePhone(data.phone) : undefined,
          email: data.email,
          status: data.status,
          // Solo tocamos tags si vienen en la petición.
          tags: data.tags,
          notes: data.notes,
          lastContact: data.lastContact
            ? new Date(data.lastContact)
            : undefined,
        },
      })
      .catch((error: unknown) => {
        if (isUniqueConstraintError(error)) {
          throw new BadRequestException(
            'El número de teléfono ya está registrado.',
          );
        }
        throw error;
      });

    if (result.count === 0)
      throw new NotFoundException('Cliente no encontrado');
    return this.getClientById(userId, id);
  }

  async deleteClient(userId: string, id: string) {
    const result = await this.prisma.client.deleteMany({
      where: { id, userId },
    });
    if (result.count === 0)
      throw new NotFoundException('Cliente no encontrado');
    return { deleted: true, id };
  }

  /** Importación masiva: acepta líneas "nombre,telefono" o solo teléfonos. */
  async importClients(userId: string, rawText: string) {
    const lines = rawText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const results = { imported: 0, skipped: 0, errors: 0 };

    for (const line of lines) {
      // Ignora encabezados tipo "nombre,telefono"
      if (/nombre|name|telefono|phone/i.test(line) && !/\d{7,}/.test(line)) {
        continue;
      }

      const parts = line.split(/[,;\t]/).map((part) => part.trim());
      const name = parts[0] || '';
      const phone = normalizePhone(parts[1] || parts[0] || '');

      if (!phone || phone.length < 7) {
        results.errors++;
        continue;
      }

      try {
        await this.prisma.client.create({
          data: {
            name: name || `Contacto ${phone}`,
            phone,
            userId,
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

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2002'
  );
}
