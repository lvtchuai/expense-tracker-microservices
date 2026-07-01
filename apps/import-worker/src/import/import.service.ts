import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  INTERNAL_HEADER,
  INTERNAL_USER_HEADER,
  ImportRowEvent,
} from '@app/common';

/** Thrown for rows that are structurally invalid — do NOT retry these. */
export class InvalidRowError extends Error {}

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);
  private readonly txBaseUrl: string;
  private readonly internalKey: string;

  constructor(config: ConfigService) {
    this.txBaseUrl = config.get<string>(
      'TRANSACTION_SERVICE_URL',
      'http://localhost:3002',
    );
    this.internalKey = config.get<string>('INTERNAL_API_KEY', '');
  }

  /**
   * Validate one CSV row and create the transaction via transaction-service.
   * Throws InvalidRowError for bad data (caller acks & drops), or a generic
   * Error for transient failures (caller nacks & retries).
   */
  async processRow(event: ImportRowEvent): Promise<void> {
    const dto = this.validate(event);

    const res = await fetch(`${this.txBaseUrl}/api/transactions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        [INTERNAL_HEADER]: this.internalKey,
        [INTERNAL_USER_HEADER]: event.userId,
      },
      body: JSON.stringify(dto),
    });

    if (res.status === 401 || res.status === 403) {
      // Misconfiguration (bad internal key) — retrying won't help, but this is
      // operational, not a bad row. Surface loudly and drop to avoid a hot loop.
      const body = await res.text();
      throw new InvalidRowError(
        `auth rejected by transaction-service (${res.status}): ${body}`,
      );
    }
    if (res.status >= 400 && res.status < 500) {
      const body = await res.text();
      throw new InvalidRowError(
        `row ${event.rowNumber} rejected (${res.status}): ${body}`,
      );
    }
    if (!res.ok) {
      // 5xx / network — transient, let the caller retry.
      throw new Error(
        `transaction-service ${res.status} on row ${event.rowNumber}`,
      );
    }

    this.logger.log(
      `row ${event.rowNumber}: created ${dto.type} ${dto.amount} "${dto.category}" for ${event.userId}`,
    );
  }

  private validate(event: ImportRowEvent) {
    const { type, amount, category, occurredAt, rowNumber } = event;

    if (type !== 'income' && type !== 'expense') {
      throw new InvalidRowError(`row ${rowNumber}: bad type "${type}"`);
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      throw new InvalidRowError(`row ${rowNumber}: bad amount "${amount}"`);
    }
    if (!category) {
      throw new InvalidRowError(`row ${rowNumber}: missing category`);
    }
    const when = new Date(occurredAt ?? '');
    if (Number.isNaN(when.getTime())) {
      throw new InvalidRowError(
        `row ${rowNumber}: bad occurredAt "${occurredAt}"`,
      );
    }

    return {
      type,
      amount: Math.round(amt * 100) / 100,
      category,
      note: event.note,
      occurredAt: when.toISOString(),
    };
  }
}
