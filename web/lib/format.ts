// Shared formatting + category color helpers.

/** Categories offered in dropdowns across the app. */
export const CATEGORIES = [
  'groceries', 'dining', 'transport', 'coffee', 'rent',
  'utilities', 'salary', 'freelance', 'entertainment', 'other',
];

/**
 * Format an amount as Vietnamese đồng: grouped by thousands, no decimals,
 * with a trailing ₫ (e.g. "1.400.000 ₫"). Amounts are stored as numeric(12,2)
 * in the DB but VND has no sub-unit, so we round for display.
 * Pass sign=true to prefix +/− based on the value's sign.
 */
export function money(n: string | number, sign = false): string {
  const num = Number(n);
  const s =
    Math.round(Math.abs(num)).toLocaleString('vi-VN') + ' ₫';
  if (!sign) return s;
  return (num < 0 ? '−' : '+') + s;
}

export const CATEGORY_COLORS = [
  '#6d76ff',
  '#34d399',
  '#fbbf24',
  '#f87171',
  '#22d3ee',
  '#c084fc',
  '#f472b6',
  '#a3e635',
  '#fb923c',
  '#60a5fa',
];

/** Stable color for a category name (hash → palette index). */
export function categoryColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return CATEGORY_COLORS[Math.abs(h) % CATEGORY_COLORS.length];
}

const CATEGORY_ICONS: Record<string, string> = {
  groceries: '🛒',
  dining: '🍽️',
  transport: '🚌',
  coffee: '☕',
  rent: '🏠',
  utilities: '💡',
  salary: '💼',
  freelance: '🧑‍💻',
  entertainment: '🎬',
  other: '📦',
};

export function categoryIcon(name: string): string {
  return CATEGORY_ICONS[name] ?? '📦';
}
