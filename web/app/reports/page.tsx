'use client';

import { useCallback, useEffect, useState } from 'react';
import { MonthlyReport, reportApi } from '@/lib/api';
import { useRequireAuth } from '@/lib/useAuth';
import { useToast } from '@/lib/toast';
import { categoryColor, categoryIcon, money } from '@/lib/format';
import { TopBar } from '../components/TopBar';
import { CategoryBars, DailyBars } from '../components/Charts';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function ReportsPage() {
  const { user, ready } = useRequireAuth();
  const toast = useToast();
  const now = new Date();
  const [year, setYear] = useState(now.getUTCFullYear());
  const [month, setMonth] = useState(now.getUTCMonth() + 1);
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setReport(await reportApi.monthly(year, month));
    } catch (e) {
      toast((e as Error).message, 'err');
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [year, month, toast]);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  if (!ready) return null;

  const delta = report ? Number(report.comparedToPrevMonth.deltaExpense) : 0;
  const pct = report?.comparedToPrevMonth.pctChange;

  return (
    <>
      <TopBar user={user} />
      <div className="container grid fade-in" style={{ gap: 22 }}>
        <div className="page-head">
          <h1 className="title">📊 Monthly report</h1>
          <p className="subtitle">
            Computed by <strong>report-service</strong>, which pulls this
            month&apos;s transactions from transaction-service and aggregates
            them.
          </p>
        </div>

        {/* Period picker */}
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
                min={2000}
                max={2100}
                onChange={(e) => setYear(Number(e.target.value))}
              />
            </div>
            <button onClick={load} disabled={loading} style={{ flex: '0 0 auto' }}>
              {loading ? 'Loading…' : 'View report'}
            </button>
          </div>
        </div>

        {loading && !report ? (
          <div className="card">
            <div className="skeleton" style={{ height: 200 }} />
          </div>
        ) : report ? (
          <>
            <div className="grid grid-3">
              <div className="card stat card-hover">
                <div className="stat-head">
                  <span className="icon icon-income">↗</span>Income
                </div>
                <div className="value pos">+{money(report.totals.income)}</div>
              </div>
              <div className="card stat card-hover">
                <div className="stat-head">
                  <span className="icon icon-expense">↘</span>Expense
                </div>
                <div className="value neg">−{money(report.totals.expense)}</div>
              </div>
              <div className="card stat card-hover">
                <div className="stat-head">
                  <span className="icon icon-balance">Δ</span>vs last month
                </div>
                <div className={`value ${delta > 0 ? 'neg' : 'pos'}`}>
                  {delta > 0 ? '+' : delta < 0 ? '−' : ''}
                  {money(Math.abs(delta))}
                  {pct !== null && pct !== undefined && (
                    <span className="hint" style={{ marginLeft: 6 }}>
                      {delta > 0 ? '▲' : '▼'} {Math.abs(Number(pct))}%
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
                <h3 className="section-title">🏆 Top categories</h3>
                {report.topExpenseCategories.length === 0 ? (
                  <div className="empty">
                    <span className="emoji">🎉</span>No spending this month.
                  </div>
                ) : (
                  <table>
                    <tbody>
                      {report.topExpenseCategories.map((c, i) => (
                        <tr key={c.category}>
                          <td className="muted" style={{ width: 28 }}>
                            #{i + 1}
                          </td>
                          <td>
                            <span
                              className="cat-dot"
                              style={{ background: categoryColor(c.category) }}
                            />
                            {categoryIcon(c.category)} {c.category}
                          </td>
                          <td className="hint">{c.count}×</td>
                          <td
                            style={{ textAlign: 'right', fontWeight: 600 }}
                            className="neg"
                          >
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
                📅 Daily expense — {MONTHS[report.period.month - 1]}{' '}
                {report.period.year}
                <span className="hint" style={{ fontWeight: 400 }}>
                  · {report.transactionCount} transaction(s)
                </span>
              </h3>
              <DailyBars data={report.dailyExpense} />
            </div>
          </>
        ) : (
          <div className="card">
            <div className="empty">
              <span className="emoji">📊</span>No data for this period.
            </div>
          </div>
        )}
      </div>
    </>
  );
}
