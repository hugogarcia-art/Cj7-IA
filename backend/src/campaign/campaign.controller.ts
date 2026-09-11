import { UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from '../storage/storage.service';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';
import { CampaignService } from './campaign.service';
import { CampaignSenderService } from './campaign-sender.service';

@Controller('campaigns')
export class CampaignController {
  constructor(
    private readonly campaignService: CampaignService,
    private readonly campaignSender: CampaignSenderService,
    private readonly storageService: StorageService,
  ) {}

  @Get()
  getCampaigns(@CurrentUser() user: AuthenticatedUser) {
    return this.campaignService.getCampaigns(user.id);
  }

  @Post()
  createCampaign(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: { name: string; message: string; audience?: string },
  ) {
    return this.campaignService.createCampaign(user.id, {
      name: body.name,
      message: body.message,
      audience: body.audience || 'todos',
    });
  }
  // Flujo avanzado: imagen + programación + recurrencia
  @Post('advanced')
  @UseInterceptors(FileInterceptor('image'))
  async createAdvancedCampaign(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      name: string;
      message: string;
      audience?: string;
      scheduledAt?: string;
      recurrenceDays?: string;
    },
    @UploadedFile() image: { buffer: Buffer; mimetype: string } | undefined,
  ) {
    // Sube la imagen a Supabase si viene una
    let imageUrl: string | undefined = undefined;
    if (image) {
      const fileName = `campana-${Date.now()}.jpg`;
      imageUrl = await this.storageService.uploadImage(image, fileName);
    }

    return this.campaignService.createCampaignAdvanced(user.id, {
      name: body.name,
      message: body.message,
      audience: body.audience || 'todos',
      imageUrl,
      scheduledAt: body.scheduledAt,
      recurrenceDays: body.recurrenceDays
        ? parseInt(body.recurrenceDays)
        : undefined,
    });
  }

  // ⭐ LA RUTA ESTRELLA: dispara el envío masivo en segundo plano
  @Post(':id/send')
  sendCampaign(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.campaignSender.sendCampaign(user.id, id);
  }

  @Delete(':id')
  deleteCampaign(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.campaignService.deleteCampaign(user.id, id);
  }
}
