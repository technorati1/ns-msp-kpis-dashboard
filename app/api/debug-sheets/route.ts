import { NextResponse } from 'next/server';
import { fetchAllTabs } from '@/lib/sheets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { funnel2025, funnel2026, tabResults } = await fetchAllTabs();

    return NextResponse.json({
      ok: true,
      tabs: {
        'Sales Funnel 2025': funnel2025.length,
        'Sales Funnel 2026': funnel2026.length,
      },
      tabResults,
      sampleRow2025: funnel2025[0] ?? null,
      sampleRow2026: funnel2026[0] ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
