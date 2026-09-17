import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { UpsertAgentConfigDto } from './dto/agent-config.dto';

@Injectable()
export class AgentConfigService {
  constructor(private readonly prisma: PrismaService) {}

  getConfig(userId: string) {
    return this.prisma.agentConfig.findUnique({ where: { userId } });
  }

  /** Crea o actualiza la config del agente (un agente por usuario). */
  async upsertConfig(userId: string, data: UpsertAgentConfigDto) {
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

  async toggleActive(userId: string, isActive: boolean) {
    const existing = await this.prisma.agentConfig.findUnique({
      where: { userId },
    });
    if (!existing) {
      throw new NotFoundException(
        'Primero crea tu agente antes de activarlo.',
      );
    }
    return this.prisma.agentConfig.update({
      where: { userId },
      data: { isActive },
    });
  }
}
