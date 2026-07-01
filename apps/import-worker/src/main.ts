import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { IMPORT_QUEUE } from '@app/common';
import { ImportWorkerModule } from './import-worker.module';

/**
 * Hybrid app: tiny HTTP server (K8s health) + RabbitMQ consumer of import rows.
 * Manual ack (noAck: false) so a failed row is retried, not silently dropped —
 * this is the workload KEDA will later scale on queue depth.
 */
async function bootstrap() {
  const app = await NestFactory.create(ImportWorkerModule);

  const rabbitUrl = process.env.RABBITMQ_URL ?? 'amqp://localhost:5672';
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rabbitUrl],
      queue: IMPORT_QUEUE,
      queueOptions: { durable: true },
      noAck: false,
      // Process a few rows at a time per worker instance.
      prefetchCount: 5,
    },
  });

  await app.startAllMicroservices();

  const port = process.env.PORT ?? 3004;
  await app.listen(port);
  Logger.log(
    `📥 import-worker HTTP on :${port}, consuming ${IMPORT_QUEUE}`,
    'Bootstrap',
  );
}
bootstrap();
