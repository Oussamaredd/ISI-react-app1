CREATE TABLE "anomaly_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"anomaly_type_id" uuid NOT NULL,
	"tour_id" uuid,
	"tour_stop_id" uuid,
	"reporter_user_id" uuid,
	"comments" text,
	"photo_url" text,
	"severity" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'reported' NOT NULL,
	"reported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "anomaly_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "anomaly_types_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "anomaly_reports" ADD CONSTRAINT "anomaly_reports_anomaly_type_id_anomaly_types_id_fk" FOREIGN KEY ("anomaly_type_id") REFERENCES "public"."anomaly_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anomaly_reports" ADD CONSTRAINT "anomaly_reports_tour_id_tours_id_fk" FOREIGN KEY ("tour_id") REFERENCES "public"."tours"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anomaly_reports" ADD CONSTRAINT "anomaly_reports_tour_stop_id_tour_stops_id_fk" FOREIGN KEY ("tour_stop_id") REFERENCES "public"."tour_stops"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anomaly_reports" ADD CONSTRAINT "anomaly_reports_reporter_user_id_users_id_fk" FOREIGN KEY ("reporter_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;