import { NextResponse } from 'next/server';
import { desc } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { syncLog } from '@/lib/db/schema';

export const runtime = 'nodejs';

export async function GET() {
  const rows = await db.select().from(syncLog).orderBy(desc(syncLog.startedAt)).limit(20);
  return NextResponse.json({ syncLog: rows });
}
