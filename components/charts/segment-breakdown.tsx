'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
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

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md text-xs">
      <p className="font-medium text-muted-foreground">{label}</p>
      <p className="text-foreground font-mono tabular-nums">{formatCurrency(payload[0].value)}</p>
    </div>
  );
};

export function SegmentBreakdownChart({ data }: Props) {
  const hasData = data.some((d) => d.value > 0);

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_1px_2px_0_rgba(16,24,40,0.05)]">
      <h3 className="mb-4 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
        New Business Won by Segment
      </h3>
      {hasData ? (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={(v) => (v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`)}
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={160}
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--muted)' }} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLOURS[i % COLOURS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
          No data in selected period
        </div>
      )}
    </div>
  );
}
