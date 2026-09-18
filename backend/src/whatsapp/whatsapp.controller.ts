import {
  Body,
  Controller,
  Get,
  Headers,
  Logger,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { WhatsAppService } from './whatsapp.service';
import { Public } from '../auth/decorators/public.decorator';
import { describeError } from '../common/errors';
import { PrismaService } from '../prisma/prisma.service';

type WhatsAppWebhookBody = {
  entry?: {
    changes?: {
      value?: {
        metadata?: { phone_number_id?: string };
        messages?: {
          from?: string;
          type?: string;
          text?: { body?: string };
          image?: { id?: string };
          location?: { latitude: number; longitude: number };
        }[];
      };
    }[];
  }[];
};

type RequestWithRawBody = Request & { rawBody?: Buffer };

@Controller('whatsapp')
export class WhatsAppController {
  private readonly logger = new Logger(WhatsAppController.name);

  constructor(
    private readonly whatsappService: WhatsAppService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Get('webhook')
  async verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ): Promise<void> {
    // Acepta el token global (.env) o el token personal de algún usuario
    let expected = this.whatsappService.verifyToken;
    if (token && token !== expected) {
      const cred = await this.prisma.whatsAppCredentials.findFirst({
        where: { verifyToken: token },
        select: { verifyToken: true },
      });
      if (cred) expected = cred.verifyToken;
    }
    if (expected && mode === 'subscribe' && token === expected) {
      res.status(200).send(challenge);
      return;
    }
    res.sendStatus(403);
  }

  @Public()
  // Meta reintenta si tardamos; el límite frena picos que dispararían el gasto
  // de OpenAI, no el tráfico normal.
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Post('webhook')
  async receiveMessage(
    @Req() req: RequestWithRawBody,
    @Headers('x-hub-signature-256') signature: string | undefined,
    @Body() body: WhatsAppWebhookBody,
    @Res() res: Response,
  ): Promise<void> {
    // 1. Verifica la firma primero
    if (!this.whatsappService.verifySignature(req.rawBody, signature)) {
      res.status(403).send('Firma inválida');
      return;
    }

    // 2. ⚡ CONFIRMA A META DE INMEDIATO (anti-duplicados)
    res.status(200).send('EVENT_RECEIVED');

    // 3. Luego procesa EN SEGUNDO PLANO (sin await)
    const value = body.entry?.[0]?.changes?.[0]?.value;
    const message = value?.messages?.[0];
    const phone = message?.from;
    const webhookPhoneNumberId = value?.metadata?.phone_number_id;
    if (!phone) return;

    // Si el cliente envió una imagen, se procesa como comprobante de pago.
    if (message.type === 'image' && message.image?.id) {
      try {
        await this.whatsappService.handleIncomingImage(
          phone,
          message.image.id,
          webhookPhoneNumberId,
        );
      } catch (error: unknown) {
        this.logger.error(
          `Error procesando imagen de ${phone}: ${describeError(error)}`,
        );
      }
      return;
    }
    // 📍 Si el cliente envió su UBICACIÓN (pin de WhatsApp):
    if (message.type === 'location' && message.location) {
      try {
        await this.whatsappService.handleIncomingLocation(
          phone,
          message.location.latitude,
          message.location.longitude,
          webhookPhoneNumberId,
        );
      } catch (error: unknown) {
        this.logger.error(
          `Error procesando ubicación de ${phone}: ${describeError(error)}`,
        );
      }
      return;
    }

    // El flujo de texto existente se mantiene intacto.
    const text = message.text?.body;
    if (!text) return;

    try {
      await this.whatsappService.handleIncomingMessage(
        phone,
        text,
        webhookPhoneNumberId,
      );
    } catch (error: unknown) {
      this.logger.error(
        `Error procesando mensaje de ${phone}: ${describeError(error)}`,
      );
    }
  }
}
