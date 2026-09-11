import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ClientService } from './client.service';
import {
  CreateClientDto,
  ImportClientsDto,
  UpdateClientDto,
} from './dto/client.dto';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';
import { csvRow, safeFileName } from '../common/csv';

/** Escapa los caracteres con significado en vCard 3.0 (RFC 2426). */
function vcardValue(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function toVCard(client: {
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
}): string {
  return [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${vcardValue(client.name)}`,
    `TEL;TYPE=CELL:+${vcardValue(client.phone)}`,
    client.email ? `EMAIL:${vcardValue(client.email)}` : '',
    client.notes ? `NOTE:${vcardValue(client.notes)}` : '',
    'END:VCARD',
  ]
    .filter(Boolean)
    .join('\r\n');
}

function parseIds(ids: string | undefined): string[] {
  return ids
    ? ids
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
    : [];
}

@Controller('clients')
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  @Get()
  getClients(@CurrentUser() user: AuthenticatedUser) {
    return this.clientService.getClients(user.id);
  }

  // EXPORTAR: vCard múltiple (para guardar en el celular)
  @Get('export/vcard')
  async exportVCard(
    @CurrentUser() user: AuthenticatedUser,
    @Query('ids') ids: string,
    @Res() res: Response,
  ): Promise<void> {
    const clients = await this.clientService.getClientsForExport(
      user.id,
      parseIds(ids),
    );

    if (clients.length === 0) {
      res.status(404).send('No hay clientes para exportar');
      return;
    }

    const date = new Date().toISOString().split('T')[0];
    res.set({
      'Content-Type': 'text/vcard; charset=utf-8',
      'Content-Disposition': `attachment; filename="contactos-cj7-${date}.vcf"`,
    });
    res.send(clients.map(toVCard).join('\r\n'));
  }

  // EXPORTAR: CSV (para Excel / respaldo)
  @Get('export/csv')
  async exportCsv(
    @CurrentUser() user: AuthenticatedUser,
    @Query('ids') ids: string,
    @Res() res: Response,
  ): Promise<void> {
    const clients = await this.clientService.getClientsForExport(
      user.id,
      parseIds(ids),
    );

    const header = 'Nombre,Telefono,Correo,Estado,Registro\n';
    const rows = clients
      .map((client) =>
        csvRow([
          client.name,
          client.phone,
          client.email ?? '',
          client.status ?? '',
          new Date(client.createdAt).toLocaleDateString('es-BO'),
        ]),
      )
      .join('\n');

    const date = new Date().toISOString().split('T')[0];
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="contactos-cj7-${date}.csv"`,
    });
    // BOM para que Excel abra los acentos correctamente.
    res.send(`\uFEFF${header}${rows}`);
  }

  // Últimos mensajes de WhatsApp (para el Dashboard)
  @Get('messages/recent')
  getRecentMessages(@CurrentUser() user: AuthenticatedUser) {
    return this.clientService.getRecentMessages(user.id);
  }

  // Historial de conversaciones del cliente
  @Get(':id/messages')
  getClientMessages(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.clientService.getClientMessages(user.id, id);
  }

  // Historial de compras del cliente
  @Get(':id/sales')
  getClientSales(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.clientService.getClientSales(user.id, id);
  }

  // Obtener un cliente propio (para la ficha de detalle)
  @Get(':id')
  getClient(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.clientService.getClientById(user.id, id);
  }

  @Get(':id/vcard')
  async getVCard(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ): Promise<void> {
    const client = await this.clientService.getClientById(user.id, id);

    res.set({
      'Content-Type': 'text/vcard; charset=utf-8',
      'Content-Disposition': `attachment; filename="${safeFileName(client.name)}.vcf"`,
    });
    res.send(toVCard(client));
  }

  @Post()
  createClient(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateClientDto,
  ) {
    return this.clientService.createClient(user.id, body);
  }

  @Post('import')
  importClients(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: ImportClientsDto,
  ) {
    return this.clientService.importClients(user.id, body.rawText);
  }

  @Put(':id')
  updateClient(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateClientDto,
  ) {
    return this.clientService.updateClient(user.id, id, body);
  }

  @Delete(':id')
  deleteClient(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.clientService.deleteClient(user.id, id);
  }
}
