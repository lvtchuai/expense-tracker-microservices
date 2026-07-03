import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { GroupMember } from './group-member.entity';
import { GroupExpense } from './group-expense.entity';

@Entity('groups')
export class Group {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  /** users.id of the creator (from auth-service). */
  @Column({ name: 'owner_id' })
  ownerId: string;

  @OneToMany(() => GroupMember, (m) => m.group, { cascade: true })
  members: GroupMember[];

  @OneToMany(() => GroupExpense, (e) => e.group)
  expenses: GroupExpense[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
