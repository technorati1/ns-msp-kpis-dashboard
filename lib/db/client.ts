import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;

// Transaction-mode pooler (port 6543) — safe under Vercel's per-request
// function instances. prepare: false is required for transaction-mode pooling.
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });
