import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { GroupServiceModule } from './group-service.module';

async function bootstrap() {
  const app = await NestFactory.create(GroupServiceModule);

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

  const port = process.env.PORT ?? 3006;
  await app.listen(port);
  Logger.log(`👥 group-service listening on :${port}`, 'Bootstrap');
}
bootstrap();
