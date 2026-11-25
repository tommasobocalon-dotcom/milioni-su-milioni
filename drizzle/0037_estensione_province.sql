ALTER TABLE "area_extensions" ALTER COLUMN "municipality_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "area_extensions" ADD COLUMN "province_id" smallint;--> statement-breakpoint
ALTER TABLE "area_extensions" ADD CONSTRAINT "area_extensions_province_id_provinces_id_fk" FOREIGN KEY ("province_id") REFERENCES "public"."provinces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "area_extensions_province_idx" ON "area_extensions" USING btree ("province_id","ends_at");--> statement-breakpoint
ALTER TABLE "area_extensions" ADD CONSTRAINT "area_extensions_one_zone" CHECK (("area_extensions"."municipality_id" is null) <> ("area_extensions"."province_id" is null));