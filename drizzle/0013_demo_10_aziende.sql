-- Dati di prova ridotti a 10 aziende (richiesta del 5/11/2026), per provare la classifica:
-- 3 Premium con boost (ricerca + Home), 3 Premium senza boost, 2 Normal, 2 Base.
-- Tocca solo le aziende di prova, per slug. Su un database vuoto non fa nulla: le migrazioni girano prima del seed.
DELETE FROM "leads" WHERE "partner_id" IN (SELECT "id" FROM "partners" WHERE "slug" IN (
  'euganea-manutenzioni', 'studio-tecnico-bianchi', 'geom-gatto', 'elettro-bortolin', 'elettro-zanon',
  'pittura-mazzon', 'studio-immobiliare-euganeo', 'mutui-veneto'));--> statement-breakpoint
DELETE FROM "partners" WHERE "slug" IN (
  'euganea-manutenzioni', 'studio-tecnico-bianchi', 'geom-gatto', 'elettro-bortolin', 'elettro-zanon',
  'pittura-mazzon', 'studio-immobiliare-euganeo', 'mutui-veneto');--> statement-breakpoint
UPDATE "subscriptions" SET "plan_id" = (SELECT "id" FROM "plans" WHERE "code" = 'premium')
  WHERE "partner_id" IN (SELECT "id" FROM "partners" WHERE "slug" IN (
    'termoidraulica-brenta', 'edil-brenta', 'immobiliare-prato-della-valle', 'idraulica-lagunare', 'arch-pavan', 'immobiliare-canova'));--> statement-breakpoint
UPDATE "subscriptions" SET "plan_id" = (SELECT "id" FROM "plans" WHERE "code" = 'normal')
  WHERE "partner_id" IN (SELECT "id" FROM "partners" WHERE "slug" IN ('rossi-impianti', 'casa-veneta-immobiliare'));--> statement-breakpoint
UPDATE "subscriptions" SET "plan_id" = (SELECT "id" FROM "plans" WHERE "code" = 'base')
  WHERE "partner_id" IN (SELECT "id" FROM "partners" WHERE "slug" IN ('bianchi-idrotermica', 'gruppo-casa-padova'));--> statement-breakpoint
-- Boost: via quelli in corso delle 10 aziende, poi 7 giorni nuovi (ricerca + Home) ai 3 Premium con boost.
DELETE FROM "boosts" WHERE "ends_at" > now() AND "partner_id" IN (SELECT "id" FROM "partners" WHERE "slug" IN (
  'termoidraulica-brenta', 'edil-brenta', 'immobiliare-prato-della-valle', 'idraulica-lagunare', 'arch-pavan', 'immobiliare-canova',
  'rossi-impianti', 'casa-veneta-immobiliare', 'bianchi-idrotermica', 'gruppo-casa-padova'));--> statement-breakpoint
INSERT INTO "boosts" ("partner_id", "placement", "category_id", "province_id", "starts_at", "ends_at", "tokens_spent")
  SELECT p."id", pl."placement"::"boost_placement", p."category_id", m."province_id", now(), now() + interval '7 days', 0
  FROM "partners" p
  JOIN "municipalities" m ON m."id" = p."municipality_id"
  CROSS JOIN (VALUES ('search'), ('home')) AS pl("placement")
  WHERE p."slug" IN ('termoidraulica-brenta', 'edil-brenta', 'immobiliare-prato-della-valle');
