'use client';

import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '@/lib/format';
import type { SegmentValue } from '@/lib/kpis';

type Props = { data: SegmentValue[] };

// Ocean / teal / emerald / amber / violet — cycles for N segments.
const COLOURS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const pct = p.payload?.__pct;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md text-xs">
      <p className="font-medium text-muted-foreground">{p.name}</p>
      <p className="text-foreground font-mono tabular-nums">
        {formatCurrency(p.value)}
        {pct != null && <span className="text-muted-foreground"> · {pct}%</span>}
      </p>
    </div>
  );
};

export function SegmentBreakdownChart({ data }: Props) {
  const segments = data.filter((d) => d.value > 0);
  const total = segments.reduce((s, d) => s + d.value, 0);
  const hasData = total > 0;

  // attach a precomputed percentage so the tooltip + legend can show it
  const chartData = segments.map((d) => ({
    ...d,
    __pct: Math.round((d.value / total) * 100),
  }));

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_1px_2px_0_rgba(16,24,40,0.05)]">
      <h3 className="mb-4 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
        New Business Won by Segment
      </h3>

      {hasData ? (
        <div className="flex items-center gap-6">
          {/* Donut */}
          <div className="relative h-[200px] w-[200px] flex-none">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={88}
                  paddingAngle={2}
                  startAngle={90}
                  endAngle={-270}
                  stroke="var(--card)"
                  strokeWidth={2}
                  isAnimationActive={false}
                >
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={COLOURS[i % COLOURS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center total */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-semibold text-foreground font-mono tabular-nums">
                {formatCurrency(total)}
              </span>
              <span className="text-[11px] text-muted-foreground">Won revenue</span>
            </div>
          </div>

          {/* Legend */}
          <ul className="flex-1 space-y-2.5">
            {chartData.map((d, i) => (
              <li key={d.label} className="flex items-center gap-2.5 text-sm">
                <span
                  className="h-2.5 w-2.5 flex-none rounded-[3px]"
                  style={{ background: COLOURS[i % COLOURS.length] }}
                />
                <span className="text-muted-foreground truncate">{d.label}</span>
                <span className="ml-auto font-mono tabular-nums text-foreground">
                  {formatCurrency(d.value)}
                </span>
                <span className="w-9 text-right font-mono tabular-nums text-muted-foreground">
                  {d.__pct}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
          No data in selected period
        </div>
      )}
    </div>
  );
}
