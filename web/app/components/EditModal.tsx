'use client';

import { useState } from 'react';
import { Transaction, txApi } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { CATEGORIES, categoryIcon } from '@/lib/format';
import { AmountInput } from './AmountInput';

export function EditModal({
  tx,
  onClose,
  onSaved,
}: {
  tx: Transaction;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [type, setType] = useState<'income' | 'expense'>(tx.type);
  // AmountInput keeps a digit-only string; strip decimals from the stored value.
  const [amount, setAmount] = useState(String(Math.round(Number(tx.amount))));
  const [category, setCategory] = useState(tx.category);
  const [note, setNote] = useState(tx.note ?? '');
  const [date, setDate] = useState(tx.occurredAt.slice(0, 10));
  const [saving, setSaving] = useState(false);

  async function save() {
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      toast('Amount must be greater than 0.', 'err');
      return;
    }
    setSaving(true);
    try {
      await txApi.update(tx.id, {
        type,
        amount: amt,
        category,
        note,
        occurredAt: new Date(date + 'T12:00:00Z').toISOString(),
      });
      toast('Transaction updated.', 'ok');
      onSaved();
      onClose();
    } catch (e) {
      toast((e as Error).message, 'err');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-head">
          <h3 className="section-title" style={{ margin: 0 }}>
            ✏️ Edit transaction
          </h3>
          <button className="row-del" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

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
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {!CATEGORIES.includes(category) && (
              <option value={category}>{category}</option>
            )}
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {categoryIcon(c)} {c}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Note</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="—"
          />
        </div>

        <div className="row" style={{ marginTop: 4 }}>
          <button className="btn-ghost" onClick={onClose} type="button">
            Cancel
          </button>
          <button onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
