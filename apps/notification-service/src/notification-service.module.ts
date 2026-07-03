import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthModule } from '@app/common';
import { Notification } from './notifications/notification.entity';
import { NotificationsService } from './notifications/notifications.service';
import { NotificationsController } from './notifications/notifications.controller';
import { NotificationsConsumer } from './notifications/notifications.consumer';
import { JwtStrategy } from './auth/jwt.strategy';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get('DB_USER', 'postgres'),
        password: config.get('DB_PASSWORD', 'postgres'),
        database: config.get('DB_NAME', 'notifications'),
        entities: [Notification],
        synchronize: true,
      }),
    }),
    TypeOrmModule.forFeature([Notification]),
    PassportModule,
    HealthModule,
  ],
  controllers: [NotificationsController, NotificationsConsumer],
  providers: [NotificationsService, JwtStrategy],
})
export class NotificationServiceModule {}
