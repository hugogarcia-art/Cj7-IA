import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestWithUser } from '../decorators/current-user.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

type JwtPayload = {
  sub: string;
  email: string;
  role?: string;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. ¿La ruta es pública (@Public())? → pasa sin token
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // 2. Extrae y valida el token JWT
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException('Falta el token de autenticación.');
    }

    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Sesión expirada o token inválido.');
    }

    // 3. 🛡️ TRIAL: usuarios en TRIAL expirado solo pueden consultar
    //    su suscripción y su perfil — el resto se bloquea con 403.
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { plan: true, trialStartsAt: true, trialEndsAt: true },
    });
    if (user?.plan === 'TRIAL') {
      const ends =
        user.trialEndsAt ??
        new Date(user.trialStartsAt.getTime() + 3 * 86400000);
      const expired = new Date() > ends;
      const isSubscriptionRoute =
        request.path?.includes('/agent-config/subscription') ||
        request.path?.includes('/auth/me') ||
        (request.method === 'GET' && request.path?.includes('/payment'));
      if (expired && !isSubscriptionRoute) {
        throw new ForbiddenException(
          'Prueba gratuita expirada. Suscríbete por $49/mes.',
        );
      }
    }

    // 4. Todo bien: pasa al controller con el usuario en la petición
    request.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role ?? 'USER',
    };
    return true;
  }

  private extractToken(request: RequestWithUser): string | null {
    const header = request.headers.authorization;
    if (header) {
      const [scheme, value] = header.split(' ');
      if (scheme?.toLowerCase() === 'bearer' && value) return value;
    }
    // Las descargas (vCard/CSV) van por <a href> y no pueden mandar headers.
    const queryToken = (request.query as Record<string, unknown>)?.token;
    if (typeof queryToken === 'string' && queryToken.length > 0) {
      return queryToken;
    }
    return null;
  }
}
