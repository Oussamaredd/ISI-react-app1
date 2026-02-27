CREATE INDEX "anomaly_reports_reported_at_idx" ON "anomaly_reports" USING btree ("reported_at");--> statement-breakpoint
CREATE INDEX "anomaly_reports_type_reported_at_idx" ON "anomaly_reports" USING btree ("anomaly_type_id","reported_at");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs" USING btree ("action","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_resource_type_created_at_idx" ON "audit_logs" USING btree ("resource_type","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_user_created_at_idx" ON "audit_logs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "collection_events_collected_at_idx" ON "collection_events" USING btree ("collected_at");--> statement-breakpoint
CREATE INDEX "collection_events_container_collected_at_idx" ON "collection_events" USING btree ("container_id","collected_at");--> statement-breakpoint
CREATE INDEX "report_exports_created_at_idx" ON "report_exports" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "report_exports_requester_created_at_idx" ON "report_exports" USING btree ("requested_by_user_id","created_at");--> statement-breakpoint
CREATE INDEX "tickets_created_at_idx" ON "tickets" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "tickets_status_created_at_idx" ON "tickets" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "tickets_priority_created_at_idx" ON "tickets" USING btree ("priority","created_at");--> statement-breakpoint
CREATE INDEX "tickets_support_category_created_at_idx" ON "tickets" USING btree ("support_category","created_at");--> statement-breakpoint
CREATE INDEX "tickets_assignee_created_at_idx" ON "tickets" USING btree ("assignee_id","created_at");--> statement-breakpoint
CREATE INDEX "tours_scheduled_for_idx" ON "tours" USING btree ("scheduled_for");--> statement-breakpoint
CREATE INDEX "tours_zone_scheduled_for_idx" ON "tours" USING btree ("zone_id","scheduled_for");--> statement-breakpoint
UPDATE "roles"
SET
  "permissions" = '["users.read","users.write","roles.read","roles.write","tickets.read","tickets.write","audit.read","settings.write","ecotrack.containers.read","ecotrack.containers.write","ecotrack.zones.read","ecotrack.zones.write","ecotrack.tours.read","ecotrack.tours.write","ecotrack.citizenReports.read","ecotrack.citizenReports.write","ecotrack.gamification.read","ecotrack.gamification.write","ecotrack.analytics.read"]'::jsonb,
  "updated_at" = now()
WHERE
  "name" IN ('super_admin', 'admin')
  AND (
    "permissions" IS NULL
    OR jsonb_typeof("permissions") <> 'array'
    OR jsonb_array_length("permissions") = 0
  );--> statement-breakpoint
UPDATE "roles"
SET
  "permissions" = '["users.read","tickets.read","audit.read","ecotrack.containers.read","ecotrack.zones.read","ecotrack.tours.read","ecotrack.tours.write","ecotrack.citizenReports.read","ecotrack.gamification.read","ecotrack.analytics.read"]'::jsonb,
  "updated_at" = now()
WHERE
  "name" = 'manager'
  AND (
    "permissions" IS NULL
    OR jsonb_typeof("permissions") <> 'array'
    OR jsonb_array_length("permissions") = 0
  );--> statement-breakpoint
UPDATE "roles"
SET
  "permissions" = '["tickets.read","tickets.write","ecotrack.containers.read","ecotrack.tours.read","ecotrack.tours.write","ecotrack.citizenReports.read","ecotrack.citizenReports.write"]'::jsonb,
  "updated_at" = now()
WHERE
  "name" = 'agent'
  AND (
    "permissions" IS NULL
    OR jsonb_typeof("permissions") <> 'array'
    OR jsonb_array_length("permissions") = 0
  );--> statement-breakpoint
UPDATE "roles"
SET
  "permissions" = '["ecotrack.containers.read","ecotrack.citizenReports.read","ecotrack.citizenReports.write","ecotrack.gamification.read"]'::jsonb,
  "updated_at" = now()
WHERE
  "name" = 'citizen'
  AND (
    "permissions" IS NULL
    OR jsonb_typeof("permissions") <> 'array'
    OR jsonb_array_length("permissions") = 0
  );--> statement-breakpoint
INSERT INTO "user_roles" ("user_id", "role_id", "created_at")
SELECT
  "users"."id",
  "roles"."id",
  now()
FROM "users"
INNER JOIN "roles" ON lower("roles"."name") = lower("users"."role")
LEFT JOIN "user_roles"
  ON "user_roles"."user_id" = "users"."id"
 AND "user_roles"."role_id" = "roles"."id"
WHERE "user_roles"."user_id" IS NULL;
