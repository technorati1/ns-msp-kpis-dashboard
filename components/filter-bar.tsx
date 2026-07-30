'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const MONTHS: { value: string; label: string }[] = [
  { value: '1', label: 'January' }, { value: '2', label: 'February' },
  { value: '3', label: 'March' }, { value: '4', label: 'April' },
  { value: '5', label: 'May' }, { value: '6', label: 'June' },
  { value: '7', label: 'July' }, { value: '8', label: 'August' },
  { value: '9', label: 'September' }, { value: '10', label: 'October' },
  { value: '11', label: 'November' }, { value: '12', label: 'December' },
];

const YEARS: { value: string; label: string }[] = [
  { value: '2025', label: '2025' },
  { value: '2026', label: '2026' },
  { value: 'all', label: 'All' },
];

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
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  async function handleSyncNow() {
    setSyncError(null);
    setIsSyncing(true);
    try {
      const res = await fetch('/api/sync/trigger', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setSyncError(data.error ?? 'Sync failed');
        return;
      }
      const failedTabs = ((data.tabs ?? []) as Array<{ tabKey: string; status: string }>).filter(
        (t) => t.status === 'error'
      );
      if (failedTabs.length > 0) {
        setSyncError(
          `${failedTabs.map((t) => t.tabKey).join(', ')} failed to sync — showing last known data for that tab.`
        );
      }
      startTransition(() => router.refresh());
    } catch {
      setSyncError('Sync failed — check your connection and try again.');
    } finally {
      setIsSyncing(false);
    }
  }

  const lastSync = lastSyncedAt
    ? new Date(lastSyncedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        {/* Year — segmented control */}
        <div className="inline-flex rounded-lg border border-border bg-secondary p-1 gap-0.5">
          {YEARS.map((y) => {
            const active = year === y.value;
            return (
              <button
                key={y.value}
                onClick={() => updateParam('year', y.value)}
                aria-pressed={active}
                className={cn(
                  'rounded-md px-3 py-1 text-sm font-medium transition-colors',
                  active
                    ? 'bg-card text-[var(--secondary-foreground)] shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {y.label}
              </button>
            );
          })}
        </div>

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
            <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Last synced {lastSync}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncNow}
            disabled={isSyncing || isPending}
            className="gap-2"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', (isSyncing || isPending) && 'animate-spin')} />
            {isSyncing ? 'Syncing…' : 'Sync now'}
          </Button>
        </div>
      </div>

      {syncError && (
        <p className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5" />
          {syncError}
        </p>
      )}
    </div>
  );
}
