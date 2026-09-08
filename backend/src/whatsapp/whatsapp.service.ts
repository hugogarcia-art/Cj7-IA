import { Injectable, Logger } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { optionalEnv } from '../common/env';

const GRAPH_VERSION = 'v20.0';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  get verifyToken(): string {
    return optionalEnv('WHATSAPP_VERIFY_TOKEN');
  }

  /**
   * Comprueba la firma X-Hub-Signature-256 de Meta contra el App Secret.
   *
   * Sin esto, cualquiera que conozca la URL del webhook puede inyectar
   * mensajes falsos, llenar el CRM y gastar tu crédito de OpenAI.
   */
  verifySignature(
    rawBody: Buffer | undefined,
    signatureHeader?: string,
  ): boolean {
    const appSecret = optionalEnv('META_APP_SECRET');
    if (!appSecret) {
      this.logger.warn(
        'META_APP_SECRET no está configurado: el webhook acepta cualquier petición.',
      );
      return true;
    }
    if (!rawBody || !signatureHeader?.startsWith('sha256=')) return false;

    const expected = createHmac('sha256', appSecret)
      .update(rawBody)
      .digest('hex');
    const received = signatureHeader.slice('sha256='.length);

    const expectedBuffer = Buffer.from(expected, 'hex');
    const receivedBuffer = Buffer.from(received, 'hex');
    if (expectedBuffer.length !== receivedBuffer.length) return false;
    return timingSafeEqual(expectedBuffer, receivedBuffer);
  }

  /**
   * Dueño de los datos que entran por WhatsApp.
   *
   * Antes se creaba al vuelo un usuario admin@cj7ia.com con una contraseña
   * conocida y publicada en el repositorio. Ahora se configura por env y,
   * si no está, se usa la cuenta más antigua.
   */
  private async resolveOwnerId(): Promise<string | null> {
    const ownerEmail = optionalEnv('WHATSAPP_OWNER_EMAIL');
    const owner = ownerEmail
      ? await this.prisma.user.findUnique({
          where: { email: ownerEmail },
          select: { id: true },
        })
      : await this.prisma.user.findFirst({
          orderBy: { createdAt: 'asc' },
          select: { id: true },
        });

    if (!owner) {
      this.logger.error(
        'No hay ninguna cuenta registrada a la que asignar los mensajes de WhatsApp.',
      );
      return null;
    }
    return owner.id;
  }

  async handleIncomingMessage(phone: string, text: string): Promise<void> {
    const ownerId = await this.resolveOwnerId();
    if (!ownerId) return;

    // Alta/actualización automática del contacto en el CRM.
    await this.prisma.client.upsert({
      where: { userId_phone: { userId: ownerId, phone } },
      update: { lastContact: new Date() },
      create: {
        name: `Cliente WhatsApp ${phone}`,
        phone,
        userId: ownerId,
      },
    });

    await this.prisma.message.create({
      data: { phone, sender: 'user', content: text },
    });

    const products = await this.prisma.product.findMany({
      where: { userId: ownerId, status: 'Activo' },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { name: true, price: true, stock: true },
    });

    const aiResponse = await this.aiService.generateWhatsAppResponse(
      text,
      'Cliente Potencial',
      AiService.formatInventory(products),
    );

    await this.prisma.message.create({
      data: { phone, sender: 'ai', content: aiResponse },
    });

    await this.sendMessage(phone, aiResponse);
  }

  private async sendMessage(phone: string, body: string): Promise<void> {
    const phoneNumberId = optionalEnv('PHONE_NUMBER_ID');
    const metaToken = optionalEnv('META_TOKEN');
    if (!phoneNumberId || !metaToken) {
      this.logger.warn(
        'PHONE_NUMBER_ID o META_TOKEN sin configurar: no se envía la respuesta.',
      );
      return;
    }

    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${metaToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phone,
          type: 'text',
          text: { body },
        }),
      },
    );

    if (!response.ok) {
      // Nunca logueamos el token ni el cuerpo completo de la respuesta.
      this.logger.error(
        `Meta rechazó el envío a ${phone}: HTTP ${response.status}`,
      );
    }
  }
}
