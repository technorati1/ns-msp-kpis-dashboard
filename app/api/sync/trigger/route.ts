import { NextResponse } from 'next/server';
import { desc } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { syncLog } from '@/lib/db/schema';
import { runSync } from '@/lib/sync';
import { MANUAL_SYNC_COOLDOWN_SECONDS } from '@/lib/sync-schedule';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST() {
  const [lastLog] = await db.select().from(syncLog).orderBy(desc(syncLog.startedAt)).limit(1);

  if (lastLog) {
    const secondsSinceLast = (Date.now() - lastLog.startedAt.getTime()) / 1000;
    if (secondsSinceLast < MANUAL_SYNC_COOLDOWN_SECONDS) {
      return NextResponse.json(
        { error: `Please wait ${Math.ceil(MANUAL_SYNC_COOLDOWN_SECONDS - secondsSinceLast)}s before syncing again` },
        { status: 429 }
      );
    }
  }

  const summary = await runSync();
  return NextResponse.json(summary);
}
