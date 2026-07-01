import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import {
  TRANSACTION_CREATED,
  TransactionCreatedEvent,
} from '@app/common';

/**
 * RabbitMQ consumer. In Phase 2 we just "send" a notification by logging it;
 * a real channel (email/push) plugs in here later without changing the event
 * contract.
 */
@Controller()
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  @EventPattern(TRANSACTION_CREATED)
  handleTransactionCreated(@Payload() event: TransactionCreatedEvent) {
    const verb = event.type === 'expense' ? 'spent' : 'received';
    this.logger.log(
      `📧 notify user ${event.userId}: ${verb} ${event.amount} on "${event.category}" (tx ${event.transactionId})`,
    );
  }
}
