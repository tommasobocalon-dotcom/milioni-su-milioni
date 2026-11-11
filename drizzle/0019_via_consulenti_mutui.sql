-- Via la categoria "Consulente mutui" (soci, 11/11/2026). Prima l'azienda di prova "mutui-veneto" (sui database dove
-- c'è ancora: il seed la creava), poi categoria, servizi, domande e boost, ma solo se nessun'altra azienda o richiesta
-- la usa: dati veri non si cancellano mai senza guardarli. In quel caso la migrazione non tocca nulla e lo segnala.
DELETE FROM "leads" WHERE "partner_id" IN (SELECT "id" FROM "partners" WHERE "slug" = 'mutui-veneto');--> statement-breakpoint
DELETE FROM "partners" WHERE "slug" = 'mutui-veneto';--> statement-breakpoint
DO $$
DECLARE cat uuid := (SELECT "id" FROM "categories" WHERE "slug" = 'consulente-mutui');
BEGIN
  IF cat IS NULL THEN
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM "partners" WHERE "category_id" = cat) OR EXISTS (SELECT 1 FROM "leads" WHERE "category_id" = cat) THEN
    RAISE NOTICE 'Categoria consulente-mutui ancora usata da aziende o richieste: non cancellata';
    RETURN;
  END IF;
  DELETE FROM "boosts" WHERE "category_id" = cat;
  DELETE FROM "service_questions" WHERE "category_id" = cat;
  DELETE FROM "services" WHERE "category_id" = cat;
  DELETE FROM "categories" WHERE "id" = cat;
END $$;
