'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

const MONTHS: { value: string; label: string }[] = [
  { value: '1', label: 'January' }, { value: '2', label: 'February' },
  { value: '3', label: 'March' }, { value: '4', label: 'April' },
  { value: '5', label: 'May' }, { value: '6', label: 'June' },
  { value: '7', label: 'July' }, { value: '8', label: 'August' },
  { value: '9', label: 'September' }, { value: '10', label: 'October' },
  { value: '11', label: 'November' }, { value: '12', label: 'December' },
];

function yearLabel(v: string) {
  if (v === '2025') return '2025';
  if (v === '2026') return '2026';
  return 'All years';
}
function monthLabel(v: string) {
  return MONTHS.find((m) => m.value === v)?.label ?? 'All months';
}
function lineLabel(v: string) {
  if (v === 'ERP') return 'ERP';
  if (v === 'SuiteCommerce') return 'SuiteCommerce';
  return 'All service lines';
}
function engLabel(v: string) {
  if (v === 'Managed Services') return 'Managed Services';
  if (v === 'Implementation') return 'Implementation';
  return 'All engagements';
}

type Props = {
  year: string;
  month: string;
  serviceLine: string;
  engagementType: string;
  lastSyncedAt?: string;
};

export function FilterBar({ year, month, serviceLine, engagementType, lastSyncedAt }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  function handleRefresh() {
    startTransition(() => router.refresh());
  }

  const lastSync = lastSyncedAt
    ? new Date(lastSyncedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Year */}
      <Select value={year} onValueChange={(v) => v && updateParam('year', v)}>
        <SelectTrigger className="w-32">
          <span className="text-sm">{yearLabel(year)}</span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="2025">2025</SelectItem>
          <SelectItem value="2026">2026</SelectItem>
          <SelectItem value="all">All years</SelectItem>
        </SelectContent>
      </Select>

      {/* Month */}
      <Select value={month} onValueChange={(v) => v && updateParam('month', v)}>
        <SelectTrigger className="w-36">
          <span className="text-sm">{monthLabel(month)}</span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All months</SelectItem>
          {MONTHS.map((m) => (
            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Service Line */}
      <Select value={serviceLine} onValueChange={(v) => v && updateParam('serviceLine', v)}>
        <SelectTrigger className="w-44">
          <span className="text-sm">{lineLabel(serviceLine)}</span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All service lines</SelectItem>
          <SelectItem value="ERP">ERP</SelectItem>
          <SelectItem value="SuiteCommerce">SuiteCommerce</SelectItem>
        </SelectContent>
      </Select>

      {/* Engagement */}
      <Select value={engagementType} onValueChange={(v) => v && updateParam('engagementType', v)}>
        <SelectTrigger className="w-48">
          <span className="text-sm">{engLabel(engagementType)}</span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All engagements</SelectItem>
          <SelectItem value="Managed Services">Managed Services</SelectItem>
          <SelectItem value="Implementation">Implementation</SelectItem>
        </SelectContent>
      </Select>

      <div className="ml-auto flex items-center gap-3">
        {lastSync && (
          <span className="text-xs text-zinc-400">Last synced {lastSync}</span>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isPending}
          className="gap-2"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isPending && 'animate-spin')} />
          Refresh
        </Button>
      </div>
    </div>
  );
}
