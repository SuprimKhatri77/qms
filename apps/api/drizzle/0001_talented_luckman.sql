UPDATE "users"
SET "role" = 'owner'
WHERE "role" IS NULL
   OR "role" NOT IN ('owner', 'admin', 'superadmin');--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'owner';--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_check" CHECK ("users"."role" IN ('owner', 'admin', 'superadmin'));
