import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from './transaction.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { QueryTransactionDto } from './dto/query-transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly repo: Repository<Transaction>,
  ) {}

  create(userId: string, dto: CreateTransactionDto) {
    const tx = this.repo.create({
      userId,
      type: dto.type,
      amount: dto.amount.toFixed(2),
      category: dto.category,
      note: dto.note,
      occurredAt: new Date(dto.occurredAt),
    });
    return this.repo.save(tx);
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
