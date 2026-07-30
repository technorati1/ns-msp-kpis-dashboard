import { config } from 'dotenv';
config({ path: '.env.local' });

function parseTabKeyArg(): string {
  const arg = process.argv.find((a) => a.startsWith('--tab-key='));
  if (!arg) {
    console.error('Usage: pnpm backfill --tab-key=<sync_config.tab_key>');
    process.exit(1);
  }
  return arg.slice('--tab-key='.length);
}

async function main() {
  const tabKey = parseTabKeyArg();

  // Dynamic imports: dotenv must finish loading .env.local before lib/db/client
  // reads process.env.DATABASE_URL — static ESM imports are hoisted above
  // this file's own top-level code, so they can't come first.
  const { eq } = await import('drizzle-orm');
  const { db } = await import('../lib/db/client');
  const { syncConfig, syncLog } = await import('../lib/db/schema');
  const { fetchTab } = await import('../lib/sheets');
  const { normalizeRows } = await import('../lib/normalize');
  const { yearToSourceTab, hashOpportunity, toDbRow, upsertOpportunities } = await import('../lib/sync');

  const [syncConfigRow] = await db.select().from(syncConfig).where(eq(syncConfig.tabKey, tabKey)).limit(1);
  if (!syncConfigRow) {
    console.error(`No sync_config row found for tab_key "${tabKey}". Add one via the /settings page first.`);
    process.exit(1);
  }

  console.log(`Backfilling "${syncConfigRow.tabKey}" from sheet tab "${syncConfigRow.tabName}"...`);
  const startedAt = new Date();

  try {
    const rawRows = await fetchTab(syncConfigRow.tabName);
    const sourceTab = yearToSourceTab(syncConfigRow.year);
    const { opportunities: normalized, filteredOutCount } = normalizeRows(rawRows, sourceTab);

    const rows = normalized.map((o) => toDbRow(o, hashOpportunity(o), startedAt));
    await upsertOpportunities(rows);

    await db.update(syncConfig).set({ lastVerifiedAt: startedAt }).where(eq(syncConfig.id, syncConfigRow.id));
    await db.insert(syncLog).values({
      tabKey: syncConfigRow.tabKey,
      startedAt,
      finishedAt: new Date(),
      status: 'success',
      rowsRead: rawRows.length,
      rowsUpserted: rows.length,
      rowsSoftDeleted: 0,
    });

    console.log(
      `Done. Read ${rawRows.length} raw rows, filtered out ${filteredOutCount}, upserted ${rows.length} opportunities.`
    );
    process.exit(0);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.insert(syncLog).values({
      tabKey: syncConfigRow.tabKey,
      startedAt,
      finishedAt: new Date(),
      status: 'error',
      errorMessage: message,
    });
    console.error('Backfill failed:', message);
    process.exit(1);
  }
}

main();
