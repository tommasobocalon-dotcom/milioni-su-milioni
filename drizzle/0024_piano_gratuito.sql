-- Piano gratuito di lancio (soci, 15/11/2026): Base senza Stripe finché l'azienda non riceve 3 richieste in un mese.
ALTER TABLE "subscriptions" ADD COLUMN "free" boolean DEFAULT false NOT NULL;
