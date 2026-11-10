-- Estensione territoriale solo per comune (decisione dei soci, 10/11/2026): le vecchie estensioni a una provincia
-- intera, pagate a crediti, spariscono.
DELETE FROM "area_extensions" WHERE "municipality_id" IS NULL;--> statement-breakpoint
ALTER TABLE "area_extensions" DROP CONSTRAINT "area_extensions_province_id_provinces_id_fk";
--> statement-breakpoint
DROP INDEX "area_extensions_lookup_idx";--> statement-breakpoint
ALTER TABLE "area_extensions" ALTER COLUMN "municipality_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "area_extensions" DROP COLUMN "province_id";