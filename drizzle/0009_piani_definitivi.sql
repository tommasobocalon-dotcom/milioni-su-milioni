-- Piani definitivi (documento "Costo e funzioni definitive", 4/11/2026): Base, Normal, Premium.
-- Le richieste dei clienti sono gratis e illimitate: leads_included resta solo per lo storico.
-- I prezzi cambiano: gli id dei prezzi Stripe vanno ricreati con `npm run stripe:setup`.
UPDATE "plans" SET "name" = 'Base', "monthly_price_cents" = 1500, "yearly_price_cents" = 10800, "leads_included" = 0,
  "visibility_weight" = 1, "max_provinces" = 1, "max_services" = 5, "max_portfolio_items" = 5, "max_users" = 1,
  "renewal_tokens" = 0, "featured_slots" = false, "stripe_monthly_price_id" = NULL, "stripe_yearly_price_id" = NULL
  WHERE "code" = 'base';--> statement-breakpoint
UPDATE "plans" SET "code" = 'normal', "name" = 'Normal', "monthly_price_cents" = 4900, "yearly_price_cents" = 46800, "leads_included" = 0,
  "visibility_weight" = 2, "max_provinces" = 7, "max_services" = 15, "max_portfolio_items" = 25, "max_users" = 2,
  "renewal_tokens" = 80, "featured_slots" = true, "stripe_monthly_price_id" = NULL, "stripe_yearly_price_id" = NULL
  WHERE "code" = 'media';--> statement-breakpoint
UPDATE "plans" SET "code" = 'premium', "name" = 'Premium', "monthly_price_cents" = 12000, "yearly_price_cents" = 118800, "leads_included" = 0,
  "visibility_weight" = 3, "max_provinces" = 99, "max_services" = NULL, "max_portfolio_items" = NULL, "max_users" = 5,
  "renewal_tokens" = 200, "featured_slots" = true, "stripe_monthly_price_id" = NULL, "stripe_yearly_price_id" = NULL
  WHERE "code" = 'professional';
--> statement-breakpoint
-- Niente più richieste da sbloccare: quelle rimaste bloccate diventano normali, con i contatti visibili.
UPDATE "leads" SET "charge" = 'quota', "unlock_expires_at" = NULL WHERE "charge" IN ('locked', 'expired');
