CREATE TYPE "public"."payment_status" AS ENUM('PENDING', 'PAID', 'CANCELLED', 'EXPIRED', 'FAILED');--> statement-breakpoint
ALTER TYPE "public"."booking_status" ADD VALUE 'AWAITING_PAYMENT' BEFORE 'CONFIRMED';--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"booking_id" uuid NOT NULL,
	"payos_order_code" varchar(32) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"status" "payment_status" DEFAULT 'PENDING' NOT NULL,
	"checkout_url" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"paid_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "payments_booking_unique" ON "payments" USING btree ("booking_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_payos_order_code_unique" ON "payments" USING btree ("payos_order_code");--> statement-breakpoint
CREATE INDEX "payments_status_expires_idx" ON "payments" USING btree ("status","expires_at");