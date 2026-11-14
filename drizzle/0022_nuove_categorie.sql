-- Quattro categorie nuove (soci, 14/11/2026): Designer d'interni, Giardiniere, Impresa di pulizie, Impresa di sgomberi,
-- con servizi e domande del modulo di richiesta. Non tocca le categorie esistenti e non duplica: se lo slug c'è già
-- (database ricreato o migrazione rilanciata) non aggiunge nulla: ogni riga entra solo se manca.
INSERT INTO "categories" ("partner_type", "name", "plural_name", "slug", "icon", "sort_order")
SELECT n."partner_type"::partner_type, n."name", n."plural_name", n."slug", n."icon", n."sort_order"
FROM (VALUES
  ('designer-interni', 'technician', 'Designer d''interni', 'Designer d''interni', 'sofa', 7),
  ('giardiniere', 'artisan', 'Giardiniere', 'Giardinieri', 'leaf', 8),
  ('impresa-pulizie', 'artisan', 'Impresa di pulizie', 'Imprese di pulizie', 'sparkles', 9),
  ('sgomberi', 'artisan', 'Impresa di sgomberi', 'Imprese di sgomberi', 'truck', 10)
) AS n("slug", "partner_type", "name", "plural_name", "icon", "sort_order")
ON CONFLICT ("slug") DO NOTHING;--> statement-breakpoint
INSERT INTO "services" ("category_id", "slug", "name", "default_unit")
SELECT a."id", s."slug", s."name", s."unit"::price_unit
FROM "categories" a
JOIN (VALUES
  ('designer-interni', 'progetto-interni', 'Progetto d''interni', 'sqm'),
  ('designer-interni', 'arredamento-su-misura', 'Arredamento su misura', 'flat'),
  ('designer-interni', 'home-staging', 'Home staging per vendita o affitto', 'flat'),
  ('designer-interni', 'consulenza-colori', 'Consulenza colori e materiali', 'hour'),
  ('designer-interni', 'progetto-illuminazione', 'Progetto illuminazione', 'flat'),
  ('giardiniere', 'manutenzione-giardino', 'Manutenzione periodica del giardino', 'month'),
  ('giardiniere', 'taglio-prato-siepi', 'Taglio prato e siepi', 'visit'),
  ('giardiniere', 'potatura', 'Potatura alberi', 'unit'),
  ('giardiniere', 'progettazione-giardini', 'Progettazione e realizzazione giardini', 'sqm'),
  ('giardiniere', 'irrigazione', 'Impianto di irrigazione', 'flat'),
  ('giardiniere', 'prato', 'Prato a rotoli e semina', 'sqm'),
  ('impresa-pulizie', 'pulizie-ordinarie', 'Pulizie ordinarie della casa', 'hour'),
  ('impresa-pulizie', 'pulizia-fondo', 'Pulizia di fondo', 'sqm'),
  ('impresa-pulizie', 'fine-cantiere', 'Pulizia fine cantiere', 'sqm'),
  ('impresa-pulizie', 'condomini', 'Pulizia condomini e scale', 'month'),
  ('impresa-pulizie', 'uffici-negozi', 'Pulizia uffici e negozi', 'month'),
  ('impresa-pulizie', 'vetri', 'Pulizia vetri', 'flat'),
  ('sgomberi', 'sgombero-case', 'Sgombero appartamenti e case', 'flat'),
  ('sgomberi', 'cantine-soffitte', 'Sgombero cantine e soffitte', 'flat'),
  ('sgomberi', 'locali-commerciali', 'Sgombero locali commerciali', 'flat'),
  ('sgomberi', 'ingombranti-raee', 'Smaltimento ingombranti e RAEE', 'unit'),
  ('sgomberi', 'dopo-successione', 'Svuotamento dopo successione', 'flat')
) AS s("category", "slug", "name", "unit") ON s."category" = a."slug"
ON CONFLICT ("category_id", "slug") DO NOTHING;--> statement-breakpoint
INSERT INTO "service_questions" ("category_id", "key", "label", "help", "type", "options", "required", "sort_order")
SELECT a."id", q."key", q."label", q."help", q."type"::question_type,
       CASE WHEN q."options" IS NULL THEN NULL
            ELSE (SELECT jsonb_agg(jsonb_build_object('value', o, 'label', o) ORDER BY i) FROM unnest(q."options") WITH ORDINALITY AS t(o, i)) END,
       q."required", q."sort_order"
