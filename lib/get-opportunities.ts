import { fetchAllTabs } from './sheets';
import { normalizeAllRows, reviveOpportunity, type Opportunity } from './normalize';
import { getActiveOpportunities } from './db/queries';
import { isDatabaseSource } from './data-source';

/**
 * Single entry point for "give me all current opportunities". Reads the
 * database by default; DATA_SOURCE=sheets falls back to the pre-migration
 * live-Sheets path (see lib/data-source.ts).
 */
export async function getAllOpportunities(): Promise<Opportunity[]> {
  if (isDatabaseSource()) {
    const opps = await getActiveOpportunities();
    return opps.map(reviveOpportunity);
  }
  const { funnel2025, funnel2026 } = await fetchAllTabs();
  return normalizeAllRows(funnel2025, funnel2026).opportunities.map(reviveOpportunity);
}
