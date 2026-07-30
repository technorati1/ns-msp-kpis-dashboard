import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { fetchAllTabs } from '@/lib/sheets';
import { normalizeAllRows } from '@/lib/normalize';
import { getActiveOpportunities } from '@/lib/db/queries';
import { isDatabaseSource } from '@/lib/data-source';

export const runtime = 'nodejs';

const getCachedOpportunities = unstable_cache(
  async () => {
    if (isDatabaseSource()) {
      const opportunities = await getActiveOpportunities();
      // filteredOutCount/deduplicatedCount are sheet-normalization-time stats;
      // once data is synced into the database those live in sync_log instead.
      return { opportunities, filteredOutCount: 0, deduplicatedCount: 0 };
    }
    const { funnel2025, funnel2026 } = await fetchAllTabs();
    return normalizeAllRows(funnel2025, funnel2026);
  },
  ['opportunities'],
  { revalidate: 60 }
);

export async function GET() {
  try {
    const result = await getCachedOpportunities();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message, code: 'SHEETS_ERROR' }, { status: 500 });
  }
}
