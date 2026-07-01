import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { IMPORT_ROW, ImportRowEvent } from '@app/common';
import { ImportService, InvalidRowError } from './import.service';

@Controller()
export class ImportController {
  private readonly logger = new Logger(ImportController.name);

  constructor(private readonly service: ImportService) {}

  @EventPattern(IMPORT_ROW)
  async handleRow(
    @Payload() event: ImportRowEvent,
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const message = context.getMessage();

    try {
      await this.service.processRow(event);
      channel.ack(message);
    } catch (err) {
      if (err instanceof InvalidRowError) {
        // Bad data or config — retrying can't fix it. Drop (no requeue).
        this.logger.warn(`dropping row: ${err.message}`);
        channel.nack(message, false, false);
      } else {
        // Transient (transaction-service down). Requeue for retry.
        this.logger.error(
          `transient failure, requeueing row ${event.rowNumber}: ${(err as Error).message}`,
        );
        channel.nack(message, false, true);
      }
    }
  }
}
