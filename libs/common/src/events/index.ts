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