FROM "categories" a
JOIN (VALUES
  ('designer-interni', 'immobile', 'Tipo di immobile', NULL, 'select', ARRAY['Appartamento', 'Casa indipendente', 'Villetta a schiera', 'Ufficio o negozio'], true, 0),
  ('designer-interni', 'mq', 'Metri quadri interessati', 'Anche una stima va bene', 'number', NULL, false, 1),
  ('designer-interni', 'stanze', 'Quali stanze?', NULL, 'select', ARRAY['Tutta la casa', 'Zona giorno', 'Cucina', 'Camere', 'Bagno'], false, 2),
  ('designer-interni', 'vendita', 'L''immobile è da vendere o affittare?', 'Per l''home staging', 'select', ARRAY['Sì', 'No'], false, 3),
  ('designer-interni', 'budget', 'Budget indicativo', NULL, 'select', ARRAY['Fino a 1.000 €', '1.000 – 5.000 €', '5.000 – 15.000 €', 'Oltre 15.000 €', 'Non so ancora'], false, 4),
  ('giardiniere', 'immobile', 'Tipo di immobile', NULL, 'select', ARRAY['Casa indipendente', 'Villetta a schiera', 'Condominio', 'Ufficio o negozio'], true, 0),
  ('giardiniere', 'mq', 'Metri quadri del giardino', 'Anche una stima va bene', 'number', NULL, false, 1),
  ('giardiniere', 'frequenza', 'Una tantum o periodico?', NULL, 'select', ARRAY['Una volta', 'Ogni mese', 'Stagionale'], false, 2),
  ('giardiniere', 'budget', 'Budget indicativo', NULL, 'select', ARRAY['Fino a 1.000 €', '1.000 – 5.000 €', '5.000 – 15.000 €', 'Oltre 15.000 €', 'Non so ancora'], false, 3),
  ('impresa-pulizie', 'immobile', 'Tipo di immobile', NULL, 'select', ARRAY['Appartamento', 'Casa indipendente', 'Villetta a schiera', 'Condominio', 'Ufficio o negozio'], true, 0),
  ('impresa-pulizie', 'mq', 'Metri quadri interessati', 'Anche una stima va bene', 'number', NULL, false, 1),
  ('impresa-pulizie', 'frequenza', 'Con che frequenza?', NULL, 'select', ARRAY['Una volta', 'Settimanale', 'Mensile'], false, 2),
  ('impresa-pulizie', 'budget', 'Budget indicativo', NULL, 'select', ARRAY['Fino a 1.000 €', '1.000 – 5.000 €', '5.000 – 15.000 €', 'Oltre 15.000 €', 'Non so ancora'], false, 3),
  ('sgomberi', 'immobile', 'Tipo di immobile', NULL, 'select', ARRAY['Appartamento', 'Casa indipendente', 'Villetta a schiera', 'Ufficio o negozio'], true, 0),
  ('sgomberi', 'mq', 'Metri quadri interessati', 'Anche una stima va bene', 'number', NULL, false, 1),
  ('sgomberi', 'piano', 'Piano e ascensore', NULL, 'select', ARRAY['Piano terra', 'Con ascensore', 'Senza ascensore'], false, 2),
  ('sgomberi', 'budget', 'Budget indicativo', NULL, 'select', ARRAY['Fino a 1.000 €', '1.000 – 5.000 €', '5.000 – 15.000 €', 'Oltre 15.000 €', 'Non so ancora'], false, 3),
  ('sgomberi', 'recupero', 'Ci sono oggetti da recuperare o valutare?', NULL, 'select', ARRAY['Sì', 'No'], false, 4)
) AS q("category", "key", "label", "help", "type", "options", "required", "sort_order") ON q."category" = a."slug"
WHERE NOT EXISTS (SELECT 1 FROM "service_questions" x WHERE x."category_id" = a."id" AND x."key" = q."key");
