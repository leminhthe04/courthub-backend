ALTER TABLE "bookings" RENAME COLUMN "guest_name" TO "contact_name";--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "contact_email" varchar(255);--> statement-breakpoint
ALTER TABLE "bookings" DROP COLUMN "guest_token_hash";--> statement-breakpoint
ALTER TABLE "bookings" ALTER COLUMN "contact_name" SET NOT NULL;
