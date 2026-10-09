CREATE TYPE "public"."booking_status" AS ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('CUSTOMER', 'PARTNER', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."venue_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"court_id" uuid NOT NULL,
	"customer_id" uuid,
	"guest_name" varchar(120),
	"contact_phone" varchar(32) NOT NULL,
	"guest_token_hash" text,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"status" "booking_status" DEFAULT 'PENDING' NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "courts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"venue_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"hourly_rate" numeric(12, 2) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operating_hours" (
	"id" uuid PRIMARY KEY NOT NULL,
	"venue_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"open_time" time,
	"close_time" time,
	"is_closed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"full_name" varchar(120) NOT NULL,
	"email" varchar(255),
	"phone" varchar(32),
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'CUSTOMER' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "venues" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" varchar(160) NOT NULL,
	"sport_type" varchar(60) NOT NULL,
	"address" varchar(255) NOT NULL,
	"city" varchar(100) NOT NULL,
	"description" text,
	"image_url" text,
	"status" "venue_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_court_id_courts_id_fk" FOREIGN KEY ("court_id") REFERENCES "public"."courts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courts" ADD CONSTRAINT "courts_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operating_hours" ADD CONSTRAINT "operating_hours_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venues" ADD CONSTRAINT "venues_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bookings_court_time_idx" ON "bookings" USING btree ("court_id","start_at","end_at");--> statement-breakpoint
CREATE INDEX "bookings_customer_idx" ON "bookings" USING btree ("customer_id","created_at");--> statement-breakpoint
CREATE INDEX "courts_venue_id_idx" ON "courts" USING btree ("venue_id");--> statement-breakpoint
CREATE UNIQUE INDEX "operating_hours_venue_day_unique" ON "operating_hours" USING btree ("venue_id","day_of_week");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_phone_unique" ON "users" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "venues_owner_id_idx" ON "venues" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "venues_search_idx" ON "venues" USING btree ("status","city");
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_contact_required" CHECK ("email" IS NOT NULL OR "phone" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "courts" ADD CONSTRAINT "courts_hourly_rate_non_negative" CHECK ("hourly_rate" >= 0);--> statement-breakpoint
ALTER TABLE "operating_hours" ADD CONSTRAINT "operating_hours_valid_range" CHECK ("is_closed" OR ("open_time" IS NOT NULL AND "close_time" IS NOT NULL AND "open_time" < "close_time"));--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_valid_range" CHECK ("start_at" < "end_at" AND extract(epoch FROM ("end_at" - "start_at"))::integer % 1800 = 0);--> statement-breakpoint
