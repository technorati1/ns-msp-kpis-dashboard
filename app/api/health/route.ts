import { NextResponse } from 'next/server';
import { fetchAllTabs } from '@/lib/sheets';
import { normalizeAllRows } from '@/lib/normalize';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { funnel2025, funnel2026, tabResults } = await fetchAllTabs();
    const { opportunities, filteredOutCount } = normalizeAllRows(funnel2025, funnel2026);
    const hasTabErrors = tabResults.some((t) => t.status === 'error');
    return NextResponse.json({
      ok: !hasTabErrors,
      lastFetchedAt: new Date().toISOString(),
      oppCount: opportunities.length,
      filteredOutCount,
      tabs: tabResults,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
