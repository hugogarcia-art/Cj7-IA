import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';

type VisionResult = {
  isPaymentProof: boolean;
  amount: number | null;
  method: string | null;
  rawAnalysis: string;
  /** Estado con el que se registró la venta. null si no se creó venta. */
  saleStatus?: 'Pagado' | 'Pendiente' | null;
  /** Precio esperado del producto en foco, si se conoció. */
  expectedAmount?: number | null;
  /** Cuánto falta para completar el pago (null si está completo). */
  missingAmount?: number | null;
  /** ID de la venta creada, si corresponde. */
  saleId?: string | null;
  recipient?: string | null;
};

@Injectable()
export class PaymentVisionService {
  private readonly logger = new Logger(PaymentVisionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  /**
   * Analiza la imagen del comprobante con GPT-4o Vision y, si es válido,
   * registra la venta y devuelve el análisis.
   */
  async processPaymentProof(
    ownerId: string,
    clientName: string,
    clientPhone: string,
    imageBuffer: Buffer,
    expectedAmount?: number | null,
    catalogPrices: number[] = [],
  ): Promise<VisionResult> {
    const base64Image = imageBuffer.toString('base64');

    // 1. GPT-4o Vision analiza el comprobante
    const analysis = await this.aiService.analyzePaymentProof(base64Image);

    const expected =
      typeof expectedAmount === 'number' && expectedAmount > 0
        ? expectedAmount
        : catalogPrices.length === 1 && catalogPrices[0] > 0
          ? catalogPrices[0]
          : null;

    // 2. El cliente SIEMPRE existe antes de crear la venta (antes se usaba
    // el id del User como clientId y rompía la clave foránea)
    const client = await this.prisma.client.findFirst({
      where: { userId: ownerId, phone: clientPhone },
    });
    const safeClient =
      client ??
      (await this.prisma.client.create({
        data: {
          userId: ownerId,
          phone: clientPhone,
          name: clientName?.trim() || 'Cliente WhatsApp',
        },
      }));

    if (!analysis.isPaymentProof) {
      this.logger.warn(
        `Imagen de ${clientName} (${clientPhone}) no reconocida como comprobante.`,
      );
      await this.notifyOwner({
        ownerId,
        clientName,
        clientPhone,
        analysis,
        saleId: null,
        status: null,
        expectedAmount: expected,
        missingAmount: null,
      });
      return { ...analysis, saleStatus: null, saleId: null };
    }

    // 3. Compara el monto recibido contra el precio esperado
    const received = analysis.amount;
    let status: 'Pagado' | 'Pendiente';
    let missingAmount: number | null = null;

    if (expected !== null && received !== null && received > 0) {
      if (received + 0.01 >= expected) {
        // Tolerancia de 1 centavo por redondeos de la moneda
        status = 'Pagado';
      } else {
        status = 'Pendiente';
        missingAmount = Math.round((expected - received) * 100) / 100;
      }
    } else if (
      received !== null &&
      received > 0 &&
      catalogPrices.includes(received)
    ) {
      // Sin producto en foco, pero el monto coincide EXACTO con un precio del catálogo
      status = 'Pagado';
    } else if (received !== null && received > 0) {
      // Monto legible pero no coincide con nada ni hay foco: revisión manual
      status = 'Pendiente';
      missingAmount = null;
    } else {
      // Monto ilegible: nunca marcar Pagado a ciegas
      status = 'Pendiente';
      missingAmount = expected;
    }

    // 4. Registra la venta en el Pipeline con el estado correcto
    const sale = await this.prisma.sale.create({
      data: {
        clientId: safeClient.id,
        total: received ?? 0,
        status,
        paymentMethod: analysis.method ?? 'QR',
        notes:
          status === 'Pagado'
            ? `Comprobante verificado por IA: ${analysis.rawAnalysis.slice(0, 200)}`
            : `PAGO INCOMPLETO O ILEGIBLE — recibido: ${received ?? '?'} / esperado: ${expected ?? '?'}. Análisis: ${analysis.rawAnalysis.slice(0, 200)}`,
      },
    });

    this.logger.log(
      `💳 Comprobante de ${clientName}: recibido ${received ?? '?'} / esperado ${expected ?? '?'} → venta ${status} (#${sale.id.slice(0, 8)})`,
    );

    // 5. Notifica al dueño SIEMPRE, en cualquier escenario
    await this.notifyOwner({
      ownerId,
      clientName,
      clientPhone,
      analysis,
      saleId: sale.id,
      status,
      expectedAmount: expected,
      missingAmount,
    });

    return {
      ...analysis,
      saleStatus: status,
      expectedAmount: expected,
      missingAmount,
      saleId: sale.id,
    };
  }

  // 🔔 Notifica al dueño. Cubre 3 escenarios:
  // venta pagada, pago parcial/ilegible e imagen no reconocida.
  private async notifyOwner(params: {
    ownerId: string;
    clientName: string;
    clientPhone: string;
    analysis: VisionResult;
    saleId: string | null;
    status: 'Pagado' | 'Pendiente' | null;
    expectedAmount: number | null;
    missingAmount: number | null;
    recipient?: string | null;
  }): Promise<void> {
    const phoneNumberId = process.env.PHONE_NUMBER_ID;
    const metaToken = process.env.META_TOKEN;
    if (!phoneNumberId || !metaToken) return;

    const ownerPhone = process.env.OWNER_NOTIFY_PHONE;
    if (!ownerPhone) {
      this.logger.warn(
        'OWNER_NOTIFY_PHONE sin configurar: no se notifica al dueño.',
      );
      return;
    }

    const { clientName, clientPhone, analysis, saleId, status } = params;
    const received = analysis.amount ?? '?';
    const method = analysis.method ?? 'N/D';

    let message: string;

    if (status === 'Pagado') {
      message =
        `💰 ¡VENTA CERRADA! 🔥\n\n` +
        `Cliente: ${clientName} (${clientPhone})\n` +
        `Monto: ${received} Bs ✅\n` +
        (params.expectedAmount
          ? `Precio esperado: ${params.expectedAmount} Bs\n`
          : `⚠️ No se pudo verificar contra un precio — revisa la venta\n`) +
        `Método: ${method}\n` +
        `Comprobante: ✅ Verificado por IA\n` +
        (saleId ? `Venta #${saleId.slice(0, 8)} en el Pipeline ✅` : '');
    } else if (status === 'Pendiente') {
      message =
        `⚠️ PAGO INCOMPLETO — requiere tu atención\n\n` +
        `Cliente: ${clientName} (${clientPhone})\n` +
        `Recibió: ${received} Bs\n` +
        (params.expectedAmount
          ? `Precio esperado: ${params.expectedAmount} Bs\nFALTAN: ${params.missingAmount} Bs\n`
          : `Monto no coincide con ningún producto del catálogo (o ilegible) — revisa manualmente\n`) +
        `Método: ${method}\n` +
        `Destino del dinero: ${analysis.recipient ?? 'N/D'}\n` +
        (saleId
          ? `Venta #${saleId.slice(0, 8)} quedó como PENDIENTE en el Pipeline.`
          : '');
    } else {
      message =
        `📩 Imagen recibida de ${clientName} (${clientPhone})\n` +
        `La IA NO la reconoció como comprobante de pago.\n` +
        `Análisis: ${analysis.rawAnalysis.slice(0, 150)}`;
    }

    try {
      await fetch(
        `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${metaToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: ownerPhone,
            type: 'text',
            text: { body: message },
          }),
        },
      );
    } catch {
      // La notificación no debe tumbar el flujo principal
    }
  }
}
