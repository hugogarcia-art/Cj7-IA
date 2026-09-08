import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { envList, optionalEnv } from './common/env';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Necesario para validar la firma HMAC del webhook de Meta sobre el
    // cuerpo exacto que llegó, antes de que Express lo parsee.
    rawBody: true,
  });

  app.use(helmet());

  // Lista blanca explícita. Antes había un '*' de fallback que dejaba a
  // cualquier sitio hacer peticiones con las credenciales del usuario.
  const allowedOrigins = [
    'http://localhost:3000',
    ...envList('FRONTEND_URLS'),
    optionalEnv('FRONTEND_URL'),
  ].filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // descarta propiedades no declaradas en el DTO
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  const port = Number(process.env.PORT) || 8765;
  await app.listen(port, '0.0.0.0');

  new Logger('Bootstrap').log(
    `🚀 Backend CJ7 IA escuchando en el puerto ${port}`,
  );
  new Logger('Bootstrap').log(
    `   CORS permitido para: ${allowedOrigins.join(', ')}`,
  );
}

void bootstrap();
