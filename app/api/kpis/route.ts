import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { fetchAllTabs } from '@/lib/sheets';
import { normalizeAllRows, reviveOpportunity } from '@/lib/normalize';
import { parseFiltersFromParams } from '@/lib/filters';
import { computeAllKpis } from '@/lib/kpis';

export const runtime = 'nodejs';

async function getOpportunities() {
  const { funnel2025, funnel2026 } = await fetchAllTabs();
  return normalizeAllRows(funnel2025, funnel2026).opportunities.map(reviveOpportunity);
}

export async function GET(req: NextRequest) {
  try {
    const filters = parseFiltersFromParams(req.nextUrl.searchParams);
    const cacheKey = `kpis-${JSON.stringify(filters)}`;

    const result = await unstable_cache(
      async () => {
        const opps = await getOpportunities();
        return computeAllKpis(opps, filters);
      },
      [cacheKey],
      { revalidate: 60 }
    )();

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message, code: 'KPI_ERROR' }, { status: 500 });
  }
}
