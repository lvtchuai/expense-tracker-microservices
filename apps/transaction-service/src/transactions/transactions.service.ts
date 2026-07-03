import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  IMPORT_ROW,
  ImportRowEvent,
  TRANSACTION_CREATED,
  TransactionCreatedEvent,
} from '@app/common';
import { Transaction } from './transaction.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { QueryTransactionDto } from './dto/query-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

/** DI tokens for the RabbitMQ client proxies. */
export const EVENT_BUS = 'EVENT_BUS';
export const IMPORT_BUS = 'IMPORT_BUS';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly repo: Repository<Transaction>,
    @Inject(EVENT_BUS) private readonly events: ClientProxy,
    @Inject(IMPORT_BUS) private readonly importBus: ClientProxy,
  ) {}

  /**
   * Parse CSV and enqueue one message per data row. Returns immediately;
   * import-worker does the real work. Header row (starts with "type") is
   * skipped. Blank lines are ignored.
   */
  enqueueImport(userId: string, csv: string) {
    const lines = csv
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    let enqueued = 0;
    let rowNumber = 0;
    for (const line of lines) {
      rowNumber++;
      // Skip an optional header row.
      if (rowNumber === 1 && /^type\s*,/i.test(line)) continue;

      const [type, amount, category, occurredAt, note] = line
        .split(',')
        .map((c) => c?.trim());

      const event: ImportRowEvent = {
        userId,
        rowNumber,
        type,
        amount,
        category,
        occurredAt,
        note: note || undefined,
      };
      this.importBus.emit(IMPORT_ROW, event);
      enqueued++;
    }

    this.logger.log(`enqueued ${enqueued} import row(s) for user ${userId}`);
    return { enqueued };
  }

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
    if (query.from)
      qb.andWhere('t.occurred_at >= :from', { from: query.from });
    if (query.to) qb.andWhere('t.occurred_at < :to', { to: query.to });
    if (query.search)
      qb.andWhere('(t.note ILIKE :q OR t.category ILIKE :q)', {
        q: `%${query.search}%`,
      });

    const [items, total] = await qb.getManyAndCount();
    return { items, total, limit: query.limit, offset: query.offset };
  }

  async findOne(userId: string, id: string) {
    const tx = await this.repo.findOne({ where: { id, userId } });
    if (!tx) throw new NotFoundException('transaction not found');
    return tx;
  }

  async update(userId: string, id: string, dto: UpdateTransactionDto) {
    const tx = await this.repo.findOne({ where: { id, userId } });
    if (!tx) throw new NotFoundException('transaction not found');

    if (dto.type !== undefined) tx.type = dto.type;
    if (dto.amount !== undefined) tx.amount = dto.amount.toFixed(2);
    if (dto.category !== undefined) tx.category = dto.category;
    if (dto.note !== undefined) tx.note = dto.note;
    if (dto.occurredAt !== undefined) tx.occurredAt = new Date(dto.occurredAt);

    return this.repo.save(tx);
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
