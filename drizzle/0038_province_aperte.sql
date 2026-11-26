ALTER TABLE "provinces" ADD COLUMN "is_open" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- Si parte dalla provincia di Treviso (soci, 23/11/2026): prima era la costante OPEN_PROVINCES nel codice.
UPDATE "provinces" SET "is_open" = true WHERE "code" = 'TV';
