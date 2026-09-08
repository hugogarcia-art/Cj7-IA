import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';

@Module({
  providers: [EventsGateway],
  exports: [EventsGateway], // Lo exportamos para usarlo en Ventas y WhatsApp
})
export class EventsModule {}
