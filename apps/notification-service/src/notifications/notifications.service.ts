import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationCreatedEvent } from '@app/common';
import { Notification } from './notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
  ) {}

  /** Persist an incoming notification event. */
  store(event: NotificationCreatedEvent) {
    const n = this.repo.create({
      recipientId: event.recipientId,
      type: event.type,
      title: event.title,
      body: event.body,
      link: event.link,
      read: false,
    });
    return this.repo.save(n);
  }

  list(userId: string, limit = 20) {
    return this.repo.find({
      where: { recipientId: userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  unreadCount(userId: string) {
    return this.repo.count({ where: { recipientId: userId, read: false } });
  }

  async markRead(userId: string, id: string) {
    await this.repo.update({ id, recipientId: userId }, { read: true });
    return { ok: true };
  }

  async markAllRead(userId: string) {
    await this.repo.update({ recipientId: userId, read: false }, { read: true });
    return { ok: true };
  }
}
