import { eq, desc } from 'drizzle-orm';
import { db } from './db/client';
import { syncConfig, syncLog } from './db/schema';
import { SYNC_INTERVAL_MINUTES } from './sync-schedule';

export type TabHealth = {
  tabKey: string;
  tabName: string;
  syncMode: string;
  lastVerifiedAt: string | null;
  status: 'success' | 'error' | 'partial' | 'unknown';
  isStale: boolean;
};

export type SyncHealth = {
  ok: boolean;
  checkedAt: string;
  tabs: TabHealth[];
};

/**
 * Staleness only applies to continuously-synced ("scheduled") tabs — a
 * backfill_once historical tab is imported once by design and its
 * lastVerifiedAt is expected to age indefinitely without that being a problem.
 */
export async function getSyncHealth(): Promise<SyncHealth> {
  const activeConfigs = await db.select().from(syncConfig).where(eq(syncConfig.isActive, true));
  const staleThresholdMs = 2 * SYNC_INTERVAL_MINUTES * 60 * 1000;
  const now = Date.now();

  const tabs: TabHealth[] = await Promise.all(
    activeConfigs.map(async (config) => {
      const [lastLog] = await db
        .select()
        .from(syncLog)
        .where(eq(syncLog.tabKey, config.tabKey))
        .orderBy(desc(syncLog.startedAt))
        .limit(1);

      const isStale =
        config.syncMode === 'scheduled' &&
        (!config.lastVerifiedAt || now - config.lastVerifiedAt.getTime() > staleThresholdMs);

      return {
        tabKey: config.tabKey,
        tabName: config.tabName,
        syncMode: config.syncMode,
        lastVerifiedAt: config.lastVerifiedAt ? config.lastVerifiedAt.toISOString() : null,
        status: (lastLog?.status as TabHealth['status']) ?? 'unknown',
        isStale,
      };
    })
  );

  return {
    ok: tabs.every((t) => t.status !== 'error'),
    checkedAt: new Date().toISOString(),
    tabs,
  };
}
