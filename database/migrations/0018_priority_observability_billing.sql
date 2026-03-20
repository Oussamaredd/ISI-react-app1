CREATE SCHEMA IF NOT EXISTS "billing";
--> statement-breakpoint
ALTER TABLE "iot"."measurements" ADD COLUMN "validated_event_id" uuid;
--> statement-breakpoint
ALTER TABLE "iot"."ingestion_events" ADD COLUMN "traceparent" text;
--> statement-breakpoint
ALTER TABLE "iot"."ingestion_events" ADD COLUMN "tracestate" text;
--> statement-breakpoint
ALTER TABLE "iot"."validated_measurement_events" ADD COLUMN "traceparent" text;
--> statement-breakpoint
ALTER TABLE "iot"."validated_measurement_events" ADD COLUMN "tracestate" text;
--> statement-breakpoint
CREATE TABLE "iot"."validated_event_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"consumer_name" text NOT NULL,
	"validated_event_id" uuid NOT NULL,
	"processing_status" text DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processing_started_at" timestamp with time zone,
	"processed_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"last_error" text,
	"traceparent" text,
	"tracestate" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing"."accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"scope_type" text NOT NULL,
	"scope_key" text NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing"."rate_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"billing_account_id" uuid NOT NULL,
	"charge_type" text NOT NULL,
	"source_type" text NOT NULL,
	"unit" text DEFAULT 'event' NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"description" text NOT NULL,
	"filters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_penalty" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing"."runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"billing_account_id" uuid NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"status" text DEFAULT 'finalized' NOT NULL,
	"subtotal_cents" integer DEFAULT 0 NOT NULL,
	"penalty_total_cents" integer DEFAULT 0 NOT NULL,
	"total_cents" integer DEFAULT 0 NOT NULL,
	"created_by_user_id" uuid,
	"finalized_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"failure_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing"."invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"billing_run_id" uuid NOT NULL,
	"billing_account_id" uuid NOT NULL,
	"invoice_number" text NOT NULL,
	"status" text DEFAULT 'issued' NOT NULL,
	"bill_to_name" text NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"subtotal_cents" integer DEFAULT 0 NOT NULL,
	"penalty_total_cents" integer DEFAULT 0 NOT NULL,
	"total_cents" integer DEFAULT 0 NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_billing_run_id_unique" UNIQUE("billing_run_id"),
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "billing"."invoice_line_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"billing_run_id" uuid NOT NULL,
	"rate_rule_id" uuid,
	"charge_type" text NOT NULL,
	"description" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit" text NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"line_total_cents" integer NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing"."source_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"billing_run_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"line_item_id" uuid NOT NULL,
	"billing_account_id" uuid NOT NULL,
	"rate_rule_id" uuid,
	"charge_type" text NOT NULL,
	"source_type" text NOT NULL,
	"source_id" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "iot"."validated_event_deliveries" ADD CONSTRAINT "validated_event_deliveries_validated_event_id_validated_measurement_events_id_fk" FOREIGN KEY ("validated_event_id") REFERENCES "iot"."validated_measurement_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing"."rate_rules" ADD CONSTRAINT "billing_rate_rules_billing_account_id_accounts_id_fk" FOREIGN KEY ("billing_account_id") REFERENCES "billing"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing"."runs" ADD CONSTRAINT "billing_runs_billing_account_id_accounts_id_fk" FOREIGN KEY ("billing_account_id") REFERENCES "billing"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing"."runs" ADD CONSTRAINT "billing_runs_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing"."invoices" ADD CONSTRAINT "billing_invoices_billing_run_id_runs_id_fk" FOREIGN KEY ("billing_run_id") REFERENCES "billing"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing"."invoices" ADD CONSTRAINT "billing_invoices_billing_account_id_accounts_id_fk" FOREIGN KEY ("billing_account_id") REFERENCES "billing"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing"."invoice_line_items" ADD CONSTRAINT "billing_invoice_line_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "billing"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing"."invoice_line_items" ADD CONSTRAINT "billing_invoice_line_items_billing_run_id_runs_id_fk" FOREIGN KEY ("billing_run_id") REFERENCES "billing"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing"."invoice_line_items" ADD CONSTRAINT "billing_invoice_line_items_rate_rule_id_rate_rules_id_fk" FOREIGN KEY ("rate_rule_id") REFERENCES "billing"."rate_rules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing"."source_allocations" ADD CONSTRAINT "billing_source_allocations_billing_run_id_runs_id_fk" FOREIGN KEY ("billing_run_id") REFERENCES "billing"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing"."source_allocations" ADD CONSTRAINT "billing_source_allocations_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "billing"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing"."source_allocations" ADD CONSTRAINT "billing_source_allocations_line_item_id_invoice_line_items_id_fk" FOREIGN KEY ("line_item_id") REFERENCES "billing"."invoice_line_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing"."source_allocations" ADD CONSTRAINT "billing_source_allocations_billing_account_id_accounts_id_fk" FOREIGN KEY ("billing_account_id") REFERENCES "billing"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing"."source_allocations" ADD CONSTRAINT "billing_source_allocations_rate_rule_id_rate_rules_id_fk" FOREIGN KEY ("rate_rule_id") REFERENCES "billing"."rate_rules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "measurements_validated_event_measured_at_idx" ON "iot"."measurements" USING btree ("validated_event_id","measured_at");--> statement-breakpoint
CREATE UNIQUE INDEX "validated_event_deliveries_consumer_event_idx" ON "iot"."validated_event_deliveries" USING btree ("consumer_name","validated_event_id");--> statement-breakpoint
CREATE INDEX "validated_event_deliveries_status_next_attempt_idx" ON "iot"."validated_event_deliveries" USING btree ("processing_status","next_attempt_at");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_accounts_scope_idx" ON "billing"."accounts" USING btree ("scope_type","scope_key");--> statement-breakpoint
CREATE INDEX "billing_accounts_active_scope_idx" ON "billing"."accounts" USING btree ("is_active","scope_type");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_rate_rules_account_charge_idx" ON "billing"."rate_rules" USING btree ("billing_account_id","charge_type");--> statement-breakpoint
CREATE INDEX "billing_rate_rules_active_source_idx" ON "billing"."rate_rules" USING btree ("billing_account_id","is_active","source_type");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_runs_account_period_idx" ON "billing"."runs" USING btree ("billing_account_id","period_start","period_end");--> statement-breakpoint
CREATE INDEX "billing_runs_status_created_idx" ON "billing"."runs" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "billing_invoices_account_issued_idx" ON "billing"."invoices" USING btree ("billing_account_id","issued_at");--> statement-breakpoint
CREATE INDEX "billing_invoice_line_items_invoice_created_idx" ON "billing"."invoice_line_items" USING btree ("invoice_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_source_allocations_account_charge_source_idx" ON "billing"."source_allocations" USING btree ("billing_account_id","charge_type","source_type","source_id");--> statement-breakpoint
CREATE INDEX "billing_source_allocations_run_source_idx" ON "billing"."source_allocations" USING btree ("billing_run_id","source_type","source_id");
