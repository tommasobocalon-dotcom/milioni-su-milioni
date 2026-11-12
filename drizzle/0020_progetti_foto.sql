ALTER TABLE "portfolio_items" ADD COLUMN "photos" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
-- I progetti già caricati avevano una sola foto: diventa la prima della galleria.
UPDATE "portfolio_items" SET "photos" = ARRAY["image_url"] WHERE "image_url" IS NOT NULL;
