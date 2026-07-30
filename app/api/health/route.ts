import { NextResponse } from 'next/server';
import { getSyncHealth } from '@/lib/health';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const health = await getSyncHealth();
    return NextResponse.json(health);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
