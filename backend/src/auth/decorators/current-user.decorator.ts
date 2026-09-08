import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export type AuthenticatedUser = {
  id: string;
  email: string;
  role: string;
};

export type RequestWithUser = Request & { user?: AuthenticatedUser };

/** Devuelve el usuario que el JwtAuthGuard dejó en la request. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    if (!request.user) {
      // No debería ocurrir: el guard corre antes que el decorador.
      throw new Error('CurrentUser usado en una ruta sin JwtAuthGuard.');
    }
    return request.user;
  },
);
