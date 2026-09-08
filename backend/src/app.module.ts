import { ProductModule } from './product/product.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AiModule } from './ai/ai.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { ClientModule } from './client/client.module';
import { AuthModule } from './auth/auth.module';
import { StorageModule } from './storage/storage.module';
import { EventsModule } from './events/events.module';
//import { QueueModule } from './queue/queue.module';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AiModule,
    WhatsAppModule, // <-- Añadimos esto
    ClientModule, // <-- Añadimos esto
    AuthModule,
    ProductModule,
    StorageModule,
    EventsModule,
    //QueueModule,
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
