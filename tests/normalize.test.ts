import { describe, it, expect } from 'vitest';
import { normalizeRows } from '@/lib/normalize';
import type { RawRow } from '@/lib/sheets';

function row(overrides: Partial<RawRow> = {}): RawRow {
  return {
    'Month': 'January',
    'Date': '2025-01-15',
    'Country': 'USA',
    'Customer Email Address': 'test@example.com',
    'Funnel high level': 'ERP Support',
    'Lead Source': 'Organic',
    'Status': 'Open',
    'Signed Contract value $': '10000',
    'Recurring rev': '12000',
    'Closing Month': 'March',
    ...overrides,
  };
}

describe('normalizeRows — service line mapping', () => {
  it('maps ERP Support → ERP + Managed Services', () => {
    const { opportunities } = normalizeRows([row({ 'Funnel high level': 'ERP Support' })], 'Sales Funnel 2025');
    expect(opportunities).toHaveLength(1);
    expect(opportunities[0].serviceLine).toBe('ERP');
    expect(opportunities[0].engagementType).toBe('Managed Services');
  });

  it('maps 2026 SuiteCommerce with recurring rev > 0 → Managed Services', () => {
    const { opportunities } = normalizeRows(
      [row({ 'Funnel high level': 'SuiteCommerce', 'Recurring rev': '6000', 'Customer Email Address': 'sca@example.com' })],
      'Sales Funnel 2026'
    );
    expect(opportunities[0].serviceLine).toBe('SuiteCommerce');
    expect(opportunities[0].engagementType).toBe('Managed Services');
  });

  it('maps 2026 SuiteCommerce with recurring rev = 0 → Implementation', () => {
    const { opportunities } = normalizeRows(
      [row({ 'Funnel high level': 'SuiteCommerce', 'Recurring rev': '0', 'Customer Email Address': 'sca2@example.com' })],
      'Sales Funnel 2026'
    );
    expect(opportunities[0].serviceLine).toBe('SuiteCommerce');
    expect(opportunities[0].engagementType).toBe('Implementation');
  });

  it('maps 2026 SuiteCommerce with blank recurring rev → Implementation', () => {
    const { opportunities } = normalizeRows(
      [row({ 'Funnel high level': 'SuiteCommerce', 'Recurring rev': '', 'Customer Email Address': 'sca3@example.com' })],
      'Sales Funnel 2026'
    );
    expect(opportunities[0].engagementType).toBe('Implementation');
  });

  it('filters out Custom Integration rows', () => {
    const { opportunities, filteredOutCount } = normalizeRows(
      [row({ 'Funnel high level': 'Custom Integration' })],
      'Sales Funnel 2025'
    );
    expect(opportunities).toHaveLength(0);
    expect(filteredOutCount).toBe(1);
  });

  it('filters out Spam rows', () => {
    const { filteredOutCount } = normalizeRows(
      [row({ 'Funnel high level': 'Spam' })],
      'Sales Funnel 2025'
    );
    expect(filteredOutCount).toBe(1);
  });
});

describe('normalizeRows — status mapping', () => {
  it('maps "closed won " (trailing space, lowercase) → Closed Won', () => {
    const { opportunities } = normalizeRows(
      [row({ 'Status': 'closed won ', 'Customer Email Address': 'won@example.com' })],
      'Sales Funnel 2025'
    );
    expect(opportunities[0].status).toBe('Closed Won');
  });

  it('maps "Closed Lost" → Closed Lost', () => {
    const { opportunities } = normalizeRows(
      [row({ 'Status': 'Closed Lost', 'Customer Email Address': 'lost@example.com' })],
      'Sales Funnel 2025'
    );
    expect(opportunities[0].status).toBe('Closed Lost');
  });

  it('maps "Dead" → Closed Lost', () => {
    const { opportunities } = normalizeRows(
      [row({ 'Status': 'Dead', 'Customer Email Address': 'dead@example.com' })],
      'Sales Funnel 2025'
    );
    expect(opportunities[0].status).toBe('Closed Lost');
  });

  it('maps blank Status → Open', () => {
    const { opportunities } = normalizeRows(
      [row({ 'Status': '', 'Customer Email Address': 'blank@example.com' })],
      'Sales Funnel 2025'
    );
    expect(opportunities[0].status).toBe('Open');
  });

  it('maps "CLOSED WON" (upper case) → Closed Won', () => {
    const { opportunities } = normalizeRows(
      [row({ 'Status': 'CLOSED WON', 'Customer Email Address': 'upper@example.com' })],
      'Sales Funnel 2025'
    );
    expect(opportunities[0].status).toBe('Closed Won');
  });
});

