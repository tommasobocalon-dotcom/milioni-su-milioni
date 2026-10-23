CREATE TYPE "public"."account_status" AS ENUM('activating', 'active', 'suspended', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."billing_period" AS ENUM('monthly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."lead_charge" AS ENUM('pending', 'quota', 'token', 'locked', 'expired', 'duplicate', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('new', 'seen', 'contacted', 'quote_sent', 'won', 'lost');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('owner', 'member');--> statement-breakpoint
CREATE TYPE "public"."otp_channel" AS ENUM('email', 'sms');--> statement-breakpoint
CREATE TYPE "public"."otp_purpose" AS ENUM('login', 'lead');--> statement-breakpoint
CREATE TYPE "public"."partner_type" AS ENUM('agency', 'technician', 'artisan', 'b2b');--> statement-breakpoint
CREATE TYPE "public"."portfolio_kind" AS ENUM('work', 'property');--> statement-breakpoint
CREATE TYPE "public"."price_unit" AS ENUM('flat', 'sqm', 'hour', 'visit', 'percent', 'month', 'unit');--> statement-breakpoint
CREATE TYPE "public"."property_contract" AS ENUM('sale', 'rent');--> statement-breakpoint
CREATE TYPE "public"."property_status" AS ENUM('available', 'negotiating', 'sold');--> statement-breakpoint
CREATE TYPE "public"."question_type" AS ENUM('text', 'textarea', 'number', 'select');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('open', 'accepted', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('published', 'flagged', 'hidden');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('activating', 'active', 'suspended', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."token_entry_kind" AS ENUM('purchase', 'credit', 'consume', 'expire', 'refund');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('client', 'partner', 'sales', 'admin');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('pending', 'verified', 'rejected');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text,
	"data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "boosts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"province_id" smallint NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"tokens_spent" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_type" "partner_type" NOT NULL,
	"name" text NOT NULL,
	"plural_name" text NOT NULL,
	"slug" text NOT NULL,
	"icon" text DEFAULT 'wrench' NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "lead_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"type" text NOT NULL,
	"message" text NOT NULL,
	"actor" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"service_id" uuid,
	"municipality_id" integer NOT NULL,
	"request_type" text NOT NULL,
	"answers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"description" text,
	"timing" text NOT NULL,
	"callback_slot" text NOT NULL,
	"client_name" text NOT NULL,
	"client_email" text NOT NULL,
	"client_phone" text NOT NULL,
	"privacy_consent" boolean NOT NULL,
	"marketing_consent" boolean DEFAULT false NOT NULL,
	"status" "lead_status" DEFAULT 'new' NOT NULL,
	"charge" "lead_charge" DEFAULT 'pending' NOT NULL,
	"tokens_charged" integer DEFAULT 0 NOT NULL,
	"unlock_expires_at" timestamp with time zone,
	"verified_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"report_reason" text,
	"report_status" "report_status",
	"reported_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "municipalities" (
	"id" integer PRIMARY KEY NOT NULL,
	"province_id" smallint NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"aliases" text[] DEFAULT '{}' NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	CONSTRAINT "municipalities_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "otp_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purpose" "otp_purpose" NOT NULL,
	"channel" "otp_channel" NOT NULL,
	"target" text NOT NULL,
	"code_hash" text NOT NULL,
	"attempts" smallint DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"lead_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partner_members" (
	"partner_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "member_role" DEFAULT 'member' NOT NULL,
	CONSTRAINT "partner_members_partner_id_user_id_pk" PRIMARY KEY("partner_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "partner_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"price_from" integer,
	"price_to" integer,
	"unit" "price_unit" NOT NULL,
	"notes" text,
	"sort_order" smallint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "partner_type" NOT NULL,
	"category_id" uuid NOT NULL,
	"business_name" text NOT NULL,
	"display_name" text NOT NULL,
	"slug" text NOT NULL,
	"vat_number" text NOT NULL,
	"tax_code" text,
	"sdi_code" text,
	"pec" text,
	"address" text,
	"municipality_id" integer NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"tagline" text NOT NULL,
	"description" text NOT NULL,
	"specialties" text[] DEFAULT '{}' NOT NULL,
	"founded_year" smallint,
	"phone" text,
	"email" text,
	"hide_direct_contacts" boolean DEFAULT true NOT NULL,
	"opening_hours" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"response_minutes" integer,
	"verification_status" "verification_status" DEFAULT 'pending' NOT NULL,
	"account_status" "account_status" DEFAULT 'activating' NOT NULL,
	"completeness" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "partners_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"monthly_price_cents" integer NOT NULL,
	"yearly_price_cents" integer NOT NULL,
	"leads_included" integer NOT NULL,
	"visibility_weight" smallint NOT NULL,
	"max_provinces" smallint NOT NULL,
	"max_services" integer,
	"max_portfolio_items" integer,
	"max_users" smallint NOT NULL,
	"renewal_tokens" integer DEFAULT 0 NOT NULL,
	"featured_slots" boolean DEFAULT false NOT NULL,
	"stripe_monthly_price_id" text,
	"stripe_yearly_price_id" text,
	CONSTRAINT "plans_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "portfolio_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"kind" "portfolio_kind" NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"municipality_id" integer,
	"contract" "property_contract",
	"price_cents" integer,
	"sqm" integer,
	"rooms" smallint,
	"status" "property_status",
	"image_url" text,
	"has_before_after" boolean DEFAULT false NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provinces" (
	"id" smallint PRIMARY KEY NOT NULL,
	"region_id" smallint NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	CONSTRAINT "provinces_code_unique" UNIQUE("code"),
	CONSTRAINT "provinces_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "regions" (
	"id" smallint PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	CONSTRAINT "regions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"lead_id" uuid,
	"author_name" text NOT NULL,
	"rating" smallint NOT NULL,
	"quality" smallint NOT NULL,
	"punctuality" smallint NOT NULL,
	"value" smallint NOT NULL,
	"communication" smallint NOT NULL,
	"text" text NOT NULL,
	"partner_reply" text,
	"status" "review_status" DEFAULT 'published' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_areas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"municipality_id" integer,
	"province_id" smallint
);
--> statement-breakpoint
CREATE TABLE "service_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"service_id" uuid,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"help" text,
	"type" "question_type" NOT NULL,
	"options" jsonb,
	"required" boolean DEFAULT false NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"default_unit" "price_unit" DEFAULT 'flat' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"period" "billing_period" NOT NULL,
	"status" "subscription_status" NOT NULL,
	"current_period_start" timestamp with time zone NOT NULL,
	"current_period_end" timestamp with time zone NOT NULL,
	"leads_used" integer DEFAULT 0 NOT NULL,
	"auto_use_tokens" boolean DEFAULT false NOT NULL,
	"stripe_subscription_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "token_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"kind" "token_entry_kind" NOT NULL,
	"amount" integer NOT NULL,
	"lot_id" uuid,
	"expires_at" timestamp with time zone,
	"reference" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"name" text NOT NULL,
	"role" "user_role" DEFAULT 'client' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "boosts" ADD CONSTRAINT "boosts_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boosts" ADD CONSTRAINT "boosts_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boosts" ADD CONSTRAINT "boosts_province_id_provinces_id_fk" FOREIGN KEY ("province_id") REFERENCES "public"."provinces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_events" ADD CONSTRAINT "lead_events_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_municipality_id_municipalities_id_fk" FOREIGN KEY ("municipality_id") REFERENCES "public"."municipalities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "municipalities" ADD CONSTRAINT "municipalities_province_id_provinces_id_fk" FOREIGN KEY ("province_id") REFERENCES "public"."provinces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_members" ADD CONSTRAINT "partner_members_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_members" ADD CONSTRAINT "partner_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_services" ADD CONSTRAINT "partner_services_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_services" ADD CONSTRAINT "partner_services_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partners" ADD CONSTRAINT "partners_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partners" ADD CONSTRAINT "partners_municipality_id_municipalities_id_fk" FOREIGN KEY ("municipality_id") REFERENCES "public"."municipalities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_items" ADD CONSTRAINT "portfolio_items_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_items" ADD CONSTRAINT "portfolio_items_municipality_id_municipalities_id_fk" FOREIGN KEY ("municipality_id") REFERENCES "public"."municipalities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provinces" ADD CONSTRAINT "provinces_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_areas" ADD CONSTRAINT "service_areas_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_areas" ADD CONSTRAINT "service_areas_municipality_id_municipalities_id_fk" FOREIGN KEY ("municipality_id") REFERENCES "public"."municipalities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_areas" ADD CONSTRAINT "service_areas_province_id_provinces_id_fk" FOREIGN KEY ("province_id") REFERENCES "public"."provinces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_questions" ADD CONSTRAINT "service_questions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_questions" ADD CONSTRAINT "service_questions_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_ledger" ADD CONSTRAINT "token_ledger_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE INDEX "boosts_lookup_idx" ON "boosts" USING btree ("category_id","province_id","ends_at");--> statement-breakpoint
CREATE INDEX "lead_events_lead_idx" ON "lead_events" USING btree ("lead_id","created_at");--> statement-breakpoint
CREATE INDEX "leads_partner_idx" ON "leads" USING btree ("partner_id","created_at");--> statement-breakpoint
CREATE INDEX "leads_duplicate_idx" ON "leads" USING btree ("partner_id","client_phone");--> statement-breakpoint
CREATE INDEX "municipalities_province_idx" ON "municipalities" USING btree ("province_id");--> statement-breakpoint
CREATE INDEX "otp_target_idx" ON "otp_codes" USING btree ("target","purpose");--> statement-breakpoint
CREATE UNIQUE INDEX "partner_services_unique" ON "partner_services" USING btree ("partner_id","service_id");--> statement-breakpoint
CREATE INDEX "partners_category_idx" ON "partners" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "partners_municipality_idx" ON "partners" USING btree ("municipality_id");--> statement-breakpoint
CREATE INDEX "portfolio_partner_idx" ON "portfolio_items" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX "reviews_partner_idx" ON "reviews" USING btree ("partner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_lead_unique" ON "reviews" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "service_areas_partner_idx" ON "service_areas" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX "service_questions_category_idx" ON "service_questions" USING btree ("category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "services_category_slug_idx" ON "services" USING btree ("category_id","slug");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "subscriptions_partner_idx" ON "subscriptions" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX "token_ledger_partner_idx" ON "token_ledger" USING btree ("partner_id","created_at");