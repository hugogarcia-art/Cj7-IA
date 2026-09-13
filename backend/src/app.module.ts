import { SaleModule } from './sale/sale.module';
import { AutomationModule } from './automation/automation.module';
import { CampaignModule } from './campaign/campaign.module';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AiModule } from './ai/ai.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { ClientModule } from './client/client.module';
import { AuthModule } from './auth/auth.module';
import { ProductModule } from './product/product.module';
import { StorageModule } from './storage/storage.module';
import { EventsModule } from './events/events.module';
import { PaymentModule } from './payment/payment.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
//import { QueueModule } from './queue/queue.module';

@Module({
  imports: [
    // Primero, para que el resto de módulos ya vea process.env al construirse.
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    AuthModule,
    AiModule,
    WhatsAppModule,
    ClientModule,
    ProductModule,
    StorageModule,
    CampaignModule,
    EventsModule,
    AutomationModule,
    SaleModule,
    PaymentModule,
    //QueueModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Todo exige token salvo lo marcado con @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
