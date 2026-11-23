CREATE TABLE "area_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"province_id" smallint NOT NULL,
	"municipality_id" integer,
	"category_id" uuid NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "area_requests" ADD CONSTRAINT "area_requests_province_id_provinces_id_fk" FOREIGN KEY ("province_id") REFERENCES "public"."provinces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "area_requests" ADD CONSTRAINT "area_requests_municipality_id_municipalities_id_fk" FOREIGN KEY ("municipality_id") REFERENCES "public"."municipalities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "area_requests" ADD CONSTRAINT "area_requests_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "area_requests_province_idx" ON "area_requests" USING btree ("province_id","created_at");--> statement-breakpoint
-- Come le altre tabelle (0004): chiusa alla Data API di Supabase, l'app vi accede come proprietaria.
ALTER TABLE "area_requests" ENABLE ROW LEVEL SECURITY;
