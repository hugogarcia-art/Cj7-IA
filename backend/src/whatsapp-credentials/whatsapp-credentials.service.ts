import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { UpsertWhatsAppCredentialsDto } from './dto/whatsapp-credentials.dto';

@Injectable()
export class WhatsAppCredentialsService {
  private readonly logger = new Logger(WhatsAppCredentialsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Devuelve las credenciales con el token ENMASCARADO (nunca sale completo). */
  async getMasked(userId: string) {
    const cred = await this.prisma.whatsAppCredentials.findUnique({
      where: { userId },
    });
    if (!cred) return null;
    return {
      phoneNumberId: cred.phoneNumberId,
      wabaId: cred.wabaId,
      displayPhone: cred.displayPhone,
      verified: cred.verified,
      tokenPreview: `••••${cred.accessToken.slice(-4)}`,
      connectedAt: cred.createdAt,
    };
  }

  /** Guarda o actualiza las credenciales. Genera verifyToken único si no existe. */
  async upsert(userId: string, data: UpsertWhatsAppCredentialsDto) {
    const existing = await this.prisma.whatsAppCredentials.findUnique({
      where: { userId },
    });

    if (existing) {
      return this.prisma.whatsAppCredentials.update({
        where: { userId },
        data: { ...data, verified: false },
      });
    }
    // Token único para el webhook de ESTE usuario
    const verifyToken = `cj7_${userId.replace(/-/g, '').slice(0, 20)}_${Date.now().toString(36)}`;
    return this.prisma.whatsAppCredentials.create({
      data: { ...data, userId, verifyToken },
    });
  }

  /** Datos para la guía de conexión del usuario (callback + token propio). */
  async getSetupInfo(userId: string) {
    const globalToken = process.env.WHATSAPP_VERIFY_TOKEN ?? '';
    const cred = await this.prisma.whatsAppCredentials.findUnique({
      where: { userId },
    });
    const verifyToken = cred?.verifyToken ?? globalToken;
    return {
      callbackUrl: `${process.env.BASE_URL ?? 'https://cj7-ia.onrender.com'}/whatsapp/webhook`,
      verifyToken,
      isPersonal: !!cred?.verifyToken,
    };
  }

  /**
   * Verifica contra la Graph API que las credenciales sean reales:
   * pide los datos del número de teléfono. Si responde 200, queda verificada.
   */
  async verify(userId: string): Promise<{ ok: boolean; detail: string }> {
    const cred = await this.prisma.whatsAppCredentials.findUnique({
      where: { userId },
    });
    if (!cred) return { ok: false, detail: 'No hay credenciales guardadas.' };

    try {
      const res = await fetch(
        `https://graph.facebook.com/v20.0/${cred.phoneNumberId}?access_token=${cred.accessToken}`,
      );
      if (!res.ok) {
        this.logger.warn(`Verificación fallida para usuario ${userId}: HTTP ${res.status}`);
        return {
          ok: false,
          detail:
            'Meta rechazó las credenciales. Revisa el Phone Number ID y el Access Token.',
        };
      }
      const data = (await res.json()) as {
        display_phone_number?: string;
        verified_name?: string;
      };
      await this.prisma.whatsAppCredentials.update({
        where: { userId },
        data: {
          verified: true,
          displayPhone: cred.displayPhone ?? data.display_phone_number ?? null,
        },
      });
      return {
        ok: true,
        detail: `✅ Conectado: ${data.verified_name ?? 'número verificado'}`,
      };
    } catch {
      return { ok: false, detail: 'No se pudo contactar a Meta. Revisa tu conexión.' };
    }
  }
}