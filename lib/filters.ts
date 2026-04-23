import type { ServiceLine, EngagementType, Opportunity } from './normalize';

export type Filters = {
  year: 2025 | 2026 | 'all';
  month: number | 'all'; // 1–12
  serviceLine: ServiceLine | 'all';
  engagementType: EngagementType | 'all';
};

export const DEFAULT_FILTERS: Filters = {
  year: new Date().getFullYear() >= 2026 ? 2026 : 2025,
  month: 'all',
  serviceLine: 'all',
  engagementType: 'all',
};

export function parseFiltersFromParams(params: URLSearchParams): Filters {
  const rawYear = params.get('year');
  const rawMonth = params.get('month');
  const rawLine = params.get('serviceLine') as ServiceLine | 'all' | null;
  const rawEng = params.get('engagementType') as EngagementType | 'all' | null;

  const year: Filters['year'] =
    rawYear === '2025' ? 2025 : rawYear === '2026' ? 2026 : 'all';

  const monthNum = rawMonth ? parseInt(rawMonth, 10) : NaN;
  const month: Filters['month'] =
    !isNaN(monthNum) && monthNum >= 1 && monthNum <= 12 ? monthNum : 'all';

  const validLines: Array<ServiceLine | 'all'> = ['ERP', 'SuiteCommerce', 'all'];
  const serviceLine: Filters['serviceLine'] = validLines.includes(rawLine as ServiceLine | 'all')
    ? (rawLine as ServiceLine | 'all')
    : 'all';

  const validEngs: Array<EngagementType | 'all'> = ['Managed Services', 'Implementation', 'all'];
  const engagementType: Filters['engagementType'] = validEngs.includes(rawEng as EngagementType | 'all')
    ? (rawEng as EngagementType | 'all')
    : 'all';

  return { year, month, serviceLine, engagementType };
}

export function filtersToParams(f: Filters): URLSearchParams {
  const p = new URLSearchParams();
  p.set('year', String(f.year));
  p.set('month', String(f.month));
  p.set('serviceLine', f.serviceLine);
  p.set('engagementType', f.engagementType);
  return p;
}

/** Returns true if an opportunity falls within the given filters (by closeDate). */
export function matchesFilters(opp: Opportunity, filters: Filters): boolean {
  if (filters.year !== 'all') {
    const tabYear = opp.sourceTab === 'Sales Funnel 2025' ? 2025 : 2026;
    if (tabYear !== filters.year) return false;
  }
  if (filters.month !== 'all' && opp.closeDate) {
    if (opp.closeDate.getMonth() + 1 !== filters.month) return false;
  }
  if (filters.serviceLine !== 'all' && opp.serviceLine !== filters.serviceLine) return false;
  if (filters.engagementType !== 'all' && opp.engagementType !== filters.engagementType) return false;
  return true;
}
