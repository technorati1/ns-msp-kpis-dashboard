import type { Opportunity } from './normalize';
import type { Filters } from './filters';
import { matchesFilters } from './filters';
import { TARGETS } from './targets';

const DEFAULT_PROBABILITY = 0.5;

function isWithinDays(date: Date, days: number): boolean {
  const now = new Date();
  const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return date >= now && date <= cutoff;
}

function filterOpps(opps: Opportunity[], filters: Filters): Opportunity[] {
  return opps.filter((o) => matchesFilters(o, filters));
}

// ─── Headline KPIs ────────────────────────────────────────────────────────────

export function newBusinessWon(opps: Opportunity[], filters: Filters): number {
  return filterOpps(opps, filters)
    .filter((o) => o.status === 'Closed Won' && o.customerType === 'New Logo')
    .reduce((sum, o) => sum + o.annualisedValue, 0);
}

export function mrrAdded(opps: Opportunity[], filters: Filters): number {
  return filterOpps(opps, filters)
    .filter((o) => o.status === 'Closed Won')
    .reduce((sum, o) => sum + o.mrrMonthly, 0);
}

export function managedServicesRevenue(opps: Opportunity[], filters: Filters): number {
  return filterOpps(opps, filters)
    .filter((o) => o.status === 'Closed Won' && o.engagementType === 'Managed Services')
    .reduce((sum, o) => sum + o.annualisedValue, 0);
}

/** Always forward-looking from today — period filter does NOT apply. */
export function qualifiedPipeline90d(opps: Opportunity[]): number {
  return opps
    .filter((o) => o.status === 'Open' && o.closeDate != null && isWithinDays(o.closeDate, 90))
    .reduce((sum, o) => sum + o.annualisedValue, 0);
}

export function winRate(opps: Opportunity[], filters: Filters): number {
  const filtered = filterOpps(opps, filters);
  const won = filtered.filter((o) => o.status === 'Closed Won').length;
  const lost = filtered.filter((o) => o.status === 'Closed Lost').length;
  const denom = won + lost;
  return denom === 0 ? 0 : won / denom;
}

export function averageDealSize(opps: Opportunity[], filters: Filters): number {
  const wins = filterOpps(opps, filters).filter((o) => o.status === 'Closed Won');
  if (wins.length === 0) return 0;
  return wins.reduce((sum, o) => sum + o.annualisedValue, 0) / wins.length;
}

// ─── Secondary KPIs ───────────────────────────────────────────────────────────

export function newLogosWon(opps: Opportunity[], filters: Filters): number {
  return filterOpps(opps, filters)
    .filter((o) => o.status === 'Closed Won' && o.customerType === 'New Logo').length;
}

export function salesCycleDays(opps: Opportunity[], filters: Filters): number {
  const wins = filterOpps(opps, filters)
    .filter((o) => o.status === 'Closed Won' && o.closeDate != null);
  if (wins.length === 0) return 0;
  const totalDays = wins.reduce((sum, o) => {
    const diff = o.closeDate!.getTime() - o.createdDate.getTime();
    return sum + diff / (1000 * 60 * 60 * 24);
  }, 0);
  return Math.round(totalDays / wins.length);
}

export function weightedForecast(opps: Opportunity[], filters: Filters): number {
  return filterOpps(opps, filters)
    .filter((o) => o.status === 'Open')
    .reduce((sum, o) => sum + o.annualisedValue * DEFAULT_PROBABILITY, 0);
}

// ─── YoY ──────────────────────────────────────────────────────────────────────

function priorYearFilters(filters: Filters): Filters | null {
  if (filters.year === 'all') return null;
  return { ...filters, year: filters.year === 2026 ? 2025 : 2026 };
}

export function yoyChange(
  current: number,
  opps: Opportunity[],
  filters: Filters,
  kpiFn: (opps: Opportunity[], filters: Filters) => number
): number | null {
  const prior = priorYearFilters(filters);
  if (!prior) return null;
  const priorValue = kpiFn(opps, prior);
  if (priorValue === 0) return null;
  return (current - priorValue) / priorValue;
}

// ─── Target attainment ────────────────────────────────────────────────────────

export function targetAttainment(
  actual: number,
  metric: keyof typeof TARGETS[2025]['annual'],
  year: 2025 | 2026
): number {
  const target = TARGETS[year]?.annual[metric] as number | undefined;
  if (!target) return 0;
  return actual / target;
}

// ─── Monthly trend (for charts) ───────────────────────────────────────────────

