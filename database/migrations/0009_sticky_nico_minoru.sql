UPDATE "roles"
SET
  "permissions" = COALESCE(
    (
      SELECT jsonb_agg(permission)
      FROM jsonb_array_elements_text("roles"."permissions") AS permission
      WHERE permission <> 'hotels.read' AND permission <> 'hotels.write'
    ),
    '[]'::jsonb
  ),
  "updated_at" = now()
WHERE "permissions" ? 'hotels.read' OR "permissions" ? 'hotels.write';--> statement-breakpoint
ALTER TABLE "tickets" DROP CONSTRAINT IF EXISTS "tickets_hotel_id_hotels_id_fk";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_hotel_id_hotels_id_fk";--> statement-breakpoint
ALTER TABLE "tickets" DROP COLUMN IF EXISTS "hotel_id";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "hotel_id";--> statement-breakpoint
DROP TABLE IF EXISTS "hotels" CASCADE;
