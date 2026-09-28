-- Replace "queue open for N hours after it opens" with a fixed shop-local
-- closing time. Written by hand (drizzle-kit can't tell a replacement from a
-- rename without asking), so the old setting is converted, not lost:
--   24 hours (the default) -> no closing time: open until midnight
--   N < 24 hours           -> closes at N:00 (the nearest fixed-time reading)
ALTER TABLE "shops" ADD COLUMN "closing_time" time;--> statement-breakpoint
UPDATE "shops"
SET "closing_time" = CASE
  WHEN "queue_expiry_hours" >= 24 THEN NULL
  ELSE make_time("queue_expiry_hours", 0, 0)
END;--> statement-breakpoint
ALTER TABLE "shops" DROP COLUMN "queue_expiry_hours";
