'use client';

import { categoryColor, money } from '@/lib/format';

/** Horizontal bars for spend-by-category, with a total for percentages. */
export function CategoryBars({
  data,
}: {
  data: { category: string; total: number }[];
}) {
  if (data.length === 0)
    return (
      <div className="empty">
        <span className="emoji">📭</span>No expenses this month.
      </div>
    );
  const max = Math.max(...data.map((d) => d.total), 1);
  const sum = data.reduce((s, d) => s + d.total, 0) || 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {data.map((d) => {
        const color = categoryColor(d.category);
        return (
          <div key={d.category}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 13.5,
                marginBottom: 6,
              }}
            >
              <span>
                <span
                  className="cat-dot"
                  style={{ background: color }}
                />
                {d.category}
              </span>
              <span className="muted" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {money(d.total)}{' '}
                <span className="hint">
                  ({Math.round((d.total / sum) * 100)}%)
                </span>
              </span>
            </div>
            <div
              style={{
                height: 9,
                background: 'var(--panel-2)',
                borderRadius: 999,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${(d.total / max) * 100}%`,
                  height: '100%',
                  background: color,
                  borderRadius: 999,
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Vertical bars for daily expense across the month. */
export function DailyBars({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  const width = 660;
  const height = 180;
  const padX = 14;
  const padTop = 12;
  const padBottom = 22;
  const barW = (width - padX * 2) / data.length;
  const total = data.reduce((a, b) => a + b, 0);
  const activeDays = data.filter((v) => v > 0).length;
  const avg = activeDays ? total / activeDays : 0;

  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', minWidth: 520 }}
        >
          {/* avg line */}
          {avg > 0 && (
            <line
              x1={padX}
              x2={width - padX}
              y1={height - padBottom - (avg / max) * (height - padTop - padBottom)}
              y2={height - padBottom - (avg / max) * (height - padTop - padBottom)}
              stroke="var(--faint)"
              strokeDasharray="4 4"
              strokeWidth="1"
            />
          )}
          {data.map((v, i) => {
            const h = (v / max) * (height - padTop - padBottom);
            return (
              <g key={i}>
                <rect
                  x={padX + i * barW + 1}
                  y={height - padBottom - h}
                  width={Math.max(barW - 2.5, 1)}
                  height={Math.max(h, v > 0 ? 2 : 0)}
                  fill={v > 0 ? 'var(--accent)' : 'var(--panel-3)'}
                  rx={2.5}
                >
                  <title>
                    Day {i + 1}: {money(v)}
                  </title>
                </rect>
                {(i + 1) % 5 === 0 && (
                  <text
                    x={padX + i * barW + barW / 2}
                    y={height - 6}
                    fontSize="9.5"
                    fill="var(--faint)"
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
      {avg > 0 && (
        <div className="hint" style={{ marginTop: 8 }}>
          <span style={{ borderTop: '1px dashed var(--faint)', paddingTop: 2 }}>
            ┈ avg {money(avg)}/active day
          </span>
        </div>
      )}
    </div>
  );
}
