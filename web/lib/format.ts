// Shared formatting + category color helpers.

export function money(n: string | number, sign = false): string {
  const num = Number(n);
  const s = Math.abs(num).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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
