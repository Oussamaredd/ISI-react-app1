CREATE TABLE "iot"."ingestion_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" uuid,
	"device_uid" text NOT NULL,
	"sensor_device_id" uuid,
	"container_id" uuid,
	"idempotency_key" text,
	"measured_at" timestamp with time zone NOT NULL,
	"fill_level_percent" integer NOT NULL,
	"temperature_c" integer,
	"battery_percent" integer,
	"signal_strength" integer,
	"measurement_quality" text DEFAULT 'valid' NOT NULL,
	"processing_status" text DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processing_started_at" timestamp with time zone,
	"processed_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"rejection_reason" text,
	"last_error" text,
	"processing_latency_ms" integer,
	"raw_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"normalized_payload" jsonb,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "iot"."validated_measurement_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_event_id" uuid NOT NULL,
	"device_uid" text NOT NULL,
	"sensor_device_id" uuid,
	"container_id" uuid,
	"measured_at" timestamp with time zone NOT NULL,
	"fill_level_percent" integer NOT NULL,
	"temperature_c" integer,
	"battery_percent" integer,
	"signal_strength" integer,
	"measurement_quality" text DEFAULT 'valid' NOT NULL,
	"warning_threshold" integer,
	"critical_threshold" integer,
	"validation_summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"normalized_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"emitted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "iot"."ingestion_events" ADD CONSTRAINT "ingestion_events_sensor_device_id_sensor_devices_id_fk" FOREIGN KEY ("sensor_device_id") REFERENCES "iot"."sensor_devices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iot"."ingestion_events" ADD CONSTRAINT "ingestion_events_container_id_containers_id_fk" FOREIGN KEY ("container_id") REFERENCES "core"."containers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iot"."validated_measurement_events" ADD CONSTRAINT "validated_measurement_events_source_event_id_ingestion_events_id_fk" FOREIGN KEY ("source_event_id") REFERENCES "iot"."ingestion_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iot"."validated_measurement_events" ADD CONSTRAINT "validated_measurement_events_sensor_device_id_sensor_devices_id_fk" FOREIGN KEY ("sensor_device_id") REFERENCES "iot"."sensor_devices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iot"."validated_measurement_events" ADD CONSTRAINT "validated_measurement_events_container_id_containers_id_fk" FOREIGN KEY ("container_id") REFERENCES "core"."containers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ingestion_events_status_next_attempt_idx" ON "iot"."ingestion_events" USING btree ("processing_status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "ingestion_events_device_measured_at_idx" ON "iot"."ingestion_events" USING btree ("device_uid","measured_at");--> statement-breakpoint
CREATE INDEX "ingestion_events_batch_idx" ON "iot"."ingestion_events" USING btree ("batch_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ingestion_events_device_idempotency_idx" ON "iot"."ingestion_events" USING btree ("device_uid","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "validated_measurement_events_source_event_idx" ON "iot"."validated_measurement_events" USING btree ("source_event_id");--> statement-breakpoint
CREATE INDEX "validated_measurement_events_container_measured_at_idx" ON "iot"."validated_measurement_events" USING btree ("container_id","measured_at");--> statement-breakpoint
CREATE INDEX "validated_measurement_events_sensor_measured_at_idx" ON "iot"."validated_measurement_events" USING btree ("sensor_device_id","measured_at");
