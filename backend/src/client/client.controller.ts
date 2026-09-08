import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Res,
  Query,
} from '@nestjs/common';
import type { Response } from 'express';
import { ClientService } from './client.service';

export interface CreateClientDto {
  name: string;
  phone: string;
  email?: string;
  tags?: string[];
}

export interface UpdateClientDto {
  name?: string;
  phone?: string;
  email?: string;
  status?: string;
  tags?: string[];
}

@Controller('clients')
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  @Get()
  async getClients() {
    return this.clientService.getClients();
  }
  // EXPORTAR: vCard múltiple (para guardar en el celular)
  @Get('export/vcard')
  async exportVCard(
    @Query('ids') ids: string,
    @Res() res: Response,
  ): Promise<any> {
    const idArray = ids ? ids.split(',').filter(Boolean) : [];
    const clients = await this.clientService.getClientsForExport(idArray);

    if (clients.length === 0) {
      return res.status(404).send('No hay clientes para exportar');
    }

    const vcard = clients
      .map((c) =>
        [
          'BEGIN:VCARD',
          'VERSION:3.0',
          `FN:${c.name}`,
          `TEL;TYPE=CELL:+${c.phone}`,
          c.email ? `EMAIL:${c.email}` : '',
          c.notes ? `NOTE:${c.notes}` : '',
          'END:VCARD',
        ]
          .filter(Boolean)
          .join('\r\n'),
      )
      .join('\r\n');

    const date = new Date().toISOString().split('T')[0];
    res.set({
      'Content-Type': 'text/vcard; charset=utf-8',
      'Content-Disposition': `attachment; filename="contactos-cj7-${date}.vcf"`,
    });
    return res.send(vcard);
  }

  // EXPORTAR: CSV (para Excel / respaldo)
  @Get('export/csv')
  async exportCsv(
    @Query('ids') ids: string,
    @Res() res: Response,
  ): Promise<any> {
    const idArray = ids ? ids.split(',').filter(Boolean) : [];
    const clients = await this.clientService.getClientsForExport(idArray);

    const header = 'Nombre,Telefono,Correo,Estado,Registro\n';
    const rows = clients
      .map(
        (c) =>
          `"${c.name}","${c.phone}","${c.email || ''}","${c.status || ''}","${new Date(c.createdAt).toLocaleDateString()}"`,
      )
      .join('\n');

    const date = new Date().toISOString().split('T')[0];
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="contactos-cj7-${date}.csv"`,
    });
    return res.send(header + rows);
  }

  @Get(':id/vcard')
  async getVCard(@Param('id') id: string, @Res() res: Response): Promise<any> {
    const client = await this.clientService.getClientById(id);
    if (!client) {
      return res.status(404).send('Cliente no encontrado');
    }

    const vcard = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${client.name}`,
      `TEL;TYPE=CELL:+${client.phone}`,
      client.email ? `EMAIL:${client.email}` : '',
      client.notes ? `NOTE:${client.notes}` : '',
      'END:VCARD',
    ]
      .filter(Boolean)
      .join('\r\n');

    res.set({
      'Content-Type': 'text/vcard; charset=utf-8',
      'Content-Disposition': `attachment; filename="${client.name.replace(/ /g, '_')}.vcf"`,
    });
    return res.send(vcard);
  }
  @Post()
  async createClient(@Body() body: CreateClientDto) {
    return this.clientService.createClient(body);
  }

  @Post('import')
  async importClients(@Body() body: { rawText: string }) {
    return this.clientService.importClients(body.rawText);
  }

  // NUEVA RUTA: Editar
  @Put(':id')
  async updateClient(@Param('id') id: string, @Body() body: UpdateClientDto) {
    return this.clientService.updateClient(id, body);
  }

  // NUEVA RUTA: Eliminar
  @Delete(':id')
  async deleteClient(@Param('id') id: string) {
    return this.clientService.deleteClient(id);
  }
}
