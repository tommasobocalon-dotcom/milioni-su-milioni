CREATE TYPE "public"."province_request_need" AS ENUM('professional', 'agency');--> statement-breakpoint
CREATE TABLE "province_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"province_id" smallint NOT NULL,
	"municipality_id" integer,
	"need" "province_request_need" NOT NULL,
	"note" text,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "province_requests" ADD CONSTRAINT "province_requests_province_id_provinces_id_fk" FOREIGN KEY ("province_id") REFERENCES "public"."provinces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "province_requests" ADD CONSTRAINT "province_requests_municipality_id_municipalities_id_fk" FOREIGN KEY ("municipality_id") REFERENCES "public"."municipalities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "province_requests_province_email_idx" ON "province_requests" USING btree ("province_id","email");--> statement-breakpoint
CREATE INDEX "province_requests_email_idx" ON "province_requests" USING btree ("email");--> statement-breakpoint
CREATE INDEX "province_requests_created_idx" ON "province_requests" USING btree ("created_at");--> statement-breakpoint
-- Chiusa alla Data API di Supabase come le altre tabelle (0004). Il modulo della Home e il gestionale scrivono e leggono
-- col ruolo dell'app; il cliente, nell'export dei suoi dati (asClient), vede solo le richieste della sua email confermata.
ALTER TABLE "province_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT SELECT (province_id, municipality_id, need, note, email, created_at, updated_at) ON province_requests TO geco_client;--> statement-breakpoint
CREATE POLICY geco_client_own ON province_requests FOR SELECT TO geco_client USING (email = (SELECT app_user_email()));--> statement-breakpoint
GRANT SELECT ON provinces TO geco_client;--> statement-breakpoint
CREATE POLICY geco_client_read ON provinces FOR SELECT TO geco_client USING (true);
