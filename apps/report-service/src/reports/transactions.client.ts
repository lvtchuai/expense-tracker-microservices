import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { INTERNAL_HEADER, INTERNAL_USER_HEADER } from '@app/common';

export interface TxRecord {
  id: string;
  type: 'income' | 'expense';
  amount: string;
  category: string;
  occurredAt: string;
}

/**
 * Reads a user's transactions from transaction-service over HTTP, using the
 * internal service key. Keeps database-per-service intact — report-service
 * never touches the transactions DB directly.
 */
@Injectable()
export class TransactionsClient {
  private readonly logger = new Logger(TransactionsClient.name);
  private readonly baseUrl: string;
  private readonly internalKey: string;
  private static readonly PAGE = 100;

  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>(
      'TRANSACTION_SERVICE_URL',
      'http://localhost:3002',
    );
    this.internalKey = config.get<string>('INTERNAL_API_KEY', '');
  }

  /** Fetch ALL transactions in [from, to) for a user, paging as needed. */
  async fetchRange(
    userId: string,
    from: string,
    to: string,
  ): Promise<TxRecord[]> {
    const all: TxRecord[] = [];
    let offset = 0;

    for (;;) {
      const url = new URL(`${this.baseUrl}/api/transactions`);
      url.searchParams.set('from', from);
      url.searchParams.set('to', to);
      url.searchParams.set('limit', String(TransactionsClient.PAGE));
      url.searchParams.set('offset', String(offset));

      const res = await fetch(url, {
        headers: {
          [INTERNAL_HEADER]: this.internalKey,
          [INTERNAL_USER_HEADER]: userId,
        },
      });
      if (!res.ok) {
        throw new Error(`transaction-service returned ${res.status}`);
      }
      const page = (await res.json()) as { items: TxRecord[]; total: number };
      all.push(...page.items);

      offset += TransactionsClient.PAGE;
      if (offset >= page.total || page.items.length === 0) break;
    }

    this.logger.log(`fetched ${all.length} txns for ${userId} in ${from}..${to}`);
    return all;
  }
}
