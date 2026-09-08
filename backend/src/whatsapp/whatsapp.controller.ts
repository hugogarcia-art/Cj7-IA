import { Controller, Post, Get, Body, Query, Res } from '@nestjs/common';
import type { Response } from 'express'; // Arregla el error TS1272
import { AiService } from '../ai/ai.service';
import { PrismaClient } from '@prisma/client';

type WhatsAppWebhookMessage = {
  from?: string;
  text?: {
    body?: string;
  };
};

type WhatsAppWebhookValue = {
  messages?: WhatsAppWebhookMessage[];
};

type WhatsAppWebhookChange = {
  value?: WhatsAppWebhookValue;
};

type WhatsAppWebhookEntry = {
  changes?: WhatsAppWebhookChange[];
};

type WhatsAppWebhookBody = {
  entry?: WhatsAppWebhookEntry[];
};

@Controller('whatsapp')
export class WhatsAppController {
  private prisma = new PrismaClient();

  constructor(private readonly aiService: AiService) {}

  @Get('webhook')
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ): any {
    const verifyToken = 'cj7_ia_token_seguro';
    if (mode === 'subscribe' && token === verifyToken) {
      return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
  }

  @Post('webhook')
  async receiveMessage(
    @Body() body: WhatsAppWebhookBody,
    @Res() res: Response,
  ): Promise<any> {
    try {
      const entry = body.entry?.[0]?.changes?.[0]?.value;
      const message = entry?.messages?.[0];

      if (message?.text?.body) {
        const userPhone = message.from ?? '';
        const userMessage = message.text.body;

        if (!userPhone) {
          return res.status(200).send('EVENT_RECEIVED');
        }

        console.log(`📞 Mensaje recibido de ${userPhone}: ${userMessage}`);
        // 0. Guardar/actualizar cliente automáticamente en el CRM (0 clics)
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

        await this.prisma.client.upsert({
          where: { phone: userPhone },
          update: { lastContact: new Date() },
          create: {
            name: `Cliente WhatsApp ${userPhone}`,
            phone: userPhone,
            userId: adminUser.id,
          },
        });
        console.log(`✅ Cliente guardado/actualizado en el CRM: ${userPhone}`);

        // 1. Guardar mensaje del usuario
        await this.prisma.message.create({
          data: { phone: userPhone, sender: 'user', content: userMessage },
        });

        // 2. Leer inventario de la base de datos
        const products = await this.prisma.product.findMany({ take: 10 });
        const inventoryString = products
          .map((p) => `- ${p.name} (Precio: ${p.price} Bs)`)
          .join('\n');

        // 3. Generar respuesta con IA
        const aiResponse = await this.aiService.generateWhatsAppResponse(
          userMessage,
          'Cliente Potencial',
          inventoryString,
        );
        console.log(`🤖 Respuesta de la IA: ${aiResponse}`);

        // 4. Guardar respuesta de la IA
        await this.prisma.message.create({
          data: { phone: userPhone, sender: 'ai', content: aiResponse },
        });

        // 5. Enviar respuesta por WhatsApp (Meta API)
        const sendResponse = await fetch(
          `https://graph.facebook.com/v20.0/${process.env.PHONE_NUMBER_ID}/messages`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.META_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: userPhone,
              type: 'text',
              text: { body: aiResponse },
            }),
          },
        );

        const sendData = (await sendResponse.json()) as {
          error?: unknown;
        };
        if (!sendResponse.ok) {
          console.error('❌ Meta rechazó el envío:', JSON.stringify(sendData));
        } else {
          console.log('📤 Respuesta enviada a WhatsApp correctamente');
        }
      }

      return res.status(200).send('EVENT_RECEIVED');
    } catch (error) {
      console.error(
        '❌ Error en webhook:',
        error instanceof Error ? error.message : String(error),
      );
      return res.status(500).send('Error');
    }
  }
}
