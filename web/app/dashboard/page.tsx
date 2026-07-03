'use client';

import { useCallback, useEffect, useState } from 'react';
import { Summary, Transaction, txApi } from '@/lib/api';
import { useRequireAuth } from '@/lib/useAuth';
import { useToast } from '@/lib/toast';
import { CATEGORIES, categoryIcon, money } from '@/lib/format';
import { TopBar } from '../components/TopBar';
import { CsvImport } from '../components/CsvImport';
import { AmountInput } from '../components/AmountInput';
import { EditModal } from '../components/EditModal';
import { TransactionList } from '../components/TransactionList';

export default function DashboardPage() {
  const { user, ready } = useRequireAuth();
  const toast = useToast();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [editing, setEditing] = useState<Transaction | null>(null);
  // Bumped after any mutation → TransactionList reloads and summary refreshes.
  const [refreshKey, setRefreshKey] = useState(0);

  // add-form state
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('groceries');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  // Reload summary; TransactionList reloads itself off refreshKey.
  const loadSummary = useCallback(async () => {
    try {
      setSummary(await txApi.summary());
    } catch (e) {
      toast((e as Error).message, 'err');
    }
  }, [toast]);

  useEffect(() => {
    if (ready) loadSummary();
  }, [ready, loadSummary, refreshKey]);

  // Called after any create/edit/delete/import.
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  async function addTransaction(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      toast('Please enter an amount greater than 0.', 'err');
      return;
    }
    setSaving(true);
    try {
      await txApi.create({
        type,
        amount: amt,
        category,
        note: note || undefined,
        occurredAt: new Date(date + 'T12:00:00Z').toISOString(),
      });
      toast(`${type === 'expense' ? 'Expense' : 'Income'} added.`, 'ok');
      setAmount('');
      setNote('');
      refresh();
    } catch (e) {
      toast((e as Error).message, 'err');
    } finally {
      setSaving(false);
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
                  <AmountInput value={amount} onChange={setAmount} />
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

          {/* Quick tips card next to the add form */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h3 className="section-title">💡 Tips</h3>
            <ul className="tips">
              <li>Add single transactions on the left.</li>
              <li>
                Import many at once below — upload a Techcombank statement
                (<code>.xlsx</code>) and it&apos;s parsed automatically.
              </li>
              <li>Review &amp; edit every row before it&apos;s saved.</li>
              <li>See charts &amp; monthly breakdowns on the Reports page.</li>
            </ul>
          </div>
        </div>

        {/* CSV / Excel import — full width for the review table */}
        <CsvImport onDone={refresh} />

        {/* Transactions: filter bar + table + pagination */}
        <TransactionList
          refreshKey={refreshKey}
          onEdit={setEditing}
          onChanged={refresh}
        />
      </div>

      {editing && (
        <EditModal
          tx={editing}
          onClose={() => setEditing(null)}
          onSaved={refresh}
        />
      )}
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
