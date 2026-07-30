import { createHash } from 'crypto';
import { eq, inArray } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { db } from './db/client';
import { opportunities, syncConfig, syncLog } from './db/schema';
import { fetchTab } from './sheets';
import { normalizeRows, type Opportunity, type SourceTab } from './normalize';

type SyncConfigRow = typeof syncConfig.$inferSelect;

export type TabSyncResult = {
  tabKey: string;
  status: 'success' | 'error';
  rowsChanged: number;
  message?: string;
};

export type SyncSummary = {
  startedAt: string;
  finishedAt: string;
  tabs: TabSyncResult[];
};

/**
 * lib/normalize.ts encodes year-specific business rules (close-date year,
 * the 2026 SuiteCommerce MRR-vs-implementation split) against the literal
 * SourceTab union, not against whatever the sheet tab happens to be named
 * today. sync_config.year is the stable identity; sync_config.tab_name is
 * just where to fetch it from this run. Extend this map (and normalize.ts)
 * together when a new year's rules are added.
 */
export function yearToSourceTab(year: number): SourceTab {
  if (year === 2025) return 'Sales Funnel 2025';
  if (year === 2026) return 'Sales Funnel 2026';
  throw new Error(
    `lib/sync.ts has no normalize.ts mapping for year ${year} yet — add one before activating this sync_config row.`
  );
}

/** Stable hash of a normalised opportunity, used to detect real changes between syncs. */
export function hashOpportunity(o: Opportunity): string {
  const canonical = {
    accountName: o.accountName,
    createdDate: o.createdDate.toISOString(),
    serviceLine: o.serviceLine,
    engagementType: o.engagementType,
    customerType: o.customerType,
    status: o.status,
    source: o.source,
    region: o.region,
    funnelHighLevel: o.funnelHighLevel,
    amountOneTime: o.amountOneTime,
    recurringRevAnnual: o.recurringRevAnnual,
    mrrMonthly: o.mrrMonthly,
    annualisedValue: o.annualisedValue,
    closeMonth: o.closeMonth,
    closeDate: o.closeDate?.toISOString() ?? null,
  };
  return createHash('sha1').update(JSON.stringify(canonical)).digest('hex');
}

export function toDbRow(o: Opportunity, rowHash: string, now: Date) {
  return {
    id: o.id,
    accountName: o.accountName,
    createdDate: o.createdDate,
    serviceLine: o.serviceLine,
    engagementType: o.engagementType,
    customerType: o.customerType,
    status: o.status,
    source: o.source,
    region: o.region,
    funnelHighLevel: o.funnelHighLevel,
    amountOneTime: o.amountOneTime.toString(),
    recurringRevAnnual: o.recurringRevAnnual.toString(),
    mrrMonthly: o.mrrMonthly.toString(),
    annualisedValue: o.annualisedValue.toString(),
    closeMonth: o.closeMonth,
    closeDate: o.closeDate,
    sourceTab: o.sourceTab,
    rowHash,
    isDeleted: false,
    firstSyncedAt: now,
    lastSyncedAt: now,
  };
}

async function postAlert(message: string) {
  const url = process.env.ALERT_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message }),
    });
  } catch (err) {
    // Alerting is best-effort — a failed webhook must never fail the sync itself.
    console.error('[sync] failed to post alert webhook:', err);
  }
}

/** Bulk upsert: values() carries the per-row data, set() references the pending row via `excluded`. */
export async function upsertOpportunities(rows: ReturnType<typeof toDbRow>[]) {
  if (rows.length === 0) return;
  await db
    .insert(opportunities)
    .values(rows)
    .onConflictDoUpdate({
      target: opportunities.id,
      set: {
        accountName: sql`excluded.account_name`,
        createdDate: sql`excluded.created_date`,
        serviceLine: sql`excluded.service_line`,
        engagementType: sql`excluded.engagement_type`,
        customerType: sql`excluded.customer_type`,
        status: sql`excluded.status`,
        source: sql`excluded.source`,
        region: sql`excluded.region`,
        funnelHighLevel: sql`excluded.funnel_high_level`,
        amountOneTime: sql`excluded.amount_one_time`,
        recurringRevAnnual: sql`excluded.recurring_rev_annual`,
        mrrMonthly: sql`excluded.mrr_monthly`,
        annualisedValue: sql`excluded.annualised_value`,
        closeMonth: sql`excluded.close_month`,
        closeDate: sql`excluded.close_date`,
        sourceTab: sql`excluded.source_tab`,
        rowHash: sql`excluded.row_hash`,
        isDeleted: sql`excluded.is_deleted`,
        lastSyncedAt: sql`excluded.last_synced_at`,
        // firstSyncedAt intentionally omitted — preserve the original value on update.
      },
    });
}

