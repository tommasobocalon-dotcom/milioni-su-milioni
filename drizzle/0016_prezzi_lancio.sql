-- Prezzi di listino dei soci (11/11/2026): Normal 69 €/mese o 828 €/anno, Premium 159 €/mese o 1908 €/anno, Base invariato.
-- Le promo (primo mese 39/79 €, annuale 599/1490 € nei primi 6 mesi) sono sconti Stripe sul primo pagamento (offers.ts).
-- Gli id dei prezzi Stripe si azzerano: il sito ripiega sulla lookup_key; `npm run stripe:setup` crea i prezzi nuovi.
UPDATE "plans" SET "monthly_price_cents" = 6900, "yearly_price_cents" = 82800, "stripe_monthly_price_id" = NULL, "stripe_yearly_price_id" = NULL WHERE "code" = 'normal';--> statement-breakpoint
UPDATE "plans" SET "monthly_price_cents" = 15900, "yearly_price_cents" = 190800, "stripe_monthly_price_id" = NULL, "stripe_yearly_price_id" = NULL WHERE "code" = 'premium';
