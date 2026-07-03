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

/**
 * Bank-statement layout (e.g. Techcombank "Sổ phụ"): the transaction table
 * lives partway down the sheet, with SEPARATE debit/credit columns instead of
 * one type column. We detect it by finding a header row that has both a
 * debit-ish and credit-ish column.
 */
const STMT_HEADERS = {
  date: ['ngày giao dịch', 'giao dịch', 'transaction', 'ngày', 'date'],
  remitter: ['đối tác', 'remitter'],
  details: ['diễn giải', 'details', 'nội dung', 'description'],
  debit: ['nợ', 'debit', 'nợ tktt'],
  credit: ['có', 'credit', 'có tktt'],
};

function headerMatches(cell: string, aliases: string[]): boolean {
  const n = normalizeHeader(cell);
  return aliases.some((a) => n.includes(a));
}

/** Find the statement header row + its debit/credit column indices, or null. */
function detectStatement(grid: unknown[][]): {
  headerIdx: number;
  cols: Record<string, number>;
} | null {
  for (let i = 0; i < Math.min(grid.length, 40); i++) {
    const cells = (grid[i] as unknown[]).map((c) => String(c ?? ''));
    let debit = -1;
    let credit = -1;
    const cols: Record<string, number> = {};
    cells.forEach((c, j) => {
      if (debit < 0 && headerMatches(c, STMT_HEADERS.debit)) debit = j;
      if (credit < 0 && headerMatches(c, STMT_HEADERS.credit)) credit = j;
      if (cols.date == null && headerMatches(c, STMT_HEADERS.date)) cols.date = j;
      if (cols.remitter == null && headerMatches(c, STMT_HEADERS.remitter))
        cols.remitter = j;
      if (cols.details == null && headerMatches(c, STMT_HEADERS.details))
        cols.details = j;
    });
    // A statement needs both money columns to be present and distinct.
    if (debit >= 0 && credit >= 0 && debit !== credit) {
      cols.debit = debit;
      cols.credit = credit;
      return { headerIdx: i, cols };
    }
  }
  return null;
}

/** True for summary rows we must skip (opening/closing balance, totals). */
function isBalanceRow(cells: unknown[]): boolean {
  const joined = cells.map((c) => normalizeHeader(String(c ?? ''))).join(' ');
  return (
    joined.includes('số dư') ||
    joined.includes('balance') ||
    joined.includes('opening') ||
    joined.includes('closing') ||
    joined.includes('đầu kỳ') ||
    joined.includes('cuối kỳ')
  );
}

function parseStatement(
  grid: unknown[][],
  headerIdx: number,
  cols: Record<string, number>,
): ParseResult {
  const rows: ParsedRow[] = [];
  const errors: { row: number; reason: string }[] = [];

  for (let i = headerIdx + 1; i < grid.length; i++) {
    const rowNo = i + 1;
    const cells = grid[i] as unknown[];
    if (cells.every((c) => String(c ?? '').trim() === '')) continue;
    if (isBalanceRow(cells)) continue;

    const get = (f: string) => (cols[f] != null ? cells[cols[f]] : undefined);
    const debit = parseAmount(get('debit'));
    const credit = parseAmount(get('credit'));

    // Exactly one of debit/credit carries the amount.
    let type: 'income' | 'expense';
    let amount: number | null;
    if (debit != null && debit > 0) {
      type = 'expense';
      amount = debit;
    } else if (credit != null && credit > 0) {
      type = 'income';
      amount = credit;
    } else {
      // No money on this row — likely a spacer; skip quietly.
      continue;
    }

    const occurredAt = parseDate(get('date'));
    if (!occurredAt) {
      errors.push({ row: rowNo, reason: `invalid date "${get('date') ?? ''}"` });
      continue;
    }

    const details = String(get('details') ?? '').trim();
    const remitter = String(get('remitter') ?? '').trim();
    const note = [details, remitter].filter(Boolean).join(' — ') || undefined;

    rows.push({ type, amount, category: 'other', occurredAt, note });
  }

  return { rows, errors };
}

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

  // First, try a bank-statement layout (separate debit/credit columns).
  const stmt = detectStatement(grid);
  if (stmt) {
    return parseStatement(grid, stmt.headerIdx, stmt.cols);
  }

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
