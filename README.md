# NetSuite Commercial KPIs Dashboard

Executive dashboard for the Managed Services practice — commercial KPIs (wins, pipeline, MRR, win rate) synced from the marketing Google Sheet into a Postgres database on a schedule, so the app never reads Sheets live on page load.

## What it does

- **Reads from Postgres**, not live Sheets — a scheduled GitHub Actions job (every 20 min) plus an in-app "Sync now" button keep the database current
- **Displays 6 headline KPIs**: New Business Won, MRR Added, Managed Services Revenue, Qualified Pipeline (90d), Win Rate, Average Deal Size
- **Filters** by year, month, service line (ERP / SuiteCommerce), and engagement type
- **4 charts**: revenue trend, MRR trend, segment breakdown, pipeline vs target
- **Drill-through table**: searchable, sortable list of all underlying opportunities
- **Google SSO login**: only accounts in your Google Workspace organisation can access the dashboard
- **`/settings` page**: edit targets, tab names, and sync configuration without a code deploy — restricted to an allowlisted set of Google accounts
- **Resilient to a tab rename**: if a tab is renamed upstream, that tab shows a scoped stale/error state — everything else keeps working, and fixing it is a `/settings` edit, not a deploy

## Architecture

```
Google Sheet (source of truth)
       │
       │  lib/sheets.ts (googleapis, service account)
       ▼
lib/sync.ts — runSync()
  • reads active tabs from sync_config (tab name, year, sync mode)
  • backfill_once tabs: import once, never touched again
  • scheduled tabs: diff-and-upsert (hash per row) + soft-delete rows no longer present
  • every attempt, per tab, logged to sync_log — the audit trail
       │
       ▼
Postgres (Supabase, via Drizzle ORM)
  opportunities · targets · sync_config · sync_log
       │
       │  lib/get-opportunities.ts, lib/db/get-targets.ts, lib/health.ts
       ▼
app/page.tsx (Next.js Server Component) + /api/opportunities, /api/kpis, /api/trend
       ▼
KpiGrid + Charts + OpportunityTable (React client components)
```

Two triggers call the same `runSync()`:
- **`.github/workflows/sync.yml`** — cron, every 20 minutes, calls `POST /api/sync` (bearer-token auth via `SYNC_SECRET`)
- **"Sync now" button** in the header — calls `POST /api/sync/trigger` (same-origin session auth, 30s cooldown)

`GET /api/health` reports per-tab sync status and staleness; the dashboard shows a non-blocking amber banner if any actively-synced tab hasn't verified successfully within 2× the sync interval.

## Running locally

**Prerequisites**: Node 20+, pnpm, a Supabase Postgres project, a `.env.local` file (copy from `.env.local.example`).

```bash
pnpm install
pnpm db:migrate         # apply the Drizzle schema to your Supabase project
pnpm db:seed            # seed sync_config (Sales Funnel 2025 + 2026 tabs)
pnpm db:seed-targets    # seed targets table from the pre-migration hard-coded values
pnpm backfill --tab-key=sales_funnel_2025   # one-time historical import
pnpm sync:once          # run the sync engine once for all active tabs
pnpm dev                # http://localhost:3000
pnpm test               # run unit tests
pnpm tsc                # type check
```

### Required environment variables

| Variable | Description |
|---|---|
| `GOOGLE_SHEET_ID` | ID of the marketing Google Sheet |
| `GOOGLE_SERVICE_ACCOUNT_KEY_BASE64` | Base64-encoded service account JSON key |
| `NEXT_PUBLIC_APP_NAME` | Display name shown in the header |
| `AUTH_SECRET` | Random secret for NextAuth (`openssl rand -base64 32`) |
| `AUTH_GOOGLE_ID` | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret |
| `NEXTAUTH_URL` | Full URL of the app (`http://localhost:3000` locally, production URL on Vercel) |
| `DATABASE_URL` | Supabase pooled connection string, Transaction mode, port 6543 |
| `SYNC_SECRET` | Random secret shared with the GitHub Actions sync workflow (`openssl rand -base64 32`) |
| `ALERT_WEBHOOK_URL` | Optional — Slack/Discord incoming webhook for sync failures. Not set up (v1 relies on the stale banner + sync log) |
| `SETTINGS_ALLOWED_EMAIL` | Comma-separated list of Google accounts allowed to access `/settings` |

