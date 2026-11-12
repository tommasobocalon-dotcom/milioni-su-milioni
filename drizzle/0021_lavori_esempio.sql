-- Lavori di esempio per Ispirazione (12/11/2026), con foto da Unsplash in public/esempi/lavori.
-- Solo sulle aziende di esempio del seed (cercate per slug): su un database senza dati di esempio non aggiunge nulla.
-- Non duplica: se l'azienda ha già un lavoro con lo stesso titolo lo salta. Si tolgono da soli eliminando l'azienda.
INSERT INTO "portfolio_items" ("partner_id", "kind", "title", "description", "image_url", "photos", "contract", "status")
SELECT p."id", v."kind"::portfolio_kind, v."title", v."description", v."photos"[1], v."photos",
       CASE WHEN v."kind" = 'property' THEN 'sale'::property_contract END,
       CASE WHEN v."kind" = 'property' THEN 'available'::property_status END
FROM (VALUES
  ('rossi-impianti', 'work', 'Bagno rifatto a Noale',
   'Demolizione, impianto idraulico nuovo, piatto doccia filo pavimento e mobile sospeso. Finito in dieci giorni.',
   ARRAY['/esempi/lavori/bagno-1.jpg', '/esempi/lavori/bagno-2.jpg', '/esempi/lavori/bagno-3.jpg', '/esempi/lavori/bagno-4.jpg']),
  ('bianchi-idrotermica', 'work', 'Cucina con impianto nuovo',
   'Smontaggio della vecchia cucina, nuovi attacchi acqua e gas, montaggio e collaudo.',
   ARRAY['/esempi/lavori/cucina-1.jpg', '/esempi/lavori/cucina-2.jpg', '/esempi/lavori/cucina-3.jpg']),
  ('arch-pavan', 'work', 'Soggiorno ridisegnato e ripitturato',
   'Progetto degli spazi, stuccatura e due mani di idropittura con colore su misura per la parete principale.',
   ARRAY['/esempi/lavori/pittura-1.jpg', '/esempi/lavori/pittura-2.jpg', '/esempi/lavori/pittura-3.jpg', '/esempi/lavori/pittura-4.jpg']),
  ('edil-brenta', 'work', 'Facciata e cappotto termico',
   'Ponteggio, cappotto da 12 cm, intonaco e tinteggiatura della facciata di una bifamiliare.',
   ARRAY['/esempi/lavori/cantiere-1.jpg', '/esempi/lavori/cantiere-2.jpg', '/esempi/lavori/cantiere-3.jpg', '/esempi/lavori/cantiere-4.jpg', '/esempi/lavori/cucina-4.jpg', '/esempi/lavori/bagno-4.jpg']),
  ('casa-veneta-immobiliare', 'property', 'Trilocale luminoso in centro',
   'Ristrutturato, due camere, soggiorno con cucina a vista e terrazzo.',
   ARRAY['/esempi/lavori/casa-1.jpg', '/esempi/lavori/casa-2.jpg', '/esempi/lavori/casa-3.jpg', '/esempi/lavori/casa-4.jpg'])
) AS v("slug", "kind", "title", "description", "photos")
JOIN "partners" p ON p."slug" = v."slug"
WHERE NOT EXISTS (SELECT 1 FROM "portfolio_items" pi WHERE pi."partner_id" = p."id" AND pi."title" = v."title");
