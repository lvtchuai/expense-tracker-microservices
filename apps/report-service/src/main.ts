import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ReportServiceModule } from './report-service.module';

async function bootstrap() {
  const app = await NestFactory.create(ReportServiceModule);

  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? true,
  });
  app.setGlobalPrefix('api', { exclude: ['health', 'health/ready'] });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  const port = process.env.PORT ?? 3005;
  await app.listen(port);
  Logger.log(`📊 report-service listening on :${port}`, 'Bootstrap');
}
bootstrap();
