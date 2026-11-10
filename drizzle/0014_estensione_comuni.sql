ALTER TABLE "area_extensions" ALTER COLUMN "province_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "area_extensions" ADD COLUMN "municipality_id" integer;--> statement-breakpoint
ALTER TABLE "area_extensions" ADD CONSTRAINT "area_extensions_municipality_id_municipalities_id_fk" FOREIGN KEY ("municipality_id") REFERENCES "public"."municipalities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "area_extensions_municipality_idx" ON "area_extensions" USING btree ("municipality_id","ends_at");