import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { RequestWithUser } from '../decorators/current-user.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

type JwtPayload = {
  sub: string;
  email: string;
  role?: string;
};

/**
 * Guard global: exige un Bearer token válido salvo en rutas marcadas @Public().
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

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
