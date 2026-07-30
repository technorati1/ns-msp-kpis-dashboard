import { reviveOpportunity, type Opportunity } from './normalize';
import { getActiveOpportunities } from './db/queries';

/** Single entry point for "give me all current opportunities" — reads the database. */
export async function getAllOpportunities(): Promise<Opportunity[]> {
  const opps = await getActiveOpportunities();
  return opps.map(reviveOpportunity);
}
