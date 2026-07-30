import { describe, it, expect, vi, beforeEach } from 'vitest';
import { opportunities, syncConfig, syncLog } from '@/lib/db/schema';

/**
 * runSync() talks to Postgres through drizzle. Rather than hit a real
 * database in tests, this mocks '@/lib/db/client' with a small in-memory
 * fake query builder that supports exactly the chains lib/sync.ts and
 * lib/db/queries.ts actually use (select/insert/update with eq/inArray
 * conditions). drizzle-orm's own eq/inArray are swapped for simple
 * inspectable predicate objects so the fake can evaluate `.where(...)`.
 */

type Row = Record<string, unknown>;

let syncConfigRows: Row[] = [];
let syncLogRows: Row[] = [];
let opportunityRows: Row[] = [];

function getTable(table: unknown): Row[] {
  if (table === syncConfig) return syncConfigRows;
  if (table === opportunities) return opportunityRows;
  if (table === syncLog) return syncLogRows;
  throw new Error('unknown table in test fake');
}

type Cond = { type: 'eq'; col: unknown; val: unknown } | { type: 'inArray'; col: unknown; vals: unknown[] };

function matches(row: Row, cond: Cond | undefined): boolean {
  if (!cond) return true;
  if (cond.type === 'eq') {
    if (cond.col === syncConfig.id) return row.id === cond.val;
    if (cond.col === syncConfig.isActive) return row.isActive === cond.val;
    if (cond.col === opportunities.id) return row.id === cond.val;
    if (cond.col === opportunities.sourceTab) return row.sourceTab === cond.val;
    if (cond.col === opportunities.isDeleted) return row.isDeleted === cond.val;
    return true;
  }
  if (cond.type === 'inArray') {
    if (cond.col === opportunities.id) return cond.vals.includes(row.id);
    return true;
  }
  return true;
}

function fakeSelect() {
  let table: Row[] = [];
  let cond: Cond | undefined;
  const builder = {
    from(t: unknown) {
      table = getTable(t);
      return builder;
    },
    where(c: Cond) {
      cond = c;
      return builder;
    },
    limit() {
      return builder;
    },
    orderBy() {
      return builder;
    },
    then(resolve: (v: Row[]) => unknown, reject?: (e: unknown) => unknown) {
      return Promise.resolve(table.filter((r) => matches(r, cond))).then(resolve, reject);
    },
  };
  return builder;
}

function fakeInsert(table: unknown) {
  return {
    values(rows: Row | Row[]) {
      const arr = Array.isArray(rows) ? rows : [rows];
      const apply = () => {
        const target = getTable(table);
        for (const r of arr) {
          const idx = target.findIndex((x) => x.id === r.id);
          if (idx >= 0) target[idx] = { ...target[idx], ...r };
          else target.push(table === syncLog ? { id: target.length + 1, ...r } : { ...r });
        }
        return Promise.resolve();
      };
      return {
        onConflictDoUpdate: apply,
        onConflictDoNothing: apply,
        then: (resolve: (v: unknown) => unknown) => apply().then(resolve),
      };
    },
  };
}

function fakeUpdate(table: unknown) {
  let patch: Row = {};
  const builder = {
    set(p: Row) {
      patch = p;
      return builder;
    },
    where(cond: Cond) {
      const target = getTable(table);
      for (const r of target) {
        if (matches(r, cond)) Object.assign(r, patch);
      }
      return Promise.resolve();
    },
  };
  return builder;
}

vi.mock('@/lib/db/client', () => ({
  db: {
    select: () => fakeSelect(),
    insert: (table: unknown) => fakeInsert(table),
    update: (table: unknown) => fakeUpdate(table),
  },
}));

vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('drizzle-orm')>();
  return {
    ...actual,
    eq: (col: unknown, val: unknown): Cond => ({ type: 'eq', col, val }),
    inArray: (col: unknown, vals: unknown[]): Cond => ({ type: 'inArray', col, vals }),
  };
});

const RENAMED_TAB_NAME = 'Sales Funnel 2026 (renamed)';

