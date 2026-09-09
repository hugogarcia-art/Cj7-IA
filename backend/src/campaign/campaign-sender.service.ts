import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CampaignService } from './campaign.service';
import { AiService } from '../ai/ai.service';

/**
 * Envía mensajes en masa con pausa de 3 segundos entre cada uno
 * (protección anti-baneo de Meta) y respeta la ventana de 24h.
 */
@Injectable()
export class CampaignSenderService implements OnModuleInit {
  private readonly logger = new Logger(CampaignSenderService.name);

  constructor(
    private readonly campaignService: CampaignService,
    private readonly aiService: AiService,
  ) {}

  async onModuleInit() {
    // No conectamos nada aquí; el envío es bajo demanda.
  }

  /**
   * Envía la campaña a toda la audiencia.
   * Se ejecuta de fondo: el controlador responde al instante.
   */
  async sendCampaign(userId: string, campaignId: string) {
    const campaign = (await this.campaignService.getCampaignById(
      userId,
      campaignId,
    )) as unknown as {
      status: string;
      audience: string;
      name: string;
      message: string;
    } | null;
    if (!campaign) throw new Error('Campaña no encontrada');
    if (campaign.status === 'enviando') {
      throw new Error('Esta campaña ya se está enviando');
    }

    await this.campaignService.markSending(campaignId);

    const audience = await this.campaignService.getAudience(
      userId,
      campaign.audience,
    );

    this.logger.log(
      `📢 Campaña "${campaign.name}": ${audience.length} destinatarios`,
    );

    // Procesamos en fondo sin bloquear al controlador
    void this.processRecipients(userId, campaignId, campaign.message, audience);

    return {
      message: 'Envío iniciado',
      recipients: audience.length,
      campaignId,
    };
  }

  private async processRecipients(
    userId: string,
    campaignId: string,
    template: string,
    audience: Array<{ id: string; name: string; phone: string }>,
  ) {
    // Producto para {{producto}} / {{precio}}: usamos el primero con oferta o el más reciente
    const products = await this.campaignService.getProductsForCampaign(userId);
    const product = products[0];

    for (const client of audience) {
      const text = this.campaignService.personalize(template, client, product);

      let sent = false;
      try {
        sent = await this.aiService.sendWhatsAppMessage(client.phone, text);
      } catch {
        this.logger.error(`Error enviando a ${client.phone}`);
      }

      await this.campaignService.recordResult(campaignId, sent);
      this.logger.log(
        sent
          ? `📤 Enviado a ${client.phone}`
          : `⚠️ No se pudo enviar a ${client.phone} (fuera de ventana 24h)`,
      );

      // Pausa anti-baneo entre mensajes
      await this.sleep(3000);
    }

    await this.campaignService.markCompleted(campaignId);
    this.logger.log(`✅ Campaña "${campaignId}" completada`);
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
