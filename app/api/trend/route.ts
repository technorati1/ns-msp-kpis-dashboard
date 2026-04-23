import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { fetchAllTabs } from '@/lib/sheets';
import { normalizeAllRows, reviveOpportunity } from '@/lib/normalize';
import { monthlyTrend } from '@/lib/kpis';
import type { Filters } from '@/lib/filters';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const rawYear = params.get('year');
    const year: 2025 | 2026 = rawYear === '2025' ? 2025 : 2026;
    const metric = params.get('metric') === 'mrrAdded' ? 'mrrAdded' : 'newBusinessWon';
    const serviceLine = (params.get('serviceLine') ?? 'all') as Filters['serviceLine'];
    const engagementType = (params.get('engagementType') ?? 'all') as Filters['engagementType'];

    const cacheKey = `trend-${year}-${metric}-${serviceLine}-${engagementType}`;

    const result = await unstable_cache(
      async () => {
        const { funnel2025, funnel2026 } = await fetchAllTabs();
        const opps = normalizeAllRows(funnel2025, funnel2026).opportunities.map(reviveOpportunity);
        return monthlyTrend(opps, year, metric, serviceLine, engagementType);
      },
      [cacheKey],
      { revalidate: 60 }
    )();

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message, code: 'TREND_ERROR' }, { status: 500 });
  }
}
