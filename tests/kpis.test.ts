import { describe, it, expect } from 'vitest';
import type { Opportunity } from '@/lib/normalize';
import type { Filters } from '@/lib/filters';
import {
  newBusinessWon,
  mrrAdded,
  managedServicesRevenue,
  qualifiedPipeline90d,
  winRate,
  averageDealSize,
  newLogosWon,
  salesCycleDays,
  weightedForecast,
} from '@/lib/kpis';

function makeOpp(overrides: Partial<Opportunity> = {}): Opportunity {
  return {
    id: Math.random().toString(36).slice(2),
    accountName: 'test@example.com',
    createdDate: new Date('2026-01-01'),
    serviceLine: 'ERP',
    engagementType: 'Managed Services',
    customerType: 'New Logo',
    status: 'Closed Won',
    source: 'Organic',
    region: 'USA',
    funnelHighLevel: 'ERP Support',
    amountOneTime: 0,
    recurringRevAnnual: 12000,
    mrrMonthly: 1000,
    annualisedValue: 12000,
    closeMonth: 3,
    closeDate: new Date('2026-03-31'),
    sourceTab: 'Sales Funnel 2026',
    ...overrides,
  };
}

const F_2026_ALL: Filters = { year: 2026, month: 'all', serviceLine: 'all', engagementType: 'all' };
const F_2025_ALL: Filters = { year: 2025, month: 'all', serviceLine: 'all', engagementType: 'all' };

describe('newBusinessWon', () => {
  it('sums annualisedValue for Closed Won New Logo in period', () => {
    const opps = [
      makeOpp({ annualisedValue: 10000, status: 'Closed Won', customerType: 'New Logo' }),
      makeOpp({ annualisedValue: 5000, status: 'Closed Won', customerType: 'New Logo' }),
      makeOpp({ annualisedValue: 8000, status: 'Open', customerType: 'New Logo' }),         // excluded: Open
      makeOpp({ annualisedValue: 3000, status: 'Closed Lost', customerType: 'New Logo' }), // excluded: Lost
    ];
    expect(newBusinessWon(opps, F_2026_ALL)).toBe(15000);
  });

  it('excludes Existing customers', () => {
    const opps = [
      makeOpp({ annualisedValue: 10000, status: 'Closed Won', customerType: 'New Logo' }),
      makeOpp({ annualisedValue: 5000, status: 'Closed Won', customerType: 'Existing' }),
    ];
    expect(newBusinessWon(opps, F_2026_ALL)).toBe(10000);
  });

  it('returns 0 for empty array', () => {
    expect(newBusinessWon([], F_2026_ALL)).toBe(0);
  });

  it('filters by year — 2025 opp excluded from 2026 filter', () => {
    const opps = [
      makeOpp({ annualisedValue: 10000, status: 'Closed Won', sourceTab: 'Sales Funnel 2025' }),
      makeOpp({ annualisedValue: 5000, status: 'Closed Won', sourceTab: 'Sales Funnel 2026' }),
    ];
    expect(newBusinessWon(opps, F_2026_ALL)).toBe(5000);
    expect(newBusinessWon(opps, F_2025_ALL)).toBe(10000);
  });
});

describe('mrrAdded', () => {
  it('sums mrrMonthly for Closed Won in period', () => {
    const opps = [
      makeOpp({ mrrMonthly: 1000, status: 'Closed Won' }),
      makeOpp({ mrrMonthly: 500, status: 'Closed Won' }),
      makeOpp({ mrrMonthly: 200, status: 'Open' }),
    ];
    expect(mrrAdded(opps, F_2026_ALL)).toBe(1500);
  });
});

describe('managedServicesRevenue', () => {
  it('sums annualisedValue for Closed Won + Managed Services', () => {
    const opps = [
      makeOpp({ annualisedValue: 10000, status: 'Closed Won', engagementType: 'Managed Services' }),
      makeOpp({ annualisedValue: 5000, status: 'Closed Won', engagementType: 'Implementation' }),
      makeOpp({ annualisedValue: 3000, status: 'Open', engagementType: 'Managed Services' }),
    ];
    expect(managedServicesRevenue(opps, F_2026_ALL)).toBe(10000);
  });
});

