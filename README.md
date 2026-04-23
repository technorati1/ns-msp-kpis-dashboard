# NetSuite Commercial KPIs Dashboard

Executive dashboard for the Managed Services practice. Reads live data from the marketing Google Sheet and renders commercial KPIs — wins, pipeline, MRR, win rate — without any database or manual sync.

## What it does

- **Pulls live data** from the marketing Google Sheet every 60 seconds (no manual export needed)
- **Displays 6 headline KPIs**: New Business Won, MRR Added, Managed Services Revenue, Qualified Pipeline (90d), Win Rate, Average Deal Size
- **Filters** by year, month, service line (ERP / SuiteCommerce), and engagement type
- **4 charts**: revenue trend, MRR trend, segment breakdown, pipeline vs target
- **Drill-through table**: searchable, sortable list of all underlying opportunities
- **Google SSO login**: only accounts in your Google Workspace organisation can access it

## Running locally

**Prerequisites**: Node 20+, pnpm, a `.env.local` file (copy from `.env.local.example`).

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm test         # run unit tests
pnpm tsc          # type check
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

## Deploying to Vercel

1. Push this repo to GitHub
2. Go to **vercel.com/new** → import the repository
3. Add all 7 environment variables listed above (Vercel dashboard → Project → Settings → Environment Variables)
4. Add your production URL to the Google OAuth client's authorised redirect URIs:
   `https://your-app.vercel.app/api/auth/callback/google`
5. Click **Deploy**

After first deploy, updates are automatic on every `git push`.

## Updating targets

Hard-coded targets live in [`lib/targets.ts`](lib/targets.ts). To update:

1. Edit the values in that file
2. Commit and push — Vercel redeploys automatically (< 1 min)

No database to update, no environment variables to change.

## Architecture

```
Google Sheet (source of truth)
       ↓  (googleapis, service account, 60s cache)
lib/sheets.ts → lib/normalize.ts → lib/kpis.ts
       ↓
app/page.tsx (Next.js Server Component)
       ↓
KpiGrid + Charts + OpportunityTable (React client components)
```

- **No database** — all data fetched live from Google Sheets, cached in Next.js for 60 seconds
- **Google SSO** — NextAuth v5 with Google provider; set OAuth consent screen to "Internal" to restrict to your org
- **Targets** — hard-coded in `lib/targets.ts`; update by editing the file and redeploying

## Known limitations

- **Customer type** defaults to "New Logo" — the source sheet does not distinguish new vs existing customers
- **Managed Services Revenue** uses annualised contract value as a proxy; the sheet does not contain monthly recognised revenue
- **Weighted Forecast** uses a fixed 50% probability — no probability field in the source data
- The **Working file plan tabs** are not parsed at runtime; targets are hard-coded in `lib/targets.ts` instead

## Data source

Marketing Google Sheet ID: `1hFNaWnzW6Bol2zk7gLjfY4sO-2CqNm18Zvfi_WG_kKU`

Tabs consumed: `Sales Funnel 2025`, `Sales Funnel 2026`
