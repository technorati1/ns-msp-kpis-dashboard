'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { monthName, formatCurrency } from '@/lib/format';
import type { MonthlyValue } from '@/lib/kpis';

type Props = { data: MonthlyValue[]; title: string };

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-md text-xs">
      <p className="font-medium text-zinc-700">{monthName(label)}</p>
      <p className="text-zinc-900">{formatCurrency(payload[0].value)}</p>
    </div>
  );
};

export function RevenueTrendChart({ data, title }: Props) {
  const hasData = data.some((d) => d.value > 0);

  return (
    <div className="rounded-2xl border-0 bg-white p-6 shadow-[0_1px_4px_0_rgba(0,0,0,0.06),0_4px_16px_0_rgba(0,0,0,0.04)]">
      <h3 className="mb-4 text-xs font-semibold text-zinc-400 uppercase tracking-widest">{title}</h3>
      {hasData ? (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
            <XAxis
              dataKey="month"
              tickFormatter={(v) => monthName(v).slice(0, 3)}
              tick={{ fontSize: 11, fill: '#a1a1aa' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => (v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`)}
              tick={{ fontSize: 11, fill: '#a1a1aa' }}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#4f46e5"
              strokeWidth={2}
              dot={{ r: 3, fill: '#4f46e5', strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-[200px] items-center justify-center text-sm text-zinc-400">
          No data in selected period
        </div>
      )}
    </div>
  );
}
