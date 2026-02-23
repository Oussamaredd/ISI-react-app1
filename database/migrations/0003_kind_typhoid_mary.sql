ALTER TABLE "comments" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION set_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
DROP TRIGGER IF EXISTS comments_set_updated_at ON "comments";
--> statement-breakpoint
CREATE TRIGGER comments_set_updated_at
BEFORE UPDATE ON "comments"
FOR EACH ROW
EXECUTE FUNCTION set_comments_updated_at();
--> statement-breakpoint
INSERT INTO "roles" ("name", "description", "permissions")
VALUES (
  'super_admin',
  'Super Administrator',
  '["users.read","users.write","roles.read","roles.write","hotels.read","hotels.write","tickets.read","tickets.write","audit.read","settings.write"]'::jsonb
)
ON CONFLICT ("name") DO UPDATE
SET
  "description" = EXCLUDED."description",
  "permissions" = EXCLUDED."permissions",
  "updated_at" = now();
--> statement-breakpoint
UPDATE "roles"
SET
  "permissions" = '["users.read","users.write","roles.read","roles.write","hotels.read","hotels.write","tickets.read","tickets.write","audit.read","settings.write"]'::jsonb,
  "updated_at" = now()
WHERE "name" = 'admin';
