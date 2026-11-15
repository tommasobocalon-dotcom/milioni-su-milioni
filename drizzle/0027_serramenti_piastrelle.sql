-- Due categorie nuove (soci, 15/11/2026): Serramentista e Piastrellista, con servizi e domande del modulo di richiesta,
-- e il servizio "Pulizia e manutenzione piscine e vasche" per i giardinieri. Come la 0022: ogni riga entra solo se manca.
INSERT INTO "categories" ("partner_type", "name", "plural_name", "slug", "icon", "sort_order")
SELECT n."partner_type"::partner_type, n."name", n."plural_name", n."slug", n."icon", n."sort_order"
FROM (VALUES
  ('serramentista', 'artisan', 'Serramentista', 'Serramentisti', 'blinds', 11),
  ('piastrellista', 'artisan', 'Piastrellista', 'Piastrellisti', 'tiles', 12)
) AS n("slug", "partner_type", "name", "plural_name", "icon", "sort_order")
ON CONFLICT ("slug") DO NOTHING;--> statement-breakpoint
INSERT INTO "services" ("category_id", "slug", "name", "default_unit")
SELECT a."id", s."slug", s."name", s."unit"::price_unit
FROM "categories" a
JOIN (VALUES
  ('serramentista', 'finestre', 'Sostituzione finestre e portefinestre', 'unit'),
  ('serramentista', 'porte-blindate', 'Porte blindate e portoncini', 'unit'),
  ('serramentista', 'porte-interne', 'Porte interne', 'unit'),
  ('serramentista', 'tapparelle-persiane', 'Tapparelle, persiane e scuri', 'unit'),
  ('serramentista', 'zanzariere', 'Zanzariere', 'unit'),
  ('serramentista', 'tende-pergole', 'Tende da sole e pergole', 'flat'),
  ('serramentista', 'riparazione-infissi', 'Riparazione e regolazione infissi', 'visit'),
  ('piastrellista', 'posa-pavimenti', 'Posa pavimenti', 'sqm'),
  ('piastrellista', 'rivestimento-bagno', 'Rivestimento bagno', 'sqm'),
  ('piastrellista', 'rivestimento-cucina', 'Rivestimento cucina', 'sqm'),
  ('piastrellista', 'pavimenti-esterni', 'Pavimenti esterni, terrazzi e balconi', 'sqm'),
  ('piastrellista', 'rimozione-pavimenti', 'Rimozione vecchi pavimenti', 'sqm'),
  ('piastrellista', 'riparazione-piastrelle', 'Riparazione e sostituzione piastrelle', 'visit'),
  ('giardiniere', 'piscine', 'Pulizia e manutenzione piscine e vasche', 'visit')
) AS s("category", "slug", "name", "unit") ON s."category" = a."slug"
ON CONFLICT ("category_id", "slug") DO NOTHING;--> statement-breakpoint
INSERT INTO "service_questions" ("category_id", "key", "label", "help", "type", "options", "required", "sort_order")
SELECT a."id", q."key", q."label", q."help", q."type"::question_type,
       CASE WHEN q."options" IS NULL THEN NULL
            ELSE (SELECT jsonb_agg(jsonb_build_object('value', o, 'label', o) ORDER BY i) FROM unnest(q."options") WITH ORDINALITY AS t(o, i)) END,
       q."required", q."sort_order"
FROM "categories" a
JOIN (VALUES
  ('serramentista', 'immobile', 'Tipo di immobile', NULL, 'select', ARRAY['Appartamento', 'Casa indipendente', 'Villetta a schiera', 'Condominio', 'Ufficio o negozio'], true, 0),
  ('serramentista', 'pezzi', 'Quante finestre o porte?', 'Anche una stima va bene', 'number', NULL, false, 1),
  ('serramentista', 'materiale', 'Materiale preferito', NULL, 'select', ARRAY['PVC', 'Legno', 'Alluminio', 'Legno-alluminio', 'Non so ancora'], false, 2),
  ('serramentista', 'detrazioni', 'Vuoi usare le detrazioni fiscali?', NULL, 'select', ARRAY['Sì', 'No', 'Non so'], false, 3),
  ('serramentista', 'budget', 'Budget indicativo', NULL, 'select', ARRAY['Fino a 1.000 €', '1.000 – 5.000 €', '5.000 – 15.000 €', 'Oltre 15.000 €', 'Non so ancora'], false, 4),
  ('piastrellista', 'immobile', 'Tipo di immobile', NULL, 'select', ARRAY['Appartamento', 'Casa indipendente', 'Villetta a schiera', 'Ufficio o negozio'], true, 0),
  ('piastrellista', 'ambiente', 'Dove va posato?', NULL, 'select', ARRAY['Bagno', 'Cucina', 'Tutta la casa', 'Terrazzo o esterno', 'Altro'], false, 1),
  ('piastrellista', 'mq', 'Metri quadri da posare', 'Anche una stima va bene', 'number', NULL, false, 2),
  ('piastrellista', 'materiale', 'Hai già le piastrelle?', NULL, 'select', ARRAY['Sì, le ho già', 'No, da scegliere'], false, 3),
  ('piastrellista', 'budget', 'Budget indicativo', NULL, 'select', ARRAY['Fino a 1.000 €', '1.000 – 5.000 €', '5.000 – 15.000 €', 'Oltre 15.000 €', 'Non so ancora'], false, 4)
) AS q("category", "key", "label", "help", "type", "options", "required", "sort_order") ON q."category" = a."slug"
WHERE NOT EXISTS (SELECT 1 FROM "service_questions" x WHERE x."category_id" = a."id" AND x."key" = q."key");
