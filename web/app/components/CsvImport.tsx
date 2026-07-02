'use client';

import { useState } from 'react';
import { txApi } from '@/lib/api';
import { useToast } from '@/lib/toast';

const SAMPLE = `type,amount,category,occurredAt,note
expense,45.90,groceries,2026-07-01T10:00:00Z,weekly shop
income,3000,salary,2026-07-01T09:00:00Z,july pay
expense,12.50,coffee,2026-07-02T08:00:00Z,`;

export function CsvImport({ onDone }: { onDone: () => void }) {
  const toast = useToast();
  const [csv, setCsv] = useState('');
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setCsv(await file.text());
      setFileName(file.name);
    }
  }

  async function submit() {
    setBusy(true);
    try {
      const res = await txApi.importCsv(csv);
      toast(
        `Queued ${res.enqueued} row(s) — import-worker is processing them.`,
        'ok',
      );
      setCsv('');
      setFileName('');
      // Give the worker a beat, then refresh the list.
      setTimeout(onDone, 1500);
    } catch (e) {
      toast((e as Error).message, 'err');
    } finally {
      setBusy(false);
    }
  }

  const rowCount = csv
    .split(/\r?\n/)
    .filter((l) => l.trim() && !/^type\s*,/i.test(l)).length;

  return (
    <div className="card">
      <h3 className="section-title">📥 Import from CSV</h3>
      <p className="hint" style={{ marginTop: -10, marginBottom: 14 }}>
        Columns: <code>type,amount,category,occurredAt</code> (note optional).
        Rows are queued and created asynchronously by <code>import-worker</code>.
      </p>

      <div className="field">
        <label className="filepick">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={onFile}
            style={{ display: 'none' }}
          />
          <span className="btn btn-ghost">Choose file…</span>
          <span className="hint">{fileName || 'or paste below'}</span>
        </label>
      </div>

      <div className="field">
        <textarea
          rows={5}
          value={csv}
          onChange={(e) => {
            setCsv(e.target.value);
            setFileName('');
          }}
          placeholder={SAMPLE}
          style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13 }}
        />
      </div>

      <div className="row" style={{ alignItems: 'center' }}>
        <button
          className="btn-ghost"
          onClick={() => setCsv(SAMPLE)}
          type="button"
          style={{ flex: '0 0 auto' }}
        >
          Use sample
        </button>
        <span className="hint" style={{ textAlign: 'right' }}>
          {rowCount > 0 ? `${rowCount} row(s) ready` : ''}
        </span>
        <button
          onClick={submit}
          disabled={busy || !csv.trim()}
          style={{ flex: '0 0 auto' }}
        >
          {busy ? 'Uploading…' : `Import${rowCount ? ` ${rowCount}` : ''}`}
        </button>
      </div>
    </div>
  );
}
