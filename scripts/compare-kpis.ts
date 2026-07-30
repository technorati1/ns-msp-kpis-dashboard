import { config } from 'dotenv';
config({ path: '.env.local' });

async function main() {
  // Dynamic imports: dotenv must finish loading .env.local before lib/db/client
  // reads process.env.DATABASE_URL — static ESM imports are hoisted above
  // this file's own top-level code.
  const { fetchAllTabs } = await import('../lib/sheets');
  const { normalizeAllRows } = await import('../lib/normalize');
  const { computeAllKpis } = await import('../lib/kpis');
  const { getActiveOpportunities } = await import('../lib/db/queries');
  const { getTargetsMap } = await import('../lib/db/get-targets');

  const targets = await getTargetsMap();

  // --- Live Sheets path (today's production behaviour) ---
  const { funnel2025, funnel2026 } = await fetchAllTabs();
  const { opportunities: liveOpps } = normalizeAllRows(funnel2025, funnel2026);

  // --- Database path ---
  const dbOpps = await getActiveOpportunities();

  console.log(`Live Sheets: ${liveOpps.length} opportunities. Database: ${dbOpps.length} opportunities.\n`);

  const metrics: Array<keyof ReturnType<typeof computeAllKpis>> = [
    'newBusinessWon',
    'mrrAdded',
    'managedServicesRevenue',
    'winRate',
    'averageDealSize',
    'newLogosWon',
    'weightedForecast',
  ];

  let anyMismatch = false;

  for (const year of [2025, 2026] as const) {
    const filters = { year, month: 'all' as const, serviceLine: 'all' as const, engagementType: 'all' as const };
    const liveKpis = computeAllKpis(liveOpps, filters, targets);
    const dbKpis = computeAllKpis(dbOpps, filters, targets);

    console.log(`=== Year ${year} ===`);
    console.log('metric'.padEnd(24), 'live'.padEnd(18), 'db'.padEnd(18), 'match');
    for (const m of metrics) {
      const liveVal = liveKpis[m] as number;
      const dbVal = dbKpis[m] as number;
      const match = Math.abs(liveVal - dbVal) < 0.01;
      if (!match) anyMismatch = true;
      console.log(
        m.padEnd(24),
        String(liveVal).padEnd(18),
        String(dbVal).padEnd(18),
        match ? 'OK' : 'MISMATCH'
      );
    }
    console.log('');
  }

  if (anyMismatch) {
    console.error('MISMATCH DETECTED — do not proceed to cutover until resolved.');
    process.exit(1);
  } else {
    console.log('All compared KPIs match between live Sheets and the database.');
    process.exit(0);
  }
}

main();
