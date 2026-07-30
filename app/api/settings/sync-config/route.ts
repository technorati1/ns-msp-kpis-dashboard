import { NextRequest, NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { syncConfig } from '@/lib/db/schema';

export const runtime = 'nodejs';

export async function GET() {
  const rows = await db.select().from(syncConfig).orderBy(asc(syncConfig.year), asc(syncConfig.tabKey));
  return NextResponse.json({ syncConfig: rows });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const id = Number(body.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const updates: Partial<{ tabName: string; isActive: boolean }> = {};
  if (typeof body.tabName === 'string' && body.tabName.trim().length > 0) {
    updates.tabName = body.tabName.trim();
  }
  if (typeof body.isActive === 'boolean') {
    updates.isActive = body.isActive;
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'no valid fields to update' }, { status: 400 });
  }

  const [updated] = await db.update(syncConfig).set(updates).where(eq(syncConfig.id, id)).returning();
  if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ syncConfig: updated });
}
