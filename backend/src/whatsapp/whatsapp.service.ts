import { Injectable, Logger } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { optionalEnv } from '../common/env';
import { PaymentVisionService } from '../payment/payment.service';

const GRAPH_VERSION = 'v20.0';
const IMAGE_TAG_PATTERN = /\[IMG:([^\]]+)\]/i;
const IMAGE_TAG_GLOBAL_PATTERN = /\[IMG:[^\]]+\]/gi;
const VIDEO_TAG_PATTERN = /\[VIDEO:([^\]]+)\]/i;
const VIDEO_TAG_GLOBAL_PATTERN = /\[VIDEO:[^\]]+\]/gi;

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
      if (process.env.NODE_ENV === 'production') {
        this.logger.error(
          'META_APP_SECRET falta en producción: webhook RECHAZADO por seguridad.',
        );
        return false;
      }
      this.logger.warn(
        'META_APP_SECRET sin configurar (solo desarrollo): se acepta la petición.',
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

    // 🧠 PERFIL PERSISTENTE: lo que la IA ya sabe (no vuelve a pedirlo)
    const clientProfile = [
      `Nombre en CRM: ${client.name}`,
      client.tags?.length ? `Etiquetas: ${client.tags.join(', ')}` : '',
      client.status ? `Estado: ${client.status}` : '',
      client.notes ? `Notas previas: ${client.notes}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    await this.prisma.message.create({
      data: { phone, sender: 'user', content: text },
    });

    // 🧠 NUEVO: memoria — últimos 30 mensajes de esta conversación
    const recentMessages = await this.prisma.message.findMany({
      where: { phone },
      orderBy: { createdAt: 'desc' },
      take: 30,
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
        offerPrice: true,
        stock: true,
        imageUrl: true,
        videoUrl: true,
        extraImages: true,
        description: true,
      },
    });

    // ⭐ Testimonios activos (prueba social para la IA)
    const testimonials = await this.prisma.testimonial.findMany({
      where: { userId: ownerId, active: true },
      take: 5,
      select: {
        title: true,
        content: true,
        imageUrl: true,
        product: { select: { name: true } },
      },
    });

    const testimonialsForAi =
      testimonials.length > 0
        ? `⭐ TESTIMONIOS REALES DE CLIENTES (úsalos como prueba social cuando el cliente dude):\n${testimonials
            .map(
              (testimonial) =>
                `- "${testimonial.content}" — ${testimonial.title}${testimonial.product ? ` (${testimonial.product.name})` : ''}`,
            )
            .join('\n')}`
        : '';

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
      testimonialsForAi,
      clientProfile, // <-- NUEVO
    );

    // 🖼️🎥 MEDIA: la respuesta puede traer [IMG:...], [VIDEO:...] o ambos.
    // Orden: FOTO (con la descripción como caption) → VIDEO → texto si faltó material
    let imgMatch = aiResponse.match(IMAGE_TAG_PATTERN);
    let videoMatch = aiResponse.match(VIDEO_TAG_PATTERN);

    // 🎯 GARANTÍA: si la IA no puso tags pero el cliente mencionó un producto,
    // inyectamos foto+video de todas formas (no dependemos de GPT)
    if (!imgMatch && !videoMatch) {
      const mentioned = products.find((p) => {
        const first = p.name.toLowerCase().split(' ')[0];
        return first.length > 3 && text.toLowerCase().includes(first);
      });
      if (mentioned) {
        if (mentioned.imageUrl)
          imgMatch = [mentioned.name, mentioned.name] as RegExpMatchArray;
        if (mentioned.videoUrl)
          videoMatch = [mentioned.name, mentioned.name] as RegExpMatchArray;
      }
    }

    if (imgMatch || videoMatch) {
      const plainText = aiResponse
        .replace(IMAGE_TAG_GLOBAL_PATTERN, '')
        .replace(VIDEO_TAG_GLOBAL_PATTERN, '')
        .trim();

      const findProduct = (requested: string) =>
        products.find(
          (p) =>
            p.name.toLowerCase().includes(requested) ||
            requested.includes(p.name.toLowerCase().split(' ')[0]),
        );

      let sentSomething = false;

      if (imgMatch) {
        const product = findProduct(imgMatch[1].trim().toLowerCase());
        if (product?.imageUrl) {
          await this.aiService.sendWhatsAppImage(
            phone,
            product.imageUrl,
            plainText || `📸 ${product.name}`,
          );
          sentSomething = true;
          this.logger.log(`🖼️ Foto de "${product.name}" enviada a ${phone}`);

          const [extraImage] = product.extraImages;
          if (extraImage) {
            await this.aiService.sendWhatsAppImage(
              phone,
              extraImage,
              `✨ Otra vista de ${product.name}`,
            );
          }
        }
      }

      if (videoMatch) {
        const product = findProduct(videoMatch[1].trim().toLowerCase());
        if (product?.videoUrl) {
          await this.aiService.sendWhatsAppVideo(
            phone,
            product.videoUrl,
            `🎥 Mira este video de ${product.name}`,
          );
          sentSomething = true;
          this.logger.log(`🎥 Video de "${product.name}" enviada a ${phone}`);
        }
      }

      await this.prisma.message.create({
        data: { phone, sender: 'ai', content: `[Media] ${plainText}` },
      });

      if (sentSomething) return; // La descripción ya viajó como caption

      // Sin foto/video cargados: responde solo texto, sin tags visibles
      const textOnly =
        plainText ||
        'Claro que sí 😊 Ahora mismo no tengo ese material cargado, pero con gusto te cuento todo sobre el producto. ¿Qué quieres saber?';
      await this.sendMessage(phone, textOnly);
      await this.prisma.message.create({
        data: { phone, sender: 'ai', content: textOnly },
      });
      return;
    }

    // ⭐ Testimonios: hasta 3 evidencias (imagen o texto) — nunca filtra el tag
    const testimonialMatch = aiResponse.match(/\[TESTIMONIAL:([^\]]+)\]/i);
    if (testimonialMatch) {
      const requested = testimonialMatch[1].trim().toLowerCase();
      const words = requested.split(' ').filter((w) => w.length > 3);

      // Coincidencia suave por puntaje (título o producto)
      const scored = testimonials
        .map((item) => {
          const haystack = (
            item.title +
            ' ' +
            (item.product?.name ?? '')
          ).toLowerCase();
          const score =
            (haystack.includes(requested) ? 10 : 0) +
            words.filter((w) => haystack.includes(w)).length;
          return { item, score };
        })
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score);

      // Si nada coincide, usa los primeros activos: SIEMPRE hay respuesta
      const selected =
        scored.length > 0
          ? scored.slice(0, 3).map((entry) => entry.item)
          : testimonials.slice(0, 3);

      if (selected.length > 0) {
        for (const testimonial of selected) {
          const caption = `⭐ ${testimonial.title}: ${testimonial.content}${
            testimonial.product ? ` (${testimonial.product.name})` : ''
          }`;
          if (testimonial.imageUrl) {
            await this.aiService.sendWhatsAppImage(
              phone,
              testimonial.imageUrl,
              caption,
            );
          } else {
            await this.sendMessage(phone, caption);
          }
        }
        await this.prisma.message.create({
          data: {
            phone,
            sender: 'ai',
            content: `[Testimonios enviados: ${selected
              .map((t) => t.title)
              .join(' | ')}]`,
          },
        });
        return;
      }

      // Sin testimonios cargados: honesto, sin filtrar el tag
      const noTestimonials =
        'Me encantaría mostrarte testimonios 😊 Ahora mismo no tengo evidencias cargadas, pero con gusto te mando una foto del producto o respondo tus dudas. ¿Qué prefieres?';
      await this.sendMessage(phone, noTestimonials);
      await this.prisma.message.create({
        data: { phone, sender: 'ai', content: noTestimonials },
      });
      return;
    }

    // 🏷️ Procesar tags especiales ANTES de enviar al cliente
    let responseToSend = aiResponse;
    // 💳 [PAGO]: lee cuentas y QRs del USUARIO desde la BD (multitenant).
    // Fallback a PAYMENT_INFO/PAYMENT_QR_URL del .env si el usuario no cargó nada.
    if (/\[PAGO\]/i.test(responseToSend)) {
      responseToSend = responseToSend.replace(/\[PAGO\]/gi, '').trim();

      // 1. Carga las cuentas y QRs del dueño
      const [accounts, qrs] = await Promise.all([
        this.prisma.bankAccount.findMany({
          where: { userId: ownerId },
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
        }),
        this.prisma.paymentQR.findMany({
          where: { userId: ownerId },
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
        }),
      ]);

      // 2. ¿Hay QR de monto fijo que coincida con el producto en foco?
      const focus = this.detectFocusProduct(history, products);
      const exactQr =
        (focus &&
          qrs.find((qr) => qr.amount !== null && qr.amount === focus.price)) ||
        null;
      const chosenQr =
        exactQr ?? qrs.find((qr) => qr.isDefault) ?? qrs[0] ?? null;

      // 3. Envía el QR (imagen) si existe
      if (chosenQr) {
        const qrCaption = chosenQr.amount
          ? `📷 Escanea este QR para pagar ${chosenQr.amount} Bs (${chosenQr.label})`
          : '📷 Escanea este QR para pagar — cualquier monto';
        await this.aiService.sendWhatsAppImage(
          phone,
          chosenQr.imageUrl,
          qrCaption,
        );
      }

      // 4. Arma el texto con las cuentas del usuario (o fallback al .env)
      let paymentMessage: string;
      if (accounts.length > 0) {
        const accountsText = accounts
          .map((acc) => {
            const lines = [
              `🏦 ${acc.bankName}`,
              `   Titular: ${acc.fullName}`,
              `   Cuenta: ${acc.accountNumber}`,
            ];
            if (acc.cci) lines.push(`   CCI: ${acc.cci}`);
            if (acc.yapePhone) lines.push(`   Yape/Plin: ${acc.yapePhone}`);
            return lines.join('\n');
          })
          .join('\n\n');
        paymentMessage = `${responseToSend}\n\n💳 DATOS DE PAGO:\n${accountsText}\n\nCuéntame por cuál medio pagas y quedo atenta/o a tu comprobante 😊`;
      } else {
        // Fallback: usuarios antiguos con PAYMENT_INFO del .env
        const paymentInfo = process.env.PAYMENT_INFO?.trim();
        paymentMessage = paymentInfo
          ? `${responseToSend}\n\n💳 DATOS DE PAGO:\n${paymentInfo}\n\nCuéntame por cuál medio pagas y quedo atenta/o a tu comprobante 😊`
          : 'Con gusto 😊 Un asesor te enviará los datos de pago en unos minutos.';
      }

      // 5. Si no se envió QR (no hay ninguno), intenta el QR del .env como fallback
      if (!chosenQr) {
        const envQrUrl = process.env.PAYMENT_QR_URL?.trim();
        if (envQrUrl) {
          await this.aiService.sendWhatsAppImage(
            phone,
            envQrUrl,
            '📷 Este es nuestro QR — escanéalo para pagar',
          );
        }
      }

      await this.sendMessage(phone, paymentMessage);
      await this.prisma.message.create({
        data: { phone, sender: 'ai', content: paymentMessage },
      });
      return;
    }

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

    // 💰 [VENTA]: el cliente mostró interés → registra como lead (SIN notificar:
    // el dueño solo recibe alertas de comprobantes verificados y datos de entrega)
    if (/\[VENTA\]/i.test(responseToSend)) {
      responseToSend = responseToSend.replace(/\[VENTA\]/gi, '').trim();

      await this.sendMessage(phone, responseToSend);
      await this.prisma.message.create({
        data: { phone, sender: 'ai', content: responseToSend },
      });

      // Registra la venta en el Pipeline (monto por confirmar) — silencioso
      await this.prisma.sale.create({
        data: {
          clientId: client.id,
          total: 0,
          status: 'Nuevo',
          paymentMethod: 'Por confirmar',
          notes: `Interés detectado por IA. Último mensaje: "${text}"`,
        },
      });
      return;
    }
    // 📦 [DATOS]: nombre completo + dirección/ciudad + hora preferida de entrega
    const datosMatch = responseToSend.match(/\[DATOS:([^\]]+)\]/i);
    if (datosMatch) {
      const [fullName, address, deliveryTime] = datosMatch[1]
        .split('|')
        .map((part) => part.trim());

      const updateData: { name?: string; notes?: string } = {};
      if (fullName && fullName !== 'N/D') updateData.name = fullName;

      const noteParts: string[] = [];
      if (address && address !== 'N/D')
        noteParts.push(`📍 Dirección: ${address}`);
      if (deliveryTime && deliveryTime !== 'N/D')
        noteParts.push(`⏰ Entrega preferida: ${deliveryTime}`);
      if (noteParts.length > 0) {
        updateData.notes = noteParts.join(' | ');
      }

      if (Object.keys(updateData).length > 0) {
        await this.prisma.client.update({
          where: { id: client.id },
          data: updateData,
        });
      }

      const ack =
        '¡Perfecto! 📦 Tus datos de entrega quedaron registrados. Te contactaré para coordinar tu pedido a la hora que prefieras. 🚚✨';
      await this.sendMessage(phone, ack);
      await this.prisma.message.create({
        data: { phone, sender: 'ai', content: ack },
      });

      await this.notifyOwner(
        `📦 DATOS DE ENTREGA recibidos:\nCliente: ${client.name} (${phone})\nNombre: ${
          fullName || 'N/D'
        }\nDirección: ${address || 'N/D'}\nHora preferida: ${
          deliveryTime || 'N/D'
        }\n\nContacta al cliente para coordinar 🚚`,
      );
      return;
    }

    await this.sendMessage(phone, responseToSend);
    await this.prisma.message.create({
      data: { phone, sender: 'ai', content: responseToSend },
    });
  }
  // 🎯 Detecta el producto en foco: prioriza el ÚLTIMO mensaje del CLIENTE
  private detectFocusProduct(
    history: Array<{ sender: string; content: string }>,
    products: Array<{
      name: string;
      price: number;
      offerPrice?: number | null;
    }>,
  ): { name: string; price: number } | null {
    const effectivePrice = (p: {
      price: number;
      offerPrice?: number | null;
    }) => (p.offerPrice && p.offerPrice < p.price ? p.offerPrice : p.price);

    // 1. Del mensaje del CLIENTE más reciente hacia atrás: el primero que
    //    mencione un producto gana (es el que está comprando ahora).
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].sender !== 'user') continue;
      const content = history[i].content.toLowerCase();

      const full = products.find((p) => content.includes(p.name.toLowerCase()));
      if (full) return { name: full.name, price: effectivePrice(full) };

      // Palabra clave: la PRIMERA del nombre distingue productos de la misma
      // línea (Biokits Moringa vs Xol Moringa).
      const byKeyword = products.find((p) => {
        const first = p.name.toLowerCase().split(' ')[0];
        return first.length > 3 && content.includes(first);
      });
      if (byKeyword) {
        return {
          name: byKeyword.name,
          price: effectivePrice(byKeyword),
        };
      }
    }

    // 2. Respaldo: puntaje en todo el historial
    let best: { product: (typeof products)[0]; score: number } | null = null;
    for (const product of products) {
      const words = product.name
        .toLowerCase()
        .split(' ')
        .filter((word) => word.length > 3);
      let score = 0;
      for (const message of history) {
        const content = message.content.toLowerCase();
        for (const word of words) if (content.includes(word)) score++;
      }
      if (score > (best?.score ?? 0)) best = { product, score };
    }
    return best?.product
      ? { name: best.product.name, price: effectivePrice(best.product) }
      : null;
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

    // ── ANTES de analizar: carga memoria + catálogo y detecta el producto
    // en foco. Necesitamos su precio ANTES de registrar la venta.
    const recentMessages = await this.prisma.message.findMany({
      where: { phone },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    const history = recentMessages.reverse().map((message) => ({
      sender: message.sender,
      content: message.content,
    }));

    const catalog = await this.prisma.product.findMany({
      where: { userId: ownerId, status: 'Activo' },
      take: 30,
      select: {
        name: true,
        price: true,
        offerPrice: true,
        stock: true,
        videoUrl: true,
      },
    });

    // 🎯 Producto en foco: del que hablaban antes del pago
    const focusProduct = this.detectFocusProduct(history, catalog);

    // Analiza con Vision AI y registra la venta COMPARANDO contra el precio real
    const analysis = await this.paymentVision.processPaymentProof(
      ownerId,
      client.name,
      phone,
      buffer,
      focusProduct?.price ?? null,
      catalog.map((p) => p.offerPrice ?? p.price),
    );

    if (analysis.isPaymentProof) {
      // ✅ Confirmación al CLIENTE (la IA ya sabe si fue completo o parcial)
      const confirmation = await this.aiService.generatePaymentConfirmation(
        analysis.amount,
        AiService.formatInventory(catalog),
        client.name,
        history,
        focusProduct,
        analysis.saleStatus ?? null,
        analysis.missingAmount ?? null,
        analysis.wrongAccount
          ? (analysis.recipient ?? 'una cuenta diferente')
          : null,
      );

      await this.sendMessage(phone, confirmation);
      await this.prisma.message.create({
        data: { phone, sender: 'ai', content: confirmation },
      });
      this.logger.log(
        `💳 Pago de ${analysis.amount ?? '?'} Bs de ${phone} — comprobante verificado y confirmación enviada`,
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
  // 📍 Guarda la ubicación del cliente como dirección de entrega
  async handleIncomingLocation(
    phone: string,
    latitude: number,
    longitude: number,
  ): Promise<void> {
    const ownerId = await this.resolveOwnerId();
    if (!ownerId) return;

    const client = await this.prisma.client.upsert({
      where: { userId_phone: { userId: ownerId, phone } },
      update: { lastContact: new Date() },
      create: {
        name: `Cliente WhatsApp ${phone}`,
        phone,
        userId: ownerId,
      },
    });

    const mapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;

    await this.prisma.client.update({
      where: { id: client.id },
      data: {
        notes: `📍 Ubicación de entrega: ${mapsLink} (lat: ${latitude}, lng: ${longitude})`,
      },
    });

    await this.prisma.message.create({
      data: {
        phone,
        sender: 'user',
        content: `[Ubicación de entrega: ${mapsLink}]`,
      },
    });

    await this.sendMessage(
      phone,
      '¡Perfecto! 📍 Tu ubicación quedó registrada para la entrega. 🚚✨',
    );

    await this.notifyOwner(
      `📍 UBICACIÓN DE ENTREGA recibida:\nCliente: ${client.name} (${phone})\nVer en el mapa: ${mapsLink}\n\nCoordina la entrega 🚚`,
    );
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
