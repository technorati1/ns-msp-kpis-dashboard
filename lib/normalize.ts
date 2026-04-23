import { createHash } from 'crypto';
import type { RawRow } from './sheets';

export type ServiceLine = 'ERP' | 'SuiteCommerce' | 'Other';
export type EngagementType = 'Managed Services' | 'Implementation' | 'Other';
export type OppStatus = 'Open' | 'Closed Won' | 'Closed Lost';
export type CustomerType = 'New Logo' | 'Existing';
export type SourceTab = 'Sales Funnel 2025' | 'Sales Funnel 2026';

export type Opportunity = {
  id: string;
  accountName: string;
  createdDate: Date;
  serviceLine: ServiceLine;
  engagementType: EngagementType;
  customerType: CustomerType;
  status: OppStatus;
  source: string;
  region: string;
  funnelHighLevel: string;
  amountOneTime: number;
  recurringRevAnnual: number;
  mrrMonthly: number;
  annualisedValue: number;
  closeMonth: number | null;
  closeDate: Date | null;
  sourceTab: SourceTab;
};

const MONTH_MAP: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4,
  may: 5, june: 6, july: 7, august: 8,
  september: 9, october: 10, november: 11, december: 12,
};

function parseMonthName(raw: string): number | null {
  const key = raw.trim().toLowerCase();
  return MONTH_MAP[key] ?? null;
}

function lastDayOfMonth(year: number, month: number): Date {
  return new Date(year, month, 0); // day=0 of next month = last day of this month
}

function parseAmount(raw: string): number {
  if (!raw || raw.trim() === '' || raw.trim() === '#REF!') return 0;
  const cleaned = raw.replace(/[$,\s]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function parseDate(raw: string): Date | null {
  if (!raw || raw.trim() === '') return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

function mapServiceLine(funnelHighLevel: string, recurringRevAnnual: number, sourceTab: SourceTab): {
  serviceLine: ServiceLine;
  engagementType: EngagementType;
} {
  const val = funnelHighLevel.trim().toLowerCase();

  if (val === 'erp support') {
    return { serviceLine: 'ERP', engagementType: 'Managed Services' };
  }

  if (val === 'suitecommerce') {
    const engagementType: EngagementType =
      sourceTab === 'Sales Funnel 2026' && recurringRevAnnual > 0
        ? 'Managed Services'
        : 'Implementation';
    return { serviceLine: 'SuiteCommerce', engagementType };
  }

  return { serviceLine: 'Other', engagementType: 'Other' };
}

function mapStatus(raw: string): OppStatus {
  const val = raw.trim().toLowerCase();
  if (val.includes('won')) return 'Closed Won';
  if (val.includes('lost') || val.includes('dead')) return 'Closed Lost';
  return 'Open';
}

function stableId(email: string, createdDate: Date): string {
  return createHash('sha1')
    .update(`${email}|${createdDate.toISOString()}`)
    .digest('hex')
    .slice(0, 16);
}

export type NormalizeResult = {
  opportunities: Opportunity[];
  filteredOutCount: number;
  deduplicatedCount: number;
};

export function normalizeRows(rows: RawRow[], sourceTab: SourceTab): NormalizeResult {
  const year = sourceTab === 'Sales Funnel 2025' ? 2025 : 2026;
  const seen = new Map<string, Opportunity>();
  let filteredOutCount = 0;

  for (const row of rows) {
    const email = (row['Customer Email Address'] ?? '').trim();
    const rawDate = row['Date'] ?? '';
    const createdDate = parseDate(rawDate);

    if (!createdDate) continue;

    const funnelHighLevel = (row['Funnel high level'] ?? '').trim();
    const amountOneTime = parseAmount(row['Signed Contract value $'] ?? '');
    const recurringRevAnnual = parseAmount(row['Recurring rev'] ?? '');
    const { serviceLine, engagementType } = mapServiceLine(funnelHighLevel, recurringRevAnnual, sourceTab);

    if (serviceLine === 'Other') {
      filteredOutCount++;
      if (process.env.NODE_ENV !== 'test') {
        console.debug(`[normalize] filtered out: "${funnelHighLevel}" (${email})`);
      }
      continue;
    }

    const rawCloseMonth = (row['Closing Month'] ?? '').trim();
    const closeMonth = rawCloseMonth ? parseMonthName(rawCloseMonth) : null;
    const closeDate = closeMonth != null ? lastDayOfMonth(year, closeMonth) : null;

    const rawStatus = row['Status'] ?? '';
    const status = mapStatus(rawStatus);
    if (!['Open', 'Closed Won', 'Closed Lost'].includes(status) && process.env.NODE_ENV !== 'test') {
      console.warn(`[normalize] ambiguous status: "${rawStatus}" for ${email}`);
    }

    const mrrMonthly = recurringRevAnnual / 12;
    const annualisedValue = amountOneTime + recurringRevAnnual;
    const id = stableId(email, createdDate);

    const opp: Opportunity = {
      id,
      accountName: email,
      createdDate,
      serviceLine,
      engagementType,
      customerType: 'New Logo',
      status,
      source: row['Lead Source'] ?? '',
      region: row['Country'] ?? '',
      funnelHighLevel,
      amountOneTime,
      recurringRevAnnual,
      mrrMonthly,
      annualisedValue,
      closeMonth,
      closeDate,
      sourceTab,
    };

    const existing = seen.get(id);
    if (existing) {
      if (annualisedValue > existing.annualisedValue) {
        if (process.env.NODE_ENV !== 'test') {
          console.debug(`[normalize] dedup: keeping higher-value row for ${email}`);
        }
        seen.set(id, opp);
      }
    } else {
      seen.set(id, opp);
    }
  }

  const opportunities = Array.from(seen.values());
  const deduplicatedCount = rows.length - filteredOutCount - opportunities.length;

  return { opportunities, filteredOutCount, deduplicatedCount };
}

export function normalizeAllRows(
  rows2025: RawRow[],
  rows2026: RawRow[]
): NormalizeResult {
  const r2025 = normalizeRows(rows2025, 'Sales Funnel 2025');
  const r2026 = normalizeRows(rows2026, 'Sales Funnel 2026');
  return {
    opportunities: [...r2025.opportunities, ...r2026.opportunities],
    filteredOutCount: r2025.filteredOutCount + r2026.filteredOutCount,
    deduplicatedCount: r2025.deduplicatedCount + r2026.deduplicatedCount,
  };
}
