import { Injectable } from '@nestjs/common';
import { TransactionsClient, TxRecord } from './transactions.client';

interface CategoryBucket {
  category: string;
  total: number;
  count: number;
}

@Injectable()
export class ReportsService {
  constructor(private readonly txClient: TransactionsClient) {}

  /**
   * Monthly report for a user. Fetches the month's transactions from
   * transaction-service, then does the aggregation in-process. The rollup is
   * intentionally computed here (not in SQL) so this service carries real CPU
   * work — it's the workload we scale on CPU (HPA) in K8s.
   */
  async monthly(userId: string, year: number, month: number) {
    const from = this.monthStart(year, month);
    const to = this.monthStart(month === 12 ? year + 1 : year, (month % 12) + 1);
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevFrom = this.monthStart(prevYear, prevMonth);

    const [current, previous] = await Promise.all([
      this.txClient.fetchRange(userId, from, to),
      this.txClient.fetchRange(userId, prevFrom, from),
    ]);

    const cur = this.aggregate(current, year, month);
    const prevExpense = this.sum(previous, 'expense');

    return {
      period: { year, month },
      totals: cur.totals,
      byCategory: cur.byCategory,
      dailyExpense: cur.dailyExpense,
      topExpenseCategories: cur.byCategory
        .filter((c) => c.total > 0)
        .slice(0, 5),
      comparedToPrevMonth: {
        prevExpense: prevExpense.toFixed(2),
        deltaExpense: (cur.totals.expenseNum - prevExpense).toFixed(2),
        pctChange:
          prevExpense === 0
            ? null
            : (
                ((cur.totals.expenseNum - prevExpense) / prevExpense) *
                100
              ).toFixed(1),
      },
      transactionCount: current.length,
    };
  }

  private aggregate(txns: TxRecord[], year: number, month: number) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const dailyExpense = new Array<number>(daysInMonth).fill(0);
    const byCatMap = new Map<string, CategoryBucket>();

    let income = 0;
    let expense = 0;

    for (const t of txns) {
      const amt = Number(t.amount);
      if (t.type === 'income') {
        income += amt;
      } else {
        expense += amt;
        const day = new Date(t.occurredAt).getUTCDate();
        if (day >= 1 && day <= daysInMonth) dailyExpense[day - 1] += amt;

        const bucket = byCatMap.get(t.category) ?? {
          category: t.category,
          total: 0,
          count: 0,
        };
        bucket.total += amt;
        bucket.count += 1;
        byCatMap.set(t.category, bucket);
      }
    }

    const byCategory = [...byCatMap.values()]
      .map((b) => ({ ...b, total: round2(b.total) }))
      .sort((a, b) => b.total - a.total);

    return {
      totals: {
        income: income.toFixed(2),
        expense: expense.toFixed(2),
        balance: (income - expense).toFixed(2),
        expenseNum: round2(expense),
      },
      byCategory,
      dailyExpense: dailyExpense.map(round2),
    };
  }

  private sum(txns: TxRecord[], type: 'income' | 'expense') {
    return round2(
      txns
        .filter((t) => t.type === type)
        .reduce((s, t) => s + Number(t.amount), 0),
    );
  }

  private monthStart(year: number, month: number): string {
    const mm = String(month).padStart(2, '0');
    return `${year}-${mm}-01T00:00:00.000Z`;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
