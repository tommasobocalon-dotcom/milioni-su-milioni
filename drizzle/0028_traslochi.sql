-- Impresa di sgomberi diventa Impresa di traslochi (soci, 15/11/2026). Nessuna azienda era in quella categoria:
-- si rinomina la stessa riga (slug compreso), si tengono i servizi di sgombero, che le ditte di traslochi fanno quasi sempre,
-- e si aggiungono quelli di trasloco e due domande nel modulo di richiesta. Ogni riga entra solo se manca.
UPDATE "categories" SET "slug" = 'traslochi', "name" = 'Impresa di traslochi', "plural_name" = 'Imprese di traslochi'
WHERE "slug" = 'sgomberi' AND NOT EXISTS (SELECT 1 FROM "categories" WHERE "slug" = 'traslochi');--> statement-breakpoint
INSERT INTO "services" ("category_id", "slug", "name", "default_unit")
SELECT a."id", s."slug", s."name", s."unit"::price_unit
FROM "categories" a
JOIN (VALUES
  ('trasloco-casa', 'Trasloco di casa', 'flat'),
  ('trasloco-uffici', 'Trasloco di uffici e negozi', 'flat'),
  ('piccoli-traslochi', 'Piccoli traslochi e trasporto singoli mobili', 'flat'),
  ('imballaggio', 'Imballaggio e materiale per il trasloco', 'flat'),
  ('montaggio-mobili', 'Smontaggio e montaggio mobili', 'hour'),
  ('deposito-mobili', 'Deposito e custodia mobili', 'month'),
  ('autoscala', 'Noleggio autoscala o montacarichi', 'hour')
) AS s("slug", "name", "unit") ON a."slug" = 'traslochi'
ON CONFLICT ("category_id", "slug") DO NOTHING;--> statement-breakpoint
-- Ordine del modulo: tipo di immobile, comune di arrivo, metri quadri, piano, mobili da smontare, budget, oggetti da recuperare.
INSERT INTO "service_questions" ("category_id", "key", "label", "help", "type", "options", "required", "sort_order")
SELECT a."id", q."key", q."label", q."help", q."type"::question_type,
       CASE WHEN q."options" IS NULL THEN NULL
            ELSE (SELECT jsonb_agg(jsonb_build_object('value', o, 'label', o) ORDER BY i) FROM unnest(q."options") WITH ORDINALITY AS t(o, i)) END,
       q."required", q."sort_order"
FROM "categories" a
JOIN (VALUES
  ('arrivo', 'Comune di arrivo', 'Solo per i traslochi', 'text', NULL, false, 1),
  ('montaggio', 'Ci sono mobili da smontare e rimontare?', NULL, 'select', ARRAY['Sì', 'No', 'Non so'], false, 4)
) AS q("key", "label", "help", "type", "options", "required", "sort_order") ON a."slug" = 'traslochi'
WHERE NOT EXISTS (SELECT 1 FROM "service_questions" x WHERE x."category_id" = a."id" AND x."key" = q."key");--> statement-breakpoint
UPDATE "service_questions" q SET "sort_order" = n."sort_order"
FROM "categories" a, (VALUES ('mq', 2), ('piano', 3), ('budget', 5), ('recupero', 6)) AS n("key", "sort_order")
WHERE a."slug" = 'traslochi' AND q."category_id" = a."id" AND q."key" = n."key";
