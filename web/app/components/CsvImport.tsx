'use client';

import { useState } from 'react';
import { txApi } from '@/lib/api';
import { useToast } from '@/lib/toast';
import {
  ParseResult,
  parseCsvText,
  parseImportFile,
  rowsToCsv,
} from '@/lib/importParser';
import { ReviewTable, EditableRow } from './ReviewTable';

const SAMPLE = `type,amount,category,occurredAt,note
expense,350000,groceries,2026-07-01T10:00:00Z,đi chợ
income,18000000,salary,2026-07-01T09:00:00Z,lương tháng 7
expense,45000,coffee,2026-07-02T08:00:00Z,`;

let ROW_SEQ = 0;

export function CsvImport({ onDone }: { onDone: () => void }) {
  const toast = useToast();
  const [csv, setCsv] = useState('');
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<EditableRow[] | null>(null);
  const [errors, setErrors] = useState<ParseResult['errors']>([]);
  const [busy, setBusy] = useState(false);

  function ingest(result: ParseResult) {
    setRows(result.rows.map((r) => ({ ...r, _id: ++ROW_SEQ })));
    setErrors(result.errors);
    if (result.rows.length === 0) {
      toast('No valid rows found.', 'err');
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setCsv('');
    try {
      ingest(await parseImportFile(file));
    } catch {
      toast('Could not read that file. Is it a valid Excel/CSV?', 'err');
      reset();
    }
  }

  function onPaste(text: string) {
    setCsv(text);
    setFileName('');
    if (text.trim()) ingest(parseCsvText(text));
    else {
      setRows(null);
      setErrors([]);
    }
  }

  async function submit() {
    if (!rows || rows.length === 0) return;
    const bad = rows.find((r) => !r.amount || r.amount <= 0);
    if (bad) {
      toast('Every row needs an amount greater than 0.', 'err');
      return;
    }
    setBusy(true);
    try {
      const res = await txApi.importCsv(rowsToCsv(rows));
      toast(`Queued ${res.enqueued} transaction(s) for import.`, 'ok');
      reset();
      setTimeout(onDone, 1500);
    } catch (e) {
      toast((e as Error).message, 'err');
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setCsv('');
    setFileName('');
    setRows(null);
    setErrors([]);
  }

  return (
    <div className="card">
      <h3 className="section-title">📥 Import from Excel / CSV</h3>
      <p className="hint" style={{ marginTop: -10, marginBottom: 14 }}>
        Upload a <code>.xlsx</code> / <code>.csv</code> or paste rows.{' '}
        <strong>Techcombank statements are auto-detected</strong>. Review &amp;
        edit everything below before importing — missing category defaults to{' '}
        <code>other</code>.
      </p>

      <div className="field">
        <label className="filepick">
          <input
            type="file"
            accept=".csv,.xlsx,.xls,text/csv"
            onChange={onFile}
            style={{ display: 'none' }}
          />
          <span className="btn btn-ghost">Choose file…</span>
          <span className="hint">{fileName || 'or paste below'}</span>
        </label>
      </div>

      {!fileName && !rows && (
        <div className="field">
          <textarea
            rows={4}
            value={csv}
            onChange={(e) => onPaste(e.target.value)}
            placeholder={SAMPLE}
            style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13 }}
          />
        </div>
      )}

      {rows && (
        <div className="fade-in">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 10,
            }}
          >
            <strong style={{ fontSize: 14 }}>
              Review {rows.length} transaction(s)
            </strong>
            <span className="hint">Edit any cell, or ✕ to drop a row</span>
          </div>

          {rows.length > 0 ? (
            <ReviewTable rows={rows} onChange={setRows} />
          ) : (
            <div className="empty" style={{ padding: 24 }}>
              All rows removed.
            </div>
          )}

          {errors.length > 0 && (
            <div className="hint" style={{ marginTop: 10 }}>
              ⚠️ {errors.length} row(s) couldn&apos;t be read and were left out:{' '}
              {errors
                .slice(0, 3)
                .map((e) => `row ${e.row} (${e.reason})`)
                .join(', ')}
              {errors.length > 3 && ` +${errors.length - 3} more`}
            </div>
          )}
        </div>
      )}

      <div className="row" style={{ alignItems: 'center', marginTop: 14 }}>
        {!rows && (
          <button
            className="btn-ghost"
            onClick={() => onPaste(SAMPLE)}
            type="button"
            style={{ flex: '0 0 auto' }}
          >
            Use sample
          </button>
        )}
        <span className="spacer" />
        {rows && (
          <button
            className="btn-ghost"
            onClick={reset}
            type="button"
            style={{ flex: '0 0 auto' }}
          >
            Cancel
          </button>
        )}
        <button
          onClick={submit}
          disabled={busy || !rows || rows.length === 0}
          style={{ flex: '0 0 auto' }}
        >
          {busy
            ? 'Importing…'
            : rows?.length
              ? `Import ${rows.length}`
              : 'Import'}
        </button>
      </div>
    </div>
  );
}
