import { NextRequest, NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { targets } from '@/lib/db/schema';

export const runtime = 'nodejs';

export async function GET() {
  const rows = await db.select().from(targets).orderBy(asc(targets.year), asc(targets.metric));
  return NextResponse.json({ targets: rows });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const id = Number(body.id);
  const value = Number(body.value);
  if (!Number.isFinite(id) || !Number.isFinite(value)) {
    return NextResponse.json({ error: 'id and value are required numbers' }, { status: 400 });
  }

  const [updated] = await db
    .update(targets)
    .set({ value: value.toString(), updatedAt: new Date() })
    .where(eq(targets.id, id))
    .returning();

  if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ target: updated });
}
