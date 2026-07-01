import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  ClientsModule,
  Transport,
} from '@nestjs/microservices';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IMPORT_QUEUE, NOTIFICATIONS_QUEUE } from '@app/common';
import { Transaction } from './transaction.entity';
import { TransactionsController } from './transactions.controller';
import {
  TransactionsService,
  EVENT_BUS,
  IMPORT_BUS,
} from './transactions.service';
import { JwtStrategy } from '../auth/jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction]),
    PassportModule,
    ConfigModule,
    ClientsModule.registerAsync([
      {
        name: EVENT_BUS,
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [
              config.get<string>('RABBITMQ_URL', 'amqp://localhost:5672'),
            ],
            queue: NOTIFICATIONS_QUEUE,
            queueOptions: { durable: true },
          },
        }),
      },
      {
        name: IMPORT_BUS,
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [
              config.get<string>('RABBITMQ_URL', 'amqp://localhost:5672'),
            ],
            queue: IMPORT_QUEUE,
            queueOptions: { durable: true },
          },
        }),
      },
    ]),
  ],
  controllers: [TransactionsController],
  providers: [TransactionsService, JwtStrategy],
})
export class TransactionsModule {}
