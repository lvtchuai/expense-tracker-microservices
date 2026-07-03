import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { NotificationType } from '@app/common';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Recipient (users.id from auth-service). */
  @Index()
  @Column({ name: 'recipient_id' })
  recipientId: string;

  @Column({ type: 'varchar', length: 32 })
  type: NotificationType;

  @Column()
  title: string;

  @Column()
  body: string;

  @Column({ nullable: true })
  link?: string;

  @Index()
  @Column({ default: false })
  read: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
