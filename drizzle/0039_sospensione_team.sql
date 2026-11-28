ALTER TABLE "partners" ADD COLUMN "suspended_by_team" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- Le sospese senza un abbonamento sospeso (pagamento non riuscito o gratuito finito) le ha sospese il team.
UPDATE "partners" p SET "suspended_by_team" = true
WHERE p."account_status" = 'suspended'
  AND NOT EXISTS (SELECT 1 FROM "subscriptions" s WHERE s."partner_id" = p."id" AND s."status" = 'suspended');
