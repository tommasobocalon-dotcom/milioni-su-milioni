-- Prezzi a ,99 (5/11/2026): mensile 12,99 / 48,99 / 118,99; annuale 8,99 / 38,99 / 98,99 al mese (totale anno = ×12).
-- Gli id dei prezzi Stripe si azzerano: il sito ripiega sulla lookup_key; `npm run stripe:setup` crea i prezzi nuovi.
UPDATE "plans" SET "monthly_price_cents" = 1299, "yearly_price_cents" = 10788, "stripe_monthly_price_id" = NULL, "stripe_yearly_price_id" = NULL WHERE "code" = 'base';--> statement-breakpoint
UPDATE "plans" SET "monthly_price_cents" = 4899, "yearly_price_cents" = 46788, "stripe_monthly_price_id" = NULL, "stripe_yearly_price_id" = NULL WHERE "code" = 'normal';--> statement-breakpoint
UPDATE "plans" SET "monthly_price_cents" = 11899, "yearly_price_cents" = 118788, "stripe_monthly_price_id" = NULL, "stripe_yearly_price_id" = NULL WHERE "code" = 'premium';
