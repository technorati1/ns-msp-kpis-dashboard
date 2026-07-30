import { config } from 'dotenv';
config({ path: '.env.local' });

async function main() {
  // Dynamic import so dotenv finishes loading .env.local before lib/sync's
  // lib/db/client dependency reads process.env.DATABASE_URL.
  const { runSync } = await import('../lib/sync');
  const summary = await runSync();
  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
}

main();
