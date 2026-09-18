import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { encryptSecret, decryptSecret, maskSecret } from '../common/crypto';
import type { UpsertAgentConfigDto } from './dto/agent-config.dto';

/** Días de prueba gratuita. */
const TRIAL_DAYS = 3;
const TRIAL_PRICE_USD = 49;

@Injectable()
export class AgentConfigService {
  constructor(private readonly prisma: PrismaService) {}

  /** Estado de la suscripción del usuario. */
  async getSubscription(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true, trialStartsAt: true, trialEndsAt: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const trialEndsAt =
      user.trialEndsAt ??
      new Date(user.trialStartsAt.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

    const now = new Date();
    const isTrial = user.plan === 'TRIAL';
    const trialExpired = isTrial && now > trialEndsAt;
    const daysLeft = isTrial
      ? Math.max(
          0,
          Math.ceil((trialEndsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
        )
      : 0;

    return {
      plan: user.plan,
      isTrial,
      trialExpired,
      trialEndsAt,
      daysLeft,
      priceUsd: TRIAL_PRICE_USD,
    };
  }

  /** Guardia: si el trial expiró y no es PRO, bloquea. */
  private async assertAccess(userId: string) {
    const sub = await this.getSubscription(userId);
    if (sub.trialExpired) {
      throw new ForbiddenException(
        `Prueba gratuita expirada. Accede al plan PRO por $${sub.priceUsd}/mes para continuar.`,
      );
    }
    return sub;
  }

  getConfig(userId: string) {
    return this.assertAccess(userId).then(() =>
      this.prisma.agentConfig.findUnique({ where: { userId } }),
    );
  }

  async upsertConfig(userId: string, data: UpsertAgentConfigDto) {
    await this.assertAccess(userId);

    const existing = await this.prisma.agentConfig.findUnique({
      where: { userId },
    });

    if (existing) {
      return this.prisma.agentConfig.update({
        where: { userId },
        data,
      });
    }
    return this.prisma.agentConfig.create({
      data: { ...data, userId },
    });
  }
  async setPromptMode(userId: string, promptMode: string, customPrompt?: string) {
    const existing = await this.prisma.agentConfig.findUnique({
      where: { userId },
    });
    if (!existing) {
      return this.prisma.agentConfig.create({
        data: { userId, promptMode, customPrompt, category: 'custom', agentName: 'Alex' },
      });
    }
    return this.prisma.agentConfig.update({
      where: { userId },
      data: { promptMode, customPrompt: customPrompt ?? existing.customPrompt },
    });
  }

  /** BYOK: guarda la OpenAI key del usuario CIFRADA. */
  async setOpenAiKey(userId: string, apiKey: string) {
    const encrypted = encryptSecret(apiKey);
    const existing = await this.prisma.agentConfig.findUnique({
      where: { userId },
    });
    if (existing) {
      await this.prisma.agentConfig.update({
        where: { userId },
        data: { openaiApiKey: encrypted },
      });
    } else {
      await this.prisma.agentConfig.create({
        data: { userId, openaiApiKey: encrypted, category: 'custom', agentName: 'Alex' },
      });
    }
    return { saved: true, preview: maskSecret(apiKey) };
  }

  /** Key descifrada SOLO para uso interno del agente. */
  async getDecryptedOpenAiKey(userId: string): Promise<string | null> {
    const cfg = await this.prisma.agentConfig.findUnique({
      where: { userId },
    });
    return decryptSecret(cfg?.openaiApiKey);
  }

  async toggleActive(userId: string, isActive: boolean) {
    await this.assertAccess(userId);
    const existing = await this.prisma.agentConfig.findUnique({
      where: { userId },
    });
    if (!existing) {
      throw new NotFoundException('Primero crea tu agente antes de activarlo.');
    }
    return this.prisma.agentConfig.update({
      where: { userId },
      data: { isActive },
    });
  }
}