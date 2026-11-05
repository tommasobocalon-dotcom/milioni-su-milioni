CREATE TYPE "public"."boost_placement" AS ENUM('search', 'home');--> statement-breakpoint
ALTER TABLE "boosts" ADD COLUMN "placement" "boost_placement" DEFAULT 'search' NOT NULL;--> statement-breakpoint
-- Fino a oggi un boost valeva sia per la ricerca sia per la fascia loghi della Home: quelli ancora in corso
-- restano anche in Home fino alla scadenza (copia a 0 crediti, i crediti sono già scalati sull'originale).
INSERT INTO "boosts" ("partner_id", "placement", "category_id", "province_id", "starts_at", "ends_at", "tokens_spent", "created_at")
  SELECT "partner_id", 'home', "category_id", "province_id", "starts_at", "ends_at", 0, "created_at" FROM "boosts" WHERE "ends_at" > now();
