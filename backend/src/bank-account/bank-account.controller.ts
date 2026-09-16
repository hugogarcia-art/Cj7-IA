import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';
import { BankAccountService } from './bank-account.service';
import {
  CreateBankAccountDto,
  UpdateBankAccountDto,
} from './dto/bank-account.dto';

@Controller('bank-accounts')
export class BankAccountController {
  constructor(private readonly bankAccountService: BankAccountService) {}

  @Get()
  getAccounts(@CurrentUser() user: AuthenticatedUser) {
    return this.bankAccountService.getAccounts(user.id);
  }

  @Post()
  createAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateBankAccountDto,
  ) {
    return this.bankAccountService.createAccount(user.id, body);
  }

  @Put(':id')
  updateAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateBankAccountDto,
  ) {
    return this.bankAccountService.updateAccount(user.id, id, body);
  }

  @Delete(':id')
  deleteAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.bankAccountService.deleteAccount(user.id, id);
  }
}
