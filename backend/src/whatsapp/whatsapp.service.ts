import { Injectable, Logger } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { optionalEnv } from '../common/env';
import { PaymentVisionService } from '../payment/payment.service';

const GRAPH_VERSION = 'v20.0';
const IMAGE_TAG_PATTERN = /\[IMG:([^\]]+)\]/i;
const IMAGE_TAG_GLOBAL_PATTERN = /\[IMG:[^\]]+\]/gi;

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly paymentVision: PaymentVisionService,
  ) {}

  get verifyToken(): string {
    return optionalEnv('WHATSAPP_VERIFY_TOKEN');
  }

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
    const client = await this.prisma.client.upsert({
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

    // 🧠 NUEVO: memoria — últimos 10 mensajes de esta conversación
    const recentMessages = await this.prisma.message.findMany({
      where: { phone },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    const history = recentMessages
      .reverse()
      .map((message) => ({ sender: message.sender, content: message.content }));

    // Catálogo con fotos disponibles
    const products = await this.prisma.product.findMany({
      where: { userId: ownerId, status: 'Activo' },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        name: true,
        price: true,
        stock: true,
        imageUrl: true,
        extraImages: true,
        description: true,
      },
    });
    const productDescriptions = products
      .filter((product) => product.description?.trim())
      .map((product) => `- ${product.name}: ${product.description}`)
      .join('\n');

    const aiResponse = await this.aiService.generateWhatsAppResponse(
      text,
      client.name,
      AiService.formatInventory(products),
      history, // <-- NUEVO: la memoria
      productDescriptions,
    );

    // 🖼️ NUEVO: si la IA pidió una foto de producto [IMG:nombre], la enviamos
    const imgMatch = aiResponse.match(IMAGE_TAG_PATTERN);
    if (imgMatch) {
      const requested = imgMatch[1].trim().toLowerCase();
      const product = products.find(
        (p) =>
          p.name.toLowerCase().includes(requested) ||
          requested.includes(p.name.toLowerCase().split(' ')[0]),
      );

      if (product?.imageUrl) {
        const caption = aiResponse.replace(IMAGE_TAG_GLOBAL_PATTERN, '').trim();

        await this.aiService.sendWhatsAppImage(
          phone,
          product.imageUrl,
          caption || `📸 ${product.name}`,
        );
        this.logger.log(`🖼️ Foto de "${product.name}" enviada a ${phone}`);

        const [extraImage] = product.extraImages;
        if (extraImage) {
          await this.aiService.sendWhatsAppImage(
            phone,
            extraImage,
            `✨ Otra vista de ${product.name}`,
          );
        }

        await this.prisma.message.create({
          data: {
            phone,
            sender: 'ai',
            content: `[Imagen: ${product.name}] ${caption || ''}`,
          },
        });
        return; // La imagen ya fue la respuesta: terminamos aquí
      }

      // Producto sin foto disponible: respondemos solo con texto
      const textOnly = aiResponse.replace(IMAGE_TAG_GLOBAL_PATTERN, '').trim();
      await this.sendMessage(phone, textOnly);
      await this.prisma.message.create({
        data: { phone, sender: 'ai', content: textOnly },
      });
      return;
    }

    // 🏷️ Procesar tags especiales ANTES de enviar al cliente
    let responseToSend = aiResponse;

    // [ASESOR]: derivar a asesor humano + notificar al dueño
    if (/\[ASESOR\]/i.test(responseToSend)) {
      responseToSend = responseToSend.replace(/\[ASESOR\]/gi, '').trim();
      const advisorMessage =
        responseToSend ||
        'Perfecto 😊 Un asesor humano de nuestro equipo se pondrá en contacto contigo en breve para ayudarte con tu pedido.';

      await this.sendMessage(phone, advisorMessage);
      await this.prisma.message.create({
        data: { phone, sender: 'ai', content: advisorMessage },
      });

      await this.notifyOwner(
        `🔔 ${client.name} (${phone}) solicita un ASESOR HUMANO.\nSu último mensaje: "${text}"\nContéstale pronto para no perder la venta. 🙋`,
      );
      return;
    }

    // 💰 [VENTA]: el cliente confirmó la compra
    if (/\[VENTA\]/i.test(responseToSend)) {
      responseToSend = responseToSend.replace(/\[VENTA\]/gi, '').trim();

      await this.sendMessage(phone, responseToSend);
      await this.prisma.message.create({
        data: { phone, sender: 'ai', content: responseToSend },
      });

      // Registra la venta en el Pipeline (monto por confirmar)
      const sale = await this.prisma.sale.create({
        data: {
          clientId: client.id,
          total: 0,
          status: 'Nuevo',
          paymentMethod: 'Por confirmar',
          notes: `Venta detectada por IA en conversación. Último mensaje: "${text}"`,
        },
      });
      void sale;

      await this.notifyOwner(
        `💰 ¡VENTA DETECTADA POR LA IA! 🔥\nCliente: ${client.name} (${phone})\nRegistrada en el Pipeline como "Nuevo".\nRevisa el monto y ajústalo si es necesario.`,
      );
      return;
    }
    // 📦 [DATOS]: el cliente envió su nombre completo y/o dirección de entrega
    const datosMatch = responseToSend.match(/\[DATOS:([^\]]+)\]/i);
    if (datosMatch) {
      const [fullName, address] = datosMatch[1]
        .split('|')
        .map((part) => part.trim());

      const updateData: { name?: string; notes?: string } = {};
      if (fullName && fullName !== 'N/D') updateData.name = fullName;
      if (address && address !== 'N/D') {
        updateData.notes = `📍 Dirección de entrega: ${address}`;
      }

      if (Object.keys(updateData).length > 0) {
        await this.prisma.client.update({
          where: { id: client.id },
          data: updateData,
        });
      }

      const ack =
        '¡Perfecto! 📦 Tus datos de entrega quedaron registrados. Te contactaré pronto para coordinar. 🚚✨';
      await this.sendMessage(phone, ack);
      await this.prisma.message.create({
        data: { phone, sender: 'ai', content: ack },
      });

      await this.notifyOwner(
        `📦 DATOS DE ENTREGA recibidos:\nCliente: ${client.name} (${phone})\nNombre: ${
          fullName || 'N/D'
        }\nDirección: ${address || 'N/D'}\n\nContacta al cliente para coordinar la entrega 🚚`,
      );
      return;
    }

    await this.sendMessage(phone, responseToSend);
    await this.prisma.message.create({
      data: { phone, sender: 'ai', content: responseToSend },
    });
  }

  // 🔔 Notifica al dueño por WhatsApp (requiere OWNER_NOTIFY_PHONE en .env)
  private async notifyOwner(message: string): Promise<void> {
    const ownerPhone = process.env.OWNER_NOTIFY_PHONE;
    if (!ownerPhone) return;
    await this.sendMessage(ownerPhone, message);
  }
  // Descarga la imagen que el cliente envió (por mediaId de Meta)
  private async downloadMedia(mediaId: string): Promise<Buffer | null> {
    const metaToken = optionalEnv('META_TOKEN');
    if (!metaToken) return null;

    try {
      // 1. Pide la URL temporal del archivo
      const urlRes = await fetch(
        `https://graph.facebook.com/${GRAPH_VERSION}/${mediaId}`,
        { headers: { Authorization: `Bearer ${metaToken}` } },
      );
      if (!urlRes.ok) return null;
      const urlData = (await urlRes.json()) as { url?: string };
      if (!urlData.url) return null;

      // 2. Descarga el archivo
      const fileRes = await fetch(urlData.url, {
        headers: { Authorization: `Bearer ${metaToken}` },
      });
      if (!fileRes.ok) return null;

      const arrayBuffer = await fileRes.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch {
      return null;
    }
  }

  // Detecta si el mensaje es una imagen (comprobante de pago)
  async handleIncomingImage(phone: string, imageId: string): Promise<void> {
    const ownerId = await this.resolveOwnerId();
    if (!ownerId) return;

    // Iguala el flujo del texto: guarda al cliente + el mensaje de imagen
    const client = await this.prisma.client.upsert({
      where: { userId_phone: { userId: ownerId, phone } },
      update: { lastContact: new Date() },
      create: {
        name: `Cliente WhatsApp ${phone}`,
        phone,
        userId: ownerId,
      },
    });

    await this.prisma.message.create({
      data: { phone, sender: 'user', content: '[El cliente envió una imagen]' },
    });

    // Descarga la imagen
    const buffer = await this.downloadMedia(imageId);
    if (!buffer) {
      await this.sendMessage(
        phone,
        'No pude descargar tu imagen 😅 ¿puedes reenviarla?',
      );
      return;
    }

    // Analiza con Vision AI y registra la venta si es válida.
    const analysis = await this.paymentVision.processPaymentProof(
      ownerId,
      client.name,
      phone,
      buffer,
    );

    if (analysis.isPaymentProof) {
      // ✅ Confirmación al CLIENTE (con memoria de la conversación)
      const recentMessages = await this.prisma.message.findMany({
        where: { phone },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
      const history = recentMessages.reverse().map((message) => ({
        sender: message.sender,
        content: message.content,
      }));

      const catalog = await this.prisma.product.findMany({
        where: { userId: ownerId, status: 'Activo' },
        take: 10,
        select: { name: true, price: true, stock: true },
      });

      const confirmation = await this.aiService.generatePaymentConfirmation(
        analysis.amount,
        AiService.formatInventory(catalog),
        client.name,
        history,
      );

      await this.sendMessage(phone, confirmation);
      await this.prisma.message.create({
        data: { phone, sender: 'ai', content: confirmation },
      });
      this.logger.log(
        `💳 Pago verificado de ${analysis.amount ?? '?'} Bs a ${phone} — confirmación enviada`,
      );
    } else {
      const msg =
        'Hmm, no pude verificar esa imagen como comprobante de pago 😅 ¿puedes enviar una foto más clara de tu recibo o transferencia?';
      await this.sendMessage(phone, msg);
      await this.prisma.message.create({
        data: { phone, sender: 'ai', content: msg },
      });
    }
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
