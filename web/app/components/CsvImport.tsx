'use client';

import { useState } from 'react';
import { txApi } from '@/lib/api';

const SAMPLE = `type,amount,category,occurredAt,note
expense,45.90,groceries,2026-07-01T10:00:00Z,weekly shop
income,3000,salary,2026-07-01T09:00:00Z,july pay
expense,12.50,coffee,2026-07-02T08:00:00Z,`;

export function CsvImport({ onDone }: { onDone: () => void }) {
  const [csv, setCsv] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setCsv(await file.text());
  }

  async function submit() {
    setErr('');
    setMsg('');
    setBusy(true);
    try {
      const res = await txApi.importCsv(csv);
      setMsg(
        `Enqueued ${res.enqueued} row(s). They're processed asynchronously by import-worker — refresh in a moment.`,
      );
      setCsv('');
      // Give the worker a beat, then refresh the list.
      setTimeout(onDone, 1500);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h3 className="section-title">📥 Import CSV</h3>
      <p className="muted" style={{ fontSize: 13, marginTop: -8 }}>
        Columns: <code>type,amount,category,occurredAt[,note]</code>. Rows are
        queued and created by import-worker.
      </p>
      {err && <div className="error">{err}</div>}
      {msg && <div className="success">{msg}</div>}
      <div className="field">
        <input type="file" accept=".csv,text/csv" onChange={onFile} />
      </div>
      <div className="field">
        <textarea
          rows={5}
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          placeholder={SAMPLE}
          style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13 }}
        />
      </div>
      <div className="row">
        <button
          className="btn-ghost"
          onClick={() => setCsv(SAMPLE)}
          type="button"
        >
          Use sample
        </button>
        <button onClick={submit} disabled={busy || !csv.trim()}>
          {busy ? 'Uploading…' : 'Import'}
        </button>
      </div>
    </div>
  );
}
