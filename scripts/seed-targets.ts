import { config } from 'dotenv';
config({ path: '.env.local' });

async function main() {
  // Dynamic import: dotenv must finish loading .env.local before lib/db/client
  // reads process.env.DATABASE_URL — static ESM imports are hoisted above
  // this file's own top-level code.
  const { db } = await import('../lib/db/client');
  const { targets } = await import('../lib/db/schema');
  const { FALLBACK_TARGETS } = await import('../lib/targets-map');

  const [existing] = await db.select({ id: targets.id }).from(targets).limit(1);
  if (existing) {
    console.log('targets table already has rows — skipping seed. Edit via /settings instead.');
    process.exit(0);
  }

  const rows = ([2025, 2026] as const).flatMap((year) =>
    Object.entries(FALLBACK_TARGETS[year]).map(([metric, value]) => ({
      year,
      segmentKey: null,
      metric,
      value: value.toString(),
    }))
  );

  await db.insert(targets).values(rows);

  const inserted = await db.select().from(targets);
  console.log(`Seeded ${inserted.length} target rows.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
