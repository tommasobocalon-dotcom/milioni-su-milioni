ALTER TABLE "profile_events" ADD COLUMN "visitor" text;--> statement-breakpoint
CREATE INDEX "profile_events_visitor_idx" ON "profile_events" USING btree ("partner_id","visitor");