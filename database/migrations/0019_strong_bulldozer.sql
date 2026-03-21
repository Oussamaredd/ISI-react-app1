ALTER TABLE "iot"."ingestion_events" ADD COLUMN "producer_name" text DEFAULT 'iot_ingestion_http' NOT NULL;
--> statement-breakpoint
ALTER TABLE "iot"."ingestion_events" ADD COLUMN "producer_transaction_id" uuid DEFAULT gen_random_uuid() NOT NULL;
--> statement-breakpoint
ALTER TABLE "iot"."ingestion_events" ADD COLUMN "claimed_by_instance_id" text;
--> statement-breakpoint
ALTER TABLE "iot"."validated_measurement_events" ADD COLUMN "event_name" text DEFAULT 'iot.measurement.validated' NOT NULL;
--> statement-breakpoint
ALTER TABLE "iot"."validated_measurement_events" ADD COLUMN "routing_key" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "iot"."validated_measurement_events" ADD COLUMN "schema_version" text DEFAULT 'v1' NOT NULL;
--> statement-breakpoint
ALTER TABLE "iot"."validated_measurement_events" ADD COLUMN "producer_name" text DEFAULT 'iot_ingestion_worker' NOT NULL;
--> statement-breakpoint
ALTER TABLE "iot"."validated_measurement_events" ADD COLUMN "producer_transaction_id" uuid;
--> statement-breakpoint
ALTER TABLE "iot"."validated_event_deliveries" ADD COLUMN "event_name" text DEFAULT 'iot.measurement.validated' NOT NULL;
--> statement-breakpoint
ALTER TABLE "iot"."validated_event_deliveries" ADD COLUMN "routing_key" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "iot"."validated_event_deliveries" ADD COLUMN "claimed_by_instance_id" text;
--> statement-breakpoint
UPDATE "iot"."validated_measurement_events"
SET
  "routing_key" = "device_uid",
  "producer_transaction_id" = "source_event_id"
WHERE NULLIF("routing_key", '') IS NULL OR "producer_transaction_id" IS NULL;
--> statement-breakpoint
UPDATE "iot"."validated_event_deliveries" AS deliveries
SET
  "event_name" = events."event_name",
  "routing_key" = events."routing_key"
FROM "iot"."validated_measurement_events" AS events
WHERE deliveries."validated_event_id" = events."id";
