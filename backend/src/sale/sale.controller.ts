import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';
import { SaleService } from './sale.service';

@Controller('sales')
export class SaleController {
  constructor(private readonly saleService: SaleService) {}

  // Datos para gráficos de Analítica
  @Get('analytics')
  getAnalytics(@CurrentUser() user: AuthenticatedUser) {
    return this.saleService.getAnalytics(user.id);
  }

  // 📊 Métricas reales (para el Dashboard)
  @Get('metrics')
  getMetrics(@CurrentUser() user: AuthenticatedUser) {
    return this.saleService.getMetrics(user.id);
  }

  @Get()
  getSales(@CurrentUser() user: AuthenticatedUser) {
    return this.saleService.getSales(user.id);
  }

  @Post()
  createSale(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      clientId: string;
      total: number;
      paymentMethod?: string;
      notes?: string;
      status?: string;
    },
  ) {
    return this.saleService.createSale(user.id, {
      clientId: body.clientId,
      total: body.total,
      paymentMethod: body.paymentMethod,
      notes: body.notes,
      status: body.status,
    });
  }

  // El Pipeline: mover venta entre estados
  @Put(':id/status')
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { status: string },
  ) {
    return this.saleService.updateStatus(user.id, id, body.status);
  }

  @Delete(':id')
  deleteSale(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.saleService.deleteSale(user.id, id);
  }
}
