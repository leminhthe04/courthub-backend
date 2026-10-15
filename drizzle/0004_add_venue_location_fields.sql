ALTER TABLE "venues" RENAME COLUMN "city" TO "province";--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "ward" varchar(150);--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "ward_code" varchar(20);--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "province_code" varchar(20);--> statement-breakpoint