async function syncBackfillOnceTab(
  config: SyncConfigRow,
  sourceTab: SourceTab,
  rawRowCount: number,
  normalized: Opportunity[],
  now: Date
): Promise<TabSyncResult> {
  const [existing] = await db
    .select({ id: opportunities.id })
    .from(opportunities)
    .where(eq(opportunities.sourceTab, sourceTab))
    .limit(1);

  if (existing) {
    // Historical year already imported — never touch it again from the scheduled/manual sync.
    await db.update(syncConfig).set({ lastVerifiedAt: now }).where(eq(syncConfig.id, config.id));
    await db.insert(syncLog).values({
      tabKey: config.tabKey,
      startedAt: now,
      finishedAt: new Date(),
      status: 'success',
      rowsRead: rawRowCount,
      rowsUpserted: 0,
      rowsSoftDeleted: 0,
    });
    return { tabKey: config.tabKey, status: 'success', rowsChanged: 0 };
  }

  const rows = normalized.map((o) => toDbRow(o, hashOpportunity(o), now));
  await upsertOpportunities(rows);
  await db.update(syncConfig).set({ lastVerifiedAt: now }).where(eq(syncConfig.id, config.id));
  await db.insert(syncLog).values({
    tabKey: config.tabKey,
    startedAt: now,
    finishedAt: new Date(),
    status: 'success',
    rowsRead: rawRowCount,
    rowsUpserted: rows.length,
    rowsSoftDeleted: 0,
  });
  return { tabKey: config.tabKey, status: 'success', rowsChanged: rows.length };
}

async function syncScheduledTab(
  config: SyncConfigRow,
  sourceTab: SourceTab,
  rawRowCount: number,
  normalized: Opportunity[],
  now: Date
): Promise<TabSyncResult> {
  const existingRows = await db
    .select({ id: opportunities.id, rowHash: opportunities.rowHash, isDeleted: opportunities.isDeleted })
    .from(opportunities)
    .where(eq(opportunities.sourceTab, sourceTab));
  const existingById = new Map(existingRows.map((r) => [r.id, r]));

  const seenIds = new Set<string>();
  const toUpsert: ReturnType<typeof toDbRow>[] = [];

  for (const o of normalized) {
    seenIds.add(o.id);
    const hash = hashOpportunity(o);
    const existing = existingById.get(o.id);
    if (!existing || existing.rowHash !== hash || existing.isDeleted) {
      toUpsert.push(toDbRow(o, hash, now));
    }
  }

  const idsToSoftDelete = existingRows
    .filter((r) => !r.isDeleted && !seenIds.has(r.id))
    .map((r) => r.id);

  await upsertOpportunities(toUpsert);
  if (idsToSoftDelete.length > 0) {
    await db
      .update(opportunities)
      .set({ isDeleted: true, lastSyncedAt: now })
      .where(inArray(opportunities.id, idsToSoftDelete));
  }

  await db.update(syncConfig).set({ lastVerifiedAt: now }).where(eq(syncConfig.id, config.id));
  await db.insert(syncLog).values({
    tabKey: config.tabKey,
    startedAt: now,
    finishedAt: new Date(),
    status: 'success',
    rowsRead: rawRowCount,
    rowsUpserted: toUpsert.length,
    rowsSoftDeleted: idsToSoftDelete.length,
  });

  return {
    tabKey: config.tabKey,
    status: 'success',
    rowsChanged: toUpsert.length + idsToSoftDelete.length,
  };
}

async function syncTab(config: SyncConfigRow): Promise<TabSyncResult> {
  const startedAt = new Date();

  let rawRows;
  try {
    rawRows = await fetchTab(config.tabName);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.insert(syncLog).values({
      tabKey: config.tabKey,
      startedAt,
      finishedAt: new Date(),
      status: 'error',
      errorMessage: message,
    });
    await postAlert(`[sync] "${config.tabKey}" (tab "${config.tabName}") failed to fetch: ${message}`);
    return { tabKey: config.tabKey, status: 'error', rowsChanged: 0, message };
  }

  try {
    const sourceTab = yearToSourceTab(config.year);
    const { opportunities: normalized } = normalizeRows(rawRows, sourceTab);

    if (config.syncMode === 'backfill_once') {
      return await syncBackfillOnceTab(config, sourceTab, rawRows.length, normalized, startedAt);
    }
    return await syncScheduledTab(config, sourceTab, rawRows.length, normalized, startedAt);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.insert(syncLog).values({
      tabKey: config.tabKey,
      startedAt,
      finishedAt: new Date(),
      status: 'error',
      rowsRead: rawRows.length,
      errorMessage: message,
    });
    await postAlert(`[sync] "${config.tabKey}" failed during normalize/write: ${message}`);
    return { tabKey: config.tabKey, status: 'error', rowsChanged: 0, message };
  }
}

/**
 * Runs sync for every active sync_config row. Each tab is fully isolated —
 * one tab's fetch/normalize/write failure is logged and reported but never
 * stops the others, and never throws out of runSync().
 */
export async function runSync(): Promise<SyncSummary> {
  const startedAt = new Date().toISOString();
  const activeConfigs = await db.select().from(syncConfig).where(eq(syncConfig.isActive, true));

  const results = await Promise.all(activeConfigs.map((config) => syncTab(config)));

  return {
    startedAt,
    finishedAt: new Date().toISOString(),
    tabs: results,
  };
}
