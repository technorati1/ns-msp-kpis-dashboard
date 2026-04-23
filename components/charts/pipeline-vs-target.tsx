'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine, Tooltip, ResponsiveContainer } from 'recharts';
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

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-sm font-medium text-zinc-500 uppercase tracking-wide">
        Pipeline vs Target{year !== 'all' ? ` · ${year}` : ''}
      </h3>
      {hasData ? (
        <>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: '#71717a' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => (v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`)}
                tick={{ fontSize: 11, fill: '#a1a1aa' }}
                axisLine={false}
                tickLine={false}
                width={52}
              />
              <Tooltip
                formatter={(v) => [formatCurrency(Number(v)), '']}
                contentStyle={{
                  borderRadius: 8,
                  border: '1px solid #e4e4e7',
                  fontSize: 12,
                }}
              />
              <Bar dataKey="value" fill="#0ea5e9" radius={[4, 4, 0, 0]} maxBarSize={80} />
              {target > 0 && (
                <ReferenceLine
                  y={target}
                  stroke="#f97316"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{ value: 'Target', position: 'insideTopRight', fontSize: 10, fill: '#f97316' }}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 flex justify-between text-xs text-zinc-400">
            <span>Actual: {formatCurrency(actual)}</span>
            <span>Target: {target > 0 ? formatCurrency(target) : '—'}</span>
            {target > 0 && (
              <span className="font-medium text-zinc-600">
                {((actual / target) * 100).toFixed(0)}% attained
              </span>
            )}
          </div>
        </>
      ) : (
        <div className="flex h-[200px] items-center justify-center text-sm text-zinc-400">
          No data in selected period
        </div>
      )}
    </div>
  );
}

