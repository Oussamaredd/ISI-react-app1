UPDATE "auth"."users"
SET
  "role" = 'citizen',
  "updated_at" = now()
WHERE lower("auth_provider") = 'google'
  AND lower("role") <> 'citizen';
--> statement-breakpoint
DELETE FROM "auth"."user_roles" AS "user_roles"
USING "auth"."users" AS "users", "auth"."roles" AS "roles"
WHERE "user_roles"."user_id" = "users"."id"
  AND "user_roles"."role_id" = "roles"."id"
  AND lower("users"."auth_provider") = 'google'
  AND lower("roles"."name") <> 'citizen';
--> statement-breakpoint
INSERT INTO "auth"."user_roles" ("user_id", "role_id", "created_at")
SELECT
  "users"."id",
  "roles"."id",
  now()
FROM "auth"."users"
INNER JOIN "auth"."roles" ON lower("roles"."name") = 'citizen'
LEFT JOIN "auth"."user_roles"
  ON "user_roles"."user_id" = "users"."id"
 AND "user_roles"."role_id" = "roles"."id"
WHERE lower("users"."auth_provider") = 'google'
  AND "user_roles"."user_id" IS NULL;
