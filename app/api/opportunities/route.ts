import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { getActiveOpportunities } from '@/lib/db/queries';

export const runtime = 'nodejs';

const getCachedOpportunities = unstable_cache(
  async () => {
    const opportunities = await getActiveOpportunities();
    // filteredOutCount/deduplicatedCount are sheet-normalization-time stats;
    // now that data is synced into the database those live in sync_log instead.
    return { opportunities, filteredOutCount: 0, deduplicatedCount: 0 };
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
    return NextResponse.json({ error: message, code: 'DB_ERROR' }, { status: 500 });
  }
}
