import { Body, Controller, Get, Put } from '@nestjs/common';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';
import { StoreInfoService } from './store-info.service';
import { UpsertStoreInfoDto } from './dto/store-info.dto';

@Controller('store-info')
export class StoreInfoController {
  constructor(private readonly storeInfoService: StoreInfoService) {}

  @Get()
  getStore(@CurrentUser() user: AuthenticatedUser) {
    return this.storeInfoService.getStore(user.id);
  }

  @Put()
  upsertStore(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpsertStoreInfoDto,
  ) {
    return this.storeInfoService.upsertStore(user.id, body);
  }
}
