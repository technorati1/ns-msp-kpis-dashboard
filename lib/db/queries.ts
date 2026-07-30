import { eq } from 'drizzle-orm';
import { db } from './client';
import { opportunities } from './schema';
import type { Opportunity } from '../normalize';

export function dbRowToOpportunity(r: typeof opportunities.$inferSelect): Opportunity {
  return {
    id: r.id,
    accountName: r.accountName,
    createdDate: r.createdDate!,
    serviceLine: r.serviceLine as Opportunity['serviceLine'],
    engagementType: r.engagementType as Opportunity['engagementType'],
    customerType: r.customerType as Opportunity['customerType'],
    status: r.status as Opportunity['status'],
    source: r.source ?? '',
    region: r.region ?? '',
    funnelHighLevel: r.funnelHighLevel ?? '',
    amountOneTime: parseFloat(r.amountOneTime),
    recurringRevAnnual: parseFloat(r.recurringRevAnnual),
    mrrMonthly: parseFloat(r.mrrMonthly),
    annualisedValue: parseFloat(r.annualisedValue),
    closeMonth: r.closeMonth,
    closeDate: r.closeDate,
    sourceTab: r.sourceTab as Opportunity['sourceTab'],
  };
}

export async function getActiveOpportunities(): Promise<Opportunity[]> {
  const rows = await db.select().from(opportunities).where(eq(opportunities.isDeleted, false));
  return rows.map(dbRowToOpportunity);
}
