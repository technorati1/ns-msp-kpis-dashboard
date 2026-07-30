import { isNull } from 'drizzle-orm';
import { db } from './client';
import { targets } from './schema';
import { FALLBACK_TARGETS, type TargetsMap, type TargetMetric } from '../targets-map';

/**
 * Reads company-wide (segmentKey IS NULL) annual targets from the database.
 * Falls back to the pre-migration hard-coded values for any year with no
 * rows yet, so the dashboard never breaks while targets are being seeded.
 */
export async function getTargetsMap(): Promise<TargetsMap> {
  const rows = await db.select().from(targets).where(isNull(targets.segmentKey));

  const map: TargetsMap = {
    2025: { ...FALLBACK_TARGETS[2025] },
    2026: { ...FALLBACK_TARGETS[2026] },
  };

  for (const row of rows) {
    if (row.year !== 2025 && row.year !== 2026) continue;
    map[row.year][row.metric as TargetMetric] = parseFloat(row.value);
  }

  return map;
}
