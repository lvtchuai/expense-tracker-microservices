import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Group } from './group.entity';

/**
 * A shared expense: one member paid `amount`, split evenly among
 * `participantIds`. Balances are derived from these rows (not stored).
 */
@Entity('group_expenses')
export class GroupExpense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Group, (g) => g.expenses, { onDelete: 'CASCADE' })
  group: Group;

  @Column({ name: 'group_id' })
  groupId: string;

  /** userId of the member who paid. */
  @Column({ name: 'paid_by' })
  paidBy: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: string;

  @Column()
  description: string;

  /** userIds the expense is split evenly across. */
  @Column({ type: 'jsonb', name: 'participant_ids' })
  participantIds: string[];

  @Column({ name: 'occurred_at', type: 'timestamptz' })
  occurredAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
