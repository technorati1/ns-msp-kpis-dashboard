'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatCurrency } from '@/lib/format';

type Props = {
  actual: number;
  target: number;
  year: number | 'all';
};

export function PipelineVsTargetChart({ actual, target, year }: Props) {
  const data = [
    { name: 'Actual', value: actual },
    { name: 'Target', value: target },
  ];

  const hasData = actual > 0 || target > 0;
  const onTarget = target > 0 && actual >= target;
  // Actual bar: emerald when at/above target, amber when below. Target bar: neutral.
  const actualColor = onTarget ? 'var(--chart-3)' : 'var(--chart-4)';

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_1px_2px_0_rgba(16,24,40,0.05)]">
      <h3 className="mb-4 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
        Pipeline vs Target{year !== 'all' ? ` · ${year}` : ''}
      </h3>
      {hasData ? (
        <>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => (v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`)}
                tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                axisLine={false}
                tickLine={false}
                width={52}
              />
              <Tooltip
                formatter={(v) => [formatCurrency(Number(v)), '']}
                contentStyle={{
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  fontSize: 12,
                }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={80}>
                <Cell fill={actualColor} />
                <Cell fill="var(--chart-1)" />
              </Bar>
              {target > 0 && (
                <ReferenceLine
                  y={target}
                  stroke="var(--chart-4)"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{ value: 'Target', position: 'insideTopRight', fontSize: 10, fill: 'var(--chart-4)' }}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 flex justify-between text-xs text-muted-foreground">
            <span>Actual: <span className="font-mono tabular-nums">{formatCurrency(actual)}</span></span>
            <span>Target: <span className="font-mono tabular-nums">{target > 0 ? formatCurrency(target) : '—'}</span></span>
            {target > 0 && (
              <span className="font-medium text-foreground font-mono tabular-nums">
                {((actual / target) * 100).toFixed(0)}% attained
              </span>
            )}
          </div>
        </>
      ) : (
        <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
          No data in selected period
        </div>
      )}
    </div>
  );
}
