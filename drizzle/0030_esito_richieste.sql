ALTER TABLE "leads" ADD COLUMN "follow_up_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "client_contacted" boolean;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "client_answered_at" timestamp with time zone;