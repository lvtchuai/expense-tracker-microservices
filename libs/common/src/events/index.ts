/**
 * Event contract shared by producers and consumers.
 * The RabbitMQ message `pattern` MUST match on both sides.
 */

/** Emitted by transaction-service whenever a transaction is created. */
export const TRANSACTION_CREATED = 'transaction.created';

export interface TransactionCreatedEvent {
  transactionId: string;
  userId: string;
  type: 'income' | 'expense';
  amount: string; // numeric-as-string, matches the entity
  category: string;
  occurredAt: string; // ISO
}

/** Name of the queue notification-service consumes from. */
export const NOTIFICATIONS_QUEUE = 'notifications_queue';

// --- CSV import flow ---

/** Queue import-worker consumes from (one message per CSV row). */
export const IMPORT_QUEUE = 'import_queue';

/** Emitted once per CSV row by transaction-service's import endpoint. */
export const IMPORT_ROW = 'transaction.import.row';

export interface ImportRowEvent {
  /** Owner the imported transaction belongs to. */
  userId: string;
  /** 1-based row number in the uploaded file, for error reporting. */
  rowNumber: number;
  /** Raw parsed columns; worker validates before creating. */
  type?: string;
  amount?: string;
  category?: string;
  note?: string;
  occurredAt?: string;
}
