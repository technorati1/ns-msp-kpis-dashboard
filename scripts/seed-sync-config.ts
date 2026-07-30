import { config } from 'dotenv';
config({ path: '.env.local' });

async function main() {
  // Dynamic import: must happen after dotenv config() runs, since lib/db/client
  // reads process.env.DATABASE_URL at module-evaluation time and static ESM
  // imports are hoisted above this file's own top-level code.
  const { db } = await import('../lib/db/client');
  const { syncConfig } = await import('../lib/db/schema');
  const { sql } = await import('drizzle-orm');

  await db
    .insert(syncConfig)
    .values([
      {
        tabKey: 'sales_funnel_2025',
        tabName: 'Sales Funnel 2025',
        year: 2025,
        syncMode: 'backfill_once',
        isActive: true,
      },
      {
        tabKey: 'sales_funnel_2026',
        tabName: 'Sales Funnel 2026',
        year: 2026,
        syncMode: 'scheduled',
        isActive: true,
      },
    ])
    .onConflictDoNothing({ target: syncConfig.tabKey });

  const rows = await db.select().from(syncConfig).orderBy(sql`year`);
  console.log('sync_config rows:', rows);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
