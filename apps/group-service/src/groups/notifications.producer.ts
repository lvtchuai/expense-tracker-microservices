import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  NOTIFICATION_CREATED,
  NotificationCreatedEvent,
} from '@app/common';

export const NOTIFY_BUS = 'NOTIFY_BUS';

/**
 * Fire-and-forget emitter for in-app notifications. A broker outage must never
 * fail the group operation — we log and move on.
 */
@Injectable()
export class NotificationsProducer {
  private readonly logger = new Logger(NotificationsProducer.name);

  constructor(@Inject(NOTIFY_BUS) private readonly bus: ClientProxy) {}

  emit(event: NotificationCreatedEvent) {
    this.bus.emit(NOTIFICATION_CREATED, event).subscribe({
      error: (err) =>
        this.logger.warn(
          `failed to emit notification for ${event.recipientId}: ${err?.message ?? err}`,
        ),
    });
  }
}
