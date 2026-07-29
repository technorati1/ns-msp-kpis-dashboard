import { google } from 'googleapis';

const SHEET_ID = process.env.GOOGLE_SHEET_ID!;

function getAuth() {
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64;
  if (!b64) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 is not set');
  const json = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'));
  return new google.auth.GoogleAuth({
    credentials: json,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === attempts - 1) throw err;
      await new Promise((r) => setTimeout(r, 2 ** i * 500));
    }
  }
  throw new Error('unreachable');
}

export type RawRow = Record<string, string>;

/**
 * Live tabs fetched at runtime. The "Working file <year> plan" tabs are a
 * one-time source for the hard-coded values in lib/targets.ts and must never
 * be requested here — see README "Known limitations".
 */
export const TAB_NAMES = ['Sales Funnel 2025', 'Sales Funnel 2026'] as const;

export type TabName = (typeof TAB_NAMES)[number];

export interface TabResult {
  tab: TabName;
  status: 'ok' | 'error';
  message?: string;
}

/**
 * Fetches all rows from a single tab as an array of header-keyed objects.
 * Row 1 is treated as headers; empty rows are skipped.
 */
export async function fetchTab(tabName: TabName): Promise<RawRow[]> {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  const response = await withRetry(() =>
    sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `'${tabName}'`,
      valueRenderOption: 'FORMATTED_VALUE',
    })
  );

  const values = response.data.values ?? [];
  if (values.length < 2) return [];

  const [headerRow, ...dataRows] = values;
  const headers = headerRow.map((h) => String(h ?? '').trim());

  return dataRows
    .filter((row) => row.some((cell) => cell !== '' && cell != null))
    .map((row) => {
      const obj: RawRow = {};
      headers.forEach((h, i) => {
        obj[h] = String(row[i] ?? '').trim();
      });
      return obj;
    });
}

/** Fetches a single tab, isolating failures so one bad tab can't take down the others. */
async function fetchTabIsolated(
  tabName: TabName
): Promise<{ rows: RawRow[]; result: TabResult }> {
  try {
    const rows = await fetchTab(tabName);
    return { rows, result: { tab: tabName, status: 'ok' } };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[sheets] Failed to fetch tab "${tabName}": ${message}`);
    return { rows: [], result: { tab: tabName, status: 'error', message } };
  }
}

/** Fetches the live sales-funnel tabs in parallel; a per-tab failure returns an empty array for that tab instead of throwing. */
export async function fetchAllTabs() {
  const [funnel2025, funnel2026] = await Promise.all([
    fetchTabIsolated('Sales Funnel 2025'),
    fetchTabIsolated('Sales Funnel 2026'),
  ]);
  return {
    funnel2025: funnel2025.rows,
    funnel2026: funnel2026.rows,
    tabResults: [funnel2025.result, funnel2026.result] as TabResult[],
  };
}
