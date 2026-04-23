'use client';

import { useState, useMemo } from 'react';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Opportunity } from '@/lib/normalize';

type SortKey = 'accountName' | 'serviceLine' | 'status' | 'createdDate' | 'closeDate' | 'annualisedValue' | 'mrrMonthly';
type SortDir = 'asc' | 'desc';

const STATUS_COLOUR: Record<string, string> = {
  'Closed Won': 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  'Closed Lost': 'bg-red-100 text-red-600 hover:bg-red-100',
  'Open': 'bg-sky-100 text-sky-700 hover:bg-sky-100',
};

type Props = { opportunities: Opportunity[] };

export function OpportunityTable({ opportunities }: Props) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('annualisedValue');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [open, setOpen] = useState(false);

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
    if (sortKey !== col) return <ChevronsUpDown className="ml-1 inline h-3 w-3 text-zinc-300" />;
    return sortDir === 'asc'
      ? <ChevronUp className="ml-1 inline h-3 w-3 text-zinc-500" />
      : <ChevronDown className="ml-1 inline h-3 w-3 text-zinc-500" />;
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
      <button
        className="flex w-full items-center justify-between px-6 py-4 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-sm font-medium text-zinc-700">
          Underlying Opportunities ({opportunities.length})
        </span>
        {open
          ? <ChevronUp className="h-4 w-4 text-zinc-400" />
          : <ChevronDown className="h-4 w-4 text-zinc-400" />}
      </button>

      {open && (
        <div className="border-t border-zinc-100">
          <div className="px-6 py-3">
            <input
              type="text"
              placeholder="Search by account, service line, status, region…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 px-3 py-1.5 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-100 bg-zinc-50">
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
                      className="cursor-pointer select-none text-xs text-zinc-500 whitespace-nowrap"
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
                    <TableCell colSpan={7} className="text-center text-sm text-zinc-400 py-8">
                      No opportunities match the current filters
                    </TableCell>
                  </TableRow>
                ) : (
                  sorted.map((opp) => (
                    <TableRow key={opp.id} className="border-zinc-100 hover:bg-zinc-50">
                      <TableCell className="text-xs text-zinc-700 max-w-[180px] truncate">
                        {opp.accountName}
                      </TableCell>
                      <TableCell className="text-xs text-zinc-600 whitespace-nowrap">
                        {opp.serviceLine} · {opp.engagementType}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs font-normal ${STATUS_COLOUR[opp.status] ?? ''}`}>
                          {opp.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-zinc-500 whitespace-nowrap">
                        {formatDate(opp.createdDate)}
                      </TableCell>
                      <TableCell className="text-xs text-zinc-500 whitespace-nowrap">
                        {opp.closeDate ? formatDate(opp.closeDate) : '—'}
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium text-zinc-800 whitespace-nowrap">
                        {opp.annualisedValue > 0 ? formatCurrency(opp.annualisedValue) : '—'}
                      </TableCell>
                      <TableCell className="text-right text-xs text-zinc-600 whitespace-nowrap">
                        {opp.mrrMonthly > 0 ? formatCurrency(opp.mrrMonthly) : '—'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="border-t border-zinc-100 px-6 py-3 text-xs text-zinc-400 text-right">
            Showing {sorted.length} of {opportunities.length} opportunities
          </div>
        </div>
      )}
    </div>
  );
}
