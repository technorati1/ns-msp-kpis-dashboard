'use client';

import { useState, useMemo } from 'react';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, ChevronsUpDown, Search } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Opportunity } from '@/lib/normalize';

type SortKey = 'accountName' | 'serviceLine' | 'status' | 'createdDate' | 'closeDate' | 'annualisedValue' | 'mrrMonthly';
type SortDir = 'asc' | 'desc';

const STATUS_COLOUR: Record<string, string> = {
  'Closed Won': 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  'Closed Lost': 'bg-rose-100 text-rose-600 hover:bg-rose-100',
  'Open': 'bg-accent text-[var(--secondary-foreground)] hover:bg-accent',
};

type Props = { opportunities: Opportunity[] };

export function OpportunityTable({ opportunities }: Props) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('annualisedValue');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [open, setOpen] = useState(true);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return opportunities.filter(
      (o) =>
        o.accountName.toLowerCase().includes(q) ||
        o.serviceLine.toLowerCase().includes(q) ||
        o.status.toLowerCase().includes(q) ||
        o.region.toLowerCase().includes(q)
    );
  }, [opportunities, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av: string | number | Date | null = a[sortKey] as string | number | Date | null;
      let bv: string | number | Date | null = b[sortKey] as string | number | Date | null;
      if (av == null) av = sortDir === 'asc' ? Infinity : -Infinity;
      if (bv == null) bv = sortDir === 'asc' ? Infinity : -Infinity;
      if (av instanceof Date) av = av.getTime();
      if (bv instanceof Date) bv = bv.getTime();
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(String(bv)) : String(bv).localeCompare(av);
      return sortDir === 'asc' ? Number(av) - Number(bv) : Number(bv) - Number(av);
    });
  }, [filtered, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronsUpDown className="ml-1 inline h-3 w-3 text-muted-foreground/50" />;
    return sortDir === 'asc'
      ? <ChevronUp className="ml-1 inline h-3 w-3 text-foreground" />
      : <ChevronDown className="ml-1 inline h-3 w-3 text-foreground" />;
  }

  return (
    <div className="rounded-2xl border border-border bg-card shadow-[0_1px_2px_0_rgba(16,24,40,0.05)] overflow-hidden">
      <button
        className="flex w-full items-center justify-between px-6 py-4 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-sm font-semibold text-foreground">
          Underlying Opportunities ({opportunities.length})
        </span>
        {open
          ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t border-border">
          <div className="px-6 py-3">
            <div className="relative max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by account, service line, status, region…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-border bg-card pl-9 pr-3 py-1.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border bg-muted">
                  {([
                    ['accountName', 'Account'],
                    ['serviceLine', 'Service Line'],
                    ['status', 'Status'],
                    ['createdDate', 'Created'],
                    ['closeDate', 'Close Date'],
                    ['annualisedValue', 'Annualised Value'],
                    ['mrrMonthly', 'MRR/mo'],
                  ] as [SortKey, string][]).map(([key, label]) => (
                    <TableHead
                      key={key}
                      className="cursor-pointer select-none text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap"
                      onClick={() => handleSort(key)}
                    >
                      {label}<SortIcon col={key} />
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                      No opportunities match the current filters
                    </TableCell>
                  </TableRow>
                ) : (
                  sorted.map((opp) => (
                    <TableRow key={opp.id} className="border-border hover:bg-accent">
                      <TableCell className="text-xs font-medium text-foreground max-w-[180px] truncate">
                        {opp.accountName}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-foreground">
                          {opp.serviceLine}
                        </span>
                        <span className="ml-1.5">{opp.engagementType}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs font-medium ${STATUS_COLOUR[opp.status] ?? ''}`}>
                          {opp.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap font-mono tabular-nums">
                        {formatDate(opp.createdDate)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap font-mono tabular-nums">
                        {opp.closeDate ? formatDate(opp.closeDate) : '—'}
                      </TableCell>
                      <TableCell className="text-right text-xs font-semibold text-foreground whitespace-nowrap font-mono tabular-nums">
                        {opp.annualisedValue > 0 ? formatCurrency(opp.annualisedValue) : '—'}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap font-mono tabular-nums">
                        {opp.mrrMonthly > 0 ? formatCurrency(opp.mrrMonthly) : '—'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="border-t border-border px-6 py-3 text-xs text-muted-foreground text-right">
            Showing {sorted.length} of {opportunities.length} opportunities
          </div>
        </div>
      )}
    </div>
  );
}