## Deploying to Vercel

1. Push this repo to GitHub
2. Go to **vercel.com/new** → import the repository
3. Add all environment variables listed above (Vercel dashboard → Project → Settings → Environment Variables)
4. Add your production URL to the Google OAuth client's authorised redirect URIs:
   `https://your-app.vercel.app/api/auth/callback/google`
5. Add `SYNC_SECRET` as a GitHub Actions repository secret (repo → Settings → Secrets and variables → Actions → New repository secret) — must match the Vercel env var value
6. Click **Deploy**

After first deploy, updates are automatic on every `git push`. The scheduled sync workflow runs independently of deploys, every 20 minutes.

> **Note**: on Vercel's free (Hobby) plan, "Vercel Authentication" deployment protection can only be applied to all deployments or none — it can't be scoped to preview-only. Since this app already has its own full auth (Google SSO on every page, a bearer-token check on `/api/sync`, and an email allowlist on `/settings`), Vercel Authentication is left **off** so the GitHub Actions cron job can reach `/api/sync`. On a Pro plan, scope it to preview deployments only instead.

## Operating the sync

### Running a backfill

Historical years are imported once, manually, and never touched again by the scheduled sync:

```bash
pnpm backfill --tab-key=sales_funnel_2025
```

Safe to re-run — it upserts by opportunity `id`. Use this to import a year's tab once during setup, and again for the active year once it closes and becomes historical (see "Adding a new year" below).

### Renaming a tab safely

If a tab gets renamed in the source Google Sheet, the sync engine will log a scoped error for that tab only (`sync_log`, and the health check) — the rest of the dashboard keeps working with last-known-good data.

**To fix it: go to `/settings` → Sync Configuration → edit the "Tab Name" field → Save.** No code change, no deploy. The next scheduled sync (within 20 minutes) or a manual "Sync now" click will pick up the new name.

### Adding a new year each January

1. Go to `/settings` → Sync Configuration and add a new row: tab key (e.g. `sales_funnel_2027`), the tab's actual name in the sheet, year `2027`, mode `scheduled`.
2. Change the outgoing year's row (e.g. `sales_funnel_2026`) from `scheduled` to `backfill_once` once it's closed, so the continuous sync stops touching it.
3. `lib/normalize.ts`'s business rules (close-date year, SuiteCommerce MRR-vs-implementation split) are keyed to specific years via `lib/sync.ts`'s `yearToSourceTab()` — extend both together when a new year needs its own rule, or reuse the existing logic if the rules carry over unchanged.
4. Add the new year's targets on `/settings` → Targets (or via `pnpm db:seed-targets` if starting from the hard-coded fallback values in `lib/targets-map.ts`).

## Updating targets

Targets live in the `targets` table, editable at `/settings` → Targets — changes take effect on the next page load, no deploy needed. `lib/targets-map.ts` keeps the pre-migration hard-coded values only as a fallback for any year with no database rows yet.

## Known limitations

- **Customer type** defaults to "New Logo" — the source sheet does not distinguish new vs existing customers
- **Managed Services Revenue** uses annualised contract value as a proxy; the sheet does not contain monthly recognised revenue
- **Weighted Forecast** uses a fixed 50% probability — no probability field in the source data
- The **Working file plan tabs** are never fetched at runtime (`lib/sheets.ts`'s `TAB_NAMES` allowlist) — they were only ever a one-time source for what are now the seeded `targets` rows
- Vercel Authentication (deployment protection) is off in production — see the note under "Deploying to Vercel"

## Data source

Marketing Google Sheet ID: `1hFNaWnzW6Bol2zk7gLjfY4sO-2CqNm18Zvfi_WG_kKU`

Tabs consumed: whatever `sync_config.tab_name` says for each active row (`Sales Funnel 2025`, `Sales Funnel 2026` as of this writing) — check `/settings` for the current mapping, since a tab rename changes this without a code change.
