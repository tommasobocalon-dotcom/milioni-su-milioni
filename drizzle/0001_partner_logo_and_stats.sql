CREATE TYPE "public"."profile_event_type" AS ENUM('impression', 'view', 'contact_click');--> statement-breakpoint
CREATE TABLE "profile_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"type" "profile_event_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "logo_url" text;--> statement-breakpoint
ALTER TABLE "profile_events" ADD CONSTRAINT "profile_events_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "profile_events_partner_idx" ON "profile_events" USING btree ("partner_id","created_at");