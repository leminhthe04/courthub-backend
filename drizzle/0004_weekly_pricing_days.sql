CREATE TYPE "public"."day_of_week" AS ENUM('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN');--> statement-breakpoint
ALTER TABLE "venue_pricing_rules" ADD COLUMN "day_of_week" "day_of_week";--> statement-breakpoint
ALTER TABLE "venue_pricing_rules" ALTER COLUMN "day_of_week" SET NOT NULL;--> statement-breakpoint
DROP TABLE "operating_hours";--> statement-breakpoint
DROP INDEX IF EXISTS "venue_pricing_rules_venue_id_idx";--> statement-breakpoint
CREATE INDEX "venue_pricing_rules_venue_day_idx" ON "venue_pricing_rules" USING btree ("venue_id", "day_of_week", "start_time");
