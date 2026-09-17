import { Body, Controller, Get, Post, Put } from '@nestjs/common';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';
import { WhatsAppCredentialsService } from './whatsapp-credentials.service';
import { UpsertWhatsAppCredentialsDto } from './dto/whatsapp-credentials.dto';

@Controller('whatsapp-credentials')
export class WhatsAppCredentialsController {
  constructor(
    private readonly credentialsService: WhatsAppCredentialsService,
  ) {}

  @Get()
  getMasked(@CurrentUser() user: AuthenticatedUser) {
    return this.credentialsService.getMasked(user.id);
  }
  /** Guía de pasos con los datos exactos de este usuario. */
  @Get('setup-info')
  getSetupInfo(@CurrentUser() user: AuthenticatedUser) {
    return this.credentialsService.getSetupInfo(user.id);
  }
  @Put()
  upsert(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpsertWhatsAppCredentialsDto,
  ) {
    return this.credentialsService.upsert(user.id, body);
  }

  /** Prueba las credenciales contra Meta y marca verified si pasan. */
  @Post('verify')
  verify(@CurrentUser() user: AuthenticatedUser) {
    return this.credentialsService.verify(user.id);
  }
}
