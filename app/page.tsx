import { Suspense } from 'react';
import { fetchAllTabs } from '@/lib/sheets';
import { normalizeAllRows, reviveOpportunity } from '@/lib/normalize';
import { computeAllKpis } from '@/lib/kpis';
import { parseFiltersFromParams } from '@/lib/filters';
import { KpiGrid } from '@/components/kpi-grid';
import { FilterBar } from '@/components/filter-bar';
import { Separator } from '@/components/ui/separator';
import { unstable_cache } from 'next/cache';

const SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1hFNaWnzW6Bol2zk7gLjfY4sO-2CqNm18Zvfi_WG_kKU/edit';

const getCachedData = unstable_cache(
  async () => {
    const { funnel2025, funnel2026 } = await fetchAllTabs();
    const result = normalizeAllRows(funnel2025, funnel2026);
    return { opportunities: result.opportunities, fetchedAt: new Date().toISOString() };
  },
  ['dashboard-data'],
  { revalidate: 60 }
);

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function DashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const urlParams = new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => typeof v === 'string')
      .map(([k, v]) => [k, v as string])
  );

  const filters = parseFiltersFromParams(urlParams);

  // Default to current year if not specified
  const displayYear = filters.year;
  const displayMonth = filters.month;
  const displayLine = filters.serviceLine;
  const displayEng = filters.engagementType;

  let kpis = null;
  let fetchedAt: string | undefined;
  let errorMsg: string | null = null;

  try {
    const { opportunities: raw, fetchedAt: fa } = await getCachedData();
    fetchedAt = fa;
    const opportunities = raw.map(reviveOpportunity);
    kpis = computeAllKpis(opportunities, filters);
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : 'Failed to load data';
  }

  const yearParam = String(displayYear);
  const monthParam = String(displayMonth);

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-zinc-900">
                {process.env.NEXT_PUBLIC_APP_NAME ?? 'NetSuite Commercial KPIs'}
              </h1>
              <p className="text-xs text-zinc-400">Managed Services · Live from Google Sheets</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Filter bar */}
        <Suspense>
          <FilterBar
            year={yearParam}
            month={monthParam}
            serviceLine={String(displayLine)}
            engagementType={String(displayEng)}
            lastSyncedAt={fetchedAt}
          />
        </Suspense>

        <Separator />

        {/* Error state */}
        {errorMsg && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
            <strong>Could not load data:</strong> {errorMsg}
          </div>
        )}

        {/* KPI grid */}
        {kpis && (
          <section aria-label="Key Performance Indicators">
            <h2 className="mb-4 text-sm font-medium text-zinc-500 uppercase tracking-wide">
              {displayYear === 'all' ? 'All Years' : displayYear}
              {displayMonth !== 'all' ? ` · ${new Date(2026, Number(displayMonth) - 1).toLocaleString('en-US', { month: 'long' })}` : ''}
              {displayLine !== 'all' ? ` · ${displayLine}` : ''}
              {displayEng !== 'all' ? ` · ${displayEng}` : ''}
            </h2>
            <KpiGrid kpis={kpis} year={displayYear === 'all' ? 'all' : (displayYear as 2025 | 2026)} />
          </section>
        )}

        {/* Secondary stats strip */}
        {kpis && (
          <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: 'New Logos Won', value: kpis.newLogosWon.toString() },
              { label: 'Sales Cycle', value: kpis.salesCycleDays > 0 ? `${kpis.salesCycleDays} days` : '—' },
              { label: 'Weighted Forecast', value: kpis.weightedForecast > 0 ? `$${kpis.weightedForecast.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—' },
              {
                label: 'Pipeline Coverage',
                value: kpis.newBusinessWon > 0
                  ? `${((kpis.qualifiedPipeline90d / kpis.newBusinessWon) * 100).toFixed(0)}%`
                  : '—',
              },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</p>
                <p className="mt-1 text-2xl font-semibold text-zinc-900 text-right">{value}</p>
              </div>
            ))}
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white mt-16">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between text-xs text-zinc-400">
          <span>Data source: Google Sheets · refreshes every 60 seconds</span>
          <a
            href={SHEET_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-700 underline underline-offset-2"
          >
            Open source sheet ↗
          </a>
        </div>
      </footer>
    </div>
  );
}
