import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { NOTIFICATIONS_QUEUE } from '@app/common';
import { NotificationServiceModule } from './notification-service.module';

/**
 * Hybrid app: an HTTP server (for K8s health probes) that ALSO consumes from
 * RabbitMQ. The HTTP side stays trivial; the real work is the RMQ consumer.
 */
async function bootstrap() {
  const app = await NestFactory.create(NotificationServiceModule);

  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? true,
  });
  app.setGlobalPrefix('api', { exclude: ['health', 'health/ready'] });

  const rabbitUrl = process.env.RABBITMQ_URL ?? 'amqp://localhost:5672';
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rabbitUrl],
      queue: NOTIFICATIONS_QUEUE,
      queueOptions: { durable: true },
      // Ack manually only if we implement retries; default is auto-ack.
      noAck: true,
    },
  });

  await app.startAllMicroservices();

  const port = process.env.PORT ?? 3003;
  await app.listen(port);
  Logger.log(
    `🔔 notification-service HTTP on :${port}, consuming ${NOTIFICATIONS_QUEUE}`,
    'Bootstrap',
  );
}
bootstrap();
