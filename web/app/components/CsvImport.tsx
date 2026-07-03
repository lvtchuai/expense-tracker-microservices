'use client';

import { useState } from 'react';
import { txApi } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { money } from '@/lib/format';
import {
  ParsedRow,
  ParseResult,
  parseCsvText,
  parseImportFile,
  rowsToCsv,
} from '@/lib/importParser';

const SAMPLE = `type,amount,category,occurredAt,note
expense,350000,groceries,2026-07-01T10:00:00Z,đi chợ
income,18000000,salary,2026-07-01T09:00:00Z,lương tháng 7
expense,45000,coffee,2026-07-02T08:00:00Z,`;

export function CsvImport({ onDone }: { onDone: () => void }) {
  const toast = useToast();
  const [csv, setCsv] = useState('');
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setCsv('');
    try {
      const result = await parseImportFile(file);
      setParsed(result);
      if (result.rows.length === 0) {
        toast('No valid rows found in that file.', 'err');
      }
    } catch {
      toast('Could not read that file. Is it a valid Excel/CSV?', 'err');
      setParsed(null);
    }
  }

  function onPaste(text: string) {
    setCsv(text);
    setFileName('');
    setParsed(text.trim() ? parseCsvText(text) : null);
  }

  async function submit() {
    if (!parsed || parsed.rows.length === 0) return;
    setBusy(true);
    try {
      const res = await txApi.importCsv(rowsToCsv(parsed.rows));
      toast(
        `Queued ${res.enqueued} row(s) — import-worker is processing them.`,
        'ok',
      );
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
    setParsed(null);
  }

  return (
    <div className="card">
      <h3 className="section-title">📥 Import from Excel / CSV</h3>
      <p className="hint" style={{ marginTop: -10, marginBottom: 14 }}>
        Upload a <code>.xlsx</code> / <code>.csv</code> or paste rows.{' '}
        <strong>Techcombank bank statements are auto-detected</strong> (debit →
        expense, credit → income). Otherwise use columns{' '}
        <code>type, amount, category, occurredAt, note</code> — order &amp;
        header names are flexible; missing category becomes <code>other</code>.
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

      {!fileName && (
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

      {parsed && <Preview parsed={parsed} />}

      <div className="row" style={{ alignItems: 'center', marginTop: 4 }}>
        <button
          className="btn-ghost"
          onClick={() => onPaste(SAMPLE)}
          type="button"
          style={{ flex: '0 0 auto' }}
        >
          Use sample
        </button>
        <span className="spacer" />
        {parsed && (
          <button
            className="btn-ghost"
            onClick={reset}
            type="button"
            style={{ flex: '0 0 auto' }}
          >
            Clear
          </button>
        )}
        <button
          onClick={submit}
          disabled={busy || !parsed || parsed.rows.length === 0}
          style={{ flex: '0 0 auto' }}
        >
          {busy
            ? 'Uploading…'
            : parsed?.rows.length
              ? `Import ${parsed.rows.length}`
              : 'Import'}
        </button>
      </div>
    </div>
  );
}

function Preview({ parsed }: { parsed: ParseResult }) {
  const preview = parsed.rows.slice(0, 4);
  return (
    <div
      className="field"
      style={{
        background: 'var(--panel-2)',
        borderRadius: 'var(--radius-sm)',
        padding: 12,
      }}
    >
      <div style={{ fontSize: 13, marginBottom: 8 }}>
        <strong>{parsed.rows.length}</strong> valid row(s)
        {parsed.errors.length > 0 && (
          <span className="neg"> · {parsed.errors.length} skipped</span>
        )}
      </div>

      {preview.length > 0 && (
        <div className="table-wrap">
          <table style={{ fontSize: 13 }}>
            <thead>
              <tr>
                <th>Type</th>
                <th>Category</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((r: ParsedRow, i) => (
                <tr key={i}>
                  <td>
                    <span className={`badge badge-${r.type}`}>{r.type}</span>
                  </td>
                  <td>{r.category}</td>
                  <td
                    style={{ textAlign: 'right' }}
                    className={r.type === 'income' ? 'pos' : 'neg'}
                  >
                    {money(r.amount)}
                  </td>
                  <td className="muted">{r.occurredAt.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {parsed.rows.length > preview.length && (
        <div className="hint" style={{ marginTop: 6 }}>
          …and {parsed.rows.length - preview.length} more
        </div>
      )}

      {parsed.errors.length > 0 && (
        <div className="hint" style={{ marginTop: 8 }}>
          ⚠️ Skipped:{' '}
          {parsed.errors
            .slice(0, 3)
            .map((e) => `row ${e.row} (${e.reason})`)
            .join(', ')}
          {parsed.errors.length > 3 && ` +${parsed.errors.length - 3} more`}
        </div>
      )}
    </div>
  );
}
