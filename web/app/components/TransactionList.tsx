'use client';

import { useCallback, useEffect, useState } from 'react';
import { Transaction, TxFilters, txApi } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { CATEGORIES, categoryColor, categoryIcon, money } from '@/lib/format';

const PAGE_SIZE = 10;
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function monthRange(year: number, month: number) {
  const from = `${year}-${String(month).padStart(2, '0')}-01T00:00:00.000Z`;
  const ny = month === 12 ? year + 1 : year;
  const nm = month === 12 ? 1 : month + 1;
  const to = `${ny}-${String(nm).padStart(2, '0')}-01T00:00:00.000Z`;
  return { from, to };
}

export function TransactionList({
  refreshKey,
  onEdit,
  onChanged,
}: {
  refreshKey: number;
  onEdit: (t: Transaction) => void;
  onChanged: () => void;
}) {
  const toast = useToast();
  const now = new Date();

  const [type, setType] = useState<'' | 'income' | 'expense'>('');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [monthKey, setMonthKey] = useState(''); // "" = all, else "YYYY-M"
  const [page, setPage] = useState(0);

  const [items, setItems] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const filters: TxFilters = {
        type: type || undefined,
        category: category || undefined,
        search: search || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      };
      if (monthKey) {
        const [y, m] = monthKey.split('-').map(Number);
        Object.assign(filters, monthRange(y, m));
      }
      const res = await txApi.list(filters);
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      toast((e as Error).message, 'err');
    } finally {
      setLoading(false);
    }
  }, [type, category, search, monthKey, page, toast]);

  // Reload on filter/page change and when the parent bumps refreshKey.
  useEffect(() => {
    load();
  }, [load, refreshKey]);

  // Any filter change resets to page 0.
  function setFilter(fn: () => void) {
    setPage(0);
    fn();
  }

  async function remove(id: string) {
    try {
      await txApi.remove(id);
      toast('Transaction deleted.', 'info');
      onChanged();
    } catch (e) {
      toast((e as Error).message, 'err');
    }
  }

  const pages = Math.ceil(total / PAGE_SIZE);
  const hasFilters = type || category || search || monthKey;

  // Build a small month list: current + previous 11 months.
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getUTCFullYear(), now.getUTCMonth() - i, 1);
    return { key: `${d.getFullYear()}-${d.getMonth() + 1}`, label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}` };
  });

  return (
    <div className="card">
      <div className="list-head">
        <h3 className="section-title" style={{ margin: 0 }}>
          🧾 Transactions
          <span className="hint" style={{ fontWeight: 400 }}>
            · {total}
          </span>
        </h3>
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        <input
          className="cell-input"
          placeholder="🔍 Search note or category…"
          value={search}
          onChange={(e) => setFilter(() => setSearch(e.target.value))}
        />
        <select
          className="cell-input"
          value={type}
          onChange={(e) =>
            setFilter(() => setType(e.target.value as typeof type))
          }
        >
          <option value="">All types</option>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
        <select
          className="cell-input"
          value={category}
          onChange={(e) => setFilter(() => setCategory(e.target.value))}
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {categoryIcon(c)} {c}
            </option>
          ))}
        </select>
        <select
          className="cell-input"
          value={monthKey}
          onChange={(e) => setFilter(() => setMonthKey(e.target.value))}
        >
          <option value="">All time</option>
          {monthOptions.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </select>
        {hasFilters && (
          <button
            className="btn-ghost"
            onClick={() =>
              setFilter(() => {
                setType('');
                setCategory('');
                setSearch('');
                setMonthKey('');
              })
            }
          >
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 20 }} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="empty">
          <span className="emoji">{hasFilters ? '🔍' : '🗒️'}</span>
          {hasFilters
            ? 'No transactions match these filters.'
            : 'No transactions yet.'}
        </div>
      ) : (
        <>
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
                      <div className="row-actions">
                        <button className="btn-edit" onClick={() => onEdit(t)}>
                          Edit
                        </button>
                        <button
                          className="btn-danger"
                          onClick={() => remove(t.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div className="pager">
              <button
                className="btn-ghost"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                ← Prev
              </button>
              <span className="hint">
                Page {page + 1} of {pages}
              </span>
              <button
                className="btn-ghost"
                disabled={page >= pages - 1}
                onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
