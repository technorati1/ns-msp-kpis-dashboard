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

export const TAB_NAMES = [
  'Sales Funnel 2025',
  'Sales Funnel 2026',
  'Working file 2025 plan',
  'Working file 2026 plan',
] as const;

export type TabName = (typeof TAB_NAMES)[number];

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

/** Fetches all four tabs in parallel. */
export async function fetchAllTabs() {
  const [funnel2025, funnel2026, plan2025, plan2026] = await Promise.all([
    fetchTab('Sales Funnel 2025'),
    fetchTab('Sales Funnel 2026'),
    fetchTab('Working file 2025 plan'),
    fetchTab('Working file 2026 plan'),
  ]);
  return { funnel2025, funnel2026, plan2025, plan2026 };
}
