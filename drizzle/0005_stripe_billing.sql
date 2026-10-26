CREATE TABLE "stripe_processed" (
	"key" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "partners" ADD CONSTRAINT "partners_stripe_customer_id_unique" UNIQUE("stripe_customer_id");--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id");--> statement-breakpoint
-- Come le altre tabelle (0004): chiusa alla Data API di Supabase.
ALTER TABLE "stripe_processed" ENABLE ROW LEVEL SECURITY;
