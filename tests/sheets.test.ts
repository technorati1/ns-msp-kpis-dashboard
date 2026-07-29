import { describe, it, expect, vi, beforeAll } from 'vitest';

const requestedRanges: string[] = [];
let failingRange: string | null = null;

vi.mock('googleapis', () => ({
  google: {
    auth: {
      GoogleAuth: vi.fn().mockImplementation(function GoogleAuth() {
        return {};
      }),
    },
    sheets: vi.fn(() => ({
      spreadsheets: {
        values: {
          get: vi.fn(async ({ range }: { range: string }) => {
            requestedRanges.push(range);
            if (range === failingRange) {
              throw new Error(`Unable to parse range: ${range}`);
            }
            return { data: { values: [] } };
          }),
        },
      },
    })),
  },
}));

beforeAll(() => {
  process.env.GOOGLE_SHEET_ID = 'test-sheet-id';
  process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 = Buffer.from(
    JSON.stringify({ client_email: 'test@example.com', private_key: 'test' })
  ).toString('base64');
});

describe('lib/sheets — runtime tab allowlist', () => {
  it('TAB_NAMES only ever contains the live Sales Funnel tabs', async () => {
    const { TAB_NAMES } = await import('@/lib/sheets');
    expect(TAB_NAMES).toEqual(['Sales Funnel 2025', 'Sales Funnel 2026']);
    expect(TAB_NAMES.some((t) => /working file/i.test(t))).toBe(false);
  });

  it('fetchAllTabs only requests Sales Funnel 2025 and Sales Funnel 2026 from the Sheets API — never a Working file plan tab', async () => {
    const { fetchAllTabs } = await import('@/lib/sheets');
    requestedRanges.length = 0;

    await fetchAllTabs();

    expect(requestedRanges).toHaveLength(2);
    expect(new Set(requestedRanges)).toEqual(
      new Set([`'Sales Funnel 2025'`, `'Sales Funnel 2026'`])
    );
    expect(requestedRanges.some((r) => /working file/i.test(r))).toBe(false);
  });

  it('isolates a single failing tab: the other tab still loads and the failure is reported per-tab instead of throwing', async () => {
    vi.useFakeTimers();
    const { fetchAllTabs } = await import('@/lib/sheets');
    failingRange = `'Sales Funnel 2026'`;

    const resultPromise = fetchAllTabs();
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    vi.useRealTimers();
    failingRange = null;

    expect(result.funnel2025).toEqual([]);
    expect(result.funnel2026).toEqual([]);
    expect(result.tabResults).toEqual(
      expect.arrayContaining([
        { tab: 'Sales Funnel 2025', status: 'ok' },
        expect.objectContaining({ tab: 'Sales Funnel 2026', status: 'error' }),
      ])
    );
  });
});
