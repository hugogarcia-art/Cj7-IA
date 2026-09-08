import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { envList, optionalEnv } from '../common/env';

function allowedOrigins(): string[] {
  return [
    'http://localhost:3000',
    ...envList('FRONTEND_URLS'),
    optionalEnv('FRONTEND_URL'),
  ].filter(Boolean);
}

@WebSocketGateway({
  // Igual que la API HTTP: lista blanca, no `cors: true`.
  cors: { origin: allowedOrigins(), credentials: true },
})
export class EventsGateway implements OnGatewayConnection {
  private readonly logger = new Logger(EventsGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(private readonly jwtService: JwtService) {}

  /** Solo entran sockets con un JWT válido; cada uno a la sala de su usuario. */
  handleConnection(client: Socket) {
    const token =
      (client.handshake.auth?.token as string | undefined) ??
      client.handshake.headers.authorization?.replace(/^Bearer /i, '');

    if (!token) {
      client.disconnect(true);
      return;
    }

    try {
      const payload = this.jwtService.verify<{ sub: string }>(token);
      void client.join(`user:${payload.sub}`);
    } catch {
      this.logger.warn('Socket rechazado: token inválido');
      client.disconnect(true);
    }
  }

  /** Notifica solo al dueño de los datos, no a todos los conectados. */
  notifyUser(userId: string, event: string, data: unknown) {
    this.server?.to(`user:${userId}`).emit(event, data);
  }
}