describe('qualifiedPipeline90d', () => {
  it('sums Open opps with closeDate within 90 days from today', () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 30);
    const far = new Date();
    far.setDate(far.getDate() + 200);
    const past = new Date();
    past.setDate(past.getDate() - 1);

    const opps = [
      makeOpp({ annualisedValue: 10000, status: 'Open', closeDate: soon }),
      makeOpp({ annualisedValue: 5000, status: 'Open', closeDate: far }),   // too far
      makeOpp({ annualisedValue: 3000, status: 'Open', closeDate: past }),  // past
      makeOpp({ annualisedValue: 8000, status: 'Closed Won', closeDate: soon }), // not open
    ];
    expect(qualifiedPipeline90d(opps)).toBe(10000);
  });

  it('excludes opps with null closeDate', () => {
    const opps = [makeOpp({ annualisedValue: 10000, status: 'Open', closeDate: null })];
    expect(qualifiedPipeline90d(opps)).toBe(0);
  });
});

describe('winRate', () => {
  it('computes won / (won + lost)', () => {
    const opps = [
      makeOpp({ status: 'Closed Won' }),
      makeOpp({ status: 'Closed Won' }),
      makeOpp({ status: 'Closed Lost' }),
      makeOpp({ status: 'Open' }), // excluded from denominator
    ];
    expect(winRate(opps, F_2026_ALL)).toBeCloseTo(2 / 3);
  });

  it('returns 0 when no closed deals', () => {
    const opps = [makeOpp({ status: 'Open' })];
    expect(winRate(opps, F_2026_ALL)).toBe(0);
  });
});

describe('averageDealSize', () => {
  it('computes mean annualisedValue of wins', () => {
    const opps = [
      makeOpp({ annualisedValue: 10000, status: 'Closed Won' }),
      makeOpp({ annualisedValue: 20000, status: 'Closed Won' }),
      makeOpp({ annualisedValue: 5000, status: 'Closed Lost' }), // excluded
    ];
    expect(averageDealSize(opps, F_2026_ALL)).toBe(15000);
  });

  it('returns 0 with no wins', () => {
    expect(averageDealSize([], F_2026_ALL)).toBe(0);
  });
});

describe('newLogosWon', () => {
  it('counts Closed Won New Logo opps', () => {
    const opps = [
      makeOpp({ status: 'Closed Won', customerType: 'New Logo' }),
      makeOpp({ status: 'Closed Won', customerType: 'New Logo' }),
      makeOpp({ status: 'Closed Won', customerType: 'Existing' }),
      makeOpp({ status: 'Closed Lost', customerType: 'New Logo' }),
    ];
    expect(newLogosWon(opps, F_2026_ALL)).toBe(2);
  });
});

describe('salesCycleDays', () => {
  it('computes average days from createdDate to closeDate', () => {
    const opps = [
      makeOpp({
        status: 'Closed Won',
        createdDate: new Date('2026-01-01'),
        closeDate: new Date('2026-03-02'), // 60 days
      }),
      makeOpp({
        status: 'Closed Won',
        createdDate: new Date('2026-01-01'),
        closeDate: new Date('2026-04-01'), // 90 days
      }),
    ];
    expect(salesCycleDays(opps, F_2026_ALL)).toBe(75); // (60+90)/2
  });

  it('returns 0 with no wins', () => {
    expect(salesCycleDays([], F_2026_ALL)).toBe(0);
  });
});

describe('weightedForecast', () => {
  it('sums annualisedValue * 0.5 for Open opps', () => {
    const opps = [
      makeOpp({ annualisedValue: 20000, status: 'Open' }),
      makeOpp({ annualisedValue: 10000, status: 'Open' }),
      makeOpp({ annualisedValue: 5000, status: 'Closed Won' }), // excluded
    ];
    expect(weightedForecast(opps, F_2026_ALL)).toBe(15000); // (20k+10k)*0.5
  });
});

describe('filter — by month', () => {
  it('only includes opps whose closeDate month matches', () => {
    const opps = [
      makeOpp({ annualisedValue: 5000, status: 'Closed Won', closeDate: new Date('2026-03-31'), closeMonth: 3 }),
      makeOpp({ annualisedValue: 7000, status: 'Closed Won', closeDate: new Date('2026-06-30'), closeMonth: 6 }),
    ];
    const marchFilter: Filters = { ...F_2026_ALL, month: 3 };
    expect(newBusinessWon(opps, marchFilter)).toBe(5000);
  });
});

describe('filter — by serviceLine', () => {
  it('filters to ERP only', () => {
    const opps = [
      makeOpp({ annualisedValue: 10000, serviceLine: 'ERP', status: 'Closed Won' }),
      makeOpp({ annualisedValue: 5000, serviceLine: 'SuiteCommerce', status: 'Closed Won' }),
    ];
    const erpFilter: Filters = { ...F_2026_ALL, serviceLine: 'ERP' };
    expect(newBusinessWon(opps, erpFilter)).toBe(10000);
  });
});
