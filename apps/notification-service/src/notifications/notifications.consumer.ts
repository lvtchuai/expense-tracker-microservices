import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import {
  NOTIFICATION_CREATED,
  NotificationCreatedEvent,
  TRANSACTION_CREATED,
  TransactionCreatedEvent,
} from '@app/common';
import { NotificationsService } from './notifications.service';

/** RabbitMQ consumer: persists notifications, logs transaction events. */
@Controller()
export class NotificationsConsumer {
  private readonly logger = new Logger(NotificationsConsumer.name);

  constructor(private readonly service: NotificationsService) {}

  @EventPattern(NOTIFICATION_CREATED)
  async onNotification(@Payload() event: NotificationCreatedEvent) {
    await this.service.store(event);
    this.logger.log(
      `🔔 stored ${event.type} for ${event.recipientId}: ${event.title}`,
    );
  }

  @EventPattern(TRANSACTION_CREATED)
  onTransaction(@Payload() event: TransactionCreatedEvent) {
    const verb = event.type === 'expense' ? 'spent' : 'received';
    this.logger.log(
      `📧 user ${event.userId} ${verb} ${event.amount} on "${event.category}"`,
    );
  }
}
