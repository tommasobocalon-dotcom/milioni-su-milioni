-- Lavori in Ispirazione solo se l'azienda spunta la casella (20/11/2026); altrimenti restano nella sua scheda.
ALTER TABLE "portfolio_items" ADD COLUMN "in_inspiration" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- I lavori già pubblicati erano tutti in Ispirazione: restano dove sono.
UPDATE "portfolio_items" SET "in_inspiration" = true;