export type MonthlyValue = { month: number; value: number };

export function monthlyTrend(
  opps: Opportunity[],
  year: 2025 | 2026,
  metric: 'newBusinessWon' | 'mrrAdded',
  serviceLine: Filters['serviceLine'] = 'all',
  engagementType: Filters['engagementType'] = 'all'
): MonthlyValue[] {
  return Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const filters: Filters = { year, month, serviceLine, engagementType };
    const wonInMonth = filterOpps(opps, filters).filter((o) => o.status === 'Closed Won');
    const value =
      metric === 'newBusinessWon'
        ? wonInMonth.reduce((s, o) => s + o.annualisedValue, 0)
        : wonInMonth.reduce((s, o) => s + o.mrrMonthly, 0);
    return { month, value };
  });
}

// ─── Segment breakdown ────────────────────────────────────────────────────────

export type SegmentValue = { label: string; value: number };

export function segmentBreakdown(
  opps: Opportunity[],
  filters: Filters
): SegmentValue[] {
  const segments: Array<{ label: string; sl: Opportunity['serviceLine']; et: Opportunity['engagementType'] }> = [
    { label: 'ERP Managed Services', sl: 'ERP', et: 'Managed Services' },
    { label: 'SuiteCommerce Managed Services', sl: 'SuiteCommerce', et: 'Managed Services' },
    { label: 'SuiteCommerce Implementation', sl: 'SuiteCommerce', et: 'Implementation' },
  ];
  return segments.map(({ label, sl, et }) => {
    const f: Filters = { ...filters, serviceLine: sl, engagementType: et };
    const value = filterOpps(opps, f)
      .filter((o) => o.status === 'Closed Won')
      .reduce((s, o) => s + o.annualisedValue, 0);
    return { label, value };
  });
}

// ─── Composite result ─────────────────────────────────────────────────────────

export type KpiResult = {
  newBusinessWon: number;
  mrrAdded: number;
  managedServicesRevenue: number;
  qualifiedPipeline90d: number;
  winRate: number;
  averageDealSize: number;
  newLogosWon: number;
  salesCycleDays: number;
  weightedForecast: number;
  yoy: {
    newBusinessWon: number | null;
    mrrAdded: number | null;
    managedServicesRevenue: number | null;
    winRate: number | null;
    averageDealSize: number | null;
    newLogosWon: number | null;
  };
  targetAttainment: {
    newBusinessWon: number;
    mrrAdded: number;
    managedServicesRevenue: number;
    newLogosWon: number;
    winRate: number;
  };
};

export function computeAllKpis(opps: Opportunity[], filters: Filters): KpiResult {
  const nbw = newBusinessWon(opps, filters);
  const mrr = mrrAdded(opps, filters);
  const msr = managedServicesRevenue(opps, filters);
  const qp = qualifiedPipeline90d(opps);
  const wr = winRate(opps, filters);
  const ads = averageDealSize(opps, filters);
  const nl = newLogosWon(opps, filters);
  const sc = salesCycleDays(opps, filters);
  const wf = weightedForecast(opps, filters);

  const year = filters.year === 'all' ? null : filters.year;

  return {
    newBusinessWon: nbw,
    mrrAdded: mrr,
    managedServicesRevenue: msr,
    qualifiedPipeline90d: qp,
    winRate: wr,
    averageDealSize: ads,
    newLogosWon: nl,
    salesCycleDays: sc,
    weightedForecast: wf,
    yoy: {
      newBusinessWon: yoyChange(nbw, opps, filters, newBusinessWon),
      mrrAdded: yoyChange(mrr, opps, filters, mrrAdded),
      managedServicesRevenue: yoyChange(msr, opps, filters, managedServicesRevenue),
      winRate: yoyChange(wr, opps, filters, winRate),
      averageDealSize: yoyChange(ads, opps, filters, averageDealSize),
      newLogosWon: yoyChange(nl, opps, filters, newLogosWon),
    },
    targetAttainment: year
      ? {
          newBusinessWon: targetAttainment(nbw, 'newBusinessWon', year),
          mrrAdded: targetAttainment(mrr, 'mrrAdded', year),
          managedServicesRevenue: targetAttainment(msr, 'managedServicesRevenue', year),
          newLogosWon: targetAttainment(nl, 'newLogosWon', year),
          winRate: targetAttainment(wr, 'winRate', year),
        }
      : { newBusinessWon: 0, mrrAdded: 0, managedServicesRevenue: 0, newLogosWon: 0, winRate: 0 },
  };
}
