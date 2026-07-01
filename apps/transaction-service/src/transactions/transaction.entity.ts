import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type TransactionType = 'income' | 'expense';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Owner (users.id from auth-service). No FK — separate DB per service. */
  @Index()
  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 16 })
  type: TransactionType;

  /** Stored as numeric to avoid float rounding on money. */
  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: string;

  @Column({ length: 64 })
  category: string;

  @Column({ nullable: true })
  note?: string;

  @Column({ name: 'occurred_at', type: 'timestamptz' })
  occurredAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
