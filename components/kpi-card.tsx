'use client';

import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatYoY } from '@/lib/format';

type Props = {
  title: string;
  value: string;
  target: string;
  attainment: number;
  yoy: number | null;
  tooltip: string;
  isProxy?: boolean;
};

export function KpiCard({ title, value, target, attainment, yoy, tooltip, isProxy }: Props) {
  const pct = Math.min(attainment, 1);
  const over = attainment > 1;
  const { label: yoyLabel, direction } = formatYoY(yoy);

  return (
    <TooltipProvider>
      <Card className="rounded-2xl border-0 bg-white shadow-[0_1px_4px_0_rgba(0,0,0,0.06),0_4px_16px_0_rgba(0,0,0,0.04)]">
        <CardContent className="p-6 flex flex-col gap-5">

          {/* Title row */}
          <div className="flex items-center justify-between">
            <Tooltip>
              <TooltipTrigger className="flex items-center gap-1.5 bg-transparent border-0 p-0 cursor-default text-left">
                <span className="text-xs font-medium text-slate-400 tracking-normal">
                  {title}
                </span>
                {isProxy && <Info className="h-3 w-3 text-slate-300" />}
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">
                {tooltip}
              </TooltipContent>
            </Tooltip>

            {/* YoY pill */}
            {direction !== 'neutral' && (
              <span className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium tabular-nums',
                direction === 'up' && 'bg-emerald-50 text-emerald-700',
                direction === 'down' && 'bg-red-50 text-red-600',
              )}>
                {yoyLabel}
              </span>
            )}
            {direction === 'neutral' && (
              <span className="text-xs text-slate-300">—</span>
            )}
          </div>

          {/* Big value */}
          <div
            className="text-4xl font-bold tracking-tight text-slate-900 text-right"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {value}
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  over ? 'bg-emerald-500' : 'bg-indigo-500'
                )}
                style={{ width: `${pct * 100}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Target: {target}</span>
              <span className={cn(over && 'text-emerald-600 font-medium')}>
                {over
                  ? `${(attainment * 100).toFixed(0)}% ✓`
                  : `${(attainment * 100).toFixed(0)}%`}
              </span>
            </div>
          </div>

        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
