import { Global, Module } from '@nestjs/common';
import { JwtModule, type JwtSignOptions } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { requireEnv, optionalEnv } from '../common/env';

/**
 * Global para que el JwtAuthGuard registrado en AppModule pueda inyectar
 * JwtService sin volver a importar JwtModule en cada feature module.
 */
@Global()
@Module({
  imports: [
    JwtModule.register({
      // Sin valor por defecto a propósito: un secreto hardcodeado en el
      // repositorio permite a cualquiera firmar tokens válidos.
      secret: requireEnv('JWT_SECRET'),
      signOptions: {
        // El tipo viene de `ms` (p. ej. '1d', '2h', 3600) y no se puede
        // inferir desde una variable de entorno.
        expiresIn: optionalEnv(
          'JWT_EXPIRES_IN',
          '1d',
        ) as JwtSignOptions['expiresIn'],
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [JwtModule],
})
export class AuthModule {}
