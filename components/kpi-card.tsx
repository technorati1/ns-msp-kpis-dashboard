'use client';

import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Info,
  TrendingUp,
  Repeat,
  Server,
  Filter,
  Target,
  CircleDollarSign,
  type LucideIcon,
} from 'lucide-react';
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

// Map each KPI to an icon (purely decorative — falls back to none).
const ICON_BY_TITLE: Record<string, LucideIcon> = {
  'New Business Won': TrendingUp,
  'MRR Added': Repeat,
  'Managed Services Revenue': Server,
  'Qualified Pipeline (90d)': Filter,
  'Win Rate': Target,
  'Average Deal Size': CircleDollarSign,
};

export function KpiCard({ title, value, target, attainment, yoy, tooltip, isProxy }: Props) {
  const pct = Math.min(attainment, 1);
  const { label: yoyLabel, direction } = formatYoY(yoy);
  const Icon = ICON_BY_TITLE[title];

  // Three-state attainment colouring.
  const state = attainment >= 1 ? 'ok' : attainment >= 0.85 ? 'near' : 'low';
  const barColor =
    state === 'ok' ? 'bg-emerald-500' : state === 'near' ? 'bg-amber-500' : 'bg-rose-500';
  const attainColor =
    state === 'ok' ? 'text-emerald-600' : state === 'near' ? 'text-amber-600' : 'text-rose-600';

  return (
    <TooltipProvider>
      <Card className="group rounded-2xl border border-border bg-card shadow-[0_1px_2px_0_rgba(16,24,40,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_-4px_rgba(16,24,40,0.12)]">
        <CardContent className="p-6 flex flex-col gap-5">

          {/* Title row */}
          <div className="flex items-center justify-between gap-3">
            <Tooltip>
              <TooltipTrigger className="flex items-center gap-1.5 bg-transparent border-0 p-0 cursor-default text-left">
                <span className="text-xs font-semibold text-muted-foreground tracking-normal">
                  {title}
                </span>
                {isProxy && <Info className="h-3 w-3 text-muted-foreground/60" />}
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">
                {tooltip}
              </TooltipContent>
            </Tooltip>

            {Icon && (
              <span className="grid h-8 w-8 flex-none place-items-center rounded-[9px] bg-accent text-[var(--secondary-foreground)]">
                <Icon className="h-4 w-4" />
              </span>
            )}
          </div>

          {/* Big value */}
          <div className="text-4xl font-bold tracking-tight text-foreground text-right font-mono tabular-nums">
            {value}
          </div>

          {/* YoY pill */}
          <div className="flex items-center gap-2">
            {direction !== 'neutral' ? (
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold font-mono tabular-nums',
                  direction === 'up' && 'bg-emerald-50 text-emerald-700',
                  direction === 'down' && 'bg-rose-50 text-rose-600'
                )}
              >
                {yoyLabel}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground/60">—</span>
            )}
            <span className="text-xs text-muted-foreground">vs. prior year</span>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-500', barColor)}
                style={{ width: `${pct * 100}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Target: {target}</span>
              <span className={cn('font-mono tabular-nums font-medium', attainColor)}>
                {`${(attainment * 100).toFixed(0)}%`}
                {state === 'ok' ? ' ✓' : ''}
              </span>
            </div>
          </div>

        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
