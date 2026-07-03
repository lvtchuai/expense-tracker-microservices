import {
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Group } from './group.entity';

/** A user (from auth-service) who belongs to a group. */
@Entity('group_members')
@Unique(['group', 'userId'])
export class GroupMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Group, (g) => g.members, { onDelete: 'CASCADE' })
  group: Group;

  @Index()
  @Column({ name: 'user_id' })
  userId: string;

  @Column()
  email: string;

  @Column({ name: 'display_name', nullable: true })
  displayName?: string;
}
