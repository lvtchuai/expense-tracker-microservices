'use client';

import { useCallback, useEffect, useState } from 'react';
import { Summary, Transaction, txApi } from '@/lib/api';
import { useRequireAuth } from '@/lib/useAuth';
import { useToast } from '@/lib/toast';
import { categoryColor, categoryIcon, money } from '@/lib/format';
import { TopBar } from '../components/TopBar';
import { CsvImport } from '../components/CsvImport';

const CATEGORIES = [
  'groceries', 'dining', 'transport', 'coffee', 'rent',
  'utilities', 'salary', 'freelance', 'entertainment', 'other',
];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function DashboardPage() {
  const { user, ready } = useRequireAuth();
  const toast = useToast();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [items, setItems] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // add-form state
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('groceries');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [s, list] = await Promise.all([txApi.summary(), txApi.list(50)]);
      setSummary(s);
      setItems(list.items);
    } catch (e) {
      toast((e as Error).message, 'err');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (ready) refresh();
  }, [ready, refresh]);

  async function addTransaction(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await txApi.create({
        type,
        amount: Number(amount),
        category,
        note: note || undefined,
        occurredAt: new Date(date + 'T12:00:00Z').toISOString(),
      });
      toast(`${type === 'expense' ? 'Expense' : 'Income'} added.`, 'ok');
      setAmount('');
      setNote('');
      await refresh();
    } catch (e) {
      toast((e as Error).message, 'err');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    try {
      await txApi.remove(id);
      toast('Transaction deleted.', 'info');
      await refresh();
    } catch (e) {
      toast((e as Error).message, 'err');
    }
  }

  if (!ready) return null;

  return (
    <>
      <TopBar user={user} />
      <div className="container grid fade-in" style={{ gap: 22 }}>
        <div className="page-head">
          <h1 className="title">
            Hi{user?.displayName ? `, ${user.displayName}` : ''} 👋
          </h1>
          <p className="subtitle">Here&apos;s your money at a glance.</p>
        </div>

        {/* Summary */}
        <div className="grid grid-3">
          <StatCard
            label="Income"
            icon="↗"
            iconClass="icon-income"
            value={summary ? '+' + money(summary.income) : null}
            valueClass="pos"
          />
          <StatCard
            label="Expense"
            icon="↘"
            iconClass="icon-expense"
            value={summary ? '−' + money(summary.expense) : null}
            valueClass="neg"
          />
          <StatCard
            label="Balance"
            icon="≈"
            iconClass="icon-balance"
            value={summary ? money(summary.balance) : null}
            valueClass={
              summary && Number(summary.balance) < 0 ? 'neg' : undefined
            }
          />
        </div>

        <div className="grid grid-2">
          {/* Add form */}
          <div className="card">
            <h3 className="section-title">➕ Add transaction</h3>
            <form onSubmit={addTransaction}>
              <div className="field">
                <label>Type</label>
                <div className="seg">
                  <button
                    type="button"
                    className={type === 'expense' ? 'on-expense' : ''}
                    onClick={() => setType('expense')}
                  >
                    Expense
                  </button>
                  <button
                    type="button"
                    className={type === 'income' ? 'on-income' : ''}
                    onClick={() => setType('income')}
                  >
                    Income
                  </button>
                </div>
              </div>
              <div className="row" style={{ marginBottom: 15 }}>
                <div>
                  <label>Amount</label>
                  <div className="input-prefix">
                    <span>$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label>Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="field">
                <label>Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {categoryIcon(c)} {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Note (optional)</label>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. weekly shop"
                />
              </div>
              <button type="submit" disabled={saving} className="btn-block">
                {saving ? 'Saving…' : 'Add transaction'}
              </button>
            </form>
          </div>

          {/* CSV import */}
          <CsvImport onDone={refresh} />
        </div>

        {/* Transactions table */}
        <div className="card">
          <h3 className="section-title">
            🧾 Recent transactions
            {!loading && items.length > 0 && (
              <span className="hint" style={{ fontWeight: 400 }}>
                · {items.length}
              </span>
            )}
          </h3>

          {loading ? (
            <SkeletonRows />
          ) : items.length === 0 ? (
            <div className="empty">
              <span className="emoji">🗒️</span>
              No transactions yet.
              <div className="hint" style={{ marginTop: 6 }}>
                Add one above, or import a CSV to get started.
              </div>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Note</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((t) => (
                    <tr key={t.id}>
                      <td className="muted">{fmtDate(t.occurredAt)}</td>
                      <td>
                        <span
                          className="cat-dot"
                          style={{ background: categoryColor(t.category) }}
                        />
                        {categoryIcon(t.category)} {t.category}
                      </td>
                      <td className="muted">{t.note || '—'}</td>
                      <td
                        style={{ textAlign: 'right', fontWeight: 600 }}
                        className={t.type === 'income' ? 'pos' : 'neg'}
                      >
                        {t.type === 'income' ? '+' : '−'}
                        {money(t.amount)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn-danger"
                          onClick={() => remove(t.id)}
                          title="Delete"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function StatCard({
  label,
  icon,
  iconClass,
  value,
  valueClass,
}: {
  label: string;
  icon: string;
  iconClass: string;
  value: string | null;
  valueClass?: string;
}) {
  return (
    <div className="card stat card-hover">
      <div className="stat-head">
        <span className={`icon ${iconClass}`}>{icon}</span>
        {label}
      </div>
      {value === null ? (
        <div className="skeleton" style={{ height: 30, width: 120, marginTop: 12 }} />
      ) : (
        <div className={`value ${valueClass ?? ''}`}>{value}</div>
      )}
    </div>
  );
}

function SkeletonRows() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="skeleton" style={{ height: 20 }} />
      ))}
    </div>
  );
}