vi.mock('@/lib/sheets', () => ({
  fetchTab: vi.fn(async (tabName: string) => {
    if (tabName === RENAMED_TAB_NAME) {
      throw new Error(`Unable to parse range: '${tabName}'`);
    }
    return [
      {
        'Customer Email Address': 'newwin@example.com',
        Date: '2025-02-01',
        'Funnel high level': 'ERP Support',
        'Signed Contract value $': '10000',
        'Recurring rev': '0',
        'Closing Month': 'March',
        Status: 'Won',
        'Lead Source': 'Organic',
        Country: 'USA',
      },
    ];
  }),
}));

beforeEach(() => {
  syncLogRows = [];
  syncConfigRows = [
    {
      id: 1,
      tabKey: 'sales_funnel_2025',
      tabName: 'Sales Funnel 2025',
      year: 2025,
      syncMode: 'backfill_once',
      isActive: true,
      lastVerifiedAt: null,
    },
    {
      id: 2,
      tabKey: 'sales_funnel_2026',
      // Simulates the tab having been renamed upstream without sync_config being updated yet.
      tabName: RENAMED_TAB_NAME,
      year: 2026,
      syncMode: 'scheduled',
      isActive: true,
      lastVerifiedAt: new Date('2026-01-01T00:00:00Z'),
    },
  ];
  opportunityRows = [
    {
      id: 'existing-2026-opp',
      accountName: 'existing@example.com',
      createdDate: new Date('2026-01-01'),
      serviceLine: 'ERP',
      engagementType: 'Managed Services',
      customerType: 'New Logo',
      status: 'Closed Won',
      source: 'Organic',
      region: 'USA',
      funnelHighLevel: 'ERP Support',
      amountOneTime: '5000',
      recurringRevAnnual: '0',
      mrrMonthly: '0',
      annualisedValue: '5000',
      closeMonth: 1,
      closeDate: new Date('2026-01-31'),
      sourceTab: 'Sales Funnel 2026',
      rowHash: 'existing-hash',
      isDeleted: false,
      firstSyncedAt: new Date('2026-01-01'),
      lastSyncedAt: new Date('2026-01-01'),
    },
  ];
});

describe('runSync — tab rename resilience', () => {
  it('isolates a renamed tab: logs its error, keeps syncing the other tab, keeps serving last-known-good data, never throws', async () => {
    const { runSync } = await import('@/lib/sync');
    const { getActiveOpportunities } = await import('@/lib/db/queries');

    // (d) no unhandled exception reaches the caller — if runSync() threw, this line would fail the test.
    const summary = await runSync();

    // (a) the sync log records an error for the renamed tab only
    const renamedTabLogs = syncLogRows.filter((r) => r.tabKey === 'sales_funnel_2026');
    expect(renamedTabLogs).toHaveLength(1);
    expect(renamedTabLogs[0].status).toBe('error');
    expect(String(renamedTabLogs[0].errorMessage)).toContain('Unable to parse range');

    const okTabLogs = syncLogRows.filter((r) => r.tabKey === 'sales_funnel_2025');
    expect(okTabLogs.every((r) => r.status !== 'error')).toBe(true);

    // (b) the other tab still syncs successfully
    const summaryForFailingTab = summary.tabs.find((t) => t.tabKey === 'sales_funnel_2026');
    const summaryForOkTab = summary.tabs.find((t) => t.tabKey === 'sales_funnel_2025');
    expect(summaryForFailingTab?.status).toBe('error');
    expect(summaryForOkTab?.status).toBe('success');

    // The renamed tab's sync_config row must not be touched by a failed fetch.
    const renamedConfig = syncConfigRows.find((r) => r.tabKey === 'sales_funnel_2026');
    expect(renamedConfig?.lastVerifiedAt).toEqual(new Date('2026-01-01T00:00:00Z'));

    // (c) the API layer still returns data — including the renamed tab's last-known-good row,
    // which a failed fetch must never touch or soft-delete.
    const activeOpportunities = await getActiveOpportunities();
    expect(activeOpportunities.some((o) => o.id === 'existing-2026-opp')).toBe(true);
    expect(activeOpportunities.length).toBeGreaterThan(1); // plus the newly-synced 2025 opportunity
  });
});
