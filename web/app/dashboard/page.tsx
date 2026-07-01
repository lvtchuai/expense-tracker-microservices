'use client';

import { useCallback, useEffect, useState } from 'react';
import { Summary, Transaction, txApi } from '@/lib/api';
import { useRequireAuth } from '@/lib/useAuth';
import { TopBar } from '../components/TopBar';
import { CsvImport } from '../components/CsvImport';

const CATEGORIES = [
  'groceries',
  'dining',
  'transport',
  'coffee',
  'rent',
  'utilities',
  'salary',
  'freelance',
  'entertainment',
  'other',
];

function money(n: string | number) {
  return Number(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function DashboardPage() {
  const { user, ready } = useRequireAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [items, setItems] = useState<Transaction[]>([]);
  const [error, setError] = useState('');
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
      setError('');
      const [s, list] = await Promise.all([txApi.summary(), txApi.list(50)]);
      setSummary(s);
      setItems(list.items);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (ready) refresh();
  }, [ready, refresh]);

  async function addTransaction(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await txApi.create({
        type,
        amount: Number(amount),
        category,
        note: note || undefined,
        occurredAt: new Date(date + 'T12:00:00Z').toISOString(),
      });
      setAmount('');
      setNote('');
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    try {
      await txApi.remove(id);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (!ready) return null;

  return (
    <>
      <TopBar user={user} />
      <div className="container grid" style={{ gap: 20 }}>
        {error && <div className="error">{error}</div>}

        {/* Summary */}
        <div className="grid grid-3">
          <div className="card stat">
            <div className="label">Income</div>
            <div className="value pos">
              +{summary ? money(summary.income) : '—'}
            </div>
          </div>
          <div className="card stat">
            <div className="label">Expense</div>
            <div className="value neg">
              −{summary ? money(summary.expense) : '—'}
            </div>
          </div>
          <div className="card stat">
            <div className="label">Balance</div>
            <div className="value">
              {summary ? money(summary.balance) : '—'}
            </div>
          </div>
        </div>

        <div className="grid grid-2">
          {/* Add form */}
          <div className="card">
            <h3 className="section-title">➕ Add transaction</h3>
            <form onSubmit={addTransaction}>
              <div className="row" style={{ marginBottom: 14 }}>
                <div>
                  <label>Type</label>
                  <select
                    value={type}
                    onChange={(e) =>
                      setType(e.target.value as 'income' | 'expense')
                    }
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
                <div>
                  <label>Amount</label>
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
              <div className="row" style={{ marginBottom: 14 }}>
                <div>
                  <label>Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
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
                <label>Note (optional)</label>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. weekly shop"
                />
              </div>
              <button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Add transaction'}
              </button>
            </form>
          </div>

          {/* CSV import */}
          <CsvImport onDone={refresh} />
        </div>

        {/* Transactions table */}
        <div className="card">
          <h3 className="section-title">Recent transactions</h3>
          {loading ? (
            <div className="empty">Loading…</div>
          ) : items.length === 0 ? (
            <div className="empty">
              No transactions yet. Add one above or import a CSV.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Category</th>
                    <th>Note</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((t) => (
                    <tr key={t.id}>
                      <td>{t.occurredAt.slice(0, 10)}</td>
                      <td>
                        <span className={`badge badge-${t.type}`}>
                          {t.type}
                        </span>
                      </td>
                      <td>{t.category}</td>
                      <td className="muted">{t.note || '—'}</td>
                      <td
                        style={{ textAlign: 'right' }}
                        className={t.type === 'income' ? 'pos' : 'neg'}
                      >
                        {t.type === 'income' ? '+' : '−'}
                        {money(t.amount)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn-danger"
                          onClick={() => remove(t.id)}
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
