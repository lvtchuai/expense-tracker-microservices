import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NOTIFICATIONS_QUEUE } from '@app/common';
import { Group } from './entities/group.entity';
import { GroupMember } from './entities/group-member.entity';
import { GroupExpense } from './entities/group-expense.entity';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';
import { JwtStrategy } from '../auth/jwt.strategy';
import { AuthClient } from '../auth/auth.client';
import { NotificationsProducer, NOTIFY_BUS } from './notifications.producer';

@Module({
  imports: [
    TypeOrmModule.forFeature([Group, GroupMember, GroupExpense]),
    PassportModule,
    ConfigModule,
    ClientsModule.registerAsync([
      {
        name: NOTIFY_BUS,
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
    ]),
  ],
  controllers: [GroupsController],
  providers: [GroupsService, JwtStrategy, AuthClient, NotificationsProducer],
})
export class GroupsModule {}
