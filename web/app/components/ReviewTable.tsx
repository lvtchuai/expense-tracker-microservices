'use client';

import { ParsedRow } from '@/lib/importParser';
import { CATEGORIES, categoryIcon } from '@/lib/format';

/** A parsed row plus a stable id for editing/deleting in the UI. */
export interface EditableRow extends ParsedRow {
  _id: number;
}

export function ReviewTable({
  rows,
  onChange,
}: {
  rows: EditableRow[];
  onChange: (rows: EditableRow[]) => void;
}) {
  function update(id: number, patch: Partial<EditableRow>) {
    onChange(rows.map((r) => (r._id === id ? { ...r, ...patch } : r)));
  }
  function remove(id: number) {
    onChange(rows.filter((r) => r._id !== id));
  }

  return (
    <div className="table-wrap review-table">
      <table>
        <thead>
          <tr>
            <th style={{ width: 120 }}>Type</th>
            <th style={{ width: 130 }}>Amount ₫</th>
            <th style={{ width: 150 }}>Category</th>
            <th style={{ width: 140 }}>Date</th>
            <th>Note</th>
            <th style={{ width: 40 }}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r._id}>
              <td>
                <div className="seg seg-sm">
                  <button
                    type="button"
                    className={r.type === 'expense' ? 'on-expense' : ''}
                    onClick={() => update(r._id, { type: 'expense' })}
                  >
                    Chi
                  </button>
                  <button
                    type="button"
                    className={r.type === 'income' ? 'on-income' : ''}
                    onClick={() => update(r._id, { type: 'income' })}
                  >
                    Thu
                  </button>
                </div>
              </td>
              <td>
                <input
                  className="cell-input"
                  type="text"
                  inputMode="numeric"
                  value={r.amount ? r.amount.toLocaleString('vi-VN') : ''}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '');
                    update(r._id, { amount: digits ? Number(digits) : 0 });
                  }}
                />
              </td>
              <td>
                <select
                  className="cell-input"
                  value={r.category}
                  onChange={(e) => update(r._id, { category: e.target.value })}
                >
                  {/* keep an unknown value visible if it isn't in the list */}
                  {!CATEGORIES.includes(r.category) && (
                    <option value={r.category}>{r.category}</option>
                  )}
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {categoryIcon(c)} {c}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <input
                  className="cell-input"
                  type="date"
                  value={r.occurredAt.slice(0, 10)}
                  onChange={(e) => {
                    const d = e.target.value;
                    if (d)
                      update(r._id, {
                        occurredAt: new Date(d + 'T12:00:00Z').toISOString(),
                      });
                  }}
                />
              </td>
              <td>
                <input
                  className="cell-input"
                  type="text"
                  value={r.note ?? ''}
                  placeholder="—"
                  onChange={(e) =>
                    update(r._id, { note: e.target.value || undefined })
                  }
                />
              </td>
              <td style={{ textAlign: 'center' }}>
                <button
                  type="button"
                  className="row-del"
                  title="Remove row"
                  onClick={() => remove(r._id)}
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
