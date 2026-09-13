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

type WhatsAppWebhookBody = {
  entry?: {
    changes?: {
      value?: {
        messages?: {
          from?: string;
          type?: string;
          text?: { body?: string };
          image?: { id?: string };
        }[];
      };
    }[];
  }[];
};

type RequestWithRawBody = Request & { rawBody?: Buffer };

@Controller('whatsapp')
export class WhatsAppController {
  private readonly logger = new Logger(WhatsAppController.name);

  constructor(private readonly whatsappService: WhatsAppService) {}

  @Public()
  @Get('webhook')
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ): void {
    const expected = this.whatsappService.verifyToken;
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
    const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    const phone = message?.from;
    if (!phone) return;

    // Si el cliente envió una imagen, se procesa como comprobante de pago.
    if (message.type === 'image' && message.image?.id) {
      try {
        await this.whatsappService.handleIncomingImage(phone, message.image.id);
      } catch (error: unknown) {
        this.logger.error(
          `Error procesando imagen de ${phone}: ${describeError(error)}`,
        );
      }
      return;
    }

    // El flujo de texto existente se mantiene intacto.
    const text = message.text?.body;
    if (!text) return;

    try {
      await this.whatsappService.handleIncomingMessage(phone, text);
    } catch (error: unknown) {
      this.logger.error(
        `Error procesando mensaje de ${phone}: ${describeError(error)}`,
      );
    }
  }
}
