import {
  pgTable,
  text,
  timestamp,
  integer,
  numeric,
  boolean,
  serial,
} from 'drizzle-orm/pg-core';

export const opportunities = pgTable('opportunities', {
  id: text('id').primaryKey(),
  accountName: text('account_name').notNull(),
  createdDate: timestamp('created_date'),
  serviceLine: text('service_line').notNull(),
  engagementType: text('engagement_type').notNull(),
  customerType: text('customer_type').notNull(),
  status: text('status').notNull(),
  source: text('source'),
  region: text('region'),
  funnelHighLevel: text('funnel_high_level'),
  amountOneTime: numeric('amount_one_time').notNull().default('0'),
  recurringRevAnnual: numeric('recurring_rev_annual').notNull().default('0'),
  mrrMonthly: numeric('mrr_monthly').notNull().default('0'),
  annualisedValue: numeric('annualised_value').notNull().default('0'),
  closeMonth: integer('close_month'),
  closeDate: timestamp('close_date'),
  sourceTab: text('source_tab').notNull(),
  rowHash: text('row_hash').notNull(),
  isDeleted: boolean('is_deleted').notNull().default(false),
  firstSyncedAt: timestamp('first_synced_at').notNull().defaultNow(),
  lastSyncedAt: timestamp('last_synced_at').notNull().defaultNow(),
});

export const targets = pgTable('targets', {
  id: serial('id').primaryKey(),
  year: integer('year').notNull(),
  segmentKey: text('segment_key'),
  metric: text('metric').notNull(),
  value: numeric('value').notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const syncConfig = pgTable('sync_config', {
  id: serial('id').primaryKey(),
  tabKey: text('tab_key').notNull().unique(),
  tabName: text('tab_name').notNull(),
  year: integer('year').notNull(),
  syncMode: text('sync_mode').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  lastVerifiedAt: timestamp('last_verified_at'),
});

export const syncLog = pgTable('sync_log', {
  id: serial('id').primaryKey(),
  tabKey: text('tab_key').notNull(),
  startedAt: timestamp('started_at').notNull(),
  finishedAt: timestamp('finished_at'),
  status: text('status').notNull(),
  rowsRead: integer('rows_read'),
  rowsUpserted: integer('rows_upserted'),
  rowsSoftDeleted: integer('rows_soft_deleted'),
  errorMessage: text('error_message'),
});
