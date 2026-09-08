import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: true })
export class EventsGateway {
  @WebSocketServer()
  server: Server;

  // Esta función la llamaremos desde otros módulos para avisar al frontend
  notifyNewEvent(event: string, data: any) {
    this.server.emit(event, data);
  }
}
