'use client';

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { monthName, formatCurrency } from '@/lib/format';
import type { MonthlyValue } from '@/lib/kpis';

type Props = { data: MonthlyValue[]; title: string; color?: string };

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md text-xs">
      <p className="font-medium text-muted-foreground">{monthName(label)}</p>
      <p className="text-foreground font-mono tabular-nums">{formatCurrency(payload[0].value)}</p>
    </div>
  );
};

export function RevenueTrendChart({ data, title, color = 'var(--chart-1)' }: Props) {
  const hasData = data.some((d) => d.value > 0);
  // unique gradient id per title so two charts on one page don't collide
  const gradId = `area-${title.replace(/[^a-z0-9]/gi, '').toLowerCase()}`;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_1px_2px_0_rgba(16,24,40,0.05)]">
      <h3 className="mb-4 text-xs font-semibold text-muted-foreground uppercase tracking-widest">{title}</h3>
      {hasData ? (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.22} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="month"
              tickFormatter={(v) => monthName(v).slice(0, 3)}
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => (v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`)}
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2.5}
              fill={`url(#${gradId})`}
              dot={{ r: 3, fill: color, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
          No data in selected period
        </div>
      )}
    </div>
  );
}
