import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  TRANSACTION_CREATED,
  TransactionCreatedEvent,
} from '@app/common';
import { Transaction } from './transaction.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { QueryTransactionDto } from './dto/query-transaction.dto';

/** DI token for the RabbitMQ client proxy. */
export const EVENT_BUS = 'EVENT_BUS';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly repo: Repository<Transaction>,
    @Inject(EVENT_BUS) private readonly events: ClientProxy,
  ) {}

  async create(userId: string, dto: CreateTransactionDto) {
    const tx = this.repo.create({
      userId,
      type: dto.type,
      amount: dto.amount.toFixed(2),
      category: dto.category,
      note: dto.note,
      occurredAt: new Date(dto.occurredAt),
    });
    const saved = await this.repo.save(tx);

    this.publishCreated(saved);
    return saved;
  }

  /**
   * Fire-and-forget event emit. A broker outage must not fail the write —
   * we log and move on. (Phase 2 accepts at-most-once here; an outbox pattern
   * would be the production-grade upgrade.)
   */
  private publishCreated(tx: Transaction) {
    const payload: TransactionCreatedEvent = {
      transactionId: tx.id,
      userId: tx.userId,
      type: tx.type,
      amount: tx.amount,
      category: tx.category,
      occurredAt: tx.occurredAt.toISOString(),
    };
    this.events.emit(TRANSACTION_CREATED, payload).subscribe({
      error: (err) =>
        this.logger.warn(
          `failed to publish ${TRANSACTION_CREATED} for ${tx.id}: ${err?.message ?? err}`,
        ),
    });
  }

  async findAll(userId: string, query: QueryTransactionDto) {
    const qb = this.repo
      .createQueryBuilder('t')
      .where('t.user_id = :userId', { userId })
      .orderBy('t.occurred_at', 'DESC')
      .take(query.limit)
      .skip(query.offset);

    if (query.type) qb.andWhere('t.type = :type', { type: query.type });
    if (query.category)
      qb.andWhere('t.category = :category', { category: query.category });

    const [items, total] = await qb.getManyAndCount();
    return { items, total, limit: query.limit, offset: query.offset };
  }

  async findOne(userId: string, id: string) {
    const tx = await this.repo.findOne({ where: { id, userId } });
    if (!tx) throw new NotFoundException('transaction not found');
    return tx;
  }

  async remove(userId: string, id: string) {
    const result = await this.repo.delete({ id, userId });
    if (!result.affected) throw new NotFoundException('transaction not found');
    return { deleted: true, id };
  }

  /** Quick income/expense/balance rollup — precursor to report-service. */
  async summary(userId: string) {
    const rows = await this.repo
      .createQueryBuilder('t')
      .select('t.type', 'type')
      .addSelect('COALESCE(SUM(t.amount), 0)', 'total')
      .where('t.user_id = :userId', { userId })
      .groupBy('t.type')
      .getRawMany<{ type: string; total: string }>();

    const income = Number(rows.find((r) => r.type === 'income')?.total ?? 0);
    const expense = Number(rows.find((r) => r.type === 'expense')?.total ?? 0);
    return {
      income: income.toFixed(2),
      expense: expense.toFixed(2),
      balance: (income - expense).toFixed(2),
    };
  }
}
