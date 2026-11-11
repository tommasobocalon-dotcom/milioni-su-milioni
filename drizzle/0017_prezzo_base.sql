-- Prezzi dei soci (11/11/2026): Base 39 €/mese (468 € l'anno pagando mese per mese) o 348 €/anno; mensile Normal 89 € e Premium 199 €.
-- Gli id dei prezzi Stripe si azzerano: il sito ripiega sulla lookup_key; `npm run stripe:setup` crea i prezzi nuovi.
UPDATE "plans" SET "monthly_price_cents" = 3900, "yearly_price_cents" = 34800, "stripe_monthly_price_id" = NULL, "stripe_yearly_price_id" = NULL WHERE "code" = 'base';--> statement-breakpoint
UPDATE "plans" SET "monthly_price_cents" = 8900, "stripe_monthly_price_id" = NULL, "stripe_yearly_price_id" = NULL WHERE "code" = 'normal';--> statement-breakpoint
UPDATE "plans" SET "monthly_price_cents" = 19900, "stripe_monthly_price_id" = NULL, "stripe_yearly_price_id" = NULL WHERE "code" = 'premium';
