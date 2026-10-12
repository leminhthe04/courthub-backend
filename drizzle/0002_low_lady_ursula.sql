CREATE TABLE "venue_pricing_rules" (
	"id" uuid PRIMARY KEY NOT NULL,
	"venue_id" uuid NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"hourly_rate" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "venue_pricing_rules" ADD CONSTRAINT "venue_pricing_rules_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "venue_pricing_rules_venue_id_idx" ON "venue_pricing_rules" USING btree ("venue_id");--> statement-breakpoint
ALTER TABLE "courts" DROP COLUMN "hourly_rate";