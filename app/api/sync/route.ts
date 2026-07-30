import { NextRequest, NextResponse } from 'next/server';
import { runSync } from '@/lib/sync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const secret = process.env.SYNC_SECRET;
  const authHeader = req.headers.get('authorization');

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const summary = await runSync();
  return NextResponse.json(summary);
}
