import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { envList, optionalEnv } from './common/env';

/**
 * Carpeta con la exportación estática de Next (`frontend/out`).
 *
 * La resolvemos desde __dirname (backend/dist) y no desde process.cwd(),
 * porque Render lanza el proceso desde la raíz del repositorio.
 */
const CLIENT_DIR = join(__dirname, '..', '..', 'frontend', 'out');

/** Prefijos que pertenecen a la API y nunca deben devolver el HTML del cliente. */
const API_PREFIXES = [
  '/auth',
  '/clients',
  '/products',
  '/whatsapp',
  '/health',
  '/socket.io',
];

function isApiPath(path: string): boolean {
  return API_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // Necesario para validar la firma HMAC del webhook de Meta sobre el
    // cuerpo exacto que llegó, antes de que Express lo parsee.
    rawBody: true,
  });

  app.use(
    helmet({
      // El HTML exportado por Next carga sus propios scripts y estilos; la CSP
      // por defecto de helmet los bloquearía.
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  const logger = new Logger('Bootstrap');
  const servesClient = existsSync(CLIENT_DIR);

  if (servesClient) {
    // `extensions: ['html']` hace que /login sirva login.html, que es como
    // Next nombra las rutas al exportar.
    app.useStaticAssets(CLIENT_DIR, { extensions: ['html'] });
  } else {
    logger.warn(
      `No se encontró la aplicación compilada en ${CLIENT_DIR}. Solo se sirve la API.`,
    );
  }

  // Lista blanca explícita. Antes había un '*' de fallback que dejaba a
  // cualquier sitio hacer peticiones con las credenciales del usuario.
  //
  // Sirviendo la aplicación desde este mismo proceso, las peticiones son del
  // mismo origen y CORS ni entra en juego; esto queda para desarrollo y por si
  // algún día el frontend vuelve a desplegarse aparte.
  const allowedOrigins = [
    'http://localhost:3000',
    ...envList('FRONTEND_URLS'),
    optionalEnv('FRONTEND_URL'),
  ].filter(Boolean);

  app.enableCors({ origin: allowedOrigins, credentials: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // descarta propiedades no declaradas en el DTO
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  if (servesClient) {
    // Cualquier ruta de navegación que no sea de la API devuelve el HTML del
    // cliente: sin esto, recargar en /dashboard/clientes daría un 404 JSON.
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.method !== 'GET' || isApiPath(req.path)) return next();
      if (!req.headers.accept?.includes('text/html')) return next();
      res.status(404).sendFile(join(CLIENT_DIR, '404.html'), (error) => {
        if (error) next();
      });
    });
  }

  const port = Number(process.env.PORT) || 8765;
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 Backend CJ7 IA escuchando en el puerto ${port}`);
  logger.log(
    servesClient
      ? '   Sirviendo tambien la aplicacion web desde este mismo servicio'
      : '   Solo API (sin aplicacion web compilada)',
  );
  logger.log(`   CORS permitido para: ${allowedOrigins.join(', ')}`);
}

void bootstrap();
