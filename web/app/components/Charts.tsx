'use client';

const COLORS = [
  '#6366f1',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#06b6d4',
  '#a855f7',
  '#ec4899',
  '#84cc16',
];

function money(n: number) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Horizontal bars for spend-by-category. */
export function CategoryBars({
  data,
}: {
  data: { category: string; total: number }[];
}) {
  if (data.length === 0) return <div className="empty">No expenses.</div>;
  const max = Math.max(...data.map((d) => d.total), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {data.map((d, i) => (
        <div key={d.category}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 13,
              marginBottom: 4,
            }}
          >
            <span>{d.category}</span>
            <span className="muted">{money(d.total)}</span>
          </div>
          <div
            style={{
              height: 10,
              background: 'var(--panel-2)',
              borderRadius: 6,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${(d.total / max) * 100}%`,
                height: '100%',
                background: COLORS[i % COLORS.length],
                borderRadius: 6,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Vertical bars for daily expense across the month. */
export function DailyBars({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  const width = 640;
  const height = 160;
  const pad = 20;
  const barW = (width - pad * 2) / data.length;

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', minWidth: 480 }}
      >
        {data.map((v, i) => {
          const h = (v / max) * (height - pad * 2);
          return (
            <g key={i}>
              <rect
                x={pad + i * barW + 1}
                y={height - pad - h}
                width={Math.max(barW - 2, 1)}
                height={h}
                fill={v > 0 ? '#6366f1' : '#2a2f3a'}
                rx={2}
              >
                <title>
                  Day {i + 1}: {money(v)}
                </title>
              </rect>
              {(i + 1) % 5 === 0 && (
                <text
                  x={pad + i * barW + barW / 2}
                  y={height - 4}
                  fontSize="9"
                  fill="#9aa4b2"
                  textAnchor="middle"
                >
                  {i + 1}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
