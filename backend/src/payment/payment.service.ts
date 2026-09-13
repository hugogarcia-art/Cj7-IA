import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';

type VisionResult = {
  isPaymentProof: boolean;
  amount: number | null;
  method: string | null;
  rawAnalysis: string;
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
  ): Promise<VisionResult> {
    const base64Image = imageBuffer.toString('base64');

    // 1. GPT-4o Vision analiza el comprobante
    const analysis = await this.aiService.analyzePaymentProof(base64Image);

    if (!analysis.isPaymentProof) {
      return analysis;
    }

    // 2. Busca el cliente para vincular la venta
    const client = await this.prisma.client.findFirst({
      where: { userId: ownerId, phone: clientPhone },
    });

    // 3. Registra la venta AUTOMÁTICAMENTE en el Pipeline
    const sale = await this.prisma.sale.create({
      data: {
        clientId: client?.id ?? ownerId, // fallback si no está en el CRM
        total: analysis.amount ?? 0,
        status: 'Pagado',
        paymentMethod: analysis.method ?? 'QR',
        notes: `Comprobante verificado por IA: ${analysis.rawAnalysis.slice(0, 200)}`,
      },
    });

    this.logger.log(
      `💰 VENTA REGISTRADA automáticamente: ${clientName} pagó ${analysis.amount ?? '?'} Bs (${analysis.method})`,
    );

    // 4. 🔔 Notifica AL DUEÑO por WhatsApp (tu número de la cuenta más antigua)
    await this.notifyOwner(ownerId, clientName, analysis, sale.id);

    return analysis;
  }

  // 🔔 Notifica al dueño que se cerró una venta
  private async notifyOwner(
    ownerId: string,
    clientName: string,
    analysis: VisionResult,
    saleId: string,
  ): Promise<void> {
    const phoneNumberId = process.env.PHONE_NUMBER_ID;
    const metaToken = process.env.META_TOKEN;
    if (!phoneNumberId || !metaToken) return;

    // El dueño es el usuario de la cuenta — busca su teléfono en el CRM
    // si su propio número está registrado como cliente; si no, usa
    // OWNER_NOTIFY_PHONE (opcional en .env)
    const ownerPhone = process.env.OWNER_NOTIFY_PHONE;
    if (!ownerPhone) {
      this.logger.warn(
        'OWNER_NOTIFY_PHONE sin configurar: no se notifica al dueño.',
      );
      return;
    }

    const message =
      `💰 ¡VENTA CERRADA! 🔥\n\n` +
      `Cliente: ${clientName}\n` +
      `Monto: ${analysis.amount ?? '?'} Bs\n` +
      `Método: ${analysis.method ?? 'N/D'}\n` +
      `Comprobante: ✅ Verificado por IA\n` +
      `Venta #${saleId.slice(0, 8)} registrada en el Pipeline ✅`;

    await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
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
    });
  }
}
