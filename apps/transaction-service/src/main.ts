import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { text } from 'express';
import { TransactionServiceModule } from './transaction-service.module';

async function bootstrap() {
  const app = await NestFactory.create(TransactionServiceModule);

  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? true,
  });

  // Accept raw CSV bodies on the import endpoint as a plain string.
  app.use(text({ type: 'text/csv', limit: '5mb' }));

  app.setGlobalPrefix('api', { exclude: ['health', 'health/ready'] });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = process.env.PORT ?? 3002;
  await app.listen(port);
  Logger.log(`💸 transaction-service listening on :${port}`, 'Bootstrap');
}
bootstrap();
