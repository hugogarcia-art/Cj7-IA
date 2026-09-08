import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: ['http://localhost:3000', process.env.FRONTEND_URL || '*'],
  });

  const port = process.env.PORT || 8765;
  await app.listen(port);

  console.log(`🚀 Backend CJ7 IA corriendo en el puerto ${port}`);
}
void bootstrap();
