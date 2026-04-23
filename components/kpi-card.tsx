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
  attainment: number;         // 0–1+ fraction
  yoy: number | null;
  tooltip: string;
  isProxy?: boolean;          // shows ℹ️ tooltip on the title
};

export function KpiCard({ title, value, target, attainment, yoy, tooltip, isProxy }: Props) {
  const pct = Math.min(attainment, 1);
  const over = attainment > 1;
  const { label: yoyLabel, direction } = formatYoY(yoy);

  return (
    <TooltipProvider>
      <Card className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <CardContent className="p-6 flex flex-col gap-4">
          {/* Title row */}
          <div className="flex items-center justify-between">
            <Tooltip>
              <TooltipTrigger className="text-xs font-medium uppercase tracking-wide text-zinc-500 cursor-default flex items-center gap-1 bg-transparent border-0 p-0">
                {title}
                {isProxy && <Info className="h-3 w-3 text-zinc-400" />}
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">
                {tooltip}
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Big value */}
          <div className="text-3xl font-semibold tracking-tight text-zinc-900 text-right">
            {value}
          </div>

          {/* Target + YoY row */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400">Target: {target}</span>
            <span
              className={cn(
                'font-medium tabular-nums',
                direction === 'up' && 'text-emerald-600',
                direction === 'down' && 'text-red-500',
                direction === 'neutral' && 'text-zinc-400'
              )}
            >
              {yoyLabel}
            </span>
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="h-1.5 w-full rounded-full bg-zinc-100 overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  over ? 'bg-emerald-500' : 'bg-sky-500'
                )}
                style={{ width: `${pct * 100}%` }}
              />
            </div>
            <div className="text-right text-xs text-zinc-400">
              {over
                ? `${(attainment * 100).toFixed(0)}% — exceeded target`
                : `${(attainment * 100).toFixed(0)}% of target`}
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
