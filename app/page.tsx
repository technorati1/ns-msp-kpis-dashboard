import { Suspense } from 'react';
import { fetchAllTabs } from '@/lib/sheets';
import { normalizeAllRows, reviveOpportunity } from '@/lib/normalize';
import { computeAllKpis, monthlyTrend, segmentBreakdown } from '@/lib/kpis';
import { parseFiltersFromParams } from '@/lib/filters';
import { TARGETS } from '@/lib/targets';
import { KpiGrid } from '@/components/kpi-grid';
import { FilterBar } from '@/components/filter-bar';
import { RevenueTrendChart } from '@/components/charts/revenue-trend';
import { SegmentBreakdownChart } from '@/components/charts/segment-breakdown';
import { PipelineVsTargetChart } from '@/components/charts/pipeline-vs-target';
import { OpportunityTable } from '@/components/opportunity-table';
import { unstable_cache } from 'next/cache';
import { UserNav } from '@/components/user-nav';

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
  const displayYear = filters.year;
  const displayMonth = filters.month;
  const displayLine = filters.serviceLine;
  const displayEng = filters.engagementType;
  const yearParam = String(displayYear);
  const monthParam = String(displayMonth);

  let kpis = null;
  let fetchedAt: string | undefined;
  let errorMsg: string | null = null;
  let nbwTrend: Awaited<ReturnType<typeof monthlyTrend>> = [];
  let mrrTrend: Awaited<ReturnType<typeof monthlyTrend>> = [];
  let segments: Awaited<ReturnType<typeof segmentBreakdown>> = [];
  let filteredOpps: Awaited<ReturnType<typeof reviveOpportunity>>[] = [];

  try {
    const { opportunities: raw, fetchedAt: fa } = await getCachedData();
    fetchedAt = fa;
    const opportunities = raw.map(reviveOpportunity);
    kpis = computeAllKpis(opportunities, filters);

    const trendYear: 2025 | 2026 = displayYear === 'all' ? 2026 : displayYear;
    nbwTrend = monthlyTrend(opportunities, trendYear, 'newBusinessWon', displayLine, displayEng);
    mrrTrend = monthlyTrend(opportunities, trendYear, 'mrrAdded', displayLine, displayEng);
    segments = segmentBreakdown(opportunities, filters);

    // Filter opportunities for drill-through table
    filteredOpps = opportunities.filter((o) => {
      if (displayYear !== 'all') {
        const tabYear = o.sourceTab === 'Sales Funnel 2025' ? 2025 : 2026;
        if (tabYear !== displayYear) return false;
      }
      if (displayLine !== 'all' && o.serviceLine !== displayLine) return false;
      if (displayEng !== 'all' && o.engagementType !== displayEng) return false;
      return true;
    });
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : 'Failed to load data';
  }

  const pipelineTarget =
    displayYear !== 'all'
      ? (TARGETS[displayYear]?.annual.qualifiedPipeline ?? 0)
      : 0;

  const periodLabel = [
    displayYear === 'all' ? 'All Years' : String(displayYear),
    displayMonth !== 'all'
      ? new Date(2026, Number(displayMonth) - 1).toLocaleString('en-US', { month: 'long' })
      : null,
    displayLine !== 'all' ? displayLine : null,
    displayEng !== 'all' ? displayEng : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #f8faff 0%, #f4f4f8 100%)' }}>
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-10" style={{ borderTop: '3px solid #4f46e5' }}>
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-zinc-900">
                {process.env.NEXT_PUBLIC_APP_NAME ?? 'NetSuite Commercial KPIs'}
              </h1>
              <p className="text-xs text-zinc-400">Managed Services · Live from Google Sheets</p>
            </div>
            <UserNav />
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

        {/* Error state */}
        {errorMsg && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
            <strong>Could not load data:</strong> {errorMsg}
          </div>
        )}

        {kpis && (
          <>
            {/* Section label */}
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest -mb-4">
              {periodLabel}
            </p>

            {/* KPI grid */}
            <section aria-label="Key Performance Indicators">
              <KpiGrid kpis={kpis} year={displayYear === 'all' ? 'all' : displayYear} />
            </section>

            {/* Secondary stats strip */}
            <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: 'New Logos Won', value: kpis.newLogosWon.toString() },
                { label: 'Sales Cycle', value: kpis.salesCycleDays > 0 ? `${kpis.salesCycleDays} days` : '—' },
                {
                  label: 'Weighted Forecast',
                  value: kpis.weightedForecast > 0
                    ? `$${kpis.weightedForecast.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
                    : '—',
                },
                {
                  label: 'Pipeline Coverage',
                  value:
                    kpis.newBusinessWon > 0 && kpis.qualifiedPipeline90d > 0
                      ? `${((kpis.qualifiedPipeline90d / kpis.newBusinessWon) * 100).toFixed(0)}%`
                      : '—',
                },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-2xl border-0 bg-white px-5 py-4 shadow-[0_1px_4px_0_rgba(0,0,0,0.06),0_4px_16px_0_rgba(0,0,0,0.04)]">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</p>
                  <p className="mt-1 text-2xl font-semibold text-zinc-900 text-right">{value}</p>
                </div>
              ))}
            </section>

            {/* Charts row 1 */}
            <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <RevenueTrendChart
                data={nbwTrend}
                title={`New Business Won · ${displayYear === 'all' ? '2026' : displayYear}`}
              />
              <RevenueTrendChart
                data={mrrTrend}
                title={`MRR Added · ${displayYear === 'all' ? '2026' : displayYear}`}
              />
            </section>

            {/* Charts row 2 */}
            <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <SegmentBreakdownChart data={segments} />
              <PipelineVsTargetChart
                actual={kpis.newBusinessWon}
                target={pipelineTarget}
                year={displayYear}
              />
            </section>

            {/* Opportunity drill-through */}
            <OpportunityTable opportunities={filteredOpps} />
          </>
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
