import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { getAllOpportunities } from '@/lib/get-opportunities';
import { parseFiltersFromParams } from '@/lib/filters';
import { computeAllKpis } from '@/lib/kpis';
import { getTargetsMap } from '@/lib/db/get-targets';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const filters = parseFiltersFromParams(req.nextUrl.searchParams);
    const cacheKey = `kpis-${JSON.stringify(filters)}`;

    const result = await unstable_cache(
      async () => {
        const [opps, targets] = await Promise.all([getAllOpportunities(), getTargetsMap()]);
        return computeAllKpis(opps, filters, targets);
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
