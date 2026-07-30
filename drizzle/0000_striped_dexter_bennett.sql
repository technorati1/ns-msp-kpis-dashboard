CREATE TABLE "opportunities" (
	"id" text PRIMARY KEY NOT NULL,
	"account_name" text NOT NULL,
	"created_date" timestamp,
	"service_line" text NOT NULL,
	"engagement_type" text NOT NULL,
	"customer_type" text NOT NULL,
	"status" text NOT NULL,
	"source" text,
	"region" text,
	"funnel_high_level" text,
	"amount_one_time" numeric DEFAULT '0' NOT NULL,
	"recurring_rev_annual" numeric DEFAULT '0' NOT NULL,
	"mrr_monthly" numeric DEFAULT '0' NOT NULL,
	"annualised_value" numeric DEFAULT '0' NOT NULL,
	"close_month" integer,
	"close_date" timestamp,
	"source_tab" text NOT NULL,
	"row_hash" text NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"first_synced_at" timestamp DEFAULT now() NOT NULL,
	"last_synced_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"tab_key" text NOT NULL,
	"tab_name" text NOT NULL,
	"year" integer NOT NULL,
	"sync_mode" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_verified_at" timestamp,
	CONSTRAINT "sync_config_tab_key_unique" UNIQUE("tab_key")
);
--> statement-breakpoint
CREATE TABLE "sync_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"tab_key" text NOT NULL,
	"started_at" timestamp NOT NULL,
	"finished_at" timestamp,
	"status" text NOT NULL,
	"rows_read" integer,
	"rows_upserted" integer,
	"rows_soft_deleted" integer,
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE "targets" (
	"id" serial PRIMARY KEY NOT NULL,
	"year" integer NOT NULL,
	"segment_key" text,
	"metric" text NOT NULL,
	"value" numeric NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
