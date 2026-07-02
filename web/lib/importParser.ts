import * as XLSX from 'xlsx';

export interface ParsedRow {
  type: 'income' | 'expense';
  amount: number;
  category: string;
  occurredAt: string; // ISO
  note?: string;
}

export interface ParseResult {
  rows: ParsedRow[];
  errors: { row: number; reason: string }[];
}

/** Serialize normalized rows back into the canonical CSV the backend expects. */
export function rowsToCsv(rows: ParsedRow[]): string {
  const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const header = 'type,amount,category,occurredAt,note';
  const lines = rows.map((r) =>
    [r.type, r.amount, esc(r.category), r.occurredAt, esc(r.note ?? '')].join(','),
  );
  return [header, ...lines].join('\n');
}

// Accept a few common header spellings (English + Vietnamese) per field.
const HEADERS: Record<string, string[]> = {
  type: ['type', 'loai', 'loại'],
  amount: ['amount', 'sotien', 'so tien', 'số tiền', 'giá trị', 'gia tri'],
  category: ['category', 'danhmuc', 'danh mục', 'phanloai', 'phân loại'],
  occurredAt: ['occurredat', 'date', 'ngay', 'ngày', 'ngày giao dịch'],
  note: ['note', 'ghichu', 'ghi chú', 'mô tả', 'mo ta', 'noi dung', 'nội dung', 'description'],
};

function normalizeHeader(h: string): string {
  return String(h).trim().toLowerCase();
}

/** Map the sheet's header row to our field → column-index. */
function mapColumns(header: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  header.forEach((h, i) => {
    const n = normalizeHeader(h);
    for (const [field, aliases] of Object.entries(HEADERS)) {
      if (aliases.includes(n)) map[field] = i;
    }
  });
  return map;
}

/** Parse "30000", "30.000", "30,000", "-30000" → 30000 (absolute). */
function parseAmount(raw: unknown): number | null {
  if (typeof raw === 'number') return Math.abs(raw);
  if (raw == null) return null;
  const cleaned = String(raw).replace(/[^\d.-]/g, '').replace(/(?!^)-/g, '');
  // Drop thousands separators: any dot/comma used as grouping.
  const digits = cleaned.replace(/[.,]/g, '');
  const n = Number(digits);
  return Number.isFinite(n) && n !== 0 ? Math.abs(n) : null;
}

/** Parse many date shapes → ISO, or null. Handles dd/mm/yyyy (VN) and Excel serials. */
function parseDate(raw: unknown): string | null {
  if (raw == null || raw === '') return null;

  // Excel stores dates as serial numbers; SheetJS can give us a Date directly
  // when cellDates is on, but guard for numbers too.
  if (raw instanceof Date && !isNaN(raw.getTime())) {
    return raw.toISOString();
  }
  const s = String(raw).trim();

  // dd/mm/yyyy or dd-mm-yyyy (Techcombank & most VN banks)
  const vn = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  if (vn) {
    let [, d, m, y] = vn;
    if (y.length === 2) y = '20' + y;
    const dt = new Date(Date.UTC(+y, +m - 1, +d, 12));
    if (!isNaN(dt.getTime())) return dt.toISOString();
  }
  // ISO or anything Date understands
  const dt = new Date(s);
  if (!isNaN(dt.getTime())) return dt.toISOString();
  return null;
}

function parseType(raw: unknown, amountRaw: unknown): 'income' | 'expense' {
  const s = String(raw ?? '').trim().toLowerCase();
  if (['income', 'thu', 'credit', 'ghi có', 'ghi co', '+'].includes(s))
    return 'income';
  if (['expense', 'chi', 'debit', 'ghi nợ', 'ghi no', '-'].includes(s))
    return 'expense';
  // No explicit type: infer from a negative amount → expense, else expense
  // (bank statements are mostly outflows; user can fix afterwards).
  if (typeof amountRaw === 'number' && amountRaw > 0) return 'income';
  const numeric = Number(String(amountRaw ?? '').replace(/[^\d.-]/g, ''));
  return numeric < 0 ? 'expense' : 'expense';
}

/**
 * Parse an uploaded File (.xlsx, .xls, or .csv) into normalized rows.
 * Flexible about column names/order; missing category defaults to 'other'.
 */
export async function parseImportFile(file: File): Promise<ParseResult> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    blankrows: false,
    defval: '',
  });

  return parseGrid(grid);
}

/** Parse pasted CSV text (fallback / manual paste). */
export function parseCsvText(text: string): ParseResult {
  const grid = text
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0)
    .map((line) => line.split(','));
  return parseGrid(grid);
}

function parseGrid(grid: unknown[][]): ParseResult {
  const rows: ParsedRow[] = [];
  const errors: { row: number; reason: string }[] = [];
  if (grid.length === 0) return { rows, errors };

  // Detect a header row: does the first row contain any known header word?
  const firstRow = (grid[0] as unknown[]).map((c) => normalizeHeader(String(c)));
  const allAliases = Object.values(HEADERS).flat();
  const hasHeader = firstRow.some((c) => allAliases.includes(c));

  let colMap: Record<string, number>;
  let dataStart: number;
  if (hasHeader) {
    colMap = mapColumns((grid[0] as unknown[]).map(String));
    dataStart = 1;
  } else {
    // Positional fallback: type,amount,category,occurredAt,note
    colMap = { type: 0, amount: 1, category: 2, occurredAt: 3, note: 4 };
    dataStart = 0;
  }

  for (let i = dataStart; i < grid.length; i++) {
    const rowNo = i + 1;
    const cells = grid[i] as unknown[];
    const get = (f: string) =>
      colMap[f] != null ? cells[colMap[f]] : undefined;

    const amount = parseAmount(get('amount'));
    if (amount == null) {
      errors.push({ row: rowNo, reason: `invalid amount "${get('amount') ?? ''}"` });
      continue;
    }
    const occurredAt = parseDate(get('occurredAt'));
    if (!occurredAt) {
      errors.push({ row: rowNo, reason: `invalid date "${get('occurredAt') ?? ''}"` });
      continue;
    }
    const category =
      String(get('category') ?? '').trim().toLowerCase() || 'other';
    const note = String(get('note') ?? '').trim() || undefined;

    rows.push({
      type: parseType(get('type'), get('amount')),
      amount,
      category,
      occurredAt,
      note,
    });
  }

  return { rows, errors };
}
