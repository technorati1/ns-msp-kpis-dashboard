'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { formatCurrency } from '@/lib/format';
import type { SegmentValue } from '@/lib/kpis';

type Props = { data: SegmentValue[] };

const COLOURS = ['#4f46e5', '#7c3aed', '#10b981'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-md text-xs">
      <p className="font-medium text-zinc-700">{label}</p>
      <p className="text-zinc-900">{formatCurrency(payload[0].value)}</p>
    </div>
  );
};

export function SegmentBreakdownChart({ data }: Props) {
  const hasData = data.some((d) => d.value > 0);

  return (
    <div className="rounded-2xl border-0 bg-white p-6 shadow-[0_1px_4px_0_rgba(0,0,0,0.06),0_4px_16px_0_rgba(0,0,0,0.04)]">
      <h3 className="mb-4 text-xs font-semibold text-zinc-400 uppercase tracking-widest">
        New Business Won by Segment
      </h3>
      {hasData ? (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={(v) => (v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`)}
              tick={{ fontSize: 11, fill: '#a1a1aa' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={160}
              tick={{ fontSize: 11, fill: '#71717a' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f4f4f5' }} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLOURS[i % COLOURS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-[200px] items-center justify-center text-sm text-zinc-400">
          No data in selected period
        </div>
      )}
    </div>
  );
}