describe('normalizeRows — close date', () => {
  it('row with blank Closing Month → closeDate = null', () => {
    const { opportunities } = normalizeRows(
      [row({ 'Closing Month': '', 'Customer Email Address': 'noclose@example.com' })],
      'Sales Funnel 2025'
    );
    expect(opportunities[0].closeDate).toBeNull();
    expect(opportunities[0].closeMonth).toBeNull();
  });

  it('parses March → closeMonth 3, closeDate last day of March 2025', () => {
    const { opportunities } = normalizeRows(
      [row({ 'Closing Month': 'March', 'Customer Email Address': 'march@example.com' })],
      'Sales Funnel 2025'
    );
    const opp = opportunities[0];
    expect(opp.closeMonth).toBe(3);
    expect(opp.closeDate).not.toBeNull();
    expect(opp.closeDate!.getFullYear()).toBe(2025);
    expect(opp.closeDate!.getMonth()).toBe(2); // 0-indexed
    expect(opp.closeDate!.getDate()).toBe(31); // March has 31 days
  });

  it('uses year 2026 for the 2026 tab', () => {
    const { opportunities } = normalizeRows(
      [row({ 'Closing Month': 'February', 'Customer Email Address': 'feb@example.com', 'Date': '2026-02-01' })],
      'Sales Funnel 2026'
    );
    expect(opportunities[0].closeDate!.getFullYear()).toBe(2026);
    expect(opportunities[0].closeDate!.getDate()).toBe(28); // Feb 2026 = 28 days
  });
});

describe('normalizeRows — amounts', () => {
  it('computes mrrMonthly = recurringRevAnnual / 12', () => {
    const { opportunities } = normalizeRows(
      [row({ 'Recurring rev': '24000', 'Signed Contract value $': '0', 'Customer Email Address': 'mrr@example.com' })],
      'Sales Funnel 2025'
    );
    expect(opportunities[0].mrrMonthly).toBeCloseTo(2000);
  });

  it('computes annualisedValue = oneTime + recurring', () => {
    const { opportunities } = normalizeRows(
      [row({ 'Signed Contract value $': '5000', 'Recurring rev': '12000', 'Customer Email Address': 'av@example.com' })],
      'Sales Funnel 2025'
    );
    expect(opportunities[0].annualisedValue).toBe(17000);
  });

  it('coerces blank amount to 0', () => {
    const { opportunities } = normalizeRows(
      [row({ 'Signed Contract value $': '', 'Recurring rev': '', 'Customer Email Address': 'zero@example.com' })],
      'Sales Funnel 2025'
    );
    expect(opportunities[0].amountOneTime).toBe(0);
    expect(opportunities[0].recurringRevAnnual).toBe(0);
  });

  it('coerces #REF! to 0', () => {
    const { opportunities } = normalizeRows(
      [row({ 'Signed Contract value $': '#REF!', 'Customer Email Address': 'ref@example.com' })],
      'Sales Funnel 2025'
    );
    expect(opportunities[0].amountOneTime).toBe(0);
  });

  it('strips $ and commas from amounts', () => {
    const { opportunities } = normalizeRows(
      [row({ 'Signed Contract value $': '$1,500.00', 'Customer Email Address': 'dollar@example.com' })],
      'Sales Funnel 2025'
    );
    expect(opportunities[0].amountOneTime).toBe(1500);
  });
});

describe('normalizeRows — deduplication', () => {
  it('keeps the higher-value row when email + date match', () => {
    const rows = [
      row({ 'Signed Contract value $': '1000', 'Recurring rev': '0', 'Customer Email Address': 'dup@example.com' }),
      row({ 'Signed Contract value $': '5000', 'Recurring rev': '0', 'Customer Email Address': 'dup@example.com' }),
    ];
    const { opportunities, deduplicatedCount } = normalizeRows(rows, 'Sales Funnel 2025');
    expect(opportunities).toHaveLength(1);
    expect(opportunities[0].amountOneTime).toBe(5000);
    expect(deduplicatedCount).toBe(1);
  });

  it('treats different emails as separate opportunities', () => {
    const rows = [
      row({ 'Customer Email Address': 'a@example.com' }),
      row({ 'Customer Email Address': 'b@example.com' }),
    ];
    const { opportunities } = normalizeRows(rows, 'Sales Funnel 2025');
    expect(opportunities).toHaveLength(2);
  });
});

describe('normalizeRows — skips rows with invalid dates', () => {
  it('skips a row where Date is blank', () => {
    const { opportunities } = normalizeRows(
      [row({ 'Date': '', 'Customer Email Address': 'nodate@example.com' })],
      'Sales Funnel 2025'
    );
    expect(opportunities).toHaveLength(0);
  });
});
