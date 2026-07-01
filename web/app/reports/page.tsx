'use client';

import { useCallback, useEffect, useState } from 'react';
import { MonthlyReport, reportApi } from '@/lib/api';
import { useRequireAuth } from '@/lib/useAuth';
import { TopBar } from '../components/TopBar';
import { CategoryBars, DailyBars } from '../components/Charts';

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function money(n: string | number) {
  return Number(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function ReportsPage() {
  const { user, ready } = useRequireAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getUTCFullYear());
  const [month, setMonth] = useState(now.getUTCMonth() + 1);
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setReport(await reportApi.monthly(year, month));
    } catch (e) {
      setError((e as Error).message);
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  if (!ready) return null;

  const delta = report ? Number(report.comparedToPrevMonth.deltaExpense) : 0;

  return (
    <>
      <TopBar user={user} />
      <div className="container grid" style={{ gap: 20 }}>
        <div className="card">
          <div className="row" style={{ alignItems: 'flex-end' }}>
            <div>
              <label>Month</label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Year</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              />
            </div>
            <button onClick={load} disabled={loading}>
              {loading ? 'Loading…' : 'View report'}
            </button>
          </div>
          <p className="muted" style={{ fontSize: 13, marginBottom: 0 }}>
            Computed by <strong>report-service</strong>, which fetches this
            month&apos;s transactions from transaction-service and aggregates
            them.
          </p>
        </div>

        {error && <div className="error">{error}</div>}

        {report && (
          <>
            <div className="grid grid-3">
              <div className="card stat">
                <div className="label">Income</div>
                <div className="value pos">+{money(report.totals.income)}</div>
              </div>
              <div className="card stat">
                <div className="label">Expense</div>
                <div className="value neg">−{money(report.totals.expense)}</div>
              </div>
              <div className="card stat">
                <div className="label">vs last month</div>
                <div className={`value ${delta > 0 ? 'neg' : 'pos'}`}>
                  {delta > 0 ? '+' : ''}
                  {money(report.comparedToPrevMonth.deltaExpense)}
                  {report.comparedToPrevMonth.pctChange !== null && (
                    <span style={{ fontSize: 14 }} className="muted">
                      {' '}
                      ({report.comparedToPrevMonth.pctChange}%)
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-2">
              <div className="card">
                <h3 className="section-title">Spending by category</h3>
                <CategoryBars data={report.byCategory} />
              </div>
              <div className="card">
                <h3 className="section-title">Top categories</h3>
                {report.topExpenseCategories.length === 0 ? (
                  <div className="empty">No expenses this month.</div>
                ) : (
                  <table>
                    <tbody>
                      {report.topExpenseCategories.map((c, i) => (
                        <tr key={c.category}>
                          <td className="muted">#{i + 1}</td>
                          <td>{c.category}</td>
                          <td className="muted">{c.count}×</td>
                          <td style={{ textAlign: 'right' }} className="neg">
                            {money(c.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="card">
              <h3 className="section-title">
                Daily expense — {MONTHS[report.period.month - 1]}{' '}
                {report.period.year}
              </h3>
              <DailyBars data={report.dailyExpense} />
              <p className="muted" style={{ fontSize: 13 }}>
                {report.transactionCount} transaction(s) this month.
              </p>
            </div>
          </>
        )}

        {!report && !loading && !error && (
          <div className="empty">No data for this period.</div>
        )}
      </div>
    </>
  );
}
