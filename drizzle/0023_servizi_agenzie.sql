-- Più servizi per le agenzie immobiliari (soci, 14/11/2026): finora erano solo compravendita, valutazione, locazione
-- residenziale e foto con planimetria. Non duplica: un servizio che la categoria ha già (stesso slug) viene saltato.
INSERT INTO "services" ("category_id", "slug", "name", "default_unit")
SELECT c."id", s."slug", s."name", s."unit"::price_unit
FROM "categories" c
CROSS JOIN (VALUES
  ('affitti-brevi', 'Affitti brevi e turistici', 'percent'),
  ('gestione-affitti', 'Gestione affitti', 'percent'),
  ('locazione-commerciale', 'Locazione commerciale', 'month'),
  ('nuove-costruzioni', 'Vendita nuove costruzioni', 'percent'),
  ('terreni', 'Terreni e rustici', 'percent'),
  ('verifica-documenti', 'Verifica documenti e conformità', 'flat'),
  ('tour-virtuale', 'Tour virtuale e video', 'flat')
) AS s("slug", "name", "unit")
WHERE c."slug" = 'agenzia-immobiliare'
ON CONFLICT ("category_id", "slug") DO NOTHING;
