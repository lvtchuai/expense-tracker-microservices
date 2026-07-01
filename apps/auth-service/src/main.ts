import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AuthServiceModule } from './auth-service.module';

async function bootstrap() {
  const app = await NestFactory.create(AuthServiceModule);

  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? true,
  });
  app.setGlobalPrefix('api', { exclude: ['health', 'health/ready'] });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  Logger.log(`🔐 auth-service listening on :${port}`, 'Bootstrap');
}
bootstrap();
